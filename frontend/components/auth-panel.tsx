'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cms, CmsError, type Account } from '@/lib/cms';
import { copy, type SiteLocale } from '@/lib/locale';

export function AuthPanel({
  editorial = false,
  signup = false,
  locale = 'en',
  onAuthenticated,
}: {
  editorial?: boolean;
  signup?: boolean;
  locale?: SiteLocale;
  onAuthenticated: (account: Account) => Promise<unknown>;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email')).trim().toLowerCase(),
      password = String(data.get('password'));
    try {
      if (signup) {
        if (new TextEncoder().encode(password).length > 72)
          throw new Error(
            copy(
              locale,
              'पासवर्ड अधिकतम 72 UTF-8 बाइट का रखें।',
              'Use a password of at most 72 UTF-8 bytes.',
            ),
          );
        await cms('auth/register', 'POST', {
          email,
          password,
          displayName: String(data.get('displayName')).trim(),
        });
      }
      await cms('auth/login', 'POST', new URLSearchParams({ email, password }));
      await onAuthenticated(await cms<Account>('auth/me'));
    } catch (reason) {
      setError(
        reason instanceof CmsError && reason.status === 401
          ? copy(locale, 'ईमेल या पासवर्ड गलत है।', 'The email or password is incorrect.')
          : reason instanceof Error && (!(reason instanceof CmsError) || locale === 'en')
            ? reason.message
            : copy(locale, 'खाता नहीं खुला। दोबारा कोशिश करें।', 'Sign-in failed. Please try again.'),
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
        <h1>
          {editorial
            ? copy(locale, 'संपादकीय कक्ष', 'Newsroom')
            : copy(locale, 'खबरों से जुड़े रहें', 'Stay connected')}
        </h1>
        <p>
          {editorial
            ? copy(
                locale,
                'रिपोर्टिंग, संपादन और प्रकाशन का कार्यक्षेत्र।',
                'Your reporting, editing and publishing workspace.',
              )
            : copy(locale, 'अपना खाता खोलें और खबरें पढ़ें।', 'Sign in to manage your account.')}
        </p>
        <a href="/" className="text-link">
          {copy(locale, 'मुख्य पृष्ठ', 'Home')}
        </a>
      </div>
      <div className="auth-form-panel">
        <LockKeyhole size={22} aria-hidden="true" />
        <h2>
          {signup
            ? copy(locale, 'खाता बनाएँ', 'Create an account')
            : copy(locale, 'लॉगिन', 'Sign in')}
        </h2>
        <p>
          {editorial
            ? copy(
                locale,
                'प्रशासक का दिया खाता इस्तेमाल करें।',
                'Use the account provided by your administrator.',
              )
            : signup
              ? copy(locale, 'मुफ़्त पाठक खाता बनाएँ।', 'Create a free subscriber account.')
              : copy(
                  locale,
                  'अपने UP24Network खाते में लॉगिन करें।',
                  'Sign in to your UP24Network account.',
                )}
        </p>
        <form onSubmit={submit} className="cms-form">
          {signup && (
            <label>
              {copy(locale, 'नाम', 'Your name')}
              <input name="displayName" autoComplete="name" required maxLength={100} />
            </label>
          )}
          <label>
            {copy(locale, 'ईमेल', 'Email address')}
            <input name="email" type="email" autoComplete="username" required maxLength={254} />
          </label>
          <label>
            {copy(locale, 'पासवर्ड', 'Password')}
            <span className="password-field">
              <input
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete={signup ? 'new-password' : 'current-password'}
                required
                minLength={signup ? 12 : 1}
                maxLength={72}
              />
              <button
                type="button"
                aria-label={
                  visible
                    ? copy(locale, 'पासवर्ड छिपाएँ', 'Hide password')
                    : copy(locale, 'पासवर्ड दिखाएँ', 'Show password')
                }
                aria-pressed={visible}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {signup && (
            <p className="field-help">
              {copy(
                locale,
                'कम से कम 12 अक्षर रखें। पाठक खाते से संपादकीय पहुँच नहीं मिलती।',
                'Use at least 12 characters. Subscriber accounts do not have editorial access.',
              )}
            </p>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy} type="submit" className="auth-submit">
            {busy
              ? copy(locale, 'प्रतीक्षा करें…', 'Please wait…')
              : signup
                ? copy(locale, 'खाता बनाएँ', 'Create account')
                : copy(locale, 'लॉगिन', 'Sign in')}
          </Button>
        </form>
        {!signup && (
          <Link className="text-button" href="/account/recover">
            {copy(locale, 'पासवर्ड भूल गए?', 'Forgot your password?')}
          </Link>
        )}
        {!editorial && (
          <Link className="text-button" href={signup ? '/account/sign-in' : '/account/register'}>
            {signup
              ? copy(locale, 'मौजूदा खाते में लॉगिन', 'Already registered? Sign in')
              : copy(locale, 'नया खाता बनाएँ', 'New here? Create an account')}
          </Link>
        )}
        <p className="auth-help">
          <Link href="/contact">{copy(locale, 'खाते के लिए सहायता', 'Get account help')}</Link>
        </p>
      </div>
    </section>
  );
}
