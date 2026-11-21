import { publicationMetadata } from '@/lib/publication-api';
import { PublicationDocument } from '@/components/publication-document';
import { publicationDocuments } from '@/lib/publication';
import { getArticle } from '@/lib/articles';
import { localizeArticle } from '@/lib/article-locale';
import { getReaderLocale } from '@/lib/reader-locale';

const document = publicationDocuments.corrections;
export async function generateMetadata() {
  return publicationMetadata(document);
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ story?: string }>;
}) {
  const { story } = await searchParams;
  if (typeof story !== 'string' || !/^[\p{L}\p{M}\p{N}_-]{1,500}$/u.test(story)) {
    return <PublicationDocument document={document} />;
  }

  const [article, locale] = await Promise.all([
    getArticle(story).catch(() => undefined),
    getReaderLocale(),
  ]);
  const reference = article && {
    title: localizeArticle(article, locale).title,
    url: new URL(
      `/news/${encodeURIComponent(article.slug)}`,
      process.env.SITE_URL ?? 'http://127.0.0.1:3000',
    ).href,
  };
  return <PublicationDocument document={document} reference={reference} />;
}
