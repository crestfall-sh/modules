# postgres

## changelog

### v1.18.7

- update table.insert, add options.hydrate and options.cleanup.
- update table.update, add options.hydrate and options.cleanup.

### v1.18.6

Item insert / update / remove events. Item hydrate and cleanup.

- add properties: table.hydrate and table.cleanup.
- update table.select. add options.hydrate and options.cleanup.
- add properties: table.on_insert, table.on_update, table.on_remove.
- add feature: execute table.on_insert, table.on_update, table.on_remove on process.nextTick.

### v1.18.5

RFC 7230 case-insensitive headers compliance

- add class: InternalHeaders, extends Map
- add feature: InternalHeaders allows case-insensitive keys
- add feature: InternalHeaders allows toJSON(), now usable with JSON.stringify()
- update request.headers and response.headers. now uses InternalHeaders.
- add class: InternalURLSearchParams, extends URLSearchParams
- add feature: InternalURLSearchParams allows toJSON(), now usable with JSON.stringify()
- update request.query. now uses InternalURLSearchParams.
