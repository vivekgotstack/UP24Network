'use client';

import { useState } from 'react';
import type { AirQualityCity } from '@/lib/air-quality-api';
import { AirQualityReading, aqiBands } from '@/components/air-quality-reading';
import styles from './air-quality.module.css';

export function AirQualityCityPicker({
  cities,
  initialCity,
  asOf,
}: {
  cities: AirQualityCity[];
  initialCity: string;
  asOf: number;
}) {
  const [selected, setSelected] = useState(initialCity);
  const city = cities.find((entry) => entry.key === selected) ?? cities[0];
  const groups = new Map<string, AirQualityCity[]>();
  for (const entry of cities) {
    const group = groups.get(entry.state);
    if (group) group.push(entry);
    else groups.set(entry.state, [entry]);
  }
  return (
    <div className={styles.picker}>
      <label className={styles.field}>
        शहर चुनें
        <select value={city.key} onChange={(event) => setSelected(event.target.value)}>
          {[...groups]
            .sort(([a], [b]) => a.localeCompare(b, 'hi'))
            .map(([state, entries]) => (
              <optgroup key={state} label={state}>
                {entries.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.city}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      </label>
      <div className={styles.cityPanel} aria-live="polite">
        <div>
          <h2>{city.city}</h2>
          <p>{city.state}</p>
        </div>
        <AirQualityReading city={city} asOf={asOf} />
      </div>
      <details className={styles.legend}>
        <summary>AQI का पैमाना</summary>
        <ul>
          {aqiBands.map((band) => (
            <li key={band.range}>
              <span className={`${styles.range} ${band.color}`}>{band.range}</span> {band.label}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
