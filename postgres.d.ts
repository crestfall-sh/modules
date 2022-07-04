import * as postgres from 'postgres';

export type sql = postgres.Sql<{ date: string }>;

export interface column {
  name: string;
  type: string;
  primary?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: string;
  references?: string;
}

export interface methods<T> {
  drop_table?: () => Promise<void>;
  create_table?: () => Promise<void>;
  create_items?: (items: T[]) => Promise<T[]>;
  read_items?: (limit: number, offset: number) => Promise<T[]>;
  read_items_where?: (name: string, value: boolean|string|number, limit: number, offset: number) => Promise<T[]>;
  read_item?: (id: number) => Promise<T>;
  read_item_where?: (name: string, value: boolean|string|number) => Promise<T>;
  update_item?: (item: T) => Promise<T>;
  delete_item?: (id: number) => Promise<void>;
}

export interface table<T> extends methods<T> {
  name: string;
  columns: column[];
}

export type item = Record<string, any>;

export type drop_table<T> = (sql: sql, table: table<T>) => Promise<void>;
export type create_table<T> = (sql: sql, table: table<T>) => Promise<void>;
export type validate_item<T> = (table: table<T>, item: item, null_id: boolean) => void;
export type create_items<T> = (sql: sql, table: table<T>, items: item[]) => Promise<T[]>;
export type read_items<T> = (sql: sql, table: table<T>, limit: number, offset: number) => Promise<T[]>;
export type read_items_where<T> = (sql: sql, table: table<T>, name: string, value: boolean|string|number, limit: number, offset: number) => Promise<any[]>;
export type read_item<T> = (sql: sql, table: table<T>, id: number) => Promise<T>;
export type read_item_where<T> = (sql: sql, table: table<T>, name: string, value: boolean|string|number) => Promise<T>;
export type update_item<T> = (sql: sql, table: table<T>, item: item) => Promise<T>;
export type delete_item<T> = (sql: sql, table: table<T>, id: number) => Promise<void>;

export type assign_table_methods<T> = (sql: sql, table: table<T>) => void;
export const assign_table_methods: assign_table_methods;

export type connect = (host: string, port: number, username: string, password: string, database: string) => sql;
export const connect: connect;