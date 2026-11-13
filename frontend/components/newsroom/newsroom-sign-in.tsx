'use client';

import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cms, type Account } from '@/lib/cms';
import { newsroomAuth, type CodeDelivery } from '@/lib/newsroom/auth';

export function NewsroomSignIn({
  account,
  onAuthenticated,
  signInPath,
}: {
  account: Account | null | undefined;
  onAuthenticated: (account: Account) => Promise<unknown>;
  signInPath: string;
}) {
  const [staff, setStaff] = useState<Account | null>(null);
  const current = staff ?? (account?.newsroomEligible ? account : null);
  const [delivery, setDelivery] = useState<CodeDelivery | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!delivery) return;
    codeInput.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [delivery]);
  const resendSeconds = delivery
    ? Math.max(0, Math.ceil((Date.parse(delivery.resendAt) - now) / 1000))
    : 0;
  const expired = Boolean(delivery && now >= Date.parse(delivery.expiresAt));

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in could not be completed.');
    } finally {
      setBusy(false);
    }
  }
  async function sendCode() {
    const next = await newsroomAuth.sendCode();
    setNow(Date.now());
    setDelivery(next);
    setCode('');
  }
  return (
    <section className="auth-layout">
      <div className="auth-brand-panel">
        <Link href="/" className="brand-badge" aria-label="UP24Network home">
          <BrandLogo eager />
        </Link>
        <p className="eyebrow">PRIVATE NEWSROOM</p>
        <h1 lang="hi">
          हर खबर के पीछे,
          <br />
          एक जिम्मेदारी।
        </h1>
        <p>A private workspace for the UP24Network editorial team.</p>
        <Link href="/" className="text-link">
          Back to the front page
        </Link>
      </div>
      <div className="auth-form-panel">
        <LockKeyhole size={22} aria-hidden="true" />
        <p className="eyebrow">{current ? 'EMAIL VERIFICATION' : 'STAFF SIGN IN'}</p>
        <h2>{current ? 'Confirm it’s you.' : 'Welcome back.'}</h2>
        {current ? (
          <>
            <p>
              {delivery
                ? `Enter the six-digit code sent to ${current.email}.`
                : `Send a sign-in code to ${current.email}.`}
            </p>
            {delivery && (
              <form
                className="cms-form"
                aria-busy={busy}
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform(async () => {
                    const verified = await newsroomAuth.verify(code);
                    if (!verified.newsroomAccess)
                      throw new Error('This account has no newsroom access.');
                    await onAuthenticated(verified);
                  });
                }}
              >
                <label>
                  Sign-in code
                  <input
                    ref={codeInput}
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    required
                    value={code}
                    disabled={busy || expired}
                    aria-describedby="code-help"
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </label>
                <p className="field-help" id="code-help" role="status">
                  {expired
                    ? 'This code has expired. Request a new one.'
                    : 'Valid for five minutes. Only the newest code will work.'}
                </p>
                <Button type="submit" disabled={busy || expired || code.length !== 6}>
                  {busy ? 'Verifying…' : 'Open newsroom'}
                </Button>
              </form>
            )}
            <Button
              type="button"
              variant={delivery ? 'outline' : 'default'}
              disabled={busy || resendSeconds > 0}
              onClick={() => void perform(sendCode)}
            >
              {busy && !delivery
                ? 'Sending code…'
                : resendSeconds > 0
                  ? `Resend in ${resendSeconds}s`
                  : delivery
                    ? 'Send a new code'
                    : 'Send sign-in code'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  await cms('auth/logout', 'POST');
                  setStaff(null);
                  setDelivery(null);
                  window.location.assign(signInPath);
                })
              }
            >
              Use another account
            </Button>
          </>
        ) : (
          <>
            <p>Sign in with your staff account, then confirm the code sent to your email.</p>
            <form
              className="cms-form"
              aria-busy={busy}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void perform(async () => {
                  const signedIn = await newsroomAuth.signIn(
                    String(data.get('email')).trim().toLowerCase(),
                    String(data.get('password')),
                  );
                  if (!signedIn.newsroomEligible)
                    throw new Error('This account has no newsroom access.');
                  setStaff(signedIn);
                  await sendCode();
                });
              }}
            >
              <fieldset className="editor-fields" disabled={busy}>
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    maxLength={254}
                    required
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    maxLength={72}
                    required
                  />
                </label>
                <Button type="submit">{busy ? 'Signing in…' : 'Continue'}</Button>
              </fieldset>
            </form>
          </>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <p className="auth-help">Staff access is assigned by the publication owner.</p>
      </div>
    </section>
  );
}
