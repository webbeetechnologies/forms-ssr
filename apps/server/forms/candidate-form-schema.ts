import { defineTaylorForm } from "@taylordb/forms-taylordb";
import { isValidPhoneNumber } from "libphonenumber-js";
import { taylorSchema } from "../taylordb/types";

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
 * The router calls `candidateForm.adapter(ctx => ctx.queryBuilder)` and
 * gets back `{ resolvers, session }` already wired to the `candidates`
 * table. Every step's `save` is auto-generated — no manual
 * `update().set().where().execute()` per field.
 *
 * Attachment columns (`resume`, `videoIntro`) are special-cased by the
 * adapter:
 *   - `save` is auto-`'noop'` — bytes go through the dedicated upload
 *     endpoint, which writes the attachment column directly.
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
export const candidateForm = defineTaylorForm(taylorSchema)({
  sharedSteps: [
    {
      taylordbFieldName: "name",
      questionType: "text",
      validate(value: string) {
        return value.trim().length >= 2
          ? null
          : "Please enter your full name (at least 2 characters).";
      },
    },
    {
      taylordbFieldName: "email",
      // The built-in `email` validator enforces RFC-ish format and
      // lower-cases the value — no extra `validate` needed.
      questionType: "email",
    },
    {
      taylordbFieldName: "phone",
      questionType: "phone_number",
      validate(value: string) {
        const trimmed = value.trim();
        if (trimmed === "") return "Phone number is required.";
        return isValidPhoneNumber(trimmed)
          ? null
          : "Enter a valid international number with country code.";
      },
    },
    {
      // The adapter sees `attachment` on this column and auto-applies
      // `save: 'noop'` + the built-in attachment loader. File bytes flow
      // through `upload.uploadCandidateFile` directly.
      taylordbFieldName: "resume",
      questionType: "file_upload",
    },
    {
      taylordbFieldName: "videoIntro",
      questionType: "file_upload",
      // 2-minute cap is enforced in the UI via `<VideoQuestion
      // maxDurationSeconds={120} />`. The built-in `file_upload` validator
      // already requires a non-empty array, so we just keep the custom
      // error copy here.
      validate(value: unknown) {
        if (!Array.isArray(value) || value.length === 0) {
          return "Please record or upload a short video introduction.";
        }
        return null;
      },
    },
    {
      // Single-select. `taylorSchema.candidates.workAuthorization` is
      // `select { mode: 'single' }`, which the adapter pairs with
      // `dropdown` (and `picture_choice`). `<Dropdown>` stores a scalar
      // string, so no array unwrap is needed end-to-end. Choices are
      // pinned at the TaylorDB level — the docstring in `inputs.md`
      // covers the UI side.
      taylordbFieldName: "workAuthorization",
      questionType: "dropdown",
    },
    {
      // Checkbox column → handler `yes_no` (or `legal`). Since
      // `@taylordb/forms-ui >= 0.2.10`, `<YesNo>` stores a boolean
      // directly — matches the column type with no mapper. (`legal`
      // would also fit if we wanted the long-form A/B agreement UI.)
      taylordbFieldName: "marketingConsent",
      questionType: "yes_no",
      // Optional — let the candidate skip it. With `optional`, the
      // built-in `yes_no` validator allows `undefined`; without it,
      // the candidate must actively pick Yes or No.
      optional: true,
    },
  ] as const,
  taylordb: {
    table: "candidates",
    completedColumn: "submitted",
    initialValues: { submitted: false },
    // mediaHost defaults to `https://media.taylordb.ai` — set this if your
    // attachments are served from a different origin.
  },
});
