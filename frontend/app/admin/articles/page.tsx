import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
export const metadata: Metadata = {
  title: 'Article desk',
  robots: { index: false, follow: false },
};
export default function Articles() {
  return <AdminConsole section="articles" />;
}
