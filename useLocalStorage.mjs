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
  }, [key, value]);
  return [value, set_value];
};