import stream from 'stream';
import * as uws from 'uWebSockets.js';

export class InternalHeaders extends Map<string, string> {}
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

export type serve_transform = (buffer: Buffer) => Buffer;
export type serve = (app: uws.TemplatedApp, base_directory: string, serve_transform: serve_transform) => void;
export const serve: serve;

export type http = (app: uws.TemplatedApp, port_access_type: number, port: number) => Promise<uws.us_listen_socket>;
export const http: http;

export type default_headers = Set<string>;
export const default_headers: default_headers;

export * as uws from 'uWebSockets.js';