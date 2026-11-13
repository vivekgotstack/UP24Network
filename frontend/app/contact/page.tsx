import type { Metadata } from 'next';
import { PublicationDocument } from '@/components/publication-document';
import { publicationDocuments } from '@/lib/publication';

const document = publicationDocuments.contact;
export const metadata: Metadata = {
  title: document.title,
  description: document.description,
  alternates: { canonical: document.path },
};
export default function Page() {
  return <PublicationDocument document={document} />;
}
