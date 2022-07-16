// @ts-check

const get_char_code = (s) => s.charCodeAt(0);

export const char_codes = {
  simpleString: get_char_code('+'),
  simpleError: get_char_code('-'),
  blobString: get_char_code('$'),
  blobError: get_char_code('!'),
  double: get_char_code(','),
  number: get_char_code(':'),
  null: get_char_code('_'),
  boolean: get_char_code('#'),
  true: get_char_code('t'),
  false: get_char_code('f'),
  array: get_char_code('*'),
  push: get_char_code('>'),
  map: get_char_code('%'),
  mapkey: get_char_code('+'),
};