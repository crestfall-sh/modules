// @ts-check

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
  /**
   * @type {[T, React.Dispatch<T>]}
   */
  const [value, set_value] = React.useState(JSON.parse(localStorage.getItem(key)) || default_value);
  React.useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
    /**
     * @param {StorageEvent} e
     */
    const storage_event_listener = (e) => {
      if (e.key === key) {
        set_value(JSON.parse(localStorage.getItem(key)) || default_value);
      }
    };
    window.addEventListener('storage', storage_event_listener);
    return () => {
      window.removeEventListener('storage', storage_event_listener);
    };
  }, [key, default_value, value]);
  return [value, set_value];
};