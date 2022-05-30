export type x = Headers;

export interface options {
  id?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  files?: File[];
  data?: Record<string, any>;
}

export type request = (url: string, options?: options) => Promise<any>;
