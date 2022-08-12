// @ts-check

/**
 * @typedef {import('./sessions').session<any>} session
 */

import crypto from 'crypto';
import * as luxon from 'luxon';
import * as redis from './redis.mjs';
import { assert } from './assert.mjs';

const no_redis = process.argv.includes('--no-redis');

/**
 * @type {import('./sessions').connect<any>}
 */
export const connect_no_redis = () => {

  const redis_client = null;

  /**
   * @type {Map<string, session>}
   */
  const map = new Map();

  /**
   * @type {import('./sessions').set_session<any>}
   */
  const set_session = async (session) => {
    assert(session instanceof Object);
    assert(typeof session.id === 'string');
    map.set(session.id, session);
    return null;
  };

  /**
   * @type {import('./sessions').get_session<any>}
   */
  const get_session = async (session_id) => {
    assert(typeof session_id === 'string');
    if (map.has(session_id) === true) {
      const session = map.get(session_id);
      return session;
    }
    return null;
  };

  /**
   * @type {import('./sessions').create_session<any>}
   */
  const create_session = async (data) => {
    assert(data instanceof Object);
    const id = crypto.randomBytes(32).toString('hex');
    const created = luxon.DateTime.now().toISO();
    const session = { id, created, data };
    await set_session(session);
    return session;
  };

  /**
   * @type {import('./sessions').client}
   */
  const client = { redis_client, set_session, get_session, create_session };
  return client;

};

/**
 * @type {import('./sessions').connect<any>}
 */
export const connect = () => {

  if (no_redis === true) {
    return connect_no_redis();
  }

  const redis_client = redis.connect('localhost', 6379);

  /**
   * @type {Set<string>}
   */
  const precache = new Set();

  /**
   * @type {Map<string, session>}
   */
  const cache = new Map();

  redis_client.events.on('ready', async () => {

    /**
     * @type {string}
     */
    const client_tracking_response = await redis.exec(redis_client, 'CLIENT', 'TRACKING', 'ON', 'BCAST', 'PREFIX', 'session:', 'NOLOOP');
    assert(typeof client_tracking_response === 'string');
    assert(client_tracking_response === 'OK');

    /**
     * @type {string[]}
     */
    const keys_response = await redis.exec(redis_client, 'KEYS', 'session:*');
    assert(keys_response instanceof Array);

    if (keys_response.length > 0) {
      keys_response.forEach((key) => {
        assert(key.substring(0, 8) === 'session:');
        const session_id = key.substring(8);
        precache.add(session_id);
      });
    }

  });

  redis_client.events.on('invalidate', async (keys) => {
    assert(keys instanceof Array);
    keys.forEach((key) => {
      assert(typeof key === 'string');
      assert(key.substring(0, 8) === 'session:');
      const session_id = key.substring(8);
      if (precache.has(session_id) === true) {
        precache.delete(session_id);
      }
      if (cache.has(session_id) === true) {
        cache.delete(session_id);
      }
    });
  });

  /**
   * @type {import('./sessions').set_session<any>}
   */
  const set_session = async (session) => {
    assert(session instanceof Object);
    assert(typeof session.id === 'string');
    const set_parameters = [];
    if (precache.has(session.id) === true || cache.has(session.id) === true) {
      set_parameters.push('KEEPTTL');
    } else {
      set_parameters.push('EX', '86400'); // ttl: one day
    }
    /**
     * @type {string}
     */
    const set_response = await redis.exec(redis_client, 'SET', `session:${session.id}`, JSON.stringify(session), ...set_parameters);
    assert(typeof set_response === 'string');
    assert(set_response === 'OK');
    cache.set(session.id, session);
    return null;
  };

  /**
   * @type {import('./sessions').get_session<any>}
   */
  const get_session = async (session_id) => {
    assert(typeof session_id === 'string');
    if (cache.has(session_id) === true) {
      const session = cache.get(session_id);
      return session;
    }
    const response = await redis.exec(redis_client, 'GET', `session:${session_id}`);
    if (typeof response === 'string') {
      const session = JSON.parse(response);
      cache.set(session.id, session);
      return session;
    }
    return null;
  };

  /**
   * @type {import('./sessions').create_session<any>}
   */
  const create_session = async (data) => {
    assert(data instanceof Object);
    const id = crypto.randomBytes(32).toString('hex');
    const created = luxon.DateTime.now().toISO();
    const session = { id, created, data };
    await set_session(session);
    return session;
  };

  /**
   * @type {import('./sessions').client}
   */
  const client = { redis_client, set_session, get_session, create_session };
  return client;

};
