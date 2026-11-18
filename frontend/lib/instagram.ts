export const trendingReelsCategory = 'Trending Reels';

/** Accept public Reel addresses and remove link-sharing parameters. */
export function canonicalReelUrl(input?: string | null): string | null {
  const match = /^https:\/\/(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)\/?(?:[?#]\S*)?$/i.exec(
    input?.trim() ?? '',
  );
  return match ? `https://www.instagram.com/reel/${match[1]}/` : null;
}
