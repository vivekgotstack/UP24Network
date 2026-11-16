import { publicationMetadata } from '@/lib/publication-api';
import { PublicationDocument } from '@/components/publication-document';
import { publicationDocuments } from '@/lib/publication';
import { CookiePreferences } from '@/components/cookie-consent';

const document = publicationDocuments.cookies;
export async function generateMetadata() { return publicationMetadata(document); }
export default function CookiesPage() {
  return <><PublicationDocument document={document} /><div className="container" style={{ paddingBlock: 24 }}><CookiePreferences>अपनी कुकी पसंद बदलें</CookiePreferences></div></>;
}
