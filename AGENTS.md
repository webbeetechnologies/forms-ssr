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
   │   defineTaylorForm(taylorSchema)({ sharedSteps: […] })    │
   └─────────────┬───────────────────────────────┬─────────────┘
                 │                               │
                 ▼                               ▼
   ┌────────────────────────┐       ┌──────────────────────────────────┐
   │ apps/client/src/pages/ │ tRPC  │ apps/server/routers/             │
   │ CandidateFormPage.tsx  │ ────► │ candidateForm.ts                 │
   │   <Form>               │       │   candidateForm.createActions(): │
   │   <Question id="…">    │       │     createSession                │
   │   …                    │       │     loadSession                  │
   │                        │       │     saveAnswer  (per step)       │
   │                        │       │     submitForm                   │
   │                        │       │     uploadFile  ◄────────┐       │
   └────────────────────────┘       └──────────────────────────┼───────┘
                                                               │
                                              apps/server/routers/upload.ts
                                              (FormData → actions.uploadFile)
```

* **Schema is the single source of truth.** Any change to questions
  starts in `candidate-form-schema.ts`.
* **One row per session.** A row in the `candidates` table represents
  one in-flight or completed application.
* **Files bypass `saveAnswer`.** They go through `upload.uploadCandidateFile`
  which delegates to `candidateFormActions.uploadFile(ctx, …)` — the
  built-in TaylorDB attachment action (forms-taylordb ≥ 0.1.9). It
  writes bytes to the step's `attachment` column atomically. The `save`
  resolver for a `file_upload` step is auto-`'noop'`.
* **Single uploader on the client.** `form.mappers({}, { uploadFile })`
  auto-wires `toApiValue` for every `file_upload` / `multi_format` step
  — no per-step `createFileUploadMapper` boilerplate. Adding another
  file question doesn't touch `upload.ts` or the mapper.

For a complete worked example covering every common question type plus
resume + video upload, see [`examples/candidate-application-form.md`](./examples/candidate-application-form.md).

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
   *   `Dropdown` -> `select` (single — scalar `string`)
   *   `SingleChoice` -> `select` (single — scalar `string`). Use for
       `dropdown` / `picture_choice` style single-value choice UIs.
       The build-time form-config check will fail if you use
       `<MultipleChoice>` on a `dropdown` / `picture_choice` step.
   *   `MultipleChoice` -> `select` (with `isSingle = false`). Stores
       `string[]`. ONLY use this for `multiple_choice` / `checkbox`
       style multi-select fields — never for single-select. For
       single-select, use `<SingleChoice>` or `<Dropdown>` instead.
   *   `YesNo` -> `checkbox`
   *   `Rating` / `Scale` -> `rating`
   *   `Legal` -> `checkbox`
   *   `FileUpload` / `VideoQuestion` / `AudioQuestion` -> `attachment`
   *   `AddressInput` -> Add flat columns directly on `candidates` (one
       per sub-field: address, address line 2, city, state, zip code,
       country) and wire them up via a **composite schema override**
       (see rule 4a below). DO NOT use a `link` field or a separate
       foreign table — composite is simpler and avoids an extra row
       per session.
   *   `ContactInfoInput` -> Same pattern as `AddressInput`: add flat
       columns on `candidates` (first name, last name, company, email,
       phone number) and use a **composite schema override**. DO NOT
       use a `link` field / foreign table.
   *   *Note: Ranking is not supported.*

   **4a. Composite override for `AddressInput` / `ContactInfoInput`.**
   These inputs collect multiple sub-fields under one step id. By
   default the autosave adapter looks for columns named
   `<stepId>_<subField>` (e.g. `projectAddress_city`). That naming is
   almost never what your TaylorDB schema already uses, so you MUST
   declare the step as `kind: "composite"` and map each sub-field to
   its real column name. Example:

   ```ts
   taylordbFieldName: "projectAddress",
   kind: "composite",
   fields: {
     address: { questionType: "text" },
     address_line_2: { questionType: "text", optional: true },
     city: { questionType: "text" },
     state: { questionType: "text" },
     zip_code: { questionType: "text" },
     country: { questionType: "text" },
   },
   // …
   steps: {
     // Composite address step — map each composite field to its real
     // column on the `candidates` table. Without this override the
     // adapter would look for `projectAddress_address`,
     // `projectAddress_city`, etc.
     projectAddress: {
       column: {
         address: "projectAddress",
         address_line_2: "projectAddressLine2",
         city: "projectCity",
         state: "projectAddressState",
         zip_code: "projectZipCode",
         country: "projectCountry",
       },
     },
   },
   ```

   Apply the same pattern to `ContactInfoInput` (map `first_name`,
   `last_name`, `company`, `email`, `phone_number` to their real
   columns).
5. **Never add a per-procedure auth guard.** `createContext` in
   `apps/server/trpc.ts` already throws if the
   `app_access_token` cookie is missing. Every tRPC procedure is
   protected by default.
6. **Always use `ctx.queryBuilder`** for DB access. No in-memory state,
   no globals, no other clients.
7. **Always run `pnpm build` AND `pnpm lint`** before declaring work done. Both are required.
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
| Stable test IDs (for `pnpm test`) | `apps/client/node_modules/@taylordb/forms-ui/docs/test-ids.md` |
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
2. Use `schema-mutation` to add the matching column to the
   `candidates` table.
3. Add a `<Question id="…">` to `CandidateFormBody.tsx` (NOT directly
   in `CandidateFormPage.tsx`). The body is shared with the build-time
   form-config check entry.
4. Add the new field's key to the `CandidateAnswers` type in
   `candidate-form-schema.ts` so `showWhen` / `validate` callbacks see
   the right value type.
5. Run `pnpm build` — `formsFormCheckPlugin` will fail the build if
   the body and `sharedSteps` drift.

You do NOT touch `candidateForm.ts` to add a question: the autosave
`saveAnswer` resolver is generated by
`candidateForm.createActions(...)` from the shared schema, and
`loadSession` reshapes columns back into answers automatically.

### Add a file question

Same as above, plus:

* Use `questionType: "file_upload"` (or `multi_format`) in the schema.
* Make the new column an `attachment` type via `schema-mutation`.

You do NOT touch `upload.ts` or `CandidateFormPage.tsx` — the upload
router forwards every `stepId` to `candidateFormActions.uploadFile`,
and `form.mappers({}, { uploadFile })` on the page already auto-wires
`toApiValue` for every `file_upload` / `multi_format` step. Adding a
file question is the same shape of work as adding a text question.

### Conditional question

Put `showWhen` on the **shared step only**. `<Question>` no longer
accepts `showWhen` — the UI reads the rule from `sharedSteps` (via the
autosave adapter) and applies it to both rendering and server-side
saves. Duplicating it on `<Question>` would just drift from the schema.

`showWhen` receives the in-progress answers map: `(answers) => boolean`.
**Use `.withAnswers<TAnswers>()` so `answers` is precisely typed** —
otherwise it falls back to `Record<string, unknown>` and you lose type
safety on the very predicates you write most often (see
`apps/server/forms/candidate-form-schema.ts` for the live example):

```ts
import type { FileAnswer } from "@taylordb/forms-core";
import { defineTaylorForm } from "@taylordb/forms-taylordb";

