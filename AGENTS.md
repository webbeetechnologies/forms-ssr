# AI Agent Instructions — TaylorDB Forms Template

This is a **forms-only** template. Every change you make is in service of
building or modifying a Typeform-style conversational form backed by
TaylorDB. Do not introduce dashboards, generic CRUD, or unrelated UI.

If you need a quick orientation, read [`README.md`](./README.md) first.

---

## Mental model

```
                          shared schema
   ┌───────────────────────────────────────────────────────────┐
   │ apps/server/forms/candidate-form-schema.ts                │
   │   defineForm({ sharedSteps: [{id, type, validate?}, …] }) │
   └─────────────┬───────────────────────────────┬─────────────┘
                 │                               │
                 ▼                               ▼
   ┌────────────────────────┐       ┌──────────────────────────┐
   │ apps/client/src/pages/ │ tRPC  │ apps/server/routers/     │
   │ CandidateFormPage.tsx  │ ────► │ candidateForm.ts         │
   │   <Form>               │       │   createSession          │
   │   <Question id="…">    │       │   loadSession            │
   │   …                    │       │   saveAnswer (per step)  │
   │                        │       │   submitForm             │
   └────────────────────────┘       └──────────────────────────┘
                                                ▲
                                                │
                                    apps/server/routers/upload.ts
                                    (file bytes → attachment column)
```

* **Schema is the single source of truth.** Any change to questions
  starts in `candidate-form-schema.ts`.
* **One row per session.** A row in the `candidates` table represents
  one in-flight or completed application.
* **Files bypass `saveAnswer`.** They go through the upload endpoint and
  land in attachment columns directly. The `save` resolver for a
  `file_upload` step is a no-op.

---

## Critical files (read in this order)

| Order | File | Why |
| --- | --- | --- |
| 1 | `apps/server/taylordb/types.ts` | Auto-generated DB schema. NEVER edit. |
| 2 | `apps/server/forms/candidate-form-schema.ts` | Shared steps + validation. |
| 3 | `apps/server/routers/candidateForm.ts` | Server-side autosave actions + resolvers. |
| 4 | `apps/server/routers/upload.ts` | File upload mutation. |
| 5 | `apps/client/src/pages/CandidateFormPage.tsx` | The form page (autosave + theme). |
| 6 | `apps/client/src/pages/CandidateFormBody.tsx` | The `<Question>` JSX tree, shared with the build-time check. |
| 7 | `apps/client/src/candidate-form-check.tsx` | Build-time form-config check entry (consumed by `formsFormCheckPlugin`). |
| 8 | `apps/client/vite.config.ts` | Wires `formsFormCheckPlugin` — DO NOT REMOVE. |

---

## Always-on rules

1. **Never start, stop, or restart processes manually.** The dev server
   is supervised by `pm2`. To restart, use the `dev-server-restart`
   tool — never `pnpm dev`, `pm2`, `node`, etc.
2. **Never edit `apps/server/taylordb/types.ts`.** It is regenerated
   from TaylorDB's schema. To change the schema, use the
   `schema-mutation` tool.
3. **Always create a TaylorDB column for new questions.** If a question requires
   persistent data, use `schema-mutation` to update the `candidates` table.
   *   **Ask for user consent** before deleting any column as this will result in permanent data loss.
4. **Use correct column types** for question types:
   *   `TextInput` -> `singlelineText`
   *   `TextArea` -> `longText`
   *   `NumberInput` -> `number`
   *   `DateInput` -> `date`
   *   `PhoneInput` -> `phoneNumber`
   *   `UrlInput` -> `url`
   *   `Dropdown` -> `select`
   *   `MultipleChoice` -> `select` (with `isSingle = false`)
       * **Single-select + `MultipleChoice` gotcha.** If you bind a
         `MultipleChoice` question to a TaylorDB `select` column where
         `isSingle = true`, do NOT normalize the value to a string on
         the frontend. `defineForm`'s default `validate` for the
         `multiple_choice` handler expects `string[]`, so coercing to a
         string client-side will fail validation and block autosave.
         Keep the answer as `string[]` end-to-end and unwrap it to a
         single string **on the server, right before the
         `queryBuilder` write** (e.g. `value[0] ?? null`). The same
         applies in reverse on `loadSession` — wrap the DB string back
         into `[value]` before returning it to the client.
   *   `YesNo` -> `checkbox`
   *   `Rating` / `Scale` -> `rating`
   *   `Legal` -> `checkbox`
   *   `FileUpload` / `VideoQuestion` / `AudioQuestion` -> `attachment`
   *   `AddressInput` -> Create a separate foreign table linked to `candidates` (includes address, address line 2, city, state, zip code, country).
   *   `ContactInfoInput` -> Create a separate foreign table linked to `candidates` (includes first name, last name, company, email, phone number).
   *   *Note: Ranking is not supported.*
