import { PublicationPagesPanel } from '@/components/newsroom/publication-pages';

export const metadata = { title: 'Publication pages', robots: { index: false, follow: false } };
export default function PagesPage() {
  return <PublicationPagesPanel />;
}
