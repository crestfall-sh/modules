# uwu

## changelog

### v1.21.0

- update: replace `uwu.use_middlewares(...middlewares)` with `uwu.use_middlewares(options, ...middlewares)`
- add: `uwu.use_middleware(middleware, options?)`
- add: `use_middleware` `options.pathname_parameters` as `number`
- add: `request.pathname_params` as `string[]`
- update: replace `request.query` with `request.search_params` as `URLSearchParams`