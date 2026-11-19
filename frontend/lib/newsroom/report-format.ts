import { articleSubheading } from '@/lib/article-prose';

const summarySentences = new Intl.Segmenter(['hi', 'en'], { granularity: 'sentence' });

export function openingSummary(body: string) {
  const opening = body
    .trim()
    .split(/\n\s*\n/u)
    .find((paragraph) => !articleSubheading(paragraph));
  const paragraph = (opening ?? '').replace(/\s+/gu, ' ');
  let summary = '';
  for (const { segment } of summarySentences.segment(paragraph)) {
    const next = `${summary} ${segment}`.trim();
    if (next.length > 320) break;
    summary = next;
  }
  if (summary) return summary;
  if (paragraph.length <= 320) return paragraph;
  const limit = paragraph.lastIndexOf(' ', 319);
  return `${paragraph.slice(0, limit > 0 ? limit : 319).trimEnd()}…`;
}

export function reportTopics(lines: string) {
  const topics = new Map<string, string>();
  for (const line of lines.split('\n')) {
    const tag = line.trim().normalize('NFC').replace(/\s+/gu, ' ');
    if (tag && !topics.has(tag.toLowerCase())) topics.set(tag.toLowerCase(), tag);
  }
  return [...topics.values()];
}

export function reportWordCount(text: string) {
  return text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)?.length ?? 0;
}
