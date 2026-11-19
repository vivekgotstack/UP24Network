'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { cms } from '@/lib/cms';
import { copy, type SiteLocale } from '@/lib/locale';

export function PasswordRecoveryPanel({ locale }: { locale: SiteLocale }) {
  const [step, setStep] = useState<'email' | 'code' | 'complete'>('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const status = useRef<HTMLHeadingElement>(null);
  async function requestCode() {
    const result = await cms<{ message: string }>('auth/password/request', 'POST', {
      email: email.trim(),
    });
    setMessage(
      copy(locale, 'अगर इस ईमेल से कोई खाता जुड़ा है, तो उस पर कोड भेजा गया है।', result.message),
    );
    setStep('code');
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    try {
      if (step === 'email') await requestCode();
      else {
        const data = new FormData(form);
        const password = String(data.get('password'));
        if (password !== String(data.get('confirmation')))
          throw new Error(
            copy(locale, 'दोनों पासवर्ड एक जैसे होने चाहिए।', 'Both passwords must match.'),
          );
        if (new TextEncoder().encode(password).length > 72)
          throw new Error(
            copy(
              locale,
              'पासवर्ड अधिकतम 72 UTF-8 बाइट का रखें।',
              'Use a password of at most 72 UTF-8 bytes.',
            ),
          );
        await cms('auth/password/reset', 'POST', {
          email: email.trim(),
          code: String(data.get('code')),
          password,
        });
        form.reset();
        setStep('complete');
        setMessage(
          copy(
            locale,
            'पासवर्ड बदल गया। पुराने लॉगिन बंद हो गए हैं। नए पासवर्ड से लॉगिन करें।',
            'Your password has changed. All previous logins have ended. Sign in with your new password.',
          ),
        );
      }
      requestAnimationFrame(() => status.current?.focus());
    } catch (reason) {
      setError(
        reason instanceof Error && (locale === 'en' || reason.name === 'Error')
          ? reason.message
          : copy(
              locale,
              'खाता वापस नहीं खोला जा सका। दोबारा कोशिश करें।',
              'Account recovery is unavailable. Please try again.',
            ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError('');
    try {
      await requestCode();
    } catch (reason) {
      setError(
        locale === 'en' && reason instanceof Error
          ? reason.message
          : copy(locale, 'कुछ देर बाद दोबारा कोशिश करें।', 'Please try again shortly.'),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-brand-panel">
        <Link
          href="/"
          className="brand-badge"
          aria-label={copy(locale, 'UP24Network मुख्य पृष्ठ', 'UP24Network home')}
        >
          <BrandLogo eager />
        </Link>
        <h1>{copy(locale, 'खाता वापस खोलें', 'Recover your account')}</h1>
        <p>
          {copy(
            locale,
            'ईमेल से अपने UP24Network खाते की पहुँच वापस पाएँ।',
            'Recover access to your UP24Network account securely by email.',
          )}
        </p>
        <Link href="/" className="text-link">
          {copy(locale, 'मुख्य पृष्ठ', 'Home')}
        </Link>
      </div>
      <div className="auth-form-panel">
        <KeyRound size={22} aria-hidden="true" />
        <h2 ref={status} tabIndex={-1}>
          {step === 'complete'
            ? copy(locale, 'अब लॉगिन करें', 'Ready to sign in')
            : step === 'code'
              ? copy(locale, 'नया पासवर्ड चुनें', 'Choose a new password')
              : copy(locale, 'पासवर्ड भूल गए?', 'Forgot your password?')}
        </h2>
        <p>
          {step === 'email'
            ? copy(
                locale,
                'अपना ईमेल पता दें। पासवर्ड बदलने के लिए हम छह अंकों का कोड भेजेंगे।',
                'Enter your email. We’ll send a six-digit code to reset your password.',
              )
            : message}
        </p>
        {step !== 'complete' && (
          <form className="cms-form" onSubmit={submit} aria-busy={busy}>
            <label>
              {copy(locale, 'ईमेल', 'Email address')}
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                readOnly={step === 'code'}
                required
                maxLength={254}
              />
            </label>
            {step === 'code' && (
              <>
                <label>
                  {copy(locale, 'ईमेल कोड', 'Email code')}
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    required
                    aria-describedby="recovery-code-help"
                  />
                </label>
                <p className="field-help" id="recovery-code-help">
                  {copy(
                    locale,
                    'नया कोड 10 मिनट के अंदर डालें। ईमेल न मिले तो स्पैम फ़ोल्डर देखें।',
                    'Use the latest code within 10 minutes. Check your spam folder if it hasn’t arrived.',
                  )}
                </p>
                <label>
                  {copy(locale, 'नया पासवर्ड', 'New password')}
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={64}
                    required
                  />
                </label>
                <label>
                  {copy(locale, 'पासवर्ड दोबारा डालें', 'Confirm new password')}
                  <input
                    name="confirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={64}
                    required
                  />
                </label>
                <p className="field-help">
                  {copy(
                    locale,
                    '12–64 अक्षरों का अलग पासवर्ड रखें। बदलने पर सभी उपकरणों से लॉगआउट होगा।',
                    'Use a unique password with 12–64 characters. Changing it signs out every device.',
                  )}
                </p>
              </>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="auth-submit" disabled={busy}>
              {busy
                ? copy(locale, 'प्रतीक्षा करें…', 'Please wait…')
                : step === 'email'
                  ? copy(locale, 'कोड भेजें', 'Send reset code')
                  : copy(locale, 'पासवर्ड बदलें', 'Reset password')}
            </Button>
            {step === 'code' && (
              <div className="cms-actions">
                <Button type="button" variant="outline" disabled={busy} onClick={resend}>
                  {copy(locale, 'नया कोड भेजें', 'Send a new code')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setStep('email');
                    setError('');
                    setMessage('');
                  }}
                >
                  {copy(locale, 'ईमेल बदलें', 'Change email')}
                </Button>
              </div>
            )}
          </form>
        )}
        <Link href="/account/sign-in" className="text-button">
          {copy(locale, 'लॉगिन पर जाएँ', 'Back to sign in')}
        </Link>
      </div>
    </section>
  );
}
