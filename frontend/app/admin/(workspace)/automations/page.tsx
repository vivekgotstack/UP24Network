import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
export const metadata: Metadata = {
  title: 'Automation controls',
  robots: { index: false, follow: false },
};
export default function Automations() {
  return <AdminConsole section="automations" />;
}
