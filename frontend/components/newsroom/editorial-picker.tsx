'use client';

import { Dialog } from 'radix-ui';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  editorialSearch,
  existingCityChoices,
  loadCityChoices,
  sectionChoices,
  type EditorialChoice,
} from '@/lib/newsroom/editorial-places';
import styles from './editorial-picker.module.css';

const RESULT_LIMIT = 36;
const DRAG_TYPE = 'application/x-up24-editorial-choice';

type PickerProps = {
  label: string;
  value: string;
  choices: readonly EditorialChoice[];
  choose: (value: string, region?: string) => void;
  searchHint: string;
  onOpen?: () => void;
  loading?: boolean;
  unavailable?: boolean;
  clearable?: boolean;
  custom?: boolean;
};

function Picker({
  label,
  value,
  choices,
  choose,
  searchHint,
  onOpen,
  loading,
  unavailable,
  clearable,
  custom,
}: PickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(RESULT_LIMIT);
  const [dragging, setDragging] = useState(false);
  const field = useId();
  const search = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const normalizedQuery = editorialSearch(query);
  const words = normalizedQuery ? normalizedQuery.split(' ') : [];
  const matches = choices.filter(({ search }) => words.every((word) => search.includes(word)));
  const visible = matches.slice(0, limit);
  const customValue = query.trim();

  function updateOpen(next: boolean) {
    setOpen(next);
    setQuery('');
    setLimit(RESULT_LIMIT);
    setDragging(false);
    if (next) onOpen?.();
  }

  function select(next: string, region?: string) {
    choose(next, region);
    updateOpen(false);
  }

  function moveFocus(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const buttons = Array.from(
      results.current?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    );
    if (!buttons.length) return;
    event.preventDefault();
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) search.current?.focus();
    else buttons[Math.min(nextIndex, buttons.length - 1)].focus();
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const dropped = choices.find(({ id }) => id === event.dataTransfer.getData(DRAG_TYPE));
    setDragging(false);
    if (dropped) select(dropped.value, dropped.region);
  }

  return (
    <Dialog.Root open={open} onOpenChange={updateOpen}>
      <div className={styles.field}>
        <span>{label}</span>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            className={styles.trigger}
            aria-label={`${label}: ${value || 'Choose'}`}
          >
            <span>{value || `Choose ${label.toLowerCase()}`}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </Button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.tray}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            search.current?.focus();
          }}
        >
          <header className={styles.header}>
            <div>
              <Dialog.Title>Choose {label.toLowerCase()}</Dialog.Title>
              <Dialog.Description>{searchHint}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Close picker">
                <X size={19} />
              </Button>
            </Dialog.Close>
          </header>
          <div className={styles.search}>
            <label className="sr-only" htmlFor={field}>
              Search {label.toLowerCase()}
            </label>
            <Search size={17} aria-hidden="true" />
            <input
              ref={search}
              id={field}
              type="search"
              autoComplete="off"
              value={query}
              onKeyDown={moveFocus}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(RESULT_LIMIT);
              }}
              placeholder={`Search ${label.toLowerCase()}`}
            />
          </div>
          <div className={styles.scroll} aria-busy={loading}>
            {loading && <p role="status">Loading Uttar Pradesh locations…</p>}
            {unavailable && (
              <p role="status">
                The full location directory could not load. Try reopening this picker.
              </p>
            )}
            {!visible.length && !loading && <p role="status">No matching {label.toLowerCase()}.</p>}
            <ul ref={results} aria-label={`${label} results`} onKeyDown={moveFocus}>
              {visible.map((choice) => (
                <li key={choice.id}>
                  <button
                    type="button"
                    className={styles.option}
                    aria-pressed={choice.value === value}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(DRAG_TYPE, choice.id);
                      event.dataTransfer.effectAllowed = 'copy';
                      setDragging(true);
                    }}
                    onDragEnd={() => setDragging(false)}
                    onClick={() => select(choice.value, choice.region)}
                  >
                    <span>
                      <strong>{choice.label}</strong>
                      {choice.detail && <small>{choice.detail}</small>}
                    </span>
                    {choice.value === value && <Check size={18} aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
            {matches.length > visible.length && (
              <Button type="button" variant="ghost" onClick={() => setLimit(limit + RESULT_LIMIT)}>
                Show more results
              </Button>
            )}
          </div>
          <footer className={styles.footer}>
            {custom && customValue.length > 0 && customValue.length <= 100 && (
              <Button type="button" variant="outline" onClick={() => select(customValue)}>
                Use typed dateline
              </Button>
            )}
            {clearable && value && (
              <Button type="button" variant="ghost" onClick={() => select('')}>
                Clear {label.toLowerCase()}
              </Button>
            )}
            <div
              className={styles.drop}
              data-dragging={dragging}
              onDragOver={(event) => {
                if (dragging) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDrop={drop}
            >
              Drop selection here
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function EditorialSectionPicker({
  value,
  choose,
}: {
  value: string;
  choose: (value: string) => void;
}) {
  return (
    <Picker
      label="Section"
      value={value}
      choices={sectionChoices}
      choose={choose}
      searchHint="Search for a section by its English or Hindi name."
    />
  );
}

export function EditorialCityPicker({
  value,
  choose,
  custom,
  required,
}: {
  value: string;
  choose: (value: string, region?: string) => void;
  custom: boolean;
  required: boolean;
}) {
  const [choices, setChoices] = useState(existingCityChoices);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

  async function load() {
    if (state === 'ready' || state === 'loading') return;
    setState('loading');
    try {
      setChoices(await loadCityChoices());
      setState('ready');
    } catch {
      setState('unavailable');
    }
  }

  return (
    <Picker
      label="City"
      value={value}
      choices={choices}
      choose={choose}
      searchHint="Search a city, town or district."
      custom={custom}
      clearable={!required}
      onOpen={() => void load()}
      loading={state === 'loading'}
      unavailable={state === 'unavailable'}
    />
  );
}
