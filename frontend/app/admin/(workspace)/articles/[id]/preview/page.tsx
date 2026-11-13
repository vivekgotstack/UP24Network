import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
export const metadata: Metadata = {
  title: 'Article preview',
  robots: { index: false, follow: false },
};
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  return <AdminConsole section="preview" articleId={(await params).id} />;
}
