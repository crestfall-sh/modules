// @ts-check

// Changelog
// - 1.21.3: reflect current items properly
// - 1.21.3: reflect updated items properly

import React from 'react';
import { assert } from './assert.mjs';

/**
 * @template T
 * @param {string} key
 * @param {T} default_value
 * @returns {[T, React.Dispatch<T>]}
 * @description uses LocalStorage API + JSON.stringify and JSON.parse
 * @description https://blog.logrocket.com/using-localstorage-react-hooks/
 */
export const useLocalStorage = (key, default_value) => {
  assert(typeof key === 'string');

  const current_item = localStorage.getItem(key);

  /**
   * @type {[T, React.Dispatch<T>]}
   */
  const [value, set_value] = React.useState(typeof current_item === 'string' ? JSON.parse(current_item) : default_value);

  React.useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
    /**
     * @param {StorageEvent} e
     */
    const storage_event_listener = (e) => {
      if (e.key === key) {
        const updated_item = localStorage.getItem(key);
        if (typeof updated_item === 'string') {
          set_value(JSON.parse(updated_item));
        } else {
          set_value(null);
        }
      }
    };
    window.addEventListener('storage', storage_event_listener);
    return () => {
      window.removeEventListener('storage', storage_event_listener);
    };
  }, [key, default_value, value]);

  return [value, set_value];
};