type CandidateAnswers = {
  role?: string;
  company?: string;
  resume?: FileAnswer[];
  // … one entry per shared step's `taylordbFieldName`
};

export const candidateForm = defineTaylorForm(taylorSchema)
  .withAnswers<CandidateAnswers>()({
    sharedSteps: [
      { taylordbFieldName: "role", questionType: "dropdown" },
      {
        taylordbFieldName: "company",
        questionType: "text",
        // `answers.role` is `string | undefined` here, not `unknown`.
        showWhen: (answers) => answers.role === "founder",
      },
    ] as const,
    taylordb: { table: "candidates", completedColumn: "submitted" },
  });
```

```tsx
// page body (apps/client/src/pages/CandidateFormBody.tsx)
<Question id="company">
  <Title>What are you building?</Title>
  <TextArea />
</Question>
```

When you add a step, also add its key to `CandidateAnswers` — otherwise
`showWhen` / `validate` callbacks that depend on the new field will see
`unknown` for that key. Value types follow the `questionType`:
`text`/`email`/`phone_number`/`dropdown` → `string`,
`file_upload` → `FileAnswer[]`, `yes_no` → `boolean`, etc.

### Validate a question

Put `validate` on the **shared step only** (same rule as `showWhen`).
The same normalized schema runs on **both sides of the wire**:

1. **Client** — before the autosave adapter sends an answer for a
   step, `@taylordb/forms-ui` runs the step's `validate`. A thrown
   error blocks the save and surfaces inline next to the question.
2. **Server** — `@taylordb/forms-api` re-runs the exact same
   `validate` inside `saveAnswer` / `submitForm` before any write
   reaches TaylorDB. A thrown error rejects the tRPC call.

Treat `validate` as a pure function of `(value, answers)`: never read
DOM state, `window`, cookies, or anything else that doesn't exist on
the server.

**Every question type ships with a built-in default `validate`** that
`defineForm` attaches automatically based on `questionType`
(e.g. `email` must look like an email, `number` must be finite,
`phone_number` must be non-empty, `multiple_choice` must be a
`string[]`, `file_upload` must be a `FileAnswer[]`, …). You only need
to write `validate` yourself when you want **custom rules** — and
doing so **replaces** the default for that step, it does not extend
it. If you still want the default's behaviour, re-implement it inside
your override. Full list of defaults:
`apps/client/node_modules/@taylordb/forms-core/docs/api.md`.

```ts
{
  taylordbFieldName: "yearsOfExperience",
  questionType: "number",
  // Replaces the default "must be a finite number" check with a
  // stricter range. Runs once on the client (pre-save) and once on
  // the server (pre-write to TaylorDB).
  validate: (value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("Enter a number.");
    }
    if (value < 0 || value > 60) {
      throw new Error("Must be between 0 and 60 years.");
    }
  },
},
```

### Cap input length with `maxLength`

`@taylordb/forms-ui` ≥ 0.2.35 supports a **`maxLength`** prop on
`TextInput`, `TextArea`, `NumberInput`, and `UrlInput`. It forwards to
the native HTML `maxLength` attribute (the browser blocks typing past
the cap) and renders a live `length / maxLength` character counter
under the field. The counter gets a `tf-counter-at-limit` class when
the value reaches the cap, so you can style "at limit" in your theme.

```tsx
// apps/client/src/pages/CandidateFormBody.tsx
<Question id="bio">
  <Title>Tell us about yourself</Title>
  <TextArea maxLength={500} rows={6} placeholder="A few sentences…" />
