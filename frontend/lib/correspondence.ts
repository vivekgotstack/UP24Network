export const correspondenceTopics = {
  GENERAL: 'General enquiry',
  TIP: 'News tip',
  CORRECTION: 'Correction request',
  COMPLAINT: 'Editorial complaint',
  PRIVACY: 'Privacy request',
  ADVERTISING: 'Advertising enquiry',
} as const;

export type CorrespondenceTopic = keyof typeof correspondenceTopics;
