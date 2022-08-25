// @ts-check

import { useState, useEffect, useCallback } from 'react';
import { assert } from './assert.mjs';

/**
 * @type {import('./useHistory').useHistory}
 */
export const useHistory = () => {

  const [previous_pathname, set_previous_pathname] = useState('');
  const [previous_search, set_previous_search] = useState(null);
  const [pathname, set_pathname] = useState(window.location.pathname);
  const [search, set_search] = useState(window.location.search);

  /**
   * @type {import('./useHistory').push}
   */
  const push = useCallback((next_pathname, next_search) => {
    assert(typeof next_pathname === 'string');
    if (next_search instanceof Object) {
      window.history.pushState(null, null, next_pathname.concat('?', new URLSearchParams(next_search).toString()));
    } else {
      window.history.pushState(null, null, next_pathname);
    }
    window.dispatchEvent(new Event('popstate'));
  }, [pathname]);

  /**
   * @type {import('./useHistory').replace}
   */
  const replace = useCallback((next_pathname, next_search) => {
    assert(typeof next_pathname === 'string');
    if (next_search instanceof Object) {
      window.history.replaceState(null, null, next_pathname.concat('?', new URLSearchParams(next_search).toString()));
    } else {
      window.history.replaceState(null, null, next_pathname);
    }
    window.dispatchEvent(new Event('popstate'));
  }, [pathname]);

  useEffect(() => {
    const popstate_listener = () => {
      set_previous_pathname(pathname);
      set_previous_search(search);
      set_pathname(window.location.pathname);
      set_search(window.location.search);
    };
    window.addEventListener('popstate', popstate_listener);
    return () => {
      window.removeEventListener('popstate', popstate_listener);
    };
  }, []);

  /**
   * @type {import('./useHistory').history}
   */
  const history = {
    previous_pathname,
    previous_search,
    pathname,
    search,
    push,
    replace,
  };

  return history;
};