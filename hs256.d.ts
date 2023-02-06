
export interface header {
  alg: string;
  typ: string;
}

/**
 * - https://typesense.org/docs/0.24.0/api/api-keys.html
 */
export interface typesense_key {
  /**
   * By default Typesense will auto-generate a random key for you, when this parameter is not specified. 
   */
  value?: string;
  /**
   * List of allowed actions. See next table for possible values.
   */
  actions: string[];
  /**
   * List of collections that this key is scoped to. Supports regex. Eg: coll.* will match all collections that have "coll" in their name.
   */
  collections: string[];
  /**
   * Internal description to identify what the key is for
   */
  description: string;
  /**
   * Unix timestamp until which the key is valid.
   */
  expires_at?: number;
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
   * typesense api key
   */
  typesense_key?: typesense_key;

}

export interface token_data {
  header: header;
  payload: payload;
}