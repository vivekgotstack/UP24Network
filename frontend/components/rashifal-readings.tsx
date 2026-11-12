'use client';

import { Tabs } from 'radix-ui';
import { motion, useReducedMotion } from 'framer-motion';
import type { HoroscopeEdition } from '@/lib/horoscope';

export function RashifalReadings({ edition }: { edition: HoroscopeEdition }) {
  const reducedMotion = useReducedMotion();
  const date = new Intl.DateTimeFormat('hi-IN', {
    dateStyle: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${edition.date}T00:00:00+05:30`));

  return (
    <section className="rashifal-section" id="rashifal" lang="hi" aria-labelledby="rashifal-title">
      <div className="rashifal-heading">
        <div>
          <p className="eyebrow">दैनिक विशेष</p>
          <h2 id="rashifal-title">आज का राशिफल</h2>
        </div>
        <time dateTime={edition.date}>{date}</time>
      </div>
      <Tabs.Root defaultValue={edition.signs[0].sign} orientation="horizontal">
        <Tabs.List className="rashi-signs" aria-label="अपनी राशि चुनें">
          {edition.signs.map((sign, index) => (
            <Tabs.Trigger key={sign.sign} className="rashi-sign" value={sign.sign}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              {sign.name}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {edition.signs.map((sign) => (
          <Tabs.Content key={sign.sign} value={sign.sign} className="rashi-content">
            <motion.div
              className="rashi-reading"
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="rashi-name">
                <p className="eyebrow">आपकी राशि</p>
                <h3>{sign.name}</h3>
                <dl>
                  <div>
                    <dt>शुभ अंक</dt>
                    <dd>{sign.luckyNumber}</dd>
                  </div>
                  <div>
                    <dt>शुभ रंग</dt>
                    <dd>{sign.luckyColour}</dd>
                  </div>
                </dl>
              </div>
              <p className="rashi-text">{sign.reading}</p>
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
