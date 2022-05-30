export type x = Headers;

export interface options {
  id?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  files?: File[];
  data?: any;
}

export interface response {
  status: number;
  headers: Headers;
  data: any;
}

export type request = (url: string, options?: options) => Promise<response>;
