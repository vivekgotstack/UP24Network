import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } };
export default function AccountPage() { return <AdminConsole reader />; }
