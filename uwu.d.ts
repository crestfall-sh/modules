import * as uws from 'uWebSockets.js';

export interface cache_control_types {
  no_store: string;
  no_cache: string;
  private_cache: string;
  public_cache: string;
}

export const cache_control_types: cache_control_types;

export interface port_access_types {
  SHARED: number;
  EXCLUSIVE: number;
}

export const port_access_types: port_access_types;

export interface response_headers {
  [key:string]: string;
}

export interface response {
  aborted?: boolean;
  ended?: boolean;
  error?: Error;

  status?: number;
  headers?: response_headers;

  file_path?: string;
  file_name?: string;
  file_content_type?: string;
  file_dispose?: boolean;
  file_cache?: boolean;
  file_cache_max_age_ms?: number;

  text?: string;
  html?: string;
  json?: any;
  buffer?: Buffer;

  start?: number;
  end?: number;
  took?: number;
}

export interface cached_file { 
  file_name: string;
  file_content_type: string;
  buffer: Buffer;
  timestamp: number;
}

export interface request_headers {
  host: string;
  origin: string;
  accept: string;
  accept_encoding: string;
  content_type: string;
  user_agent: string;
  cookie: string;
  x_forwarded_proto: string;
  x_forwarded_host: string;
  x_forwarded_for: string;
}

export interface request_body_part {
  name: string;
  data: ArrayBuffer;
  type?: string;
  filename?: string;
}

export interface request_body {
  buffer: Buffer;
  json: any;
  parts: request_body_part[];
}

export interface request {
  url: string;
  method: string;
  headers: request_headers;
  query: URLSearchParams;
  body: request_body;
  ip_address: string;
  error?: Error;
}

export type handler = (response: response, request: request) => void;
export type internal_handler = (res: uws.HttpResponse, handler: handler, response: response, request: request) => void;
export type initial_handler = (res: uws.HttpResponse, req: uws.HttpRequest) => void;
export type create_handler = (handler: handler) => initial_handler;
export const create_handler: create_handler;

export type create_static_handler = (app: uws.TemplatedApp, url_pathname: string, local_directory: string, response_override: response) => void;
export const create_static_handler: create_static_handler;

export type serve_http = (app: uws.TemplatedApp, port_access_type: number, port: number) => Promise<uws.us_listen_socket>;
export const serve_http: serve_http;

export * as uws from 'uWebSockets.js';