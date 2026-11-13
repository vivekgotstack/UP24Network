import type { Metadata } from 'next';
import { requireNewsroomSession } from '@/lib/newsroom/server-session';
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireNewsroomSession('staff');
  return children;
}
