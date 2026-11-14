export const zodiacSigns = [
  { id: 'aries', englishName: 'Aries', motif: 'मेंढा' },
  { id: 'taurus', englishName: 'Taurus', motif: 'वृषभ' },
  { id: 'gemini', englishName: 'Gemini', motif: 'मिथुन युगल' },
  { id: 'cancer', englishName: 'Cancer', motif: 'कर्क' },
  { id: 'leo', englishName: 'Leo', motif: 'सिंह' },
  { id: 'virgo', englishName: 'Virgo', motif: 'कन्या' },
  { id: 'libra', englishName: 'Libra', motif: 'तुला' },
  { id: 'scorpio', englishName: 'Scorpio', motif: 'वृश्चिक' },
  { id: 'sagittarius', englishName: 'Sagittarius', motif: 'धनुर्धर' },
  { id: 'capricorn', englishName: 'Capricorn', motif: 'मकर' },
  { id: 'aquarius', englishName: 'Aquarius', motif: 'जल कलश' },
  { id: 'pisces', englishName: 'Pisces', motif: 'मीन युगल' },
] as const;

export function zodiacFor(id: string) {
  const index = zodiacSigns.findIndex((sign) => sign.id === id);
  return index < 0 ? undefined : { ...zodiacSigns[index], tile: index };
}

const colourSwatches: Readonly<Record<string, string>> = {
  नीला: '#355f98', blue: '#355f98',
  हरा: '#4f7658', green: '#4f7658',
  पीला: '#e1b631', yellow: '#e1b631',
  लाल: '#b64c43', red: '#b64c43',
  सफेद: '#ffffff', white: '#ffffff',
  काला: '#25313d', black: '#25313d',
  गुलाबी: '#cd8ba0', pink: '#cd8ba0',
  नारंगी: '#d68444', orange: '#d68444',
  बैंगनी: '#826394', purple: '#826394',
  भूरा: '#927253', brown: '#927253',
  सुनहरा: '#c79b38', golden: '#c79b38',
  आसमानी: '#84b9ce', 'sky blue': '#84b9ce',
  स्लेटी: '#90979e', grey: '#90979e', gray: '#90979e',
};

export function luckyColourSwatch(colour: string) {
  return colourSwatches[colour.trim().toLocaleLowerCase('hi-IN')];
}
