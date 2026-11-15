import { publicationMetadata } from '@/lib/publication-api';
import { PublicationDocument } from '@/components/publication-document';
import { publicationDocuments } from '@/lib/publication';

const document = publicationDocuments.advertising;
export async function generateMetadata() {
  return publicationMetadata(document);
}
export default function Page() {
  return <PublicationDocument document={document} />;
}
