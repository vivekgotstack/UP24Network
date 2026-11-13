import type { Metadata } from 'next';
import { requireNewsroomSession } from '@/lib/newsroom/server-session';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireNewsroomSession();
  return children;
}
