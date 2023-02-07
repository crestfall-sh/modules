
export interface header {
  alg: string;
  typ: string;
}

/**
 * - https://www.rfc-editor.org/rfc/rfc7519#section-4
 * - https://www.iana.org/assignments/jwt/jwt.xhtml
 */
export interface payload {


  // ======================
  // Registered Claim Names
  // https://datatracker.ietf.org/doc/rfc7519/
  // ======================  
  /**
   * issued at time
   */
  iat?: number;
  /**
   * not before time
   */
  nbf?: number;
  /**
   * expiration time
   */
  exp?: number;
  /**
   * issuer
   */
  iss?: string;
  /**
   * audience
   */
  aud?: string; // audience
  /**
   * subject (user uuid)
   */
  sub?: string;
  /**
   * jwt id
   */
  jti?: string;


  // ======================
  // Public Claim Names
  // https://www.iana.org/assignments/jwt/jwt.xhtml#claims
  // ======================
  /**
   * role (postgrest spec compliant)
   * - one role only
   */
  role?: string;
  /**
   * scope (oauth2 protocol spec compliant)
   * - lower-kebab-case or lower_snake_case, space-delimited
   */
  scope?: string;


  // ======================
  // Private Claim Names
  // ======================
  /**
   * username
   */
  username?: string;
  /**
   * email address
   */
  email?: string;
  /**
   * roles
   * - lower-kebab-case, comma-delimited
   */
  roles?: string[];
  /**
   * scopes
   * - lower-kebab-case, comma-delimited
   * - permission examples: read, write
   * - permission examples: create, read, update, delete
   * - scope example: write:authorization
   * - scope example: read:projects
   */
  scopes?: string[];
  /**
   * refresh token
   */
  refresh_token?: string;
  /**
   * typesense token
   */
  typesense_token?: string;

}

export interface token_data {
  header: header;
  payload: payload;
}