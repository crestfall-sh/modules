// https://www.rfc-editor.org/rfc/rfc7519#section-4

export interface header {
  alg: string;
  typ: string;
}

export interface payload {
  iat?: number; // issued at time
  nbf?: number; // not before time
  exp?: number; // expiration time
  iss?: string; // issuer
  aud?: string; // audience
  sub?: string; // subject
  jti?: string; // jwt id
  role?: string;
  [key: string]: any;
}