
export type push = (next_pathname: string, next_search?: Record<string, string>) => void;

export type replace = (next_pathname: string, next_search?: Record<string, string>) => void;

export interface history {
  previous_pathname: string;
  previous_search: string;
  pathname: string;
  search:string;
  push: push;
  replace: replace;
}

export type useHistory = () => history;
export const useHistory: useHistory;