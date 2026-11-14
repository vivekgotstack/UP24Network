'use client';

import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { newsSections, sectionGroups, sectionHref } from '@/lib/sections';
import { cities, regions } from '@/lib/regions';

export function SectionMenu() {
  const [query, setQuery] = useState('');
  const term = query.trim().toLocaleLowerCase('hi-IN');
  const matches = (text: string) => text.toLocaleLowerCase('hi-IN').includes(term);
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) setQuery('');
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="section-menu-trigger">
          <Menu size={18} aria-hidden="true" />
          <span>सभी विभाग</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="section-overlay" />
        <Dialog.Content className="section-dialog">
          <div className="section-dialog-heading">
            <div>
              <Dialog.Title>खबरों की हर दिशा</Dialog.Title>
              <Dialog.Description>विषय, राज्य या अपना शहर चुनिए।</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close sections menu">
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <label className="menu-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Find a section or city</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="विषय या शहर तलाशिए"
              maxLength={100}
            />
          </label>
          <div className="menu-quick-links">
            <Dialog.Close asChild>
              <Link href="/latest">ताजा खबरें</Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href="/sections">सभी विभाग</Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href="/regions">राज्य और शहर</Link>
            </Dialog.Close>
          </div>
          <div className="menu-groups">
            {sectionGroups.map((group) => {
              const items = newsSections.filter(
                (section) =>
                  group.slugs.includes(section.slug) && matches(`${section.title} ${section.name}`),
              );
              return items.length ? (
                <nav key={group.title} aria-label={group.title}>
                  <h3>{group.title}</h3>
                  {items.map((section) => (
                    <Dialog.Close key={section.slug} asChild>
                      <Link href={sectionHref(section.name)}>{section.title}</Link>
                    </Dialog.Close>
                  ))}
                </nav>
              ) : null;
            })}
          </div>
          <div className="menu-places">
            <h3>राज्य</h3>
            <nav aria-label="States">
              {regions
                .filter((region) => matches(`${region.title} ${region.slug}`))
                .map((region) => (
                  <Dialog.Close key={region.slug} asChild>
                    <Link href={`/region/${region.slug}`}>{region.title}</Link>
                  </Dialog.Close>
                ))}
            </nav>
            <h3>शहर</h3>
            <nav aria-label="Cities">
              {cities
                .filter((city) => matches(`${city.title} ${city.aliases.join(' ')}`))
                .map((city) => (
                  <Dialog.Close key={city.slug} asChild>
                    <Link href={`/city/${city.slug}`}>{city.title}</Link>
                  </Dialog.Close>
                ))}
            </nav>
          </div>
          {term &&
            !newsSections.some((section) => matches(`${section.title} ${section.name}`)) &&
            !regions.some((region) => matches(`${region.title} ${region.slug}`)) &&
            !cities.some((city) => matches(`${city.title} ${city.aliases.join(' ')}`)) && (
              <p role="status">कोई विभाग या शहर नहीं मिला। दूसरा नाम आजमाइए।</p>
            )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
