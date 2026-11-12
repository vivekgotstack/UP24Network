export const newsSections = [
  {
    slug: 'uttar-pradesh',
    name: 'Uttar Pradesh',
    title: 'उत्तर प्रदेश',
    description: 'प्रदेश की राजनीति, शहरों और आपके आसपास की खबरें।',
  },
  { slug: 'india', name: 'India', title: 'देश', description: 'देश की बड़ी खबरें और उनका पूरा संदर्भ।' },
  {
    slug: 'politics',
    name: 'Politics',
    title: 'राजनीति',
    description: 'सत्ता, विपक्ष और लोकतंत्र से जुड़ी खबरें।',
  },
  {
    slug: 'world',
    name: 'World',
    title: 'दुनिया',
    description: 'दुनिया भर की घटनाएँ और बदलते समीकरण।',
  },
  {
    slug: 'business',
    name: 'Business',
    title: 'कारोबार',
    description: 'अर्थव्यवस्था, बाजार और कामकाज की खबरें।',
  },
  {
    slug: 'sports',
    name: 'Sports',
    title: 'खेल',
    description: 'मैदान से खबरें, मुकाबले और खिलाड़ियों की कहानियाँ।',
  },
  {
    slug: 'education',
    name: 'Education',
    title: 'शिक्षा और करियर',
    description: 'पढ़ाई, परीक्षाएँ और रोजगार से जुड़ी जानकारी।',
  },
  {
    slug: 'health',
    name: 'Health & Wellness',
    title: 'सेहत',
    description: 'स्वास्थ्य, व्यायाम और बेहतर जीवन से जुड़ी रिपोर्ट।',
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle',
    title: 'जीवनशैली',
    description: 'रोजमर्रा की जिंदगी की दिलचस्प और जरूरी बातें।',
  },
  {
    slug: 'rashifal',
    name: 'Rashifal',
    title: 'राशिफल',
    description: 'आज की तारीख का दैनिक राशिफल, सभी बारह राशियों के लिए।',
  },
  {
    slug: 'books',
    name: 'Books & Literature',
    title: 'किताबें और साहित्य',
    description: 'किताबों, लेखकों और साहित्य की दुनिया से।',
  },
  {
    slug: 'awards',
    name: 'Awards & Publications',
    title: 'सम्मान और प्रकाशन',
    description: 'उपलब्धियाँ, पुरस्कार और नए प्रकाशन।',
  },
  {
    slug: 'culture',
    name: 'Culture',
    title: 'कला और संस्कृति',
    description: 'हमारी विरासत, परंपराएँ और सांस्कृतिक जीवन।',
  },
  {
    slug: 'environment',
    name: 'Environment',
    title: 'पर्यावरण',
    description: 'प्रकृति, जलवायु और हमारे साझा भविष्य की खबरें।',
  },
  {
    slug: 'videos',
    name: 'Videos',
    title: 'वीडियो',
    description: 'UP24Network की वीडियो रिपोर्ट और जमीनी कवरेज।',
  },
] as const;

export const sections = newsSections.map((section) => section.name);
export function sectionHref(name: string) {
  const section = newsSections.find((section) => section.name === name);
  return section?.slug === 'videos' ? '/watch' : section ? `/section/${section.slug}` : '/latest';
}
export function sectionTitle(name: string) {
  return newsSections.find((section) => section.name === name)?.title ?? name;
}