5. **Never add a per-procedure auth guard.** `createContext` in
   `apps/server/trpc.ts` already throws if the
   `app_access_token` cookie is missing. Every tRPC procedure is
   protected by default.
6. **Always use `ctx.queryBuilder`** for DB access. No in-memory state,
   no globals, no other clients.
7. **Always run `pnpm build` and `pnpm lint`** to verify TypeScript +
   lint rules before declaring work done. `pnpm build` also runs the
   build-time form-config check (see rule 9). `pnpm lint` enforces a
   hard ban on `any` (see rule 10).
8. **Never invent forms-ui APIs.** When in doubt, read the package's
   own `llm.txt` and `docs/` (paths below). The packages are the
   authoritative source; the README in this repo is just a pointer.
9. **NEVER remove `formsFormCheckPlugin` from `apps/client/vite.config.ts`.**
   This Vite plugin (from `@taylordb/forms-ui`) SSR-mounts
   `src/candidate-form-check.tsx` in jsdom during `vite build` and
   fails the build if the JSX step tree drifts from `sharedSteps`
   (wrong order, missing or duplicate step ids, etc.). It is our only
   automatic guard against schema/JSX drift.
   * Keep the plugin enabled.
   * Keep `jsdom` in `apps/client` devDependencies.
   * Keep `@taylordb/forms-ui` up to date so the check stays in sync
     with the runtime error boundary.
   * Keep `CandidateFormBody.tsx` (the shared step tree) free of side
     effects so it renders cleanly in jsdom.
   * Docs: `apps/client/node_modules/@taylordb/forms-ui/docs/vite-plugin-form-check.md`.
10. **No `any` — ever.** `eslint.config.js` enforces
    `@typescript-eslint/no-explicit-any: error`, which blocks both
    `: any` annotations and `as any` casts. The rule exists because
    `defineForm`'s default validators are strict about runtime shapes
    (e.g. `multiple_choice` expects `string[]`); silently coercing
    through `any` at the client/server boundary is the single fastest
    way to break autosave or write a wrong shape into TaylorDB.
    * If TypeScript can't infer a value, narrow with `unknown` + a
      type guard, or import the proper type from the source package.
    * The only file allowed to contain `any` is the generated
      `apps/server/taylordb/types.ts`, which is excluded from lint.
    * Run `pnpm lint` before declaring work done.

### Authoritative library docs (already in node_modules)

| Topic | Path |
| --- | --- |
| forms-ui overview | `apps/client/node_modules/@taylordb/forms-ui/llm.txt` |
| forms-ui `<Form>` props + **UI locale** | `apps/client/node_modules/@taylordb/forms-ui/docs/form-api.md` |
| forms-ui inputs | `apps/client/node_modules/@taylordb/forms-ui/docs/inputs.md` |
| Autosave (fetch + tRPC) | `apps/client/node_modules/@taylordb/forms-ui/docs/autosave.md` |
| Theming, hooks, exports (incl. `useFormLocale`) | `apps/client/node_modules/@taylordb/forms-ui/docs/hooks-theming-exports.md` |
| Recipes & pitfalls | `apps/client/node_modules/@taylordb/forms-ui/docs/recipes-agents.md` |
| Build-time form-config check (Vite plugin) | `apps/client/node_modules/@taylordb/forms-ui/docs/vite-plugin-form-check.md` |
| Bigger example | `apps/client/node_modules/@taylordb/forms-ui/example.md` |
| forms-core handlers / `defineForm` | `apps/client/node_modules/@taylordb/forms-core/docs/api.md` |
| forms-api server actions | `apps/server/node_modules/@taylordb/forms-api/docs/api.md` |
| Query builder | `apps/server/node_modules/@taylordb/query-builder/llm.txt` |

When you touch ANY `@taylordb/*` package and aren't sure of an API,
**read its `llm.txt` first**.

---

## Common tasks

### Add a question

1. Add a step to `sharedSteps` in
   `apps/server/forms/candidate-form-schema.ts`.
