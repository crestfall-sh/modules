import * as postgres from 'postgres';

export type sql = postgres.Sql<{ date: string }>;

export interface column {
  name: string;
  type: string;
  primary?: boolean;
  unique?: boolean;
  nullable?: boolean;
  references?: string;
}

export interface properties {
  operators?: Map<string, postgres.PendingQuery<any>>;
  sql?: sql;
}

export interface methods<T> extends properties {
  drop_table?: () => Promise<void>;
  create_table?: () => Promise<void>;
  insert?: (items: T[]) => Promise<T[]>;
  select?: (options?: options) => Promise<T[]>;
  update?: (item: T) => Promise<T>;
  remove?: (id: number) => Promise<void>;
}

export interface table<T> extends methods<T> {
  name: string;
  columns: column[];
}

export type item = Record<string, any>;

export type drop_table<T> = (sql: sql, table: table<T>) => Promise<void>;
export type create_table<T> = (sql: sql, table: table<T>) => Promise<void>;
export type validate_item<T> = (table: table<T>, item: item, creating: boolean) => void;

export type insert<T> = (sql: sql, table: table<T>, items: item[]) => Promise<T[]>;
export interface options {
  where?: string;
  eq?: boolean|string|number;
  neq?: boolean|string|number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  is?: boolean;
  is_not?: boolean;
  ascend?: string;
  descend?: string;
  limit?: number;
  offset?: number;
}
export type select<T> = (sql: sql, table: table<T>, options: options) => Promise<T[]>;
export type update<T> = (sql: sql, table: table<T>, item: item) => Promise<T>;
export type remove<T> = (sql: sql, table: table<T>, id: number) => Promise<void>;

export type assign_table_methods<T> = (sql: sql, table: table<T>) => void;
export const assign_table_methods: assign_table_methods;

export type connect = (host: string, port: number, username: string, password: string, database: string) => sql;
export const connect: connect;