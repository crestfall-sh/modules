// @ts-check

import * as redis from './redis.mjs';
import { assert } from './assert.mjs';

process.nextTick(async () => {

  const client = redis.connect('localhost', 6379);
  assert(client instanceof Object);

  client.events.on('ready', async () => {

    {
      const set_response = await redis.set(client.connection, 'foo', 'bar');
      assert(typeof set_response === 'string');
      assert(set_response === 'OK');

      const get_response = await redis.get(client.connection, 'foo');
      assert(typeof get_response === 'string');
      assert(get_response === 'bar');
    }


    {
      const set_response = await redis.set(client.connection, 'foo', 'baz', 'GET');
      assert(typeof set_response === 'string');
      assert(set_response === 'bar');

      const get_response = await redis.get(client.connection, 'foo');
      assert(typeof get_response === 'string');
      assert(get_response === 'baz');
    }

    {
      const set_response = await redis.set(client.connection, 'foo', 'baf', 'PX', '250');
      assert(typeof set_response === 'string');
      assert(set_response === 'OK');

      await new Promise((resolve) => setTimeout(resolve, 150));
      const get_response = await redis.get(client.connection, 'foo');
      assert(get_response === 'baf');

      await new Promise((resolve) => setTimeout(resolve, 500));
      const get_response2 = await redis.get(client.connection, 'foo');
      assert(get_response2 === null);
    }

    client.connection.end();

  });

});