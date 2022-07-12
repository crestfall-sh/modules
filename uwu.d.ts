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

export type headers = Record<string, string>;
export type json = Record<string, any>|any[];

export interface response {

  aborted: boolean;
  ended: boolean;
  error: Error;

  status: number;
  headers: headers;

  file_path: string;
  file_name: string;
  file_content_type?: string;
  file_dispose: boolean;
  file_cache: boolean;
  file_cache_max_age_ms: number;

  text: string;
  html: string;
  json: json;
  buffer: Buffer;

}

export interface static_response {
  file_cache?: boolean;
  file_cache_max_age_ms?: number;
  headers?: headers;
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

export interface request_body {
  buffer: Buffer;
  json: json;
  parts: uws.MultipartField[];
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

export type middleware = (response: response, request: request) => void;
export type apply_middlewares = (res: uws.HttpResponse, middlewares: middleware[], response: response, request: request) => void;
export type uws_handler = (res: uws.HttpResponse, req: uws.HttpRequest) => void;

export type use_middlewares = (...middlewares: middleware[]) => uws_handler;
export const use_middlewares: use_middlewares;

export type use_static_middleware = (app: uws.TemplatedApp, url_pathname: string, local_pathname: string, static_response: static_response) => void;
export const use_static_middleware: use_static_middleware;

export type serve_http = (app: uws.TemplatedApp, port_access_type: number, port: number) => Promise<uws.us_listen_socket>;
export const serve_http: serve_http;

export * as uws from 'uWebSockets.js';