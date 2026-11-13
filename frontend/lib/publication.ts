export type PublicationSection = {
  id: string;
  title: string;
  paragraphs: string[];
  points?: string[];
  links?: { href: string; label: string }[];
};
export type PublicationDocument = {
  path: string;
  label: string;
  title: string;
  description: string;
  intro: string;
  sections: PublicationSection[];
};

export const publicationDocuments = {
  about: {
    path: '/about',
    label: 'About',
    title: 'About UP24Network',
    description: 'Our publication, coverage and responsibility to readers.',
    intro:
      'Uttar Pradesh is at the centre of our reporting. India and the wider world provide its context.',
    sections: [
      {
        id: 'publication',
        title: 'The publication',
        paragraphs: [
          'UP24Network is a Hindi news publication covering Uttar Pradesh, national affairs and the developments that shape everyday life. We publish written reports and video coverage, bringing regional stories into the same reading space as politics, public policy, business, education, sport and culture.',
          'Our editorial purpose is to make a report useful: explain what happened, identify what is known, place the development in context and make clear why it matters to the people affected. Speed matters in news, but it does not replace accuracy or responsibility.',
        ],
      },
      {
        id: 'coverage',
        title: 'What we cover',
        paragraphs: [
          'Our coverage follows public affairs alongside the practical concerns of communities: local administration, public services, education and careers, economic life, health, the environment and culture. Regional reporting is presented with the place and context needed to understand a story beyond its headline.',
          'Video reports and written articles complement one another. When a report includes video, readers can watch it within the story. Sections and publication dates help readers distinguish a new development from an earlier report or a daily feature.',
        ],
      },
      {
        id: 'responsibility',
        title: 'Our responsibility to readers',
        paragraphs: [
          'Reporting, opinion, analysis and commercial material serve different purposes. Our editorial policy sets out how those distinctions should be maintained, how sources and images are assessed, and how sensitive reporting is handled.',
          'Readers are part of that accountability. A factual challenge, a missing perspective or a concern about privacy deserves a considered review. Our corrections and complaints policies explain what to send and how the publication evaluates an issue.',
        ],
        links: [
          { href: '/editorial-policy', label: 'Editorial standards' },
          { href: '/corrections', label: 'Corrections policy' },
        ],
      },
      {
        id: 'reading',
        title: 'Read and stay connected',
        paragraphs: [
          'The latest news page lists recent reports, while topic sections provide a more focused way to follow coverage. Saved stories remain in the browser where they were saved, allowing readers to return to an article without creating a public profile.',
          'UP24Network’s official social channels are listed on the contact page. For a news tip, correction, interview request or commercial enquiry, use the relevant guidance there so that your message reaches the appropriate person.',
        ],
        links: [
          { href: '/contact', label: 'Contact UP24Network' },
          { href: '/ownership', label: 'Publication and ownership' },
        ],
      },
    ],
  },
  contact: {
    path: '/contact',
    label: 'Contact',
    title: 'Contact UP24Network',
    description: 'News tips, corrections, reader enquiries and commercial contact.',
    intro:
      'A useful conversation starts with the right details. Choose the subject of your enquiry and include the information our team needs to respond.',
    sections: [
      {
        id: 'news-tips',
        title: 'News tips and story suggestions',
        paragraphs: [
          'Tell us what happened, where it happened and when. Explain how you know about the event and why it deserves public attention. First-hand information, original records and a clear chronology are more useful than an unexplained forwarded message.',
          'When sharing a photograph or video, tell us who recorded it, the location and date, whether it has been edited, and whether you have permission to share it. Keep the original file and surrounding context available for follow-up. Sending material does not guarantee publication.',
        ],
        points: [
          'Give the location, date and a short account of the event.',
          'Identify public records or other evidence that can be checked.',
          'Include a private reply method if you would like the team to follow up.',
        ],
      },
      {
        id: 'corrections',
        title: 'Report an error or request a response',
        paragraphs: [
          'For a factual correction, provide the article or video address, the exact statement you are challenging and the evidence supporting your position. If an article concerns you or an organisation you represent, identify that relationship and explain the response or additional context you want considered.',
          'A disagreement with the subject of a report is different from an error in the report. Both may be raised, but separating factual questions from opinion helps the editor assess the request fairly.',
        ],
        links: [
          { href: '/corrections', label: 'How corrections are reviewed' },
          { href: '/complaints', label: 'Complaints and grievances' },
        ],
      },
      {
        id: 'enquiries',
        title: 'Interviews, permissions and business enquiries',
        paragraphs: [
          'For an interview or event invitation, include the organisation, proposed subject, location, date and a contact person. Invitations and press releases are assessed on editorial relevance; they do not create a commitment to publish.',
          'For reproduction rights, identify the material, intended use, territory and format. For advertising or a commercial proposal, describe the business and the placement being requested. Commercial discussions do not determine independent editorial coverage.',
        ],
        links: [
          { href: '/advertising', label: 'Advertising and commercial policy' },
          { href: '/terms', label: 'Use of our content' },
        ],
      },
      {
        id: 'channels',
        title: 'Official contact channels',
        paragraphs: [
          'Use the official UP24Network profiles listed below to reach the publication through their available contact or private messaging options. Include the subject of your enquiry at the start of your message.',
          'Keep sensitive personal information out of public comments. Do not send passwords, sign-in codes, financial credentials or identity documents as part of a routine news tip. If your enquiry involves sensitive evidence, begin with a short description and discuss an appropriate way to share it.',
        ],
      },
    ],
  },
  editorial: {
    path: '/editorial-policy',
    label: 'Editorial standards',
    title: 'Editorial standards',
    description:
      'The principles governing our reporting, editing, images and publication decisions.',
    intro:
      'Accuracy, fairness and editorial responsibility guide what we publish and how we respond when a report needs to change.',
    sections: [
      {
        id: 'accuracy',
        title: 'Accuracy and verification',
        paragraphs: [
          'A report must be supported by evidence appropriate to its subject. Names, dates, places, figures and quotations require careful checking. A headline, caption or social post must represent the substance of the report rather than exaggerate it.',
          'An allegation remains an allegation until the evidence establishes otherwise. Reporting must distinguish a statement by a source from an independently established fact. Uncertainty, limitations and important missing information belong in the reporting when they affect its meaning.',
        ],
      },
      {
        id: 'sources',
        title: 'Sources, attribution and original work',
        paragraphs: [
          'Editors assess a source’s proximity to events, knowledge, potential interests and supporting evidence. Documents, official statements and public records are checked for authenticity and context. A social-media post or forwarded clip is a starting point for verification, rather than proof on its own.',
          'Quotations must preserve the speaker’s meaning. Translation should convey substance accurately. Material from other publishers must not be presented as our original reporting. Confidentiality is considered case by case; an agreement to protect a source must be understood before information is supplied.',
        ],
      },
      {
        id: 'fairness',
        title: 'Fairness, response and independence',
        paragraphs: [
          'A person or organisation facing a significant allegation should have a meaningful opportunity to respond before publication when circumstances allow. Relevant responses must be represented fairly. If an important response arrives later, the report should be reconsidered in light of it.',
          'Editorial decisions belong to the publication’s editorial process. Personal relationships, gifts, outside interests and commercial arrangements must not improperly influence coverage. Staff should disclose conflicts to the responsible editor and step back from a decision where necessary.',
        ],
      },
      {
        id: 'sensitive-reporting',
        title: 'Privacy, dignity and sensitive reporting',
        paragraphs: [
          'The public interest in a story must be weighed against foreseeable harm. Reporting about children, survivors of sexual violence, medical circumstances, bereavement and people at risk requires particular care. Identifying information should not be published merely because it is available online.',
          'Crime and court coverage must respect the distinction between an accusation and a finding. Reports should avoid language that assumes guilt, promotes hostility towards a community or exposes a protected person’s identity. Graphic material requires a clear editorial reason and proportionate presentation.',
        ],
      },
      {
        id: 'visuals',
        title: 'Photographs, video and illustrations',
        paragraphs: [
          'Images and video must be relevant, accurately described and used with the appropriate rights. Archive footage, representational images and editorial illustrations should be identified when readers might mistake them for a direct record of the event.',
          'Editing must not materially misrepresent what happened. An artificial or reconstructed visual must not be presented as documentary evidence. Captions, thumbnails and cropped images are subject to the same accuracy standard as the report itself.',
        ],
      },
      {
        id: 'formats',
        title: 'Opinion, commercial material and assisted publishing',
        paragraphs: [
          'Opinion and analysis must be recognisable as such. Paid placements and sponsored material must be distinguishable from independent reporting. Advertising must not purchase a favourable news decision or suppress a legitimate correction.',
          'Tools may assist research, transcription, translation and presentation, but responsibility remains with the publication. Automated material must come from an approved source, carry the appropriate date and be open to editorial review. Synthetic quotations, invented sources and fabricated events have no place in a news report.',
        ],
      },
      {
        id: 'accountability',
        title: 'Corrections and accountability',
        paragraphs: [
          'A material error should be corrected clearly and promptly after review. Updates that add new information should be distinguished from changes that correct an earlier statement. Removing a report is an exceptional decision requiring an assessment of accuracy, privacy, safety and the public record.',
          'Readers can challenge a report through the contact and complaints process. Our corrections policy explains the information to provide and the forms a correction may take.',
        ],
        links: [
          { href: '/corrections', label: 'Corrections policy' },
          { href: '/complaints', label: 'Raise an editorial concern' },
        ],
      },
    ],
  },
  corrections: {
    path: '/corrections',
    label: 'Corrections',
    title: 'Corrections and updates',
    description:
      'How to flag a factual error, provide new evidence or request a right of response.',
    intro:
      'A publication’s responsibility continues after a story appears. The public record should reflect a correction when a material fact is wrong.',
    sections: [
      {
        id: 'submit',
        title: 'Submitting a correction request',
        paragraphs: [
          'Send the address of the article or video, its publication date if known, and the exact passage or claim you believe is inaccurate. State the proposed correction and provide records or other evidence that can be checked.',
          'If you are writing on behalf of another person or organisation, identify that relationship. Include a way to contact you privately for clarification. A clear, specific request is easier to assess than a general allegation that a report is unfair.',
        ],
        links: [{ href: '/contact', label: 'Contact the publication' }],
      },
      {
        id: 'review',
        title: 'How a request is reviewed',
        paragraphs: [
          'The responsible editor reviews the published material against the evidence, source notes and any response from the reporter. Where a challenge introduces new facts, further verification may be needed. Publication pressure or the prominence of a source does not determine the outcome.',
          'The review considers whether a statement is factually wrong, lacks important context, creates a misleading impression or reflects a reasonable difference of opinion. A request may result in a correction, a clarification, an update, a response being added or a reasoned decision to retain the report.',
        ],
      },
      {
        id: 'changes',
        title: 'Corrections, clarifications and updates',
        paragraphs: [
          'A material correction should explain what was wrong and what has changed, with the date of the correction. A clarification explains wording or context without disguising a factual error. An update adds a development that occurred after publication.',
          'Minor spelling, punctuation or formatting changes that do not alter meaning may be made without a correction note. A substantial change to a headline, image, quotation or central fact warrants a visible explanation when it affects how readers understand the original report.',
        ],
      },
      {
        id: 'removal',
        title: 'Removal and sensitive information',
        paragraphs: [
          'A request to remove an article is assessed against accuracy, public interest, privacy, safety and applicable legal obligations. Removal is not the usual response to an accurate report becoming inconvenient. Narrower measures, such as correcting a statement or reducing unnecessary identifying detail, may be more appropriate.',
          'If a concern involves a child, a protected identity or an immediate risk to a person, explain that clearly and identify the relevant passage. Share only the information needed to assess the issue.',
        ],
      },
      {
        id: 'follow-up',
        title: 'If you disagree with the outcome',
        paragraphs: [
          'You may request a further editorial review by explaining the unresolved factual issue and identifying evidence that has not been considered. Repeating the same request without additional information may not change the outcome. Legal notices and formal privacy complaints should be identified as such.',
        ],
        links: [{ href: '/complaints', label: 'Complaints and grievance process' }],
      },
    ],
  },
  privacy: {
    path: '/privacy',
    label: 'Privacy',
    title: 'Privacy policy',
    description: 'Information we handle, why we use it and the choices available to readers.',
    intro:
      'This policy explains how UP24Network handles information when you read the website, use an account, save a story or contact the publication.',
    sections: [
      {
        id: 'scope',
        title: 'Scope and responsibility',
        paragraphs: [
          'This policy applies to the UP24Network website and the account features it provides. External platforms, including social networks and video services, operate under their own privacy terms. The publication is responsible for the information it collects through its own services.',
          'Information supplied as part of a news tip or editorial correspondence may also be considered for journalistic purposes. The contents of a published report and an account’s operational data are handled for different purposes.',
        ],
      },
      {
        id: 'information',
        title: 'Information we handle',
        paragraphs: [
          'An account uses a display name, email address and password. Passwords are stored as one-way hashes rather than readable passwords. Account records also contain the account’s role and creation date. Private staff sign-in requires a time-limited email verification code.',
          'When you contact us, we receive the information you choose to share, including your reply details and the contents of your message. Requests made to a website may also be processed with technical information such as network address, browser information and request timestamps for delivery, diagnosis and security.',
        ],
      },
      {
        id: 'uses',
        title: 'Why information is used',
        paragraphs: [
          'Account information is used to create and authenticate accounts, enforce permissions and maintain the service. Staff email addresses are used to deliver requested sign-in codes. Technical information may help detect abuse, investigate a failure or protect the website.',
          'Reader enquiries are used to respond to the subject raised, assess news material, investigate complaints or fulfil a related request. A news tip or correction request is not permission to add someone to a marketing list.',
        ],
      },
      {
        id: 'storage',
        title: 'Cookies and saved stories',
        paragraphs: [
          'Sign-in uses a session cookie to associate the browser with an authenticated session. Request-verification protections help prevent another website from submitting account changes on your behalf. These mechanisms support account security and service operation.',
          'Saved article titles, addresses and related display details are held in this browser’s local storage. They are not synchronised between devices or uploaded as an account reading history by the saved-stories feature. You can remove individual saved stories or clear this site’s browser data. Blocking storage or cookies may limit the features that depend on them.',
        ],
      },
      {
        id: 'providers',
        title: 'Service providers and external media',
        paragraphs: [
          'Brevo delivers requested staff sign-in emails. The service receives the recipient address and the message needed for that delivery. Email codes are not included in public links or website analytics.',
          'YouTube videos use a privacy-enhanced embedded player that loads when you choose to play the video. Playback connects the browser to YouTube, which may process network and device information. Following an external social or other website link takes you to a service whose information practices are separate from ours.',
          'Information may be handled by infrastructure and communication providers to operate the service, or disclosed where a valid legal obligation requires it. Such handling is distinct from selling a reader’s account details.',
        ],
      },
      {
        id: 'retention',
        title: 'Retention and security',
        paragraphs: [
          'Account information is retained while the account remains in use or while needed for a legitimate operational, security or legal purpose. Correspondence is retained in relation to the enquiry, complaint or editorial matter it concerns. Published journalism may form part of a continuing public record.',
          'Access controls, protected passwords and limited-duration verification codes reduce the risk of unauthorised access. No system can guarantee absolute security. Do not send a password or sign-in code to someone claiming to assist with an account.',
        ],
      },
      {
        id: 'choices',
        title: 'Your choices and privacy requests',
        paragraphs: [
          'You can browse public news without creating an account, sign out of an account, remove locally saved stories and choose whether to open an external video. For an account correction, deletion request or question about information supplied to us, contact the publication and describe the request.',
          'We may ask for enough information to verify that a request concerns your account or information. A request concerning a published report is also assessed for journalistic context, applicable obligations and the rights of other people. Please do not send identity documents unless an appropriate verification method has been agreed.',
        ],
        links: [
          { href: '/contact', label: 'Contact for a privacy request' },
          { href: '/complaints', label: 'Raise a privacy concern' },
        ],
      },
      {
        id: 'changes',
        title: 'Changes to this policy',
        paragraphs: [
          'This policy may be updated when the website’s features, providers or information practices change. The date on this page identifies the latest revision. A material change should be explained in the revised policy.',
        ],
      },
    ],
  },
  complaints: {
    path: '/complaints',
    label: 'Complaints',
    title: 'Complaints and grievances',
    description:
      'A structured way to raise concerns about a report, privacy or the conduct of the publication.',
    intro:
      'Readers and people affected by our reporting can ask for a considered review of an editorial, privacy or publication concern.',
    sections: [
      {
        id: 'concerns',
        title: 'What you can raise',
        paragraphs: [
          'A complaint may concern a factual error, missing context, treatment of a response, an image or video, privacy, identification of a vulnerable person, commercial labelling or conduct connected with our reporting. Describe the specific issue rather than only the conclusion you would like the publication to reach.',
        ],
      },
      {
        id: 'information',
        title: 'Information to include',
        paragraphs: [
          'Provide the article or video link, the date it appeared if known, your relationship to the matter, the passage or action you are challenging, supporting evidence and the remedy requested. Include a private reply method.',
          'If there is a time-sensitive safety or privacy concern, explain the risk and identify the material involved. Keep sensitive documents out of public comments and share only what is relevant to the review.',
        ],
        links: [{ href: '/contact', label: 'Contact channels and submission guidance' }],
      },
      {
        id: 'review',
        title: 'Editorial review and response',
        paragraphs: [
          'The publication assesses the complaint against the report, available source material, relevant editorial standards and information provided by the complainant. The reporter or editor may be asked for an explanation. A concern about the person handling the matter should be identified so that it can be considered in assigning the review.',
          'An outcome may include a correction, clarification, added response, change to identifying detail, removal in exceptional circumstances, or an explanation of why the reporting is retained. Further verification may be necessary before a decision can be reached.',
        ],
      },
      {
        id: 'further-review',
        title: 'Further review and formal notices',
        paragraphs: [
          'If you believe a response leaves an important issue unresolved, identify that issue and any evidence not previously considered. Please keep correspondence focused on the substance of the complaint. Threats, impersonation and repeated abusive messages do not assist a review.',
          'Identify formal legal notices, rights requests and privacy complaints clearly. This editorial process does not limit any remedy available under applicable law. Where a matter concerns a different publisher or external platform, that organisation may need to be contacted directly.',
        ],
        links: [
          { href: '/editorial-policy', label: 'Editorial standards' },
          { href: '/privacy', label: 'Privacy policy' },
        ],
      },
    ],
  },
  ownership: {
    path: '/ownership',
    label: 'Ownership',
    title: 'Publication and ownership',
    description:
      'Publication responsibility, editorial control and the treatment of commercial interests.',
    intro:
      'UP24Network is the publishing identity behind this website and its official news channels. Editorial and commercial decisions carry different responsibilities.',
    sections: [
      {
        id: 'responsibility',
        title: 'Publication responsibility',
        paragraphs: [
          'The publication’s owner is responsible for the operation of UP24Network and for assigning editorial responsibilities. Editors are responsible for publication decisions within their remit. A reader’s question, correction request or formal enquiry can be directed to the publication through its contact channels.',
          'Official channels are listed together so that readers can identify the UP24Network publication across the website and social platforms. An account or page using a similar name should not be assumed to represent the publication.',
        ],
        links: [{ href: '/contact', label: 'Official publication contacts' }],
      },
      {
        id: 'independence',
        title: 'Editorial control',
        paragraphs: [
          'The owner appoints staff and assigns their permissions. Editorial review, publication and correction decisions must follow the publication’s standards. A source, advertiser or external organisation does not gain editorial authority by providing material or entering a commercial discussion.',
          'Where a personal or commercial interest could materially affect a report, that interest should be disclosed to the responsible editor and addressed through the editorial process.',
        ],
      },
      {
        id: 'funding',
        title: 'Commercial relationships and transparency',
        paragraphs: [
          'Advertising and sponsored material, when accepted, must be identifiable as commercial content. Payment must not be represented as a guarantee of independent favourable coverage, and a commercial relationship must not prevent a warranted correction.',
          'Readers should be able to recognise a commercial relationship where it is relevant to the material they are reading. Questions about publication responsibility or a commercial arrangement can be raised through our official contact channels.',
        ],
        links: [
          { href: '/advertising', label: 'Advertising policy' },
          { href: '/editorial-policy', label: 'Editorial standards' },
        ],
      },
    ],
  },
  advertising: {
    path: '/advertising',
    label: 'Advertising',
    title: 'Advertising and commercial policy',
    description:
      'How commercial enquiries, sponsorship and advertising are separated from editorial decisions.',
    intro:
      'Commercial arrangements must be clear to readers and must not determine the findings of an independent news report.',
    sections: [
      {
        id: 'enquiries',
        title: 'Advertising enquiries',
        paragraphs: [
          'A commercial proposal should identify the advertiser, product or service, campaign objective, intended dates and the placement requested. Where an agency acts for a client, disclose the client’s identity. Availability, format and commercial terms must be agreed before a placement is confirmed.',
          'No media kit, audience estimate, price or promised placement should be treated as binding without confirmation from the publication. Enquiries can be made through our official contact channels.',
        ],
        links: [{ href: '/contact', label: 'Make a commercial enquiry' }],
      },
      {
        id: 'identification',
        title: 'Clear identification',
        paragraphs: [
          'Paid placements, sponsorship and advertorials must be distinguishable from independent editorial content. Labels should describe the commercial nature of the material clearly and appear where a reader encounters it.',
          'An advertiser’s claims remain the advertiser’s responsibility. An appearance on the website does not, by itself, mean the publication endorses a product, service, political position or investment.',
        ],
      },
      {
        id: 'standards',
        title: 'Acceptance and review',
        paragraphs: [
          'Proposals are assessed for legality, accuracy, presentation and suitability for the publication. Misleading claims, impersonation, deceptive interfaces and material that unlawfully exploits personal information are not acceptable.',
          'The publication may request evidence supporting a claim, require changes, decline a proposal or discontinue a placement where a material concern arises. Advertisers must hold the rights needed for supplied text, brands, images and video.',
        ],
      },
      {
        id: 'independence',
        title: 'Separation from news coverage',
        paragraphs: [
          'An advertising purchase does not buy editorial approval, control over a reporter’s conclusions or protection from legitimate scrutiny. Newsworthiness is assessed through the editorial process. A paid partnership must not be concealed as independent reporting.',
          'Commercial pressure must not suppress a justified correction. Concerns about the accuracy or identification of a commercial placement can be raised through the same contact and complaints channels available to readers.',
        ],
        links: [{ href: '/complaints', label: 'Raise a concern' }],
      },
    ],
  },
  terms: {
    path: '/terms',
    label: 'Terms of use',
    title: 'Terms of use',
    description:
      'The terms governing access to the website, account use and reuse of publication material.',
    intro:
      'These terms explain the conditions for using UP24Network’s website and the responsibilities that accompany access to its content and account features.',
    sections: [
      {
        id: 'access',
        title: 'Using the website',
        paragraphs: [
          'Use the website lawfully and in a way that respects other readers, the publication and the people covered in its reports. Do not interfere with the service, impersonate someone else, attempt unauthorised access or bypass access controls.',
          'Public reading and staff publication tools serve different purposes. A reader account does not grant access to editorial functions. You are responsible for keeping your account credentials private and for contacting the publication if you suspect misuse.',
        ],
      },
      {
        id: 'content',
        title: 'Copyright and content reuse',
        paragraphs: [
          'Articles, photographs, video, graphics, branding and other material may be protected by copyright, trade marks and other rights held by the publication or the relevant rights holder. You may link to a public article and use material where the law or an express licence permits it.',
          'Republication, syndication, commercial reuse and use of the UP24Network logo require the appropriate permission unless a legal exception applies. Attribution does not, by itself, create permission. For a rights enquiry, identify the material and the proposed use.',
        ],
        links: [{ href: '/contact', label: 'Request permission' }],
      },
      {
        id: 'submissions',
        title: 'Material you send us',
        paragraphs: [
          'When supplying text, a photograph, a recording or other material, identify its source and your right to share it. Tell the publication about any restriction or confidentiality expectation before supplying sensitive material. Do not submit material that unlawfully infringes another person’s rights.',
          'The publication may assess, verify, edit or decline submitted material. Sending a story suggestion, press release or comment does not guarantee publication, payment or a particular editorial outcome. Any separate agreement about commissioning or rights should be recorded expressly.',
        ],
      },
      {
        id: 'information',
        title: 'News, features and external services',
        paragraphs: [
          'News develops over time. Read publication dates, correction notes and subsequent reporting for context. Opinion and commentary express the views attributed to them. General features, including health, financial or horoscope material, do not create an individual professional advisory relationship.',
          'External websites and embedded services are operated by their respective providers. Availability, access requirements and their terms may differ from those of this website. The publication may update its own features and presentation as the service develops.',
        ],
      },
      {
        id: 'concerns',
        title: 'Concerns, changes and applicable rights',
        paragraphs: [
          'If a report is inaccurate or raises a concern about your rights, use our corrections or complaints process. Requests are assessed in context and in accordance with applicable obligations. These terms do not exclude rights or remedies that cannot lawfully be excluded.',
          'The website’s terms may be revised when its operation or features change. The revision date identifies the current text. Separate written agreements, where applicable, govern the matters they expressly cover.',
        ],
        links: [
          { href: '/corrections', label: 'Corrections' },
          { href: '/complaints', label: 'Complaints' },
          { href: '/privacy', label: 'Privacy policy' },
        ],
      },
    ],
  },
} satisfies Record<string, PublicationDocument>;

export const publicationNavigation = Object.values(publicationDocuments).map(({ path, label }) => ({
  path,
  label,
}));
