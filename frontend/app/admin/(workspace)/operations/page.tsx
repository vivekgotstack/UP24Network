import type { Metadata } from 'next';
import { OperationsPanel } from '@/components/newsroom/operations-panel';

export const metadata: Metadata = { title: 'Operations', robots: { index: false, follow: false } };
export default function OperationsPage() {
  return <OperationsPanel />;
}
