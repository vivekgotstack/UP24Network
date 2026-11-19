import type { AirQualityCity } from '@/lib/air-quality-api';
import type { SiteLocale } from '@/lib/locale';

const stateNames: Record<string, string> = {
  'उत्तर प्रदेश': 'Uttar Pradesh',
  दिल्ली: 'Delhi',
  'अंडमान और निकोबार द्वीपसमूह': 'Andaman and Nicobar Islands',
  'आंध्र प्रदेश': 'Andhra Pradesh',
  'अरुणाचल प्रदेश': 'Arunachal Pradesh',
  असम: 'Assam',
  बिहार: 'Bihar',
  चंडीगढ़: 'Chandigarh',
  छत्तीसगढ़: 'Chhattisgarh',
  'दादरा और नगर हवेली और दमन और दीव': 'Dadra and Nagar Haveli and Daman and Diu',
  गोवा: 'Goa',
  गुजरात: 'Gujarat',
  हरियाणा: 'Haryana',
  'हिमाचल प्रदेश': 'Himachal Pradesh',
  'जम्मू और कश्मीर': 'Jammu and Kashmir',
  झारखंड: 'Jharkhand',
  कर्नाटक: 'Karnataka',
  केरल: 'Kerala',
  लद्दाख: 'Ladakh',
  लक्षद्वीप: 'Lakshadweep',
  'मध्य प्रदेश': 'Madhya Pradesh',
  महाराष्ट्र: 'Maharashtra',
  मणिपुर: 'Manipur',
  मेघालय: 'Meghalaya',
  मिज़ोरम: 'Mizoram',
  नागालैंड: 'Nagaland',
  ओडिशा: 'Odisha',
  पुदुचेरी: 'Puducherry',
  पंजाब: 'Punjab',
  राजस्थान: 'Rajasthan',
  सिक्किम: 'Sikkim',
  तमिलनाडु: 'Tamil Nadu',
  तेलंगाना: 'Telangana',
  त्रिपुरा: 'Tripura',
  उत्तराखंड: 'Uttarakhand',
  'पश्चिम बंगाल': 'West Bengal',
};

export function aqiLocation(location: AirQualityCity, locale: SiteLocale) {
  if (locale === 'hi') return location;
  const city =
    location.key === 'delhi'
      ? 'New Delhi'
      : location.key
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
  return { ...location, city, state: stateNames[location.state] ?? location.state };
}
