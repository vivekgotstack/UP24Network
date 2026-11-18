export const trendingReelsCategory = 'Trending Reels';

/** Accept public Reel addresses and remove link-sharing parameters. */
export function canonicalReelUrl(input?: string | null): string | null {
  const match =
    /^https:\/\/(?:www\.)?instagram\.com\/(reel)\/([a-z0-9_-]{1,64})\/?(?:[?#]\S*)?$/i.exec(
      input?.trim() ?? '',
    );
  return match?.[1] === 'reel' ? `https://www.instagram.com/reel/${match[2]}/` : null;
}
