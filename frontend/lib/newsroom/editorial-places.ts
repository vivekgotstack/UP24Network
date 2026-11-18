import { cities, regions } from '@/lib/regions';
import { newsSections } from '@/lib/sections';

export type EditorialChoice = {
  id: string;
  value: string;
  label: string;
  detail?: string;
  search: string;
  region?: string;
};

export function editorialSearch(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim();
}

export const sectionChoices: readonly EditorialChoice[] = newsSections.map((section) => ({
  id: section.slug,
  value: section.name,
  label: section.name,
  detail: section.title,
  search: editorialSearch(`${section.name} ${section.title} ${section.slug}`),
}));

export const existingCityChoices: readonly EditorialChoice[] = cities.map((city) => {
  const region = regions.find(({ slug }) => slug === city.region);
  return {
    id: city.slug,
    value: city.title,
    label: city.aliases.find((alias) => /^[a-z]/i.test(alias)) ?? city.title,
    detail: `${city.title}${region ? ` · ${region.title}` : ''}`,
    search: editorialSearch(
      [city.title, region?.title ?? '', city.region, ...city.aliases].join(' '),
    ),
    region: city.region,
  };
});

let cityChoices: readonly EditorialChoice[] | undefined;

export async function loadCityChoices(): Promise<readonly EditorialChoice[]> {
  if (cityChoices) return cityChoices;
  const { default: catalogue } = await import('./data/up-urban-places.json');
  const known = new Map(
    cities
      .filter(({ region }) => region === 'uttar-pradesh')
      .flatMap((city) => city.aliases.map((alias) => [editorialSearch(alias), city.slug] as const)),
  );
  const boroughs = new Map<string, Set<string>>();
  for (const [, rawName, districtIndex] of catalogue.places) {
    const name = editorialSearch(String(rawName));
    const district = catalogue.districts[Number(districtIndex)][0];
    const sameName = boroughs.get(name) ?? new Set<string>();
    sameName.add(district);
    boroughs.set(name, sameName);
  }
  const enriched = new Map(existingCityChoices.map((city) => [city.id, city]));
  for (const [code, rawName, districtIndex] of catalogue.places) {
    const label = String(rawName);
    const name = editorialSearch(label);
    const [district, hindi, ...aliases] = catalogue.districts[Number(districtIndex)];
    const shared = (boroughs.get(name)?.size ?? 0) > 1;
    const current = shared ? undefined : enriched.get(known.get(name) ?? '');
    const search = editorialSearch(
      `${label} ${district} ${hindi} ${aliases.join(' ')} Uttar Pradesh उत्तर प्रदेश`,
    );
    if (current) {
      enriched.set(current.id, {
        ...current,
        detail: `${district} · ${hindi}`,
        search: `${current.search} ${search}`,
      });
    } else {
      enriched.set(`up-${code}`, {
        id: `up-${code}`,
        value: shared ? `${label} (${district})` : label,
        label,
        detail: `${district} · ${hindi}`,
        search,
        region: 'uttar-pradesh',
      });
    }
  }
  cityChoices = [...enriched.values()];
  return cityChoices;
}
