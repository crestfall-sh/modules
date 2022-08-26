// @ts-check

import React from 'react';
import { assert } from './assert.mjs';

/**
 * @type {import('./useHistory').useHistory}
 */
export const useHistory = () => {

  const [previous_pathname, set_previous_pathname] = React.useState('');
  const [previous_search, set_previous_search] = React.useState(null);
  const [previous_hash, set_previous_hash] = React.useState(window.location.hash);
  const [pathname, set_pathname] = React.useState(window.location.pathname);
  const [search, set_search] = React.useState(window.location.search);
  const [hash, set_hash] = React.useState(window.location.hash);

  /**
   * @type {import('./useHistory').push}
   */
  const push = React.useCallback((next_pathname, next_search) => {
    assert(typeof next_pathname === 'string');
    if (next_search instanceof Object) {
      window.history.pushState(null, null, next_pathname.concat('?', new URLSearchParams(next_search).toString()));
    } else {
      window.history.pushState(null, null, next_pathname);
    }
    window.dispatchEvent(new Event('popstate'));
  }, []);

  /**
   * @type {import('./useHistory').replace}
   */
  const replace = React.useCallback((next_pathname, next_search) => {
    assert(typeof next_pathname === 'string');
    if (next_search instanceof Object) {
      window.history.replaceState(null, null, next_pathname.concat('?', new URLSearchParams(next_search).toString()));
    } else {
      window.history.replaceState(null, null, next_pathname);
    }
    window.dispatchEvent(new Event('popstate'));
  }, []);

  React.useEffect(() => {
    const popstate_listener = () => {
      set_previous_pathname(pathname);
      set_previous_search(search);
      set_previous_hash(hash);
      set_pathname(window.location.pathname);
      set_search(window.location.search);
      set_hash(window.location.hash);
    };
    window.addEventListener('popstate', popstate_listener);
    return () => {
      window.removeEventListener('popstate', popstate_listener);
    };
  }, [pathname, search, hash]);

  /**
   * @type {import('./useHistory').history}
   */
  const history = {
    previous_pathname,
    previous_search,
    previous_hash,
    pathname,
    search,
    hash,
    push,
    replace,
  };

  return history;
};