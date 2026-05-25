import { defineTaylorForm } from "@taylordb/forms-taylordb";
import { taylorSchema } from "../taylordb/types";

/**
 * Strongly typed in-progress answer map for this form.
 *
 * Passed to `defineTaylorForm(taylorSchema).withAnswers<CandidateAnswers>()`
 * so `showWhen` / `validate` callbacks get a precise `answers` shape
 * instead of `Record<string, unknown>`. Keys are the `taylordbFieldName`
 * of each shared step; values match the handler's value type:
 *
 *   text / email / phone_number / dropdown → `string`
 *   file_upload                             → `FileAnswer[]`
 *   yes_no                                  → `boolean`
 *
 * Everything is optional because, during the form, only the steps the
 * candidate has already answered are present in the map.
 *
 * Keep this in sync with the `sharedSteps` array below — add a key here
 * whenever you add a step, otherwise `showWhen` / `validate` on the new
 * step will see `unknown` for its dependencies.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type CandidateAnswers = {
  // Add a key per shared step's `taylordbFieldName` as you add steps.
  // See the doc block above for value types per `questionType`.
};

/**
 * Shared schema for the Candidate form — single source of truth.
 *
 * Imported by BOTH:
 *   - the server router (`apps/server/routers/candidateForm.ts`) — to
 *     auto-generate `resolvers` + `session` via `candidateForm.adapter(...)`,
 *   - the client page (`apps/client/src/pages/CandidateFormPage.tsx`) — for
 *     local validation + autosave bootstrap (`candidateForm.sharedSteps`).
 *
 * Re-exported through the `@repo/server/forms/candidate-form-schema` subpath
 * (see `apps/server/package.json` → `exports`).
 *
 * ─── How `defineTaylorForm` works ─────────────────────────────────────────
 *
 * `defineTaylorForm(taylorSchema)(config)` is curried:
 *
 *   1. The first call binds the runtime `taylorSchema` (from
 *      `@taylordb/query-builder`'s generated `types.ts`). That schema
 *      carries every column's runtime descriptor — type, required, select
 *      mode, attachment-ness — so the adapter doesn't have to guess.
 *
 *   2. The second call validates the form config against the schema at
 *      compile time (column existence + question↔column-type pairing).
 *
 * The result extends a `defineForm` result, so anything from forms-core /
 * forms-ui that expects `.sharedSteps` / `.mappers(...)` still works.
 *
 * ─── How to add or change a question ──────────────────────────────────────
 *
 *   1. Add a step here with:
 *        - `taylordbFieldName` — the step id AND the column on `candidates`.
 *        - `questionType`      — a handler kind from `@taylordb/forms-core`
 *          (`text`, `email`, `phone_number`, `file_upload`, `rating`, …).
 *
 *      Compile-time check: the column must exist on `taylorSchema.candidates`
 *      and its descriptor type must match the `questionType` (e.g.
 *      `file_upload` → `attachment`, `text/email/phone_number` → `text`).
 *
 *   2. (Optional) Provide `validate(value)` — runs on BOTH client and
 *      server. Returns `null` for valid, or a string error.
 *
 *   3. Add a matching `<Question id="…">` in `CandidateFormBody.tsx`
 *      whose `id` is the SAME string as `taylordbFieldName`.
 *
 *   4. If you need a new column, run a schema mutation to add it. Match
 *      the column type to the `questionType`:
 *
 *        text/email/phone_number/website → `singlelineText`
 *        long_text                       → `longText`
 *        number/rating/scale             → `number`
 *        date                            → `date`
 *        yes_no/legal                    → `checkbox`
 *        dropdown/picture_choice         → `select` (single)
 *        multiple_choice                 → `select` (single OR multi)
 *        file_upload                     → `attachment`
 *
 *   5. Run `pnpm --filter @repo/client build` — `formsFormCheckPlugin`
 *      will fail the build if `<Question>` order drifts from `sharedSteps`.
 *
 * ─── Server persistence: no resolver boilerplate ──────────────────────────
 *
 * The router calls `candidateForm.createActions({ ctxToQB, emailConfig })`
 * and gets back a `FormsActionsType` already wired to the form's table
 * (`createSession` / `loadSession` / `saveAnswer` / `submitForm`). Every
 * step's `save` is auto-generated — no manual
 * `update().set().where().execute()` per field.
 *
 * `createActions` ALSO exposes `actions.uploadFile(ctx, { sessionId,
 * stepId, file, name })`, which the `upload.uploadCandidateFile`
 * procedure delegates to. It verifies the step targets an `attachment`
 * column, calls `qb.uploadAttachments(...)`, and atomically swaps the
 * column's value — no hand-written attachment plumbing needed.
 *
 * Attachment columns (`resume`, `videoIntro`, …) are special-cased by the
 * adapter:
 *   - `save` is auto-`'noop'` — bytes go through `actions.uploadFile`,
 *     which writes the attachment column directly.
 *   - `load` rehydrates the stored `string[]` paths into `FileAnswer[]`
 *     with the media host prefixed (see `taylordb.mediaHost`).
 *
 * ─── What NOT to put here ─────────────────────────────────────────────────
 *
 *   `WelcomeScreen`, `Statement`, and `EndScreen` collect no answer — they
 *   are UI-only and must NOT appear in `sharedSteps`. They live inside
 *   `<Form>` in the page component.
 *
 * ─── Docs ─────────────────────────────────────────────────────────────────
 *
 *   apps/server/node_modules/@taylordb/forms-taylordb/llm.txt
 *   apps/server/node_modules/@taylordb/forms-taylordb/docs/{api,errors,migration}.md
 */
export const candidateForm = defineTaylorForm(taylorSchema)
  .withAnswers<CandidateAnswers>()({
  sharedSteps: [
  ] as const,
  taylordb: {
    table: "submissions",
    completedColumn: "submitted",
    initialValues: { submitted: false },
    // mediaHost defaults to `https://media.taylordb.ai` — set this if your
    // attachments are served from a different origin.
  },
});
