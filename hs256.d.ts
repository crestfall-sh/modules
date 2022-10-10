export interface header {
  alg: string;
  typ: string;
}

export interface payload {
  aud?: string;
  exp?: string;
  iat?: string;
  iss?: string;
  sub?: string;
  role?: string;
  [key: string]: any;
}