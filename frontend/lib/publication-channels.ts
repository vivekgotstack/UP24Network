import 'server-only';

const networks = [
  ['YouTube', 'YOUTUBE_CHANNEL_URL', ['youtube.com', 'www.youtube.com']],
  ['Facebook', 'FACEBOOK_PAGE_URL', ['facebook.com', 'www.facebook.com']],
  ['Instagram', 'INSTAGRAM_PROFILE_URL', ['instagram.com', 'www.instagram.com']],
  ['X (Twitter)', 'X_PROFILE_URL', ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']],
] as const;

export type SocialName = (typeof networks)[number][0];

export function getPublicationChannels() {
  return networks.flatMap(([name, key, hosts]) => {
    const value = process.env[key]?.trim();
    if (!value) return [];
    try {
      const url = new URL(value);
      if (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.port &&
        url.pathname !== '/' &&
        hosts.some((host) => host === url.hostname)
      ) {
        return [{ name, url: url.href }];
      }
    } catch {
      // Ignore invalid profile configuration so the public pages still render.
    }
    return [];
  });
}
