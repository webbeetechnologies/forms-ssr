import { defineForm } from "@taylordb/forms-core";
import { isValidPhoneNumber } from "libphonenumber-js";

/**
 * Shared schema for the Candidate form.
 *
 * This file is the single source of truth for the form's shape. It is
 * imported by BOTH:
 *
 *   - the server (`apps/server/routers/candidateForm.ts`) — for validation +
 *     typed save resolvers via `candidateForm.resolvers(...)`,
 *   - the client (`apps/client/src/pages/CandidateFormPage.tsx`) — to drive
 *     the same local validation + autosave bootstrap.
 *
 * It re-exports through the `@repo/server/forms/candidate-form-schema`
 * subpath (see `apps/server/package.json` → `exports`) so the client can
 * import it as `import { candidateForm } from
 * "@repo/server/forms/candidate-form-schema"`.
 *
 * ─── How to add / change a question ────────────────────────────────────────
 *
 *   1. Add a step here with a stable string `id` and a handler `type` from
 *      `typeHandlers` in `@taylordb/forms-core` (e.g. `text`, `email`,
 *      `phone_number`, `file_upload`, `multiple_choice`, `rating`, …).
 *      See `apps/client/node_modules/@taylordb/forms-core/docs/api.md`.
 *
 *   2. (Optional) Provide a `validate(value)` that runs on BOTH client and
 *      server. Return `null` for valid, or a string error message.
 *
 *   3. Add a matching `<Question id="…">` in `CandidateFormPage.tsx` whose
 *      `id` matches exactly.
 *
 *   4. Add a `save(ctx, sessionId, value)` entry in `resolvers` inside
 *      `apps/server/routers/candidateForm.ts` that writes the answer to the
 *      database (typically a column on the `candidates` row).
 *
 *   5. If the column is new, run a schema mutation to add it to the
 *      `candidates` table.
 *
 * ─── What NOT to put here ──────────────────────────────────────────────────
 *
 *   `WelcomeScreen`, `Statement`, and `EndScreen` collect no answer — they
 *   are UI-only and must NOT appear in `sharedSteps`. They are declared
 *   directly inside `<Form>` in the page component.
 */
export const candidateForm = defineForm({
  sharedSteps: [
    {
      id: "name",
      type: "text",
      validate(value: string) {
        return value.trim().length >= 2
          ? null
          : "Please enter your full name (at least 2 characters).";
      },
    },
    {
      id: "email",
      // The `email` handler already enforces RFC-ish email format and
      // lower-cases the value before saving — no extra validate() needed.
      type: "email",
    },
    {
      id: "phone",
      type: "phone_number",
      validate(value: string) {
        const trimmed = value.trim();
        if (trimmed === "") return "Phone number is required.";
        return isValidPhoneNumber(trimmed)
          ? null
          : "Enter a valid international number with country code.";
      },
    },
    {
      id: "resume",
      // `file_upload` validates the value as `FileAnswer[]`. The actual file
      // bytes are uploaded through the dedicated `upload.uploadCandidateFile`
      // mutation, not through `saveAnswer`. See the mappers in
      // `CandidateFormPage.tsx`.
      type: "file_upload",
    },
    {
      id: "videoIntro",
      type: "file_upload",
      validate(value: unknown) {
        // The 2-minute cap is enforced in the UI via `<VideoQuestion
        // maxDurationSeconds={120} />`. Here we just require *something*.
        if (!Array.isArray(value) || value.length === 0) {
          return "Please record or upload a short video introduction.";
        }
        return null;
      },
    },
  ] as const,
});
