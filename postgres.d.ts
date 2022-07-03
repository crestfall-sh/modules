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
  read_items_where?: (name: string, operator: string, value: boolean|string|number, limit: number, offset: number) => Promise<T[]>;
  read_item?: (id: number) => Promise<T>;
  read_item_where?: (name: string, operator: string, value: boolean|string|number) => Promise<T>;
  update_item?: (item: T) => Promise<T>;
  delete_item?: (id: number) => Promise<void>;
}

export interface table<T> extends methods<T> {
  name: string;
  columns: column[];
}

export type item = Record<string, any>;

export type drop_table = (sql: sql, table: table) => Promise<void>;
export const drop_table: drop_table;

export type create_table = (sql: sql, table: table) => Promise<void>;
export const create_table: create_table;

export type validate_item = (table: table, item: item, null_id: boolean) => void;
export const validate_item: validate_item;

export type create_items = (sql: sql, table: table, items: item[]) => Promise<any[]>;
export const create_items: create_items;

export type read_items = (sql: sql, table: table, limit: number, offset: number) => Promise<any[]>;
export const read_items: read_items;

export type read_items_where = (sql: sql, table: table, name: string, operator: string, value: boolean|string|number, limit: number, offset: number) => Promise<any[]>;
export const read_items_where: read_items_where;

export type read_item = (sql: sql, table: table, id: number) => Promise<any>;
export const read_item: read_item;

export type read_item_where = (sql: sql, table: table, name: string, operator: string, value: boolean|string|number) => Promise<any>;
export const read_item_where: read_item_where;

export type update_item = (sql: sql, table: table, item: item) => Promise<any>;
export const update_item: update_item;

export type delete_item = (sql: sql, table: table, id: number) => Promise<void>;
export const delete_item: delete_item;

export type assign_table_methods = (sql: sql, table: table<any>) => void;
export const assign_table_methods: assign_table_methods;