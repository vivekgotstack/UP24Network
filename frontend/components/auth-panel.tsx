'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cms, CmsError, type Account } from '@/lib/cms';

export function AuthPanel({
  editorial = false,
  signup = false,
  onAuthenticated,
}: {
  editorial?: boolean;
  signup?: boolean;
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
          throw new Error('Use a password of at most 72 UTF-8 bytes.');
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
          ? 'The email or password is incorrect.'
          : reason instanceof Error
            ? reason.message
            : 'Sign-in failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div className="auth-brand-panel">
        <Link href="/" className="brand-badge" aria-label="UP24Network home">
          <BrandLogo eager />
        </Link>
        <p className="eyebrow">{editorial ? 'THE NEWSROOM' : 'YOUR READING SPACE'}</p>
        <h1 lang="hi">{editorial ? 'हर खबर के पीछे,\nएक जिम्मेदारी।' : 'अच्छी खबरों से\nजुड़े रहिए।'}</h1>
        <p>
          {editorial
            ? 'An independent workspace for reporting, editing and publishing.'
            : 'Your account and your next good read, in one place.'}
        </p>
        <a href="/" className="text-link">
          Back to the front page
        </a>
      </div>
      <div className="auth-form-panel">
        <LockKeyhole size={22} aria-hidden="true" />
        <p className="eyebrow">{editorial ? 'EDITORIAL ACCESS' : 'READER ACCOUNT'}</p>
        <h2>{signup ? 'Create your account' : 'Welcome back.'}</h2>
        <p>
          {editorial
            ? 'Use the account provided by your administrator.'
            : signup
              ? 'Create a free subscriber account.'
              : 'Sign in to your UP24Network account.'}
        </p>
        <form onSubmit={submit} className="cms-form">
          {signup && (
            <label>
              Your name
              <input name="displayName" autoComplete="name" required maxLength={100} />
            </label>
          )}
          <label>
            Email address
            <input name="email" type="email" autoComplete="username" required maxLength={254} />
          </label>
          <label>
            Password
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
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {signup && (
            <p className="field-help">
              Use at least 12 characters. Subscriber accounts do not have editorial access.
            </p>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy} type="submit" className="auth-submit">
            {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        {!editorial && (
          <Link className="text-button" href={signup ? '/account/sign-in' : '/account/register'}>
            {signup ? 'Already registered? Sign in' : 'New here? Create an account'}
          </Link>
        )}
        <p className="auth-help">
          Need help with access? <Link href="/contact">Contact the newsroom</Link>.
        </p>
      </div>
    </section>
  );
}
