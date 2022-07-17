// @ts-check

import * as redis from './redis.mjs';
import { assert } from './assert.mjs';

process.nextTick(async () => {

  const client = redis.connect('localhost', 6379);
  assert(client instanceof Object);

  client.events.on('ready', async () => {

    {
      const set_response = await redis.exec(client.connection, 'SET', 'foo', 'bar');
      console.log({ set_response });
      assert(typeof set_response === 'string');
      assert(set_response === 'OK');

      const get_response = await redis.exec(client.connection, 'GET', 'foo');
      console.log({ get_response });
      assert(typeof get_response === 'string');
      assert(get_response === 'bar');
    }

    {
      const set_response = await redis.exec(client.connection, 'SET', 'foo', 'baz', 'GET');
      console.log({ set_response });
      assert(typeof set_response === 'string');
      assert(set_response === 'bar');

      const get_response = await redis.exec(client.connection, 'GET', 'foo');
      console.log({ get_response });
      assert(typeof get_response === 'string');
      assert(get_response === 'baz');
    }

    {
      const set_response = await redis.exec(client.connection, 'SET', 'foo', 'baf', 'PX', '250');
      console.log({ set_response });
      assert(typeof set_response === 'string');
      assert(set_response === 'OK');

      await new Promise((resolve) => setTimeout(resolve, 150));
      const get_response = await redis.exec(client.connection, 'GET', 'foo');
      console.log({ get_response });
      assert(get_response === 'baf');

      await new Promise((resolve) => setTimeout(resolve, 500));
      const get_response2 = await redis.exec(client.connection, 'GET', 'foo');
      console.log({ get_response2 });
      assert(get_response2 === null);
    }

    {
      const get_response = await redis.exec(client.connection, 'GET', 'non-existent');
      console.log({ get_response });
      assert(get_response === null);
    }

    {
      const get_response = await redis.exec(client.connection, 'EXISTS', 'non-existent');
      console.log({ get_response });
      assert(get_response === 0);
    }

    client.connection.end();

  });

});