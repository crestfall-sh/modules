// @ts-check

import React from 'react';

/**
 * @param {string} next_value
 * @param {number} next_timeout
 * @returns {string}
 */
export const useDebounce = (next_value, next_timeout) => {
  const [value, set_value] = React.useState('');
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      set_value(next_value);
    }, next_timeout);
    return () => {
      clearTimeout(timeout);
    };
  }, [next_value, next_timeout]);
  return value;
};