// @ts-check

import fetch, { FormData, File } from 'node-fetch';
import { assert } from './assert.mjs';
import * as proc from './proc.mjs';

/**
 * @type {import('./telegram').endpoint}
 */
export const endpoint = (token, method) => {
  assert(typeof token === 'string');
  assert(typeof method === 'string');
  return `https://api.telegram.org/bot${token}/${method}`;
};


/**
 * @type {import('./telegram').json}
 */
export const json = async (url, body) => {
  assert(typeof url === 'string');
  assert(body instanceof Object);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert(response.status === 200);
  const response_json = await response.json();
  return response_json;
};


/**
 * @type {import('./telegram').multipart}
 */
export const multipart = async (url, body) => {
  assert(typeof url === 'string');
  assert(body instanceof Object);
  const form_data = new FormData();
  Object.entries(body).forEach((entry) => {
    const [key, value] = entry;
    if (value instanceof Object) {
      assert(typeof value.name === 'string');
      assert(value.buffer instanceof Buffer);
      form_data.append(key, new File([value.buffer], value.name));
    } else {
      form_data.append(key, value);
    }
  });
  const response = await fetch(url, {
    method: 'POST',
    body: form_data,
  });
  assert(response.status === 200);
  const response_json = await response.json();
  return response_json;
};


/**
 * @type {import('./telegram').send_message}
 */
export const send_message = async (token, body) => {
  assert(typeof token === 'string');
  assert(body instanceof Object);
  assert(typeof body.chat_id === 'number');
  assert(typeof body.text === 'string');
  const response = await json(endpoint(token, 'sendMessage'), body);
  return response;
};


/**
 * @type {import('./telegram').delete_message}
 */
export const delete_message = async (token, body) => {
  assert(typeof token === 'string');
  assert(body instanceof Object);
  assert(typeof body.chat_id === 'number');
  assert(typeof body.message_id === 'number');
  const response = await json(endpoint(token, 'deleteMessage'), body);
  return response;
};


/**
 * @type {import('./telegram').send_photo}
 */
export const send_photo = async (token, body) => {
  assert(typeof token === 'string');
  assert(body instanceof Object);
  assert(typeof body.chat_id === 'number');
  assert(body.caption === undefined || typeof body.caption === 'string');
  assert(body.photo instanceof Object);
  assert(typeof body.photo.name === 'string');
  assert(body.photo.buffer instanceof Buffer);
  const response = await multipart(endpoint(token, 'sendPhoto'), body);
  return response;
};


/**
 * @type {import('./telegram').delete_webhook}
 */
export const delete_webhook = async (token) => {
  assert(typeof token === 'string');
  const response = await json(endpoint(token, 'deleteWebhook'), {});
  return response;
};


/**
 * @type {import('./telegram').set_webhook}
 */
export const set_webhook = async (token, body) => {
  assert(typeof token === 'string');
  assert(body instanceof Object);
  assert(typeof body.url === 'string');
  assert(typeof body.max_connections === 'number');
  assert(body.allowed_updates instanceof Array);
  await delete_webhook(token);
  const response = await json(endpoint(token, 'setWebhook'), body);
  return response;
};


/**
 * @type {import('./telegram').get_updates}
 */
export const get_updates = async (token, body) => {
  assert(typeof token === 'string');
  assert(body instanceof Object);
  assert(body.offset === undefined || typeof body.offset === 'number');
  assert(body.allowed_updates instanceof Array);
  const response = await json(endpoint(token, 'getUpdates'), body);
  assert(response instanceof Object);
  assert(response.ok === true);
  assert(response.result instanceof Array);
  return response.result;
};


/**
 * @type {import('./telegram').stream_updates}
 */
export const stream_updates = async (token, on_update) => {
  assert(typeof token === 'string');
  assert(on_update instanceof Function);
  await delete_webhook(token);
  const stream_update = async (offset) => {
    assert(offset === undefined || typeof offset === 'number');
    try {
      const updates = await get_updates(token, { offset, allowed_updates: ['message'] });
      for (let i = 0, l = updates.length; i < l; i += 1) {
        const update = updates[i];
        try {
          await on_update(update);
        } catch (e) {
          console.error(e);
        }
      }
      await proc.sleep(1000);
      const next_offset = updates.length === 0 ? undefined : updates[updates.length - 1].update_id + 1;
      process.nextTick(stream_update, next_offset);
    } catch (e) {
      console.error(e.message);
    }
  };
  process.nextTick(stream_update);
};


/**
 * @type {import('./telegram').get_me}
 */
export const get_me = async (token) => {
  assert(typeof token === 'string');
  const response = await json(endpoint(token, 'getMe'), {});
  assert(response instanceof Object);
  return response;
};


/**
 * @type {import('./telegram').get_chat_administrators}
 */
export const get_chat_administrators = async (token, body) => {
  assert(typeof token === 'string');
  assert(body instanceof Object);
  assert(typeof body.chat_id === 'number');
  const response = await json(endpoint(token, 'getChatAdministrators'), body);
  return response;
};


/**
 * @type {import('./telegram').code}
 */
export const code = (value) => {
  assert(typeof value === 'string');
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`');
};


/**
 * @type {import('./telegram').text}
 */
export const text = (value) => {
  assert(typeof value === 'string');
  return value
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
};


/**
 * @type {import('./telegram').url}
 */
export const url = (value) => {
  assert(typeof value === 'string');
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\)/g, '\\)');
};