'use client';

import { Tabs } from 'radix-ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { HoroscopeEdition } from '@/lib/horoscope';
import { luckyColourSwatch, zodiacFor, zodiacSigns } from '@/lib/zodiac';
import { ZodiacArt } from '@/components/zodiac-art';

export function RashifalReadings({ edition }: { edition: HoroscopeEdition }) {
  const reducedMotion = useReducedMotion();
  const readings = zodiacSigns.flatMap((zodiac) => {
    const reading = edition.signs.find((sign) => sign.sign === zodiac.id);
    return reading ? [reading] : [];
  });
  const date = new Intl.DateTimeFormat('hi-IN', {
    dateStyle: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${edition.date}T00:00:00+05:30`));

  return (
    <section className="rashifal-section" id="rashifal" lang="hi" aria-labelledby="rashifal-title">
      <div className="rashifal-heading">
        <div>
          <p className="eyebrow">दैनिक विशेष · {readings.length} राशियाँ</p>
          <h2 id="rashifal-title">आज का राशिफल</h2>
          <p className="rashifal-intro">अपनी राशि चुनें और आज का फल, शुभ अंक व शुभ रंग पढ़ें।</p>
        </div>
        <div className="rashifal-date"><span>दैनिक संस्करण</span><time dateTime={edition.date}>{date}</time></div>
      </div>
      <Tabs.Root defaultValue={readings[0]?.sign ?? 'aries'} orientation="horizontal">
        <Tabs.List className="rashi-signs" aria-label="अपनी राशि चुनें">
          {readings.map((sign) => (
            <Tabs.Trigger key={sign.sign} className="rashi-sign" value={sign.sign} aria-label={`${sign.name} राशिफल`}>
              <ZodiacArt sign={sign.sign} />
              <span className="rashi-sign-name">{sign.name}</span>
              <span className="rashi-sign-english" lang="en" aria-hidden="true">{zodiacFor(sign.sign)?.englishName}</span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {readings.map((sign) => (
          <Tabs.Content key={sign.sign} value={sign.sign} className="rashi-content">
            <motion.div
              className="rashi-reading"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <figure className="rashi-portrait">
                <ZodiacArt sign={sign.sign} large />
                <figcaption><span>{zodiacFor(sign.sign)?.motif}</span><span lang="en">{zodiacFor(sign.sign)?.englishName}</span></figcaption>
              </figure>
              <div className="rashi-copy">
                <header><p className="eyebrow">आपकी राशि · आज का फल</p><h3>{sign.name} राशिफल</h3></header>
                <p className="rashi-text">{sign.reading}</p>
                <dl className="rashi-details">
                  <div>
                    <dt>शुभ अंक</dt>
                    <dd className="rashi-lucky-number">{sign.luckyNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>शुभ रंग</dt>
                    <dd>{luckyColourSwatch(sign.luckyColour) && <span className="rashi-colour-chip" style={{ backgroundColor: luckyColourSwatch(sign.luckyColour) }} aria-hidden="true" />}<span>{sign.luckyColour || '—'}</span></dd>
                  </div>
                </dl>
              </div>
            </motion.div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
      <p className="rashi-note">
        ज्योतिष परंपरा पर आधारित सामान्य मार्गदर्शन। यह निश्चित भविष्यवाणी या पेशेवर सलाह नहीं है।
      </p>
    </section>
  );
}
