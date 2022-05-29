
import * as grammyjs_types from '@grammyjs/types';

export interface file {
  name: string;
  buffer: Buffer;
}

export type endpoint = (token: string, method: string) => string;
export const endpoint: create_endpoint;

export type json = (url: string, body: any) => Promise<any>;
export const json: json;

export interface multipart_body {
  [key: string]: string|file;
}
export type multipart = (url: string, body: multipart_body) => Promise<any>;
export const multipart: multipart;

export interface send_message_body {
  chat_id: number;
  text: string;
  parse_mode?: string;
  [key: string]: any;
}
export type send_message = (token: string, body: send_message_body) => Promise<any>;
export const send_message: send_message;

export interface delete_message_body {
  chat_id: number;
  message_id: number;
  [key: string]: any;
}
export type delete_message = (token: string, body: delete_message_body) => Promise<any>;
export const delete_message: delete_message;

export interface send_photo_body {
  chat_id: number;
  caption?: string;
  photo: file;
  [key: string]: any;
}
export type send_photo = (token: string, body: send_photo_body) => Promise<undici2.response>;
export const send_photo: send_photo;

export type delete_webhook = (token: string) => Promise<any>;
export const delete_webhook: delete_webhook;

export interface set_webhook_body {
  url: string;
  max_connections: number;
  allowed_updates: string[];
  [key: string]: any;
}
export type set_webhook = (token: string, body: set_webhook_body) => Promise<any>;
export const set_webhook: set_webhook;

export interface get_updates_body {
  offset?: number;
  allowed_updates: string[];
  [key: string]: any;
}
export type get_updates = (token: string, body: get_updates_body) => Promise<any>;
export const get_updates: get_updates;

export type stream_update = (update: grammyjs_types.Update) => Promise<void>;
export type stream_updates = (token: string, stream_update: stream_update) => Promise<any>;
export const stream_updates: stream_updates;

export type get_me = (token: string) => Promise<undici2.response>;
export const get_me: get_me;

export interface get_chat_administrators_body {
  chat_id: number;
  [key: string]: any;
}
export type get_chat_administrators = (token: string, body: get_chat_administrators_body) => Promise<undici2.response>;
export const get_chat_administrators: get_chat_administrators;

export type code = (value: string) => string;
export type text = (value: string) => string;
export type url = (value: string) => string;