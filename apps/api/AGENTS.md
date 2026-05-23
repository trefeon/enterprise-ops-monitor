# API Agent Rules

- Keep CommonJS modules and the `{ ok, data, meta, error }` response envelope.
- Put route input validation in `routes/*.js` with `middleware/validate.js` and Zod schemas before controller handlers.
- Keep controller exports and mounted route paths stable unless a task explicitly changes API contracts.
- Put reusable domain behavior in `services/`; route files should stay wiring plus validation.
- Keep store/employee manual writes on `data_stores` and `data_employees`; do not route the canonical flow through legacy models.
- Export endpoints should return `.xlsx` payload metadata with `fileName`, `contentType`, and `contentBase64`.
- Use migrations in `migrations/` for persistent schema changes. Do not expand boot-time compatibility SQL in `utils/ensureDb.js` unless the task targets boot compatibility.
- Add or update tests for any changed validation or controller behavior.
