import { publicationMetadata } from '@/lib/publication-api';
import { PublicationDocument } from '@/components/publication-document';
import { publicationDocuments } from '@/lib/publication';

const document = publicationDocuments.cookies;
export async function generateMetadata() {
  return publicationMetadata(document);
}
export default function CookiesPage() {
  return <PublicationDocument document={document} />;
}
