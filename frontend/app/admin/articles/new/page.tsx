import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
export const metadata: Metadata = {
  title: 'Create a draft',
  robots: { index: false, follow: false },
};
export default function NewArticle() {
  return <AdminConsole section="editor" />;
}
