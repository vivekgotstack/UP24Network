import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';
export const metadata: Metadata = { title: 'Privacy', alternates: { canonical: '/privacy' } };
export default function Privacy() {
  return (
    <InformationPage title="Your reading, your choices." eyebrow="PRIVACY">
      <p className="information-intro">
        How the current website handles account and reading information.
      </p>
      <h2>Accounts</h2>
      <p>
        Registration uses your name, email address and password. Sign-in uses a session cookie to
        keep your account authenticated. Access to newsroom tools depends on the role assigned by an
        administrator.
      </p>
      <h2>Saved stories</h2>
      <p>
        Saved article addresses and titles are stored in this browser's local storage. They are not
        synced to your account or across devices. Removing a saved story, or clearing this site's
        browser data, removes that local entry.
      </p>
      <h2>Video and external links</h2>
      <p>
        Opening a YouTube player connects to YouTube's privacy-enhanced player. Following a
        social-channel link takes you to that service, where its privacy practices apply. External
        video services may process your network and device information.
      </p>
      <h2>Questions</h2>
      <p>
        Use the verified channels on the contact page for questions about the website. This page
        should be reviewed before a production launch as hosting, analytics or other services are
        added.
      </p>
    </InformationPage>
  );
}
