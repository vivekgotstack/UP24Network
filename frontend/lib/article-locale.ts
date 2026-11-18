import type { Article } from '@/lib/articles';
import type { SiteLocale } from '@/lib/locale';
import { textLanguage } from '@/lib/language';

const hindiSentences = new Intl.Segmenter('hi', { granularity: 'sentence' });
const sentenceStop = /([\u0900-\u097e\p{N}])\.(?=[”’"')\]]*\s*$)/u;
const singleWordOrAbbreviation = /(?:^|\s)(?:डॉ|प्रो|श्री|सुश्री|सं|क्र)\.[)"”’]*\s*$/u;

function prose(text: string) {
  if (textLanguage(text) !== 'hi' || !text.includes('.')) return text;
  return Array.from(hindiSentences.segment(text), ({ segment }) =>
    segment.trim().includes(' ') && !singleWordOrAbbreviation.test(segment)
      ? segment.replace(sentenceStop, '$1।')
      : segment,
  ).join('');
}

/** Select editorial copy without changing the article's identity or URL. */
export function localizeArticle(article: Article, locale: SiteLocale): Article {
  const translation = article.english;
  if (locale === 'en' && translation && (!article.paragraphs.length || translation.paragraphs.length)) {
    return {
      ...article,
      title: translation.title,
      summary: translation.summary,
      paragraphs: translation.paragraphs,
      imageAlt: translation.imageAlt || article.imageAlt,
    };
  }
  return { ...article, summary: prose(article.summary), paragraphs: article.paragraphs.map(prose) };
}
