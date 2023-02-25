import stream from 'stream';
import * as uws from 'uWebSockets.js';

export type InternalHeaders = Map<string, string>;
export type InternalURLSearchParams = URLSearchParams;

export interface cache_control_types {
  /**
   * disallow caching
   */
  no_store: string;
  /**
   * allow caching, must revalidate:
   */
  no_cache: string;
  /**
   * allow private caching, no revalidate, one hour:
   */
  private_cache: string;
  /**
   * allow public caching, no revalidate, one day:
   */
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
  error_write_message: boolean;

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

export interface cached_file { 
  file_name: string;
  file_content_type: string;
  buffer: Buffer;
  timestamp: number;
}

export interface request<T> {
  url: string;
  method: string;
  headers: InternalHeaders;
  search_params: InternalURLSearchParams;
  ip_address: string;
  
  buffer: Buffer;
  json: T;
  parts: uws.MultipartField[];

  error: Error;
}

export type uws_handler = (res: uws.HttpResponse, req: uws.HttpRequest) => void;
export type middleware<T> = (response: response, request: request<T>) => Promise<void>;
export type apply = (res: uws.HttpResponse, middlewares: middleware[], response: response, request: request<any>) => void;
export type use = (...middlewares: middleware<any>[]) => uws_handler;
export const use: use;

export type cors = (app: uws.TemplatedApp) => void;
export const cors: cors;

export interface serve_cache_record {
  buffer: Buffer;
  buffer_hash: string;
  gzip_buffer: Buffer;
  gzip_buffer_hash: string;
}
export interface serve_record {
  /**
   * @description URL prefix to check.
   * @example '/assets/'
   */
  url: string;
  /**
   * @description Local directory to serve files from.
   * @example path.join(process.cwd(), '/assets/');
   */
  directory: string;
  /**
   * @description Additional response headers.
   * @example new Map([['Cache-Control', 'no-store']])
   */
  headers?: Map<string, string>;
  /**
   * @description Enable in-memory caching of buffers.
   */
  use_cache?: boolean;
}
export interface serve_options {
  /**
   * @description Your UWS Web Application.
   */
  app: uws.TemplatedApp;
  /**
   * @description Default HTML file to serve.
   * @example '/index.html'
   */
  index?: string;
  /**
   * @description Included pairs of url prefix and local directory to be served.
   * @example [{ url: '/assets/', directory: path.join(process.cwd(), '/assets/') }]
   * @example
   * [
   *   {
   *     url: '/assets/',
   *     directory: path.join(process.cwd(), '/assets/'),
   *     headers: new Map([['Cache-Control', 'no-store']]),
   *     use_cache: true,
   *   }
   * ]
   */
  include: serve_record[];
  /**
   * @description Excluded url prefixes.
   * @example '/api/'
   */
  exclude: string[];
  /**
   * @description Set to true to log debug information.
   */
  debug?: boolean;
}
export type serve = (serve_options: serve_options) => void;
export const serve: serve;

export type http = (app: uws.TemplatedApp, port_access_type: number, port: number) => Promise<uws.us_listen_socket>;
export const http: http;

export type default_headers = Set<string>;
export const default_headers: default_headers;

export * as uws from 'uWebSockets.js';