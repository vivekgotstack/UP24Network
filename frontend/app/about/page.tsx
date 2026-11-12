import type { Metadata } from 'next';
import Link from 'next/link';
import { InformationPage } from '@/components/information-page';
export const metadata: Metadata = {
  title: 'About the publication',
  alternates: { canonical: '/about' },
};
export default function About() {
  return (
    <InformationPage title="The publication." eyebrow="ABOUT UP24Network">
      <p className="information-intro">News from Uttar Pradesh. A wider view of India.</p>
      <p>
        UP24Network brings together regional reporting, national news and video coverage. This
        website gives each report a clear home, from politics and public affairs to education,
        culture and everyday life.
      </p>
      <h2>Read. Watch. Understand.</h2>
      <p>
        Browse the latest reports in publication order, explore a news section, or watch video
        reporting from our official channel. Save a report when you want to return to it.
      </p>
      <h2>Stay connected</h2>
      <p>
        Our official social channels and contact information are listed on the{' '}
        <Link href="/contact">contact and corrections page</Link>.
      </p>
      <p>
        <Link href="/editorial-policy">Read our editorial standards</Link>
      </p>
    </InformationPage>
  );
}
