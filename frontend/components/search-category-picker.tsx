'use client';

import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select } from 'radix-ui';
import { useState } from 'react';
import styles from './search-category-picker.module.css';

const ALL = 'all';

export function SearchCategoryPicker({ category, label, allLabel, options }: {
  category: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  const [value, setValue] = useState(category || ALL);
  return (
    <Select.Root value={value} onValueChange={setValue}>
      <input type="hidden" name="category" value={value === ALL ? '' : value} />
      <Select.Trigger type="button" aria-label={label} className={`search-category-trigger ${styles.trigger}`}>
        <span className={styles.value}><Select.Value /></span>
        <Select.Icon asChild><ChevronDown size={16} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={styles.panel} position="popper" sideOffset={5} collisionPadding={10}>
          <Select.ScrollUpButton className={styles.scroll}><ChevronUp size={15} /></Select.ScrollUpButton>
          <Select.Viewport className={styles.options}>
            {[{ value: ALL, label: allLabel }, ...options].map((option) => (
              <Select.Item key={option.value} value={option.value} className={styles.option}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator><Check size={15} aria-hidden="true" /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className={styles.scroll}><ChevronDown size={15} /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
