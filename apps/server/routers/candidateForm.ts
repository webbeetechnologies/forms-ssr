import { z } from "zod";
import { FormsError } from "@taylordb/forms-api";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import type { Context } from "../trpc";
import { candidateForm } from "../forms/candidate-form-schema";

/**
 * Candidate form router — server side of the autosave contract.
 *
 * All the form-shaped work — what questions exist, what columns they map
 * to, how attachment columns rehydrate into `FileAnswer[]`, how select
 * cardinality is normalized — lives in `candidate-form-schema.ts` and is
 * driven by the runtime `taylorSchema`. This file is just the tRPC
 * plumbing on top.
 *
 * We use `candidateForm.createActions(...)` (added in
 * `@taylordb/forms-taylordb` 0.1.9). It wires `adapter()` and
 * `createFormsActions` together AND exposes a built-in `uploadFile`
 * action — the TaylorDB attachment upload pipeline previously hand-rolled
 * in `upload.ts`. The same `candidateFormActions` is re-exported so the
 * upload router can call `candidateFormActions.uploadFile(ctx, …)`.
 *
 * What `createActions` gives us:
 *
 *   • `createSession`   — inserts an empty row in `taylordb.table` and
 *                          returns its id.
 *   • `loadSession`     — selects the row, rehydrates attachment columns
 *                          into `FileAnswer[]`, returns answers keyed by
 *                          step id. Returns `null` for already-submitted
 *                          rows.
 *   • `saveAnswer`      — runs per-save `sharedSteps[].validate` and writes
 *                          one column per simple step (or a multi-column
 *                          atomic update for composite steps).
 *   • `submitForm`      — drains pending saves, flips `submitted = true`,
 *                          and renders + sends the email summary.
 *   • `uploadFile`      — used from `upload.ts`. Verifies the step targets
 *                          an `attachment` column, calls
 *                          `qb.uploadAttachments(...)`, replaces the
 *                          column value, and returns `{ url, name, type,
 *                          size }`.
 *
 * Adding a new question only touches `candidate-form-schema.ts` and
 * `CandidateFormBody.tsx`. There is nothing for this file to learn.
 *
 * ─── Docs ────────────────────────────────────────────────────────────────
 *   apps/server/node_modules/@taylordb/forms-taylordb/docs/api.md
 *   apps/server/node_modules/@taylordb/forms-taylordb/docs/errors.md
 *   apps/server/node_modules/@taylordb/forms-api/docs/api.md
 */

export const candidateFormActions = candidateForm.createActions<Context>({
  ctxToQB: (ctx) => ctx.queryBuilder,
  emailConfig: {
    // forms-api compiles a self-contained HTML email summary on submit and
    // hands it to `send`. This template just logs it; wire up your real
    // mailer (Resend, SendGrid, SES, …) here.
    send: async ({ html }) => {
      console.log("\n[candidate form submission]\n", html, "\n");
    },
  },
});

/**
 * Maps adapter / forms-api errors to TRPCError so the client autosave
 * layer surfaces a structured failure.
 *
 * - `FormsError` (validation, missing session, completed-row reload, etc.)
 *   maps to a matching TRPC code.
 * - Query-builder errors (auth, network, schema mismatch) fall through
 *   unchanged — they become INTERNAL_SERVER_ERROR with the original
 *   message preserved by tRPC's default handler.
 *
 * See `@taylordb/forms-taylordb/docs/errors.md` for the full taxonomy.
 */
export function toTrpcError(err: unknown): never {
  if (err instanceof FormsError) {
    const code =
      err.code === "NOT_FOUND"
        ? "NOT_FOUND"
        : err.code === "BAD_REQUEST"
          ? "BAD_REQUEST"
          : "INTERNAL_SERVER_ERROR";
    throw new TRPCError({
      code,
      message: err.message,
      cause: { stepId: err.stepId, fieldName: err.fieldName },
    });
  }
  throw err;
}

export const candidateFormRouter = router({
  createSession: publicProcedure.mutation(({ ctx }) =>
    candidateFormActions.createSession(ctx).catch(toTrpcError),
  ),

  loadSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ ctx, input }) =>
      candidateFormActions.loadSession(ctx, input).catch(toTrpcError),
    ),

  saveAnswer: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        stepId: z.string(),
        // Optional: JSON clients often omit keys set to `undefined`, and
        // optional steps may legitimately persist an absent value.
        value: z.unknown().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      candidateFormActions
        .saveAnswer(ctx, {
          sessionId: input.sessionId,
          stepId: input.stepId,
          value: input.value,
        })
        .catch(toTrpcError),
    ),

  submitForm: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ ctx, input }) =>
      candidateFormActions.submitForm(ctx, input).catch(toTrpcError),
    ),
});
