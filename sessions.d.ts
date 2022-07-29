import * as redis from './redis';

export interface session<T> {
  id: string;
  created: string;
  data: T;
}

export type set_session<T> = (session: session<T>) => Promise<void>;
export type get_session<T> = (session_id: string) => Promise<session<T>>;
export type create_session<T> = (data: T) => Promise<session<T>>;

export interface client<T> {
  redis_client: redis.redis_client;
  set_session: set_session<T>;
  get_session: get_session<T>;
  create_session: create_session<T>;
}

export type connect<T> = () => client<T>;
export const connect: connect<any>;