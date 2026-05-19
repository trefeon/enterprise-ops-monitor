# Enterprise Operations Monitor Web

React 19 + Vite 7 SPA for the Enterprise Operations Monitor dashboard. The app uses Tailwind CSS 3, shadcn/Base UI primitives, Lucide icons, and the Industrial Clarity design system documented in [`../../DESIGN.md`](../../DESIGN.md).

## Development

Run commands from the repository root:

```bash
pnpm i
pnpm dev
```

The web app runs at `http://localhost:5173` and proxies API calls through `VITE_API_URL` when provided.

For mock API demo mode:

```bash
pnpm --dir mock-api install
pnpm --dir mock-api start
VITE_API_URL=http://localhost:4000 pnpm dev
```

## Project Notes

- Routes and providers are defined in `src/App.jsx`.
- API calls go through `src/lib/api/client.js`; do not call Axios directly from pages.
- Auth state lives in `src/context/AuthProvider.jsx` and uses JWT bearer tokens.
- Route permissions use `PrivateRoute` and constants from `src/lib/auth/permissions.js`.
- Shared UI components live in `src/components/shared`; shadcn/Base UI primitives live in `src/components/ui`.
- Global tokens and design utilities live in `src/index.css`.

## Checks

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

Frontend implementation details are documented in [`docs/design.md`](docs/design.md).
