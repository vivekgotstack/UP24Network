import { requireNewsroomSession } from '@/lib/newsroom/server-session';
export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  await requireNewsroomSession(true);
  return children;
}
