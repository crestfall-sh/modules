export interface config {

  http_hostname: string;
  http_port: number;

  postgresql_host: string;
  postgresql_port: number;
  postgresql_username: string;
  postgresql_password: string;
  postgresql_database: string;

  telegram_token: string;

}

export const config: config;