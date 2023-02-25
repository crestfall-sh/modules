# uwu

## changelog

### v1.23.11

- improve `serve(options)`, fix types.

### v1.23.1

- add `response.error_write_message` as `boolean`, this will write error messages to the response body.

```js
app.post('/sign-in', uwu.use(async (response, request) => {
  response.error_write_message = true;
  assert(false, 'Example error message.')
}));
```

```
HTTP/1.1 500 Internal Server Error
Content-Type: text/plain; charset=utf-8
Cotnent-Length: 21
Example error message.
```

### v1.23.0

- fix OPTIONS handling
- add OPTIONS testing

### v1.21.0

- update: replace `uwu.use_middlewares(...middlewares)` with `uwu.use_middlewares(options, ...middlewares)`
- add: `uwu.use_middleware(middleware, options?)`
- add: `use_middleware` `options.pathname_parameters` as `number`
- add: `request.pathname_params` as `string[]`
- update: replace `request.query` with `request.search_params` as `URLSearchParams`