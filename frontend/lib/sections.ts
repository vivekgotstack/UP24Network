import { trendingReelsCategory } from '@/lib/instagram';
import type { SiteLocale } from '@/lib/locale';

export type NewsSection = {
  slug: string;
  name: string;
  title: string;
  description: string;
  englishDescription?: string;
  parent?: string;
};
export const newsSections: readonly NewsSection[] = [
  {
    slug: 'uttar-pradesh',
    name: 'Uttar Pradesh',
    title: 'उत्तर प्रदेश',
    description: 'प्रदेश की राजनीति, शहरों और आपके आसपास की खबरें।',
    englishDescription: 'Politics, cities, and local news from Uttar Pradesh.',
  },
  {
    slug: 'india',
    name: 'India',
    title: 'देश',
    description: 'देश की बड़ी खबरें और उनका पूरा संदर्भ।',
    englishDescription: 'Major stories from across India, with context.',
  },
  {
    slug: 'politics',
    name: 'Politics',
    title: 'राजनीति',
    description: 'सत्ता, विपक्ष और लोकतंत्र से जुड़ी खबरें।',
    englishDescription: 'Government, the opposition, and democratic institutions.',
  },
  {
    slug: 'world',
    name: 'World',
    title: 'दुनिया',
    description: 'दुनिया भर की घटनाएँ और बदलते समीकरण।',
    englishDescription: 'World events and shifting international relationships.',
  },
  {
    slug: 'business',
    name: 'Business',
    title: 'कारोबार',
    description: 'अर्थव्यवस्था, बाजार और कामकाज की खबरें।',
    englishDescription: 'The economy, markets, and the world of work.',
  },
  {
    slug: 'sports',
    name: 'Sports',
    title: 'खेल',
    description: 'मैदान से खबरें, मुकाबले और खिलाड़ियों की कहानियाँ।',
    englishDescription: 'Sports news, fixtures, and stories about athletes.',
  },
  {
    slug: 'education',
    name: 'Education',
    title: 'शिक्षा और करियर',
    description: 'पढ़ाई, परीक्षाएँ और रोजगार से जुड़ी जानकारी।',
    englishDescription: 'Schools, exams, and careers.',
  },
  {
    slug: 'health',
    name: 'Health & Wellness',
    title: 'सेहत',
    description: 'स्वास्थ्य, व्यायाम और बेहतर जीवन से जुड़ी रिपोर्ट।',
    englishDescription: 'Reporting on health, exercise, and wellbeing.',
  },
  {
    slug: 'lifestyle',
    name: 'Lifestyle',
    title: 'जीवनशैली',
    description: 'रोजमर्रा की जिंदगी की दिलचस्प और जरूरी बातें।',
    englishDescription: 'Stories about everyday life.',
  },
  {
    slug: 'rashifal',
    name: 'Rashifal',
    title: 'राशिफल',
    description: 'आज की तारीख का दैनिक राशिफल, सभी बारह राशियों के लिए।',
    englishDescription: 'Daily horoscopes for all twelve zodiac signs.',
  },
  {
    slug: 'books',
    name: 'Books & Literature',
    title: 'किताबें और साहित्य',
    description: 'किताबों, लेखकों और साहित्य की दुनिया से।',
    englishDescription: 'Books, authors, and literature.',
  },
  {
    slug: 'awards',
    name: 'Awards & Publications',
    title: 'सम्मान और प्रकाशन',
    description: 'उपलब्धियाँ, पुरस्कार और नए प्रकाशन।',
    englishDescription: 'Achievements, awards, and new publications.',
  },
  {
    slug: 'culture',
    name: 'Culture',
    title: 'कला और संस्कृति',
    description: 'हमारी विरासत, परंपराएँ और सांस्कृतिक जीवन।',
    englishDescription: 'Heritage, traditions, and cultural life.',
  },
  {
    slug: 'environment',
    name: 'Environment',
    title: 'पर्यावरण',
    description: 'प्रकृति, जलवायु और हमारे साझा भविष्य की खबरें।',
    englishDescription: 'Nature, climate, and our shared future.',
  },
  {
    slug: 'videos',
    name: 'Videos',
    title: 'वीडियो',
    description: 'UP24Network की वीडियो रिपोर्ट और जमीनी कवरेज।',
    englishDescription: 'Video reports and on-the-ground coverage from UP24Network.',
  },
  {
    slug: 'cricket',
    name: 'Cricket',
    title: 'क्रिकेट',
    parent: 'sports',
    description: 'क्रिकेट के मैदान से खिलाड़ियों, टीमों और मुकाबलों की खबरें।',
    englishDescription: 'Cricket players, teams, and matches.',
  },
  {
    slug: 'entertainment',
    name: 'Entertainment',
    title: 'मनोरंजन',
    description: 'सिनेमा, टेलीविजन और डिजिटल मनोरंजन की दुनिया।',
    englishDescription: 'Film, television, and digital entertainment.',
  },
  {
    slug: 'bollywood',
    name: 'Bollywood',
    title: 'बॉलीवुड',
    parent: 'entertainment',
    description: 'हिंदी सिनेमा, कलाकारों और नई फिल्मों से जुड़ी खबरें।',
    englishDescription: 'Hindi cinema, actors, and new film releases.',
  },
  {
    slug: 'television',
    name: 'Television',
    title: 'टेलीविजन',
    parent: 'entertainment',
    description: 'छोटे पर्दे के कार्यक्रम, कलाकार और बदलती कहानियाँ।',
    englishDescription: 'Television programmes, performers, and stories.',
  },
  {
    slug: 'ott',
    name: 'OTT',
    title: 'ओटीटी',
    parent: 'entertainment',
    description: 'वेब सीरीज, डिजिटल फिल्में और स्ट्रीमिंग की दुनिया।',
    englishDescription: 'Web series, digital films, and streaming.',
  },
  {
    slug: 'trending-reels',
    name: trendingReelsCategory,
    title: 'ट्रेंडिंग रील्स',
    parent: 'entertainment',
    description: 'Instagram की चुनिंदा रील्स, मूल पोस्ट और ज़रूरी संदर्भ के साथ।',
    englishDescription: 'Selected Instagram Reels with original links and editorial context.',
  },
  {
    slug: 'technology',
    name: 'Technology',
    title: 'टेक्नोलॉजी',
    description: 'डिजिटल दुनिया, नए उपकरण और तकनीक का रोजमर्रा पर असर।',
    englishDescription: 'Digital life, new devices, and how technology affects us.',
  },
  {
    slug: 'auto',
    name: 'Auto',
    title: 'ऑटो',
    description: 'कार, बाइक, इलेक्ट्रिक वाहन और सड़क की दुनिया।',
    englishDescription: 'Cars, motorcycles, electric vehicles, and the road.',
  },
  {
    slug: 'science',
    name: 'Science',
    title: 'विज्ञान',
    description: 'खोज, अंतरिक्ष और वैज्ञानिक सवालों का सरल संदर्भ।',
    englishDescription: 'Discoveries, space, and the science behind the news.',
  },
  {
    slug: 'agriculture',
    name: 'Agriculture',
    title: 'खेती-किसानी',
    description: 'किसान, फसल, ग्रामीण अर्थव्यवस्था और कृषि की खबरें।',
    englishDescription: 'Farmers, crops, and the rural economy.',
  },
  {
    slug: 'religion',
    name: 'Religion',
    title: 'धर्म और आस्था',
    description: 'आस्था, पर्व, परंपराओं और तीर्थस्थलों से जुड़ी जानकारी।',
    englishDescription: 'Faith, festivals, traditions, and places of pilgrimage.',
  },
  {
    slug: 'travel',
    name: 'Travel',
    title: 'यात्रा',
    description: 'शहर, यात्राएँ, स्थानीय अनुभव और सफर की तैयारी।',
    englishDescription: 'Cities, local experiences, and travel planning.',
  },
  {
    slug: 'food',
    name: 'Food',
    title: 'खानपान',
    description: 'खानपान की परंपराएँ, स्थानीय स्वाद और रसोई की कहानियाँ।',
    englishDescription: 'Food traditions, local flavours, and kitchen stories.',
  },
  {
    slug: 'personal-finance',
    name: 'Personal Finance',
    title: 'आपका पैसा',
    parent: 'business',
    description: 'बचत, घरेलू बजट और पैसों से जुड़े फैसलों का संदर्भ।',
    englishDescription: 'Savings, household budgets, and money decisions.',
  },
  {
    slug: 'jobs',
    name: 'Jobs',
    title: 'नौकरी',
    parent: 'education',
    description: 'रोजगार, कौशल और भर्ती प्रक्रिया से जुड़ी खबरें।',
    englishDescription: 'Employment, skills, and recruitment news.',
  },
  {
    slug: 'explainers',
    name: 'Explainers',
    title: 'एक्सप्लेनर',
    description: 'जटिल मुद्दों की पृष्ठभूमि, जरूरी सवाल और आसान व्याख्या।',
    englishDescription: 'Clear explanations and background on complex issues.',
  },
  {
    slug: 'opinion',
    name: 'Opinion',
    title: 'विचार',
    description: 'लेखकों के विचार, विश्लेषण और सार्वजनिक बहस।',
    englishDescription: 'Opinion, analysis, and public debate.',
  },
  {
    slug: 'crime',
    name: 'Crime',
    title: 'अपराध',
    description: 'पुलिस, अदालत और सार्वजनिक सुरक्षा की खबरें।',
    englishDescription: 'Police, courts, and public safety news.',
  },
];

export const sectionGroups = [
  {
    title: 'देश और समाज',
    englishTitle: 'News and society',
    slugs: ['uttar-pradesh', 'india', 'politics', 'world', 'crime', 'explainers', 'opinion'],
  },
  {
    title: 'काम और प्रगति',
    englishTitle: 'Work and progress',
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
    englishTitle: 'Sports and entertainment',
    slugs: [
      'sports',
      'cricket',
      'entertainment',
      'bollywood',
      'television',
      'ott',
      'videos',
      'trending-reels',
    ],
  },
  {
    title: 'जीवन और संस्कृति',
    englishTitle: 'Life and culture',
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
export function sectionTitle(name: string, locale: SiteLocale = 'hi') {
  return locale === 'en'
    ? name
    : (newsSections.find((section) => section.name === name)?.title ?? name);
}

export function sectionDescription(section: NewsSection, locale: SiteLocale) {
  return locale === 'en' && section.englishDescription
    ? section.englishDescription
    : section.description;
}
