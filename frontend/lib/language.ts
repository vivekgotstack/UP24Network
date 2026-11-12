/** Mark the content language without changing the language of English controls. */
export function textLanguage(text: string): 'hi' | 'en' {
  return /[\u0900-\u097f]/u.test(text) ? 'hi' : 'en';
}
