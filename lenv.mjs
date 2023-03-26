// @ts-check

/**
 * Load Env
 */

import fs from 'fs';
import assert from 'assert';

/**
 * @param {string} env_path
 */
export const lenv = (env_path) => {
  assert(typeof env_path === 'string');
  assert(fs.existsSync(env_path) === true);
  /**
   * @type {Map<string, string>}
   */
  const env = new Map();
  const lines = fs.readFileSync(env_path, { encoding: 'utf-8' });
  lines.split('\n').forEach((line) => {
    const index = line.indexOf('=');
    const key = line.substring(0, index);
    const value = line.substring(index + 1);
    env.set(key, value);
  });
  return env;
};

export default lenv;