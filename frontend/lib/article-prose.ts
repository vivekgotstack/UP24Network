export function articleSubheading(paragraph: string) {
  return /^##[ \t]+([^\r\n]+)$/u.exec(paragraph.trim())?.[1].trim() || null;
}
