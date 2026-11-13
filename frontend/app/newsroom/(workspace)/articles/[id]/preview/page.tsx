import { AdminConsole } from '@/components/admin-console';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminConsole workspace="staff" section="preview" articleId={id} />;
}
