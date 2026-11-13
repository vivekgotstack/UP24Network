import { requireNewsroomSession } from '@/lib/newsroom/server-session';
export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  await requireNewsroomSession('admin');
  return children;
}
