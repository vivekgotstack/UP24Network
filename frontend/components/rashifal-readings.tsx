'use client';

import { Tabs } from 'radix-ui';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { HoroscopeEdition } from '@/lib/horoscope';
import { luckyColourSwatch, zodiacFor, zodiacSigns } from '@/lib/zodiac';
import { ZodiacArt } from '@/components/zodiac-art';
import { copy, type SiteLocale } from '@/lib/locale';

export function RashifalReadings({
  edition,
  compact = false,
  locale = 'hi',
}: {
  edition: HoroscopeEdition;
  compact?: boolean;
  locale?: SiteLocale;
}) {
  const reducedMotion = useReducedMotion();
  const readings = zodiacSigns.flatMap((zodiac) => {
    const reading = edition.signs.find((sign) => sign.sign === zodiac.id);
    return reading ? [reading] : [];
  });
  const date = new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${edition.date}T00:00:00+05:30`));

  return (
    <section
      className={`rashifal-section${compact ? ' rashifal-section-compact' : ''}`}
      id="rashifal"
      aria-labelledby="rashifal-title"
    >
      <div className="rashifal-heading">
        <div>
          <h2 id="rashifal-title">{copy(locale, 'आज का राशिफल', 'Today’s horoscope')}</h2>
          {!compact && (
            <p className="rashifal-intro">
              {copy(locale, 'अपनी राशि चुनें।', 'Choose your zodiac sign.')}
            </p>
          )}
        </div>
        <div className="rashifal-date">
          <time dateTime={edition.date}>{date}</time>
        </div>
      </div>
      <Tabs.Root defaultValue={readings[0]?.sign ?? 'aries'} orientation="horizontal">
        <Tabs.List className="rashi-signs" aria-label={copy(locale, 'राशि चुनें', 'Choose your sign')}>
          {readings.map((sign) => (
            <Tabs.Trigger
              key={sign.sign}
              className="rashi-sign"
              value={sign.sign}
              aria-label={copy(
                locale,
                `${sign.name} राशिफल`,
                `${zodiacFor(sign.sign)?.englishName ?? sign.name} horoscope`,
              )}
            >
              <ZodiacArt sign={sign.sign} />
              <span className="rashi-sign-name">
                {copy(locale, sign.name, zodiacFor(sign.sign)?.englishName ?? sign.name)}
              </span>
              {!compact && locale === 'hi' && (
                <span className="rashi-sign-english" lang="en" aria-hidden="true">
                  {zodiacFor(sign.sign)?.englishName}
                </span>
              )}
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
              {!compact && (
                <figure className="rashi-portrait">
                  <ZodiacArt sign={sign.sign} large />
                  <figcaption>
                    {locale === 'hi' && <span>{zodiacFor(sign.sign)?.motif}</span>}
                    <span lang="en">{zodiacFor(sign.sign)?.englishName}</span>
                  </figcaption>
                </figure>
              )}
              <div className="rashi-copy">
                <header>
                  <h3>
                    {copy(
                      locale,
                      `${sign.name} राशिफल`,
                      zodiacFor(sign.sign)?.englishName ?? sign.name,
                    )}
                  </h3>
                </header>
                <p className="rashi-text" lang="hi">
                  {sign.reading}
                </p>
                <dl className="rashi-details">
                  <div>
                    <dt>{copy(locale, 'शुभ अंक', 'Lucky number')}</dt>
                    <dd className="rashi-lucky-number">{sign.luckyNumber || '—'}</dd>
                  </div>
                  <div>
                    <dt>{copy(locale, 'शुभ रंग', 'Lucky colour')}</dt>
                    <dd>
                      {luckyColourSwatch(sign.luckyColour) && (
                        <span
                          className="rashi-colour-chip"
                          style={{ backgroundColor: luckyColourSwatch(sign.luckyColour) }}
                          aria-hidden="true"
                        />
                      )}
                      <span lang="hi">{sign.luckyColour || '—'}</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </motion.div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
      {compact && (
        <Link className="rashi-full-edition" href="/section/rashifal">
          {copy(locale, 'पूरा राशिफल', 'Full horoscope')}
        </Link>
      )}
      <p className="rashi-note">
        {copy(
          locale,
          'ज्योतिष परंपरा पर आधारित सामान्य मार्गदर्शन।',
          'General guidance from astrological tradition.',
        )}
      </p>
    </section>
  );
}
