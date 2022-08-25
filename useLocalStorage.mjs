// @ts-check

import { useState, useEffect } from 'react';
import { assert } from './assert.mjs';

/**
 * @template T
 * @type {import('./useLocalStorage').useLocalStorage<T>}
 * @description uses LocalStorage API + JSON.stringify and JSON.parse
 * @description https://blog.logrocket.com/using-localstorage-react-hooks/
 */
export const useLocalStorage = (key, default_value) => {
  assert(typeof key === 'string');
  /**
   * @type {[T, React.Dispatch<T>]}
   */
  const [value, set_value] = useState(JSON.parse(localStorage.getItem(key)) || default_value);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, set_value];
};