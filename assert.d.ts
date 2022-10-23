export interface AssertionErrorJSON {
  name: string;
  message: string;
  stack: string;
}

export class AssertionError extends Error {
  name: string;
  message: string;
  stack: string;
  constructor(message: string);
  toJSON() : AssertionErrorJSON;
}

export type assert = (value: boolean, message?: string) => void; 
export const assert: assert;

export default assert;