'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { cms } from '@/lib/cms';

export function PasswordRecoveryPanel() {
  const [step, setStep] = useState<'email' | 'code' | 'complete'>('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const status = useRef<HTMLHeadingElement>(null);
  async function requestCode() {
    const result = await cms<{ message: string }>('auth/password/request', 'POST', { email: email.trim() });
    setMessage(result.message);
    setStep('code');
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setError('');
    try {
      if (step === 'email') await requestCode();
      else {
        const data = new FormData(form);
        const password = String(data.get('password'));
        if (password !== String(data.get('confirmation'))) throw new Error('Both passwords must match.');
        if (new TextEncoder().encode(password).length > 72) throw new Error('Use a password of at most 72 UTF-8 bytes.');
        await cms('auth/password/reset', 'POST', { email: email.trim(), code: String(data.get('code')), password });
        form.reset();
        setStep('complete'); setMessage('Your password has changed. All previous logins have ended. Sign in with your new password.');
      }
      requestAnimationFrame(() => status.current?.focus());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Account recovery is unavailable. Please try again.');
    } finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError('');
    try { await requestCode(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please try again shortly.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="auth-layout">
      <div className="auth-brand-panel">
        <Link href="/" className="brand-badge" aria-label="UP24Network home"><BrandLogo eager /></Link>
        <p className="eyebrow">YOUR READING SPACE</p>
        <h1 lang="hi">खबरों से रिश्ता,<br />फिर से जोड़िए।</h1>
        <p>Recover access to your UP24Network account securely by email.</p>
        <Link href="/" className="text-link">Back to the front page</Link>
      </div>
      <div className="auth-form-panel">
        <KeyRound size={22} aria-hidden="true" />
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h2 ref={status} tabIndex={-1}>{step === 'complete' ? 'You’re ready to sign in.' : step === 'code' ? 'Choose a new password.' : 'Forgot your password?'}</h2>
        <p>{step === 'email' ? 'Enter your account email address. We’ll send a six-digit code to help you reset your password.' : message}</p>
        {step !== 'complete' && (
          <form className="cms-form" onSubmit={submit} aria-busy={busy}>
            <label>Email address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={step === 'code'} required maxLength={254} /></label>
            {step === 'code' && <>
              <label>Email code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required aria-describedby="recovery-code-help" /></label>
              <p className="field-help" id="recovery-code-help">Use the latest code within 10 minutes. Check your spam folder if it hasn’t arrived.</p>
              <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={64} required /></label>
              <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={64} required /></label>
              <p className="field-help">Use a unique password with 12–64 characters. Changing it signs out every device.</p>
            </>}
            {error && <p className="inline-error" role="alert">{error}</p>}
            <Button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : step === 'email' ? 'Send reset code' : 'Reset password'}</Button>
            {step === 'code' && <div className="cms-actions">
              <Button type="button" variant="outline" disabled={busy} onClick={resend}>Send a new code</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => { setStep('email'); setError(''); setMessage(''); }}>Change email</Button>
            </div>}
          </form>
        )}
        <Link href="/account/sign-in" className="text-button">Back to sign in</Link>
      </div>
    </section>
  );
}
