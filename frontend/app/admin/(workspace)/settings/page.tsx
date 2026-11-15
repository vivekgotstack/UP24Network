import { PublicationSettingsPanel } from '@/components/newsroom/publication-settings';

export const metadata = { title: 'Publication settings', robots: { index: false, follow: false } };
export default function SettingsPage() {
  return <PublicationSettingsPanel />;
}
