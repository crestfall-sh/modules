export interface config {

  http_hostname: string;
  http_port: number;

  postgresql_host: string;
  postgresql_port: number;
  postgresql_username: string;
  postgresql_password: string;
  postgresql_database: string;

  telegram_token: string;

  s3_region: string;
  s3_hostname: string;
  s3_access_key: string;
  s3_secret_key: string;

}

export const config: config;