import { z } from "zod";
import { createFormsActions, FormsError } from "@taylordb/forms-api";
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
 * `candidateForm.adapter(ctx => ctx.queryBuilder)` generates:
 *
 *   • `session.createSession`   — inserts an empty `candidates` row,
 *                                 returns its `id`.
 *   • `session.loadSession`     — selects the row, rehydrates attachment
 *                                 columns, returns answers keyed by step
 *                                 id. Returns `null` for already-submitted
 *                                 rows (no resume of completed sessions).
 *   • `session.markCompleted`   — flips `submitted = true`.
 *   • `resolvers[stepId].save`  — one `update().set({col: value})` per
 *                                 simple step, with select-cardinality
 *                                 normalization baked in. Attachment
 *                                 columns auto-default to `'noop'`.
 *
 * Adding a new question? You only touch `candidate-form-schema.ts` and
 * `CandidateFormBody.tsx` — there is nothing for this file to learn.
 *
 * ─── Docs ────────────────────────────────────────────────────────────────
 *   apps/server/node_modules/@taylordb/forms-taylordb/docs/api.md
 *   apps/server/node_modules/@taylordb/forms-taylordb/docs/errors.md
 *   apps/server/node_modules/@taylordb/forms-api/docs/api.md
 */

const { resolvers, session } = candidateForm.adapter<Context>(
  (ctx) => ctx.queryBuilder,
);

const actions = createFormsActions({
  sharedSteps: candidateForm.sharedSteps,
  resolvers,
  session,
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
function toTrpcError(err: unknown): never {
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
    actions.createSession(ctx).catch(toTrpcError),
  ),

  loadSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ ctx, input }) =>
      actions.loadSession(ctx, input).catch(toTrpcError),
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
      actions
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
      actions.submitForm(ctx, input).catch(toTrpcError),
    ),
});
