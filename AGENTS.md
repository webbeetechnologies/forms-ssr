# AI Agent Instructions — TaylorDB Forms + TanStack Start

This is a **forms-only** pnpm monorepo. The TanStack Start app lives in
`apps/web`. Every change you make is in service of building or modifying a
Typeform-style conversational form. Do not introduce dashboards, generic CRUD,
or unrelated UI.

If you need a quick orientation, read [`README.md`](./README.md) first.

---

## Mental model

```
 shared schema
 ┌──────────────────────────────────────────────────────────────┐
 │ apps/web/src/server/form-schema.ts                           │
 │   defineTaylorForm(taylorSchema)({ sharedSteps: […] })      │
 └─────────────┬───────────────────────────────┬────────────────┘
               │                               │
               ▼                               ▼
 ┌────────────────────────┐       ┌──────────────────────────────────┐
 │ apps/web/src/pages/    │ server│ apps/web/src/server/             │
 │ landing/FormPage.tsx   │ fns   │ form.functions.ts                │
 │ <Form>                 │ ────► │ form-actions.ts                  │
 │ <Question id="…">      │       │   createSession / loadSession    │
 │ …                      │       │   saveAnswer / submitForm        │
 │                        │ route │   uploadFile ◄────────┐         │
 └────────────────────────┘       └────────────────────────┼─────────┘
                                                           │
                              apps/web/src/routes/api/upload-form-file.ts
                              (FormData → actions.uploadFile)
```

* **Schema is the single source of truth.** Any change to questions starts in
  `form-schema.ts`.
* **One row per session.** A row in the `submissions` table represents one
  in-flight or completed application.
* **Files bypass `saveAnswer`.** They go through the `/api/upload-form-file`
  server route, which delegates to `formActions.uploadFile(ctx, …)`.
  The `save` resolver for a `file_upload` step is auto-`'noop'`.
* **Single uploader on the client.** `form.mappers({}, { uploadFile })`
  auto-wires `toApiValue` for every `file_upload` / `multi_format` step.

For a complete worked example covering every common question type plus resume
+ video upload, see [`examples/candidate-application-form.md`](./examples/candidate-application-form.md).

---

## Critical files (read in this order)

| Order | File | Why |
| --- | --- | --- |
| 1 | `apps/web/src/server/taylordb/types.ts` | Auto-generated DB schema. NEVER edit. |
| 2 | `apps/web/src/server/form-schema.ts` | Shared steps + validation. |
| 3 | `apps/web/src/server/form-actions.ts` | `createActions` wiring + upload helper. |
| 4 | `apps/web/src/server/form.functions.ts` | TanStack `createServerFn` exports. |
| 5 | `apps/web/src/routes/api/upload-form-file.ts` | Multipart file upload route. |
| 6 | `apps/web/src/pages/landing/FormPage.tsx` | The form page (autosave + theme). |
| 7 | `apps/web/src/pages/landing/FormBody.tsx` | The `<Question>` JSX tree, shared with the build-time check. |
| 8 | `apps/web/src/form-check.tsx` | Build-time form-config check entry. |
| 9 | `apps/web/vite.config.ts` | Wires `formsFormCheckPlugin` — DO NOT REMOVE. |

---

## Always-on rules

1. **Never start, stop, or restart processes manually.** The dev server is
   supervised by `pm2`. To restart, use the `dev-server-restart` tool — never
   `pnpm dev`, `pm2`, `node`, etc.
2. **Never edit `apps/web/src/server/taylordb/types.ts`.** It is regenerated from
   TaylorDB's schema. To change the schema, use the `schema-mutation` tool.
3. **Always create a TaylorDB column for new questions.** If a question requires
   persistent data, use `schema-mutation` to update the `submissions` table.
   * **Ask for user consent** before deleting any column as this will result in
     permanent data loss.
4. **Use correct column types** for question types — same mapping as the legacy
   template (see prior AGENTS.md / README for the full table).
5. **Never add per-function auth guards.** `getTaylorDB()` in
   `apps/web/src/server/taylordb.ts` already throws if the `app_access_token` cookie
   (or `TAYLORDB_API_KEY`) is missing. Every server function and server route
   must call `getTaylorDB()` (via `createFormContext()`).
6. **Always use `getTaylorDB()`** for DB access. No in-memory state, no globals,
   no module-scope query builders.
7. **Always run `pnpm build` AND `pnpm lint`** before declaring work done.
8. **Never invent forms-ui APIs.** Read package `llm.txt` and `docs/` first.
9. **NEVER remove `formsFormCheckPlugin` from `apps/web/vite.config.ts`.**
10. **No `any` — ever.** Same rule as before; generated types file is excluded.

### TanStack Start rules

* Route loaders are isomorphic — **do not** call TaylorDB from loaders or React
  components directly. Put DB access in `apps/web/src/server/*.functions.ts` or
  `server.handlers` routes.
* Do **not** use Next.js `"use client"`.
* After mutations from route components, refresh with `router.invalidate()`.
  The form uses autosave server functions instead — no loader needed.

### Authoritative library docs

| Topic | Path |
| --- | --- |
| forms-ui overview | `apps/web/node_modules/@taylordb/forms-ui/llm.txt` |
| forms-ui autosave | `apps/web/node_modules/@taylordb/forms-ui/docs/autosave.md` |
| Build-time form-config check | `apps/web/node_modules/@taylordb/forms-ui/docs/vite-plugin-form-check.md` |
| forms-taylordb | `apps/web/node_modules/@taylordb/forms-taylordb/docs/api.md` |
| forms-api server actions | `apps/web/node_modules/@taylordb/forms-api/docs/api.md` |
| Query builder | `apps/web/node_modules/@taylordb/query-builder/llm.txt` |

---

## Common tasks

### Add a question

1. Add a step to `sharedSteps` in `apps/web/src/server/form-schema.ts`.
2. Use `schema-mutation` to add the matching column to the `submissions` table.
3. Add a `<Question id="…">` to `apps/web/src/pages/landing/FormBody.tsx`.
4. Add the field key to `FormAnswers` in the schema file.
5. Run `pnpm build` — `formsFormCheckPlugin` will fail on schema/JSX drift.

You do NOT touch `form.functions.ts` for a normal question — autosave
actions are generated from the shared schema.

### Add a file question

Same as above, plus an `attachment` column via `schema-mutation`. You do NOT
touch `upload-form-file.ts` or `FormPage.tsx` — the page's
`form.mappers({}, { uploadFile })` already auto-wires every attachment step.

### Conditional question / validate / maxLength

Same rules as before — `showWhen`, `validate`, and `optional` live on the
**shared step only**, not on `<Question>`.

### Wire up email-on-submit

Replace the `console.log` body of `emailConfig.send` in
`apps/web/src/server/form-actions.ts`.

---

## Things that will trip you up

* `WelcomeScreen` / `Statement` / `EndScreen` collect no answer — not in
  `sharedSteps`.
* `<Question id="...">` must match the shared step id exactly.
* The autosave session id cookie is `taylordb_forms_session_submissions` (from `FORM_ID` in `shared/form.constants.ts`).
* Keep `FormBody.tsx` side-effect free for the build-time check.

---

## When in doubt

1. Read the relevant `llm.txt` in the `@taylordb/*` package.
2. Look at how the existing form does the same thing.
3. Match the existing pattern — don't invent a new one.
