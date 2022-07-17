// @ts-check

import * as redis from './redis.mjs';
import { assert } from './assert.mjs';

process.nextTick(async () => {

  const client = redis.connect('localhost', 6379);
  assert(client instanceof Object);

  client.events.on('ready', async () => {

    {
      const set_response = await redis.exec(client, 'SET', 'foo', 'bar');
      console.log({ set_response });
      assert(typeof set_response === 'string');
      assert(set_response === 'OK');

      const get_response = await redis.exec(client, 'GET', 'foo');
      console.log({ get_response });
      assert(typeof get_response === 'string');
      assert(get_response === 'bar');
    }

    {
      const set_response = await redis.exec(client, 'SET', 'foo', 'baz', 'GET');
      console.log({ set_response });
      assert(typeof set_response === 'string');
      assert(set_response === 'bar');

      const get_response = await redis.exec(client, 'GET', 'foo');
      console.log({ get_response });
      assert(typeof get_response === 'string');
      assert(get_response === 'baz');
    }

    {
      const set_response = await redis.exec(client, 'SET', 'foo', 'baf', 'PX', '250');
      console.log({ set_response });
      assert(typeof set_response === 'string');
      assert(set_response === 'OK');

      await new Promise((resolve) => setTimeout(resolve, 150));
      const get_response = await redis.exec(client, 'GET', 'foo');
      console.log({ get_response });
      assert(get_response === 'baf');

      await new Promise((resolve) => setTimeout(resolve, 500));
      const get_response2 = await redis.exec(client, 'GET', 'foo');
      console.log({ get_response2 });
      assert(get_response2 === null);
    }

    {
      const get_response = await redis.exec(client, 'GET', 'non-existent');
      console.log({ get_response });
      assert(get_response === null);
    }

    {
      const exists_response = await redis.exec(client, 'EXISTS', 'non-existent');
      console.log({ exists_response });
      assert(exists_response === 0);
    }

    {
      const subscribe_response = await redis.exec(client, 'SUBSCRIBE', 'test-channel');
      console.log({ subscribe_response });
    }

    {
      const unsubscribe_response = await redis.exec(client, 'UNSUBSCRIBE', 'test-channel');
      console.log({ unsubscribe_response });
    }

    {
      const publish_response = await redis.exec(client, 'PUBLISH', 'test-channel', 'test');
      assert(publish_response === 0);
      console.log({ publish_response });
    }

    {
      const subscribe_response = await redis.exec(client, 'SUBSCRIBE', 'test-channel');
      console.log({ subscribe_response });

      client.events.on('message', async (channel, data) => {

        console.log({ channel, data });

        const unsubscribe_response = await redis.exec(client, 'UNSUBSCRIBE', 'test-channel');
        console.log({ unsubscribe_response });

        client.connection.end();

      });
    }

    {
      const client2 = redis.connect('localhost', 6379);
      assert(client2 instanceof Object);

      client2.events.on('ready', async () => {
        const publish_response = await redis.exec(client2, 'PUBLISH', 'test-channel', 'test');
        console.log({ publish_response });
        assert(publish_response === 1);
        client2.connection.end();
      });

      await new Promise((resolve) => client2.connection.on('end', resolve));
    }


    {
      const client3 = redis.connect('localhost', 6379);
      assert(client3 instanceof Object);

      client3.events.on('ready', async () => {
        const tracking_response = await redis.exec(client3, 'CLIENT', 'TRACKING', 'ON');
        console.log({ tracking_response });
        const set_response = await redis.exec(client3, 'SET', 'foo', 'bar');
        console.log({ set_response });
        const get_response = await redis.exec(client3, 'GET', 'foo');
        console.log({ get_response });

        const client4 = redis.connect('localhost', 6379);
        assert(client4 instanceof Object);

        client4.events.on('ready', async () => {
          await redis.exec(client4, 'SET', 'foo', 'baz');
        });

        client3.events.on('invalidate', (key) => {
          console.log(`invalidate client-side cached value for key: ${key}`);
          client3.connection.end();
          client4.connection.end();
        });

      });
    }

  });

});