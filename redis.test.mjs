// @ts-check

import * as redis from './redis.mjs';
import { assert } from './assert.mjs';

process.nextTick(async () => {

  const client = redis.connect('localhost', 6379);
  assert(client instanceof Object);

  client.events.on('connected', async () => {
    console.log('connected');
  });

  client.events.on('ready', async () => {

    console.log('ready');

    const set_response = await redis.set(client.connection, 'foo', 'bar');
    assert(typeof set_response === 'string');
    assert(set_response === 'OK');

    const get_response = await redis.get(client.connection, 'foo');
    assert(typeof get_response === 'string');
    assert(get_response === 'bar');

    client.connection.end();

  });

});