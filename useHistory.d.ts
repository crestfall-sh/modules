export type push = (next: string) => void;
export type replace = (next: string) => void;

export interface history {
  previous_pathname: string;
  pathname: string;
  push: push;
  replace: replace;
}

export type useHistory = () => history;
export const useHistory: useHistory;