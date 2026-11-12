import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';
import Link from 'next/link';
export const metadata: Metadata = {
  title: 'Editorial standards',
  alternates: { canonical: '/editorial-policy' },
};
export default function Standards() {
  return (
    <InformationPage title="Standards behind the story." eyebrow="EDITORIAL STANDARDS">
      <p className="information-intro">
        Accuracy, context and a clear distinction between reporting and opinion.
      </p>
      <h2>Verification</h2>
      <p>
        Reports should distinguish confirmed facts from allegations, give relevant context and
        identify uncertainty. Headlines and photographs should accurately represent the report.
      </p>
      <h2>Fairness and independence</h2>
      <p>
        Coverage should consider relevant perspectives. Political coverage is reporting, not an
        endorsement. Opinion, sponsored content and editorial illustration should be labelled
        clearly.
      </p>
      <h2>Images and video</h2>
      <p>
        Media should be relevant to the story. Illustrative or archive material should be identified
        where it could otherwise mislead. Personal privacy and the dignity of people in difficult
        situations deserve care.
      </p>
      <h2>Corrections</h2>
      <p>
        Readers can flag a possible error through the{' '}
        <Link href="/contact">official contact channels</Link>. A correction should explain any
        material change to the meaning of a published report.
      </p>
      <h2>Daily features</h2>
      <p>
        Daily features should carry the correct edition date. Rashifal is traditional guidance and
        is not a substitute for professional advice.
      </p>
    </InformationPage>
  );
}
