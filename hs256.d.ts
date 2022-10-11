// https://www.rfc-editor.org/rfc/rfc7519#section-4

export interface header {
  alg: string;
  typ: string;
}

export interface payload {
  iss?: string; // issuer
  sub?: string; // subject
  aud?: string; // audience
  exp?: number; // expiration time
  nbf?: number; // not before time
  iat?: number; // issued at time
  jti?: string; // jwt id
  role?: string;
  [key: string]: any;
}