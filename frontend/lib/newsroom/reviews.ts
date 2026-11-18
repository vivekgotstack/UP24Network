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
  reviewDay: string;
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

export type ReviewBatch = {
  contributorId: string;
  contributor: string;
  day: string;
  pendingCount: number;
  approvedCount: number;
  returnedCount: number;
  ready: boolean;
  closedAt: string | null;
  rewardedCount: number;
  rewardedAt: string | null;
  rewardNote: string | null;
};
export type ReviewBatchQueue = { items: ReviewBatch[]; hasNext: boolean };
export type ReviewBatchDetail = { batch: ReviewBatch; items: Review[] };

const queue = 'admin/article-reviews';
const staffPath = (id: string) => `admin/articles/${id}/review`;
const detailPath = (id: string) => `${queue}/${id}`;
const batchPath = (contributor: string, day: string) => `${queue}/batches/${contributor}/${day}`;

export const articleReviews = {
  staffPath,
  detailPath,
  queuePath: (page: number, state: ReviewState) => `${queue}?page=${page}&state=${state}`,
  submit: (id: string, request: ReviewSubmission) => cms<Review>(staffPath(id), 'POST', request),
  batchesPath: (page: number) => `${queue}/batches?page=${page}`,
  batchPath,
  approveBatch: (contributor: string, day: string, ids: string[]) =>
    cms<{ count: number }>(`${batchPath(contributor, day)}/approve`, 'POST', { ids }),
  recordReward: (contributor: string, day: string, note: string) =>
    cms<ReviewBatch>(`${batchPath(contributor, day)}/reward`, 'POST', { note }),
  returnForChanges: (id: string, note: string) =>
    cms<Review>(`${detailPath(id)}/return`, 'POST', { note }),
};