2. Use `schema-mutation` to add the appropriate column/table to the DB.
3. Add a `save` resolver in `apps/server/routers/candidateForm.ts`.
4. Render the `<Question id="…">` in
   `apps/client/src/pages/CandidateFormBody.tsx` (NOT directly in
   `CandidateFormPage.tsx`). The body is shared with the build-time
   form-config check entry.
5. Update `loadSession` in `candidateForm.ts` to return the new field.
6. Run `pnpm --filter @repo/client build` — the form-config check
   plugin will fail the build if the body and `sharedSteps` drift.

### Add a file question

Same as above, plus:

* Use `type: "file_upload"` in the schema.
* Make the new column an `attachment` type via `schema-mutation`.
* Extend the `column` discriminator in
  `apps/server/routers/upload.ts`.
* Add a mapper entry in `CandidateFormPage.tsx`:

  ```ts
  newDoc: {
    toApiValue: createFileUploadMapper({
      uploadFile: (input) => uploadCandidateFile("newDoc", input),
    }),
  },
  ```

* The `save` resolver for the file step stays a no-op — the upload
  endpoint already wrote the bytes to the row.

### Conditional question

Use `showWhen` on BOTH the shared step and the `<Question>`. Without it
on the shared step, the server will refuse to save answers for a step it
considers hidden.

```ts
// schema
{ id: "company", type: "text",
  showWhen: ({ answers }) => answers.role === "founder" }
```

```tsx
// page
<Question id="company" showWhen={({ answers }) => answers.role === "founder"}>
  <Title>What are you building?</Title>
  <TextArea />
</Question>
```

### Change the brand colour

Edit `purpleTheme` in `CandidateFormPage.tsx`. Available tokens are in
the theming doc linked above. The page background gradient lives in
`apps/client/src/index.css`.

### Translate built-in UI strings (locale)

`@taylordb/forms-ui` ships a `locale` prop on `<Form>` (and
`FormProvider`) that overrides **library-owned** strings only: footer
labels, keyboard hint, dropdown search defaults, media recorder labels,
ranking move labels, composite placeholders, the submitted-button
label, etc. Your own `<Title>`, `<Description>`, choice labels, and
JSX-supplied placeholders are NOT touched.

Use a packaged locale (tree-shakeable):

```tsx
import { Form } from "@taylordb/forms-ui";
import { deFormLocale } from "@taylordb/forms-ui/locales/de";

<Form locale={deFormLocale} theme={purpleTheme} adapter={adapter}>
  …
</Form>
```

Packaged locales:

* `@taylordb/forms-ui/locales/de` → `deFormLocale`
* `@taylordb/forms-ui/locales/ru` → `ruFormLocale`

Patch a few strings on top of English defaults:

```tsx
import { Form, mergeFormLocale } from "@taylordb/forms-ui";

const locale = mergeFormLocale({
  controls: { defaultNextLabel: "Next" },
  screens: { submitted: "Thanks!" },
});

<Form locale={locale}>…</Form>
```

Read the merged strings from any child via `useFormLocale()`. Full API:
`apps/client/node_modules/@taylordb/forms-ui/docs/form-api.md` (the
"UI locale" section) and the exports list in
`docs/hooks-theming-exports.md`.

### Wire up email-on-submit

Replace the `console.log` body of `emailConfig.send` in
`apps/server/routers/candidateForm.ts` with a call to your mailer. The
HTML argument is a complete, self-contained submission summary.

---

## Things that will trip you up

* `WelcomeScreen` / `Statement` / `EndScreen` collect no answer. **Do
  not** add them to `sharedSteps`. They live only inside `<Form>` in the
  page.
* `<Question id="...">` `id` MUST exactly match the shared step `id`.
* Inputs inside a `<Question>` should NOT pass an `id` prop — they bind
  to the surrounding question via context.
* Composite inputs (like `AddressInput` parts) use `name`, not `id`.
* `YesNo` stores the strings `"yes"` / `"no"`. If your handler is
  `yes_no` (boolean), add a `toApiValue: (v) => v === "yes"` mapper.
* The autosave session id is read from a cookie called
  `taylordb_forms_session_candidate`. Clearing it forces a new session.
* `@taylordb/forms-ui` v0.2.5+ validates `<Question>` order against
  `sharedSteps` order at runtime — a mismatch throws an error. It also
  throws on duplicate step ids. Keep JSX order in sync with `defineForm`.

---

## When in doubt

1. Read the relevant `llm.txt` in the `@taylordb/*` package.
2. Look at how the existing candidate form does the same thing.
3. Match the existing pattern — don't invent a new one.
