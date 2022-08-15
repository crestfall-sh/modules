import stream from 'stream';
import * as uws from 'uWebSockets.js';

export class InternalHeaders extends Map {
  get: (key: string) => string;
  set: (key: string, value: string|number|boolean) => InternalHeaders;
};
export class InternalURLSearchParams extends URLSearchParams {}

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

export interface response {

  aborted: boolean;
  ended: boolean;
  error: Error;

  status: number;
  headers: InternalHeaders;

  file_path: string;
  file_name: string;
  file_content_type: string;
  file_dispose: boolean;
  file_cache: boolean;
  file_cache_max_age_ms: number;

  text: string;
  html: string;
  json: any;
  buffer: Buffer;
  stream: stream.Readable;

}

export interface static_response {
  file_cache?: boolean;
  file_cache_max_age_ms?: number;
  headers?: InternalHeaders;
}

export interface cached_file { 
  file_name: string;
  file_content_type: string;
  buffer: Buffer;
  timestamp: number;
}

export interface request {
  url: string;
  method: string;
  headers: InternalHeaders;
  query: URLSearchParams;
  ip_address: string;
  
  buffer: Buffer;
  json: any;
  parts: uws.MultipartField[];

  error: Error;
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

export type default_headers = Set<string>;
export const default_headers: default_headers;

export * as uws from 'uWebSockets.js';