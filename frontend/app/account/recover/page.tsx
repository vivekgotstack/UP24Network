import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { PasswordRecoveryPanel } from '@/components/password-recovery-panel';

export const metadata: Metadata = {
  title: 'Recover your account',
  robots: { index: false, follow: false },
};
export default function RecoverAccount() {
  return <><SiteHeader compact /><main id="main-content" lang="en"><PasswordRecoveryPanel /></main></>;
}
