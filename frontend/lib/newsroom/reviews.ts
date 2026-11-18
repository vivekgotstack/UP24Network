import { cms } from '@/lib/cms';
import type { ManagedArticle, SaveArticle } from '@/lib/newsroom/types';

export type ReviewState = 'PENDING' | 'APPROVED' | 'RETURNED';

export type Review = {
  id: string;
  articleId: string;
  articleVersion: number;
  kind: 'PUBLISH' | 'UPDATE';
  state: ReviewState;
  title: string;
  submittedBy: string;
  submittedAt: string;
  changeSummary: string;
  verificationNotes: string;
  decisionNote?: string | null;
  decidedAt?: string | null;
};

export type ReviewSubmission = {
  articleVersion: number;
  input: SaveArticle;
  changeSummary: string;
  verificationNotes: string;
  checks: { factsVerified: boolean; rightsVerified: boolean; standardsVerified: boolean };
};

export type ReviewHistory = { reviews: Review[]; latestInput?: SaveArticle | null };
export type ReviewQueue = { items: Review[]; hasNext: boolean };
export type ReviewDetail = Review & { input: SaveArticle; current: ManagedArticle | null };

const queue = 'admin/article-reviews';
const staffPath = (id: string) => `admin/articles/${id}/review`;
const detailPath = (id: string) => `${queue}/${id}`;

export const articleReviews = {
  staffPath,
  detailPath,
  queuePath: (page: number, state: ReviewState) => `${queue}?page=${page}&state=${state}`,
  submit: (id: string, request: ReviewSubmission) => cms<Review>(staffPath(id), 'POST', request),
  approve: (id: string) => cms<Review>(`${detailPath(id)}/approve`, 'POST', {}),
  returnForChanges: (id: string, note: string) =>
    cms<Review>(`${detailPath(id)}/return`, 'POST', { note }),
};
