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

export interface select_response<T> {
  items: T[];
  count: number;
  explain: Record<string, string>[];
}

export interface properties {
  sql?: sql;
}

export interface methods<T> extends properties {
  drop_table?: () => Promise<void>;
  create_table?: () => Promise<void>;
  insert?: (items: T[]) => Promise<T[]>;
  select?: (options?: options) => Promise<select_response<T>>;
  first?: (options?: options) => Promise<T>;
  update?: (item: T) => Promise<T>;
  remove?: (id: number) => Promise<void>;
}

export interface table<T> extends methods<T> {
  name: string; // sql-friendly name, snake-case
  name_alt: string; // url-friendly name, kebab-case
  columns: column[];
  hydrate?: (item: T) => Promise<T>;
  cleanup?: (item: T) => Promise<T>;
  on_insert?: (items: T[]) => Promise<void>; // deferred to process.nextTick, wrap with try-catch
  on_update?: (item: T) => Promise<void>; // deferred to process.nextTick, wrap with try-catch
  on_remove?: (id: number) => Promise<void>; // deferred to process.nextTick, wrap with try-catch
}

export type item = Record<string, any>;

export type drop_table<T> = (sql: sql, table: table<T>) => Promise<void>;
export type create_table<T> = (sql: sql, table: table<T>) => Promise<void>;
export type validate_item<T> = (table: table<T>, item: item, creating: boolean) => void;

export type insert<T> = (sql: sql, table: table<T>, items: item[]) => Promise<T[]>;
export interface options {
  // filter
  where?: string;
  eq?: boolean|string|number;
  neq?: boolean|string|number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  is?: boolean;
  is_not?: boolean;
  // sort
  ascend?: string;
  descend?: string;
  // pagination
  limit?: number;
  offset?: number;
  // count
  count?: boolean;
  // explain
  explain?: boolean;
  // hydrate
  hydrate?: boolean;
  // cleanup
  cleanup?: boolean;
}
export type select<T> = (sql: sql, table: table<T>, options: options) => Promise<select_response<T>>;
export type first<T> = (sql: sql, table: table<T>, options: options) => Promise<T>;
export type update<T> = (sql: sql, table: table<T>, item: item) => Promise<T>;
export type remove<T> = (sql: sql, table: table<T>, id: number) => Promise<void>;

export type assign_table_methods = (sql: sql, table: table<any>) => void;
export const assign_table_methods: assign_table_methods;

export type connect = (host: string, port: number, username: string, password: string, database: string) => sql;
export const connect: connect;