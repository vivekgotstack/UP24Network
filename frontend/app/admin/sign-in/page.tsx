import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
export const metadata: Metadata = {
  title: 'Newsroom sign in',
  robots: { index: false, follow: false },
};
export default function SignIn() {
  return <AuthPage editorial />;
}
