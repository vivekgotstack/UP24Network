import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
export const metadata: Metadata = {
  title: 'Team and readers',
  robots: { index: false, follow: false },
};
export default function Accounts() {
  return <AdminConsole section="accounts" />;
}
