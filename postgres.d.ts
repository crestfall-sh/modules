import * as postgres from 'postgres';

export type sql = postgres.Sql<{ date: string }>;

// name: e.g. rank; postgresql column name
// name_alt: e.g. Rank
// type: e.g. text; postgresql column type
// type_alt: input / select / date / datetime-local; html input element type
export interface column {
  name: string;
  type: string;
  type_alt?: string; // non-postgresql, metadata, for automation
  category?: string; // non-postgresql, metadata, for automation
  caption?: string; // non-postgresql, metadata, for automation
  primary?: boolean;
  unique?: boolean;
  nullable?: boolean;
  references?: string;
}

export interface select_response<Item> {
  items: Item[];
  count: number;
  explain: Record<string, string>[];
}

export interface properties {
  sql?: sql;
}

export interface methods<Item> extends properties {
  drop_table?: () => Promise<void>;
  create_table?: () => Promise<void>;
  insert?: (items: Item[], options?: insert_options) => Promise<Item[]>;
  select?: (options: select_options) => Promise<select_response<Item>>;
  first?: (options: select_options) => Promise<Item>;
  update?: (item: Item, options?: update_options) => Promise<Item>;
  remove?: (id: number) => Promise<void>;
}

// https://stackoverflow.com/a/49579497/19804714
export type RequiredKeys<T> = { [K in keyof T]-?: ({} extends { [P in K]: T[K] } ? never : K) }[keyof T];
export type OptionalKeys<T> = { [K in keyof T]-?: ({} extends { [P in K]: T[K] } ? K : never) }[keyof T];

export interface table<Item> extends methods<Item> {
  name: string; // sql-friendly name, snake-case
  name_alt: string; // url-friendly name, kebab-case
  columns: Record<RequiredKeys<Item>, column>;
  hydrate?: (item: Item) => Promise<Item>;
  cleanup?: (item: Item) => Promise<Item>;
  // deferred to process.nextTick, wrap with try-catch:
  on_insert?: (items: Item[]) => Promise<void>;
  // deferred to process.nextTick, wrap with try-catch:
  on_update?: (item: Item) => Promise<void>;
  // deferred to process.nextTick, wrap with try-catch:
  on_remove?: (id: number) => Promise<void>;
}

export type ItemBase = Record<string, any>;

export type drop_table<Item> = (sql: sql, table: table<Item>) => Promise<void>;
export type create_table<Item> = (sql: sql, table: table<Item>) => Promise<void>;
export type validate_item<Item> = (table: table<Item>, item: ItemBase, creating: boolean) => void;

export interface insert_options {
  // hydrate
  hydrate?: boolean;
  // cleanup
  cleanup?: boolean;
}
export type insert<Item> = (sql: sql, table: table<Item>, items: ItemBase[], options?: insert_options) => Promise<Item[]>;
export interface select_options {
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
export type select<Item> = (sql: sql, table: table<Item>, options: select_options) => Promise<select_response<Item>>;
export type first<Item> = (sql: sql, table: table<Item>, options: select_options) => Promise<Item>;
export interface update_options {
  // hydrate
  hydrate?: boolean;
  // cleanup
  cleanup?: boolean;
}
export type update<Item> = (sql: sql, table: table<Item>, item: ItemBase, options?: update_options) => Promise<Item>;
export type remove<Item> = (sql: sql, table: table<Item>, id: number) => Promise<void>;

export type bind_methods = (sql: sql, table: table<any>) => void;
export const bind_methods: bind_methods;

export type connect = (host: string, port: number, username: string, password: string, database: string) => sql;
export const connect: connect;