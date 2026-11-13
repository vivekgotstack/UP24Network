import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
export const metadata: Metadata = {
  title: 'Edit article',
  robots: { index: false, follow: false },
};
export default async function Editor({ params }: { params: Promise<{ id: string }> }) {
  return <AdminConsole section="editor" articleId={(await params).id} />;
}
