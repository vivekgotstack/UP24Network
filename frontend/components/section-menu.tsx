'use client';

import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { newsSections, sectionGroups, sectionHref } from '@/lib/sections';
import { cities, regions, cityTitle, regionTitle } from '@/lib/regions';
import { copy, type SiteLocale } from '@/lib/locale';

export function SectionMenu({ locale = 'hi' }: { locale?: SiteLocale }) {
  const [query, setQuery] = useState('');
  const term = query.trim().normalize('NFC').toLowerCase();
  const matches = (text: string) => text.normalize('NFC').toLowerCase().includes(term);
  const sections = newsSections.filter(({ title, name }) => matches(`${title} ${name}`));
  const matchingRegions = regions.filter((region) => matches(`${region.title} ${regionTitle(region, 'en')} ${region.slug}`));
  const matchingCities = cities.filter((city) => matches(`${city.title} ${city.aliases.join(' ')}`));
  const allSectionsLabel = copy(locale, 'सभी विभाग', 'All sections');
  const statesLabel = copy(locale, 'राज्य', 'States');
  const citiesLabel = copy(locale, 'शहर', 'Cities');
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) setQuery('');
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="section-menu-trigger" aria-label={allSectionsLabel}>
          <Menu size={18} aria-hidden="true" />
          <span>{allSectionsLabel}</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="section-overlay" />
        <Dialog.Content className="section-dialog">
          <div className="section-dialog-heading">
            <div>
              <Dialog.Title>{allSectionsLabel}</Dialog.Title>
              <Dialog.Description>{copy(locale, 'विषय, राज्य या अपना शहर चुनिए।', 'Choose a topic, state, or city.')}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={copy(locale, 'विभाग सूची बंद करें', 'Close sections menu')}>
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <label className="menu-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">{copy(locale, 'विभाग या शहर खोजें', 'Find a section or city')}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy(locale, 'विषय या शहर खोजें', 'Topic or city')}
              maxLength={100}
            />
          </label>
          <div className="menu-quick-links">
            <Dialog.Close asChild>
              <Link href="/latest">{copy(locale, 'ताज़ा खबरें', 'Latest news')}</Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href="/sections">{allSectionsLabel}</Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href="/regions">{copy(locale, 'राज्य और शहर', 'States and cities')}</Link>
            </Dialog.Close>
          </div>
          <div className="menu-groups">
            {sectionGroups.map((group) => {
              const items = sections.filter((section) => group.slugs.includes(section.slug));
              const title = copy(locale, group.title, group.englishTitle);
              return items.length ? (
                <nav key={group.title} aria-label={title}>
                  <h3>{title}</h3>
                  {items.map((section) => (
                    <Dialog.Close key={section.slug} asChild>
                      <Link href={sectionHref(section.name)}>{copy(locale, section.title, section.name)}</Link>
                    </Dialog.Close>
                  ))}
                </nav>
              ) : null;
            })}
          </div>
          <div className="menu-places">
            <h3>{statesLabel}</h3>
            <nav aria-label={statesLabel}>
              {matchingRegions.map((region) => (
                  <Dialog.Close key={region.slug} asChild>
                    <Link href={`/region/${region.slug}`}>{regionTitle(region, locale)}</Link>
                  </Dialog.Close>
                ))}
            </nav>
            <h3>{citiesLabel}</h3>
            <nav aria-label={citiesLabel}>
              {matchingCities.map((city) => (
                  <Dialog.Close key={city.slug} asChild>
                    <Link href={`/city/${city.slug}`}>{cityTitle(city, locale)}</Link>
                  </Dialog.Close>
                ))}
            </nav>
          </div>
          {term && !sections.length && !matchingRegions.length && !matchingCities.length && (
              <p role="status">{copy(locale, 'कोई विभाग, राज्य या शहर नहीं मिला।', 'No matching section, state, or city.')}</p>
            )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
