import { requireNewsroomSession } from '@/lib/newsroom/server-session';
export default async function AutomationsLayout({ children }: { children: React.ReactNode }) {
  await requireNewsroomSession(true);
  return children;
}
