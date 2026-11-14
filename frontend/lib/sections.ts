export type NewsSection = {
  slug: string;
  name: string;
  title: string;
  description: string;
  parent?: string;
};
export const newsSections: readonly NewsSection[] = [
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
  {
    slug: 'cricket',
    name: 'Cricket',
    title: 'क्रिकेट',
    parent: 'sports',
    description: 'क्रिकेट के मैदान से खिलाड़ियों, टीमों और मुकाबलों की खबरें।',
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    title: 'मनोरंजन',
    description: 'सिनेमा, टेलीविजन और डिजिटल मनोरंजन की दुनिया।',
  },
  {
    slug: 'bollywood',
    name: 'Bollywood',
    title: 'बॉलीवुड',
    parent: 'entertainment',
    description: 'हिंदी सिनेमा, कलाकारों और नई फिल्मों से जुड़ी खबरें।',
  },
  {
    slug: 'television',
    name: 'Television',
    title: 'टेलीविजन',
    parent: 'entertainment',
    description: 'छोटे पर्दे के कार्यक्रम, कलाकार और बदलती कहानियाँ।',
  },
  {
    slug: 'ott',
    name: 'OTT',
    title: 'ओटीटी',
    parent: 'entertainment',
    description: 'वेब सीरीज, डिजिटल फिल्में और स्ट्रीमिंग की दुनिया।',
  },
  {
    slug: 'technology',
    name: 'Technology',
    title: 'टेक्नोलॉजी',
    description: 'डिजिटल दुनिया, नए उपकरण और तकनीक का रोजमर्रा पर असर।',
  },
  {
    slug: 'auto',
    name: 'Auto',
    title: 'ऑटो',
    description: 'कार, बाइक, इलेक्ट्रिक वाहन और सड़क की दुनिया।',
  },
  {
    slug: 'science',
    name: 'Science',
    title: 'विज्ञान',
    description: 'खोज, अंतरिक्ष और वैज्ञानिक सवालों का सरल संदर्भ।',
  },
  {
    slug: 'agriculture',
    name: 'Agriculture',
    title: 'खेती-किसानी',
    description: 'किसान, फसल, ग्रामीण अर्थव्यवस्था और कृषि की खबरें।',
  },
  {
    slug: 'religion',
    name: 'Religion',
    title: 'धर्म और आस्था',
    description: 'आस्था, पर्व, परंपराओं और तीर्थस्थलों से जुड़ी जानकारी।',
  },
  {
    slug: 'travel',
    name: 'Travel',
    title: 'यात्रा',
    description: 'शहर, यात्राएँ, स्थानीय अनुभव और सफर की तैयारी।',
  },
  {
    slug: 'food',
    name: 'Food',
    title: 'खानपान',
    description: 'खानपान की परंपराएँ, स्थानीय स्वाद और रसोई की कहानियाँ।',
  },
  {
    slug: 'personal-finance',
    name: 'Personal Finance',
    title: 'आपका पैसा',
    parent: 'business',
    description: 'बचत, घरेलू बजट और पैसों से जुड़े फैसलों का संदर्भ।',
  },
  {
    slug: 'jobs',
    name: 'Jobs',
    title: 'नौकरी',
    parent: 'education',
    description: 'रोजगार, कौशल और भर्ती प्रक्रिया से जुड़ी खबरें।',
  },
  {
    slug: 'explainers',
    name: 'Explainers',
    title: 'एक्सप्लेनर',
    description: 'जटिल मुद्दों की पृष्ठभूमि, जरूरी सवाल और आसान व्याख्या।',
  },
  {
    slug: 'opinion',
    name: 'Opinion',
    title: 'विचार',
    description: 'लेखकों के विचार, विश्लेषण और सार्वजनिक बहस।',
  },
  {
    slug: 'crime',
    name: 'Crime',
    title: 'अपराध',
    description: 'पुलिस, अदालत और सार्वजनिक सुरक्षा की खबरें।',
  },
];

export const sectionGroups = [
  {
    title: 'देश और समाज',
    slugs: ['uttar-pradesh', 'india', 'politics', 'world', 'crime', 'explainers', 'opinion'],
  },
  {
    title: 'काम और प्रगति',
    slugs: [
      'business',
      'personal-finance',
      'agriculture',
      'education',
      'jobs',
      'technology',
      'auto',
      'science',
    ],
  },
  {
    title: 'खेल और मनोरंजन',
    slugs: ['sports', 'cricket', 'entertainment', 'bollywood', 'television', 'ott', 'videos'],
  },
  {
    title: 'जीवन और संस्कृति',
    slugs: [
      'health',
      'lifestyle',
      'travel',
      'food',
      'religion',
      'rashifal',
      'culture',
      'books',
      'awards',
      'environment',
    ],
  },
];

export function sectionCategories(section: NewsSection): string[] {
  return [
    section.name,
    ...newsSections.filter((item) => item.parent === section.slug).map((item) => item.name),
  ];
}

export const sections = newsSections.map((section) => section.name);
export function sectionHref(name: string) {
  const section = newsSections.find((section) => section.name === name);
  if (section?.slug === 'uttar-pradesh') return '/region/uttar-pradesh';
  return section?.slug === 'videos' ? '/watch' : section ? `/section/${section.slug}` : '/latest';
}
export function sectionTitle(name: string) {
  return newsSections.find((section) => section.name === name)?.title ?? name;
}
