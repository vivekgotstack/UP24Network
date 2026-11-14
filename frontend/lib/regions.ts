export type NewsCity = { slug: string; title: string; aliases: string[]; region: string };
export const regions = [
  { slug: 'uttar-pradesh', title: 'उत्तर प्रदेश' },
  { slug: 'bihar', title: 'बिहार' },
  { slug: 'uttarakhand', title: 'उत्तराखंड' },
  { slug: 'delhi', title: 'दिल्ली' },
  { slug: 'madhya-pradesh', title: 'मध्य प्रदेश' },
  { slug: 'rajasthan', title: 'राजस्थान' },
  { slug: 'haryana', title: 'हरियाणा' },
  { slug: 'maharashtra', title: 'महाराष्ट्र' },
] as const;

export const cities: readonly NewsCity[] = [
  { slug: 'lucknow', title: 'लखनऊ', aliases: ['लखनऊ', 'Lucknow'], region: 'uttar-pradesh' },
  { slug: 'kanpur', title: 'कानपुर', aliases: ['कानपुर', 'Kanpur'], region: 'uttar-pradesh' },
  {
    slug: 'prayagraj',
    title: 'प्रयागराज',
    aliases: ['प्रयागराज', 'Prayagraj', 'Allahabad', 'इलाहाबाद'],
    region: 'uttar-pradesh',
  },
  {
    slug: 'varanasi',
    title: 'वाराणसी',
    aliases: ['वाराणसी', 'Varanasi', 'बनारस', 'Banaras'],
    region: 'uttar-pradesh',
  },
  { slug: 'gorakhpur', title: 'गोरखपुर', aliases: ['गोरखपुर', 'Gorakhpur'], region: 'uttar-pradesh' },
  { slug: 'noida', title: 'नोएडा', aliases: ['नोएडा', 'Noida'], region: 'uttar-pradesh' },
  {
    slug: 'ghaziabad',
    title: 'गाजियाबाद',
    aliases: ['गाजियाबाद', 'Ghaziabad'],
    region: 'uttar-pradesh',
  },
  { slug: 'agra', title: 'आगरा', aliases: ['आगरा', 'Agra'], region: 'uttar-pradesh' },
  { slug: 'meerut', title: 'मेरठ', aliases: ['मेरठ', 'Meerut'], region: 'uttar-pradesh' },
  { slug: 'ayodhya', title: 'अयोध्या', aliases: ['अयोध्या', 'Ayodhya'], region: 'uttar-pradesh' },
  { slug: 'bareilly', title: 'बरेली', aliases: ['बरेली', 'Bareilly'], region: 'uttar-pradesh' },
  { slug: 'jhansi', title: 'झांसी', aliases: ['झांसी', 'Jhansi'], region: 'uttar-pradesh' },
  { slug: 'patna', title: 'पटना', aliases: ['पटना', 'Patna'], region: 'bihar' },
  { slug: 'gaya', title: 'गया', aliases: ['गया', 'Gaya'], region: 'bihar' },
  { slug: 'dehradun', title: 'देहरादून', aliases: ['देहरादून', 'Dehradun'], region: 'uttarakhand' },
  { slug: 'haridwar', title: 'हरिद्वार', aliases: ['हरिद्वार', 'Haridwar'], region: 'uttarakhand' },
  {
    slug: 'new-delhi',
    title: 'नई दिल्ली',
    aliases: ['नई दिल्ली', 'New Delhi', 'Delhi', 'दिल्ली'],
    region: 'delhi',
  },
  { slug: 'bhopal', title: 'भोपाल', aliases: ['भोपाल', 'Bhopal'], region: 'madhya-pradesh' },
  { slug: 'indore', title: 'इंदौर', aliases: ['इंदौर', 'Indore'], region: 'madhya-pradesh' },
  { slug: 'jaipur', title: 'जयपुर', aliases: ['जयपुर', 'Jaipur'], region: 'rajasthan' },
  {
    slug: 'gurugram',
    title: 'गुरुग्राम',
    aliases: ['गुरुग्राम', 'Gurugram', 'गुड़गांव', 'Gurgaon'],
    region: 'haryana',
  },
  { slug: 'mumbai', title: 'मुंबई', aliases: ['मुंबई', 'Mumbai'], region: 'maharashtra' },
];

export function regionCities(slug: string) {
  return cities.filter((city) => city.region === slug);
}