</Question>

<Question id="referralCode">
  <Title>Referral code</Title>
  <TextInput maxLength={12} placeholder="ABC123" />
</Question>
```

**`maxLength` is a UI cap, NOT a validator.** It only constrains what
a user can type into that specific input. A direct tRPC call, paste
from the clipboard on some browsers, or a programmatic value set could
still land a longer string on the server. If the cap is a real
business rule (DB column width, downstream API limit, etc.), pair
`maxLength` with a matching `validate` on the **shared step** so the
server enforces it too:

```ts
// apps/server/forms/candidate-form-schema.ts
{
  taylordbFieldName: "bio",
  questionType: "long_text",
  validate: (value) => {
    if (typeof value !== "string") throw new Error("Enter some text.");
    if (value.length > 500) throw new Error("Keep it under 500 characters.");
  },
},
```

Rule of thumb: `maxLength` on the input for UX (block typing + show
counter), `validate` on the shared step for truth (runs on both client
and server — see "Validate a question" above).

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
* **`required`, `validate`, and `showWhen` belong on the shared step
  in `defineTaylorForm` — NOT on `<Question>`.** The shared schema is
  the single source of truth: the UI reads required-ness from the
  step's `optional` flag, runs the schema's `validate` on every step,
  and applies `showWhen` to both rendering and server-side saves.
  Passing these props on `<Question>` either drifts from the schema or
  logs a dev warning (and `<Question>` no longer accepts `showWhen` at
  all). For UI-only forms with no `sharedSteps`, keep using
  `<StepPanel>` from forms-ui.
* Inputs inside a `<Question>` should NOT pass an `id` prop — they bind
  to the surrounding question via context.
* Composite inputs (like `AddressInput` parts) use `name`, not `id`.
* `YesNo` stores a boolean (`true` / `false`) since
  `@taylordb/forms-ui` v0.2.10 — it matches the core `yes_no`
  handler / TaylorDB `checkbox` column directly. No `toApiValue`
  mapper is needed. (Earlier versions stored `"yes"` / `"no"`
  strings.)
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
