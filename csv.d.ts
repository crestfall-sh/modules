import events from 'events';

export interface row {
  value: string;
  columns: string[];
}

export type on_rows_listener = (rows: row[]) => void;

export type on_rows = (name: string, listener: on_rows_listener) => void;

export type on_end = (name: string) => void;

export interface emitter {
  on: on_rows|on_end;
}