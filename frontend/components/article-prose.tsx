import { articleSubheading } from '@/lib/article-prose';
import { textLanguage } from '@/lib/language';

export function ArticleProse({
  paragraphs,
  heading: Heading = 'h2',
}: {
  paragraphs: readonly string[];
  heading?: 'h2' | 'h3' | 'h4';
}) {
  return paragraphs.map((paragraph, index) => {
    const subheading = articleSubheading(paragraph);
    return subheading ? (
      <Heading key={index} className="article-subheading" lang={textLanguage(subheading)}>
        {subheading}
      </Heading>
    ) : (
      <p key={index} lang={textLanguage(paragraph)}>
        {paragraph}
      </p>
    );
  });
}
