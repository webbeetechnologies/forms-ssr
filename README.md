# TaylorDB Forms Template (TanStack Start)

A starter template for building Typeform-style conversational forms backed by
TaylorDB — as a **pnpm monorepo** with a TanStack Start app in `apps/web`.

The template ships with a working application form shell (welcome +
end screens). Add your own questions to the shared schema and JSX body.

---

## What's in the box

| Layer | Library | Purpose |
| --- | --- | --- |
| Form runtime (UI) | [`@taylordb/forms-ui`][forms-ui] | React components — `<Form>`, `<Question>`, inputs, autosave |
| Form schema + handlers | [`@taylordb/forms-core`][forms-core] | Pure validation + email rendering |
| Form actions | [`@taylordb/forms-api`][forms-api] + [`@taylordb/forms-taylordb`][forms-taylordb] | Session lifecycle + TaylorDB persistence |
| Database | [`@taylordb/query-builder`][qb] | Typed reads, writes, and `uploadAttachments` |
| App framework | [TanStack Start](https://tanstack.com/start) | File routes, SSR, `createServerFn`, Nitro server |
| Build | Vite 8 | Includes `formsFormCheckPlugin` guard |

[forms-ui]: ./apps/web/node_modules/@taylordb/forms-ui/llm.txt
[forms-core]: ./apps/web/node_modules/@taylordb/forms-core/llm.txt
[forms-api]: ./apps/web/node_modules/@taylordb/forms-api/docs/api.md
[forms-taylordb]: ./apps/web/node_modules/@taylordb/forms-taylordb/docs/api.md
[qb]: ./apps/web/node_modules/@taylordb/query-builder/llm.txt

---

## Repo layout

```
├── apps/
│   └── web/                        # TanStack Start app (forms UI + server)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── __root.tsx
│       │   │   ├── index.tsx
│       │   │   └── api/
│       │   │       ├── forms/$action.ts
│       │   │       └── upload-form-file.ts
│       │   ├── pages/
│       │   │   └── landing/
│       │   │       ├── FormPage.tsx
│       │   │       ├── FormBody.tsx
│       │   │       ├── form-mappers.ts
│       │   │       └── form-theme.ts
│       │   ├── embed/
│       │   │   ├── form.tsx
│       │   │   └── session-storage.ts
│       │   ├── shared/
│       │   │   └── form.constants.ts
│       │   ├── server/
│       │   │   ├── taylordb.ts
│       │   │   ├── taylordb/types.ts
│       │   │   ├── form-schema.ts
│       │   │   ├── form-actions.ts
│       │   │   ├── form-session.ts
│       │   │   ├── form.functions.ts
│       │   │   ├── forms-api-handlers.ts
│       │   │   └── cors.ts
│       │   ├── form-check.tsx
│       │   ├── router.tsx
│       │   └── styles.css
│       ├── vite.config.ts
│       ├── vite.embed.config.ts
│       └── package.json
├── taylordb.yml                    # `web` service → apps/web
├── pnpm-workspace.yaml
├── AGENTS.md
└── examples/candidate-application-form.md
```

---

## Architecture

```
Browser
  ↓
TanStack Start / Nitro (apps/web, port 3000)
  ↓
/  → FormPage (forms-ui autosave)
  ↓
/api/forms/* and /api/upload-form-file
  ↓
formActions (forms-taylordb)
  ↓
getTaylorDB() → TaylorDB

File uploads: POST /api/upload-form-file → formActions.uploadFile
Embed script: /embed/submissions-{uuid}.js + /embed/manifest.json → Shadow DOM → same API routes
```

* **Schema is shared** in `apps/web/src/server/form-schema.ts`.
* **Form id / table** come from `apps/web/src/shared/form.constants.ts` (`FORM_ID`, `FORM_TABLE`).
* **One row = one session** in the `submissions` table.
* **Autosave** uses `createSsrFetchAutosaveClient` on the first-party page and
  `createFetchAutosaveClient` in the embed bundle.

---

## Run it

Local dev is managed by TaylorDB tooling (`taylordb.yml` → `apps/web` →
`pnpm dev` on port 3000). To verify locally:

```bash
pnpm install
pnpm build
pnpm lint
```

`pnpm build` runs the **form-config check** (`formsFormCheckPlugin`). Do not
remove it.

Copy `apps/web/.env.example` to `apps/web/.env` and set `TAYLORDB_*` when
running outside TaylorDB hosting.

---

## Embed the form (optional)

The embed bundle is **not** part of the default build. Use it only when you
want to let customers inline the form on another site.

| Script | What it builds |
| --- | --- |
| `pnpm build` | TanStack Start app only (includes `formsFormCheckPlugin`) |
| `pnpm --filter @repo/web build:embed` | Unique `/embed/submissions-{uuid}.js` + `manifest.json` (includes `formsFormCheckPlugin`) |
| `pnpm --filter @repo/web build:all` | Embed first, then the app (so Nitro serves the embed assets) |

For production embed hosting, run `build:all` (or `build:embed` before `build`).
Each embed build generates a new random UUID (RFC 4122 v4 from `crypto.randomUUID()`)
and writes:

- `apps/web/public/embed/submissions-{uuid}.js` — the embed bundle
- `apps/web/public/embed/manifest.json` — `{ formId, buildId, fileName, script }` for the current build

After the app build, both files are served under `/embed/`.

Install it on another website with the script URL from the build log or
`manifest.json`:

```html
<div data-taylordb-form="submissions"></div>
<script async src="https://your-forms-domain.example/embed/submissions-{uuid}.js"></script>
```

Optional attributes:

```html
<div
  data-taylordb-form="submissions"
  data-api-origin="https://your-forms-domain.example"
></div>
<script
  async
  src="https://your-forms-domain.example/embed/submissions-{uuid}.js"
  data-api-origin="https://your-forms-domain.example"
></script>
```

The embed mounts the same `FormBody` component inside a Shadow DOM,
injects `@taylordb/forms-ui` styles into that shadow root, and stores the
session id in the host page's `localStorage` instead of relying on third-party
cookies.

Cross-origin API access is controlled in
`apps/web/src/server/cors.ts`. By default `EMBED_ALLOWED_ORIGINS` is `["*"]`,
so any customer site can embed the form. For production, replace it with
explicit origins:

```ts
export const EMBED_ALLOWED_ORIGINS = [
  "https://customer-site.example",
  "https://www.customer-site.example",
] as const;
```

---

## Customise

See [`AGENTS.md`](./AGENTS.md) and
[`examples/candidate-application-form.md`](./examples/candidate-application-form.md)
for adding questions, file uploads, validation, theming, and email-on-submit.

---

## License

MIT.
