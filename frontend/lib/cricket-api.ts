import 'server-only';

type Team = { name: string; code: string; score: string | null };

export type CricketScores = {
  updatedAt: string | null;
  matches: {
    id: string;
    status: string;
    note: string | null;
    live: boolean;
    home: Team;
    away: Team;
  }[];
};

export async function getCricketScores(): Promise<CricketScores> {
  const backend = process.env.NEWS_API_URL ?? 'http://127.0.0.1:8080';
  try {
    const response = await fetch(`${backend}/api/cricket/scores`, {
      next: { revalidate: 60, tags: ['cricket-scores'] },
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) return await response.json();
  } catch {
    // The scoreboard should never prevent readers from opening the homepage.
  }
  return { updatedAt: null, matches: [] };
}
