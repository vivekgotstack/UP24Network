import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
export const metadata: Metadata = {
  title: 'Trash & archive',
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AdminConsole section="trash" />;
}
