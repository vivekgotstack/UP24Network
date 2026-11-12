import type { Metadata } from 'next';
import { InformationPage } from '@/components/information-page';
import { brand } from '@/lib/brand';
export const metadata: Metadata = {
  title: 'Contact & corrections',
  alternates: { canonical: '/contact' },
};
export default function Contact() {
  return (
    <InformationPage title="Talk to the newsroom." eyebrow="CONTACT & CORRECTIONS">
      <p className="information-intro">A story tip, a question or a correction.</p>
      <p>
        Reach UP24Network through the official channels below. For a correction, include the article
        address, the statement in question and any supporting information. Avoid sharing private
        documents in public comments.
      </p>
      <div className="contact-channels">
        {brand.socials.map((social) => (
          <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer">
            <strong>{social.name}</strong>
            <span>Official UP24Network channel</span>
          </a>
        ))}
      </div>
      <h2>News tips</h2>
      <p>
        Tell us what happened, where and when. Include a way for the newsroom to follow up when you
        contact us privately.
      </p>
      <h2>Editorial access</h2>
      <p>
        Staff accounts are managed by a newsroom administrator. Reader registration does not grant
        access to publishing tools.
      </p>
    </InformationPage>
  );
}
