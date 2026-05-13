import { z } from "zod";
import { createFormsActions, FormsError } from "@taylordb/forms-api";
import type { SessionResolvers, FileAnswer } from "@taylordb/forms-core";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { candidateForm } from "../forms/candidate-form-schema";
import type { Context } from "../trpc";

/**
 * Candidate form router
 *
 * Wires `createFormsActions` from `@taylordb/forms-api` into a tRPC router
 * that the autosave-aware `<Form>` component on the client talks to.
 *
 * Sessions are persisted directly to the `candidates` table. Each row IS a
 * session: createSession inserts an empty row, saveAnswer updates one column,
 * submitForm flips `submitted = true`. File uploads land in their attachment
 * columns via the dedicated `/upload` endpoint, and saveAnswer for those
 * file steps just re-validates without re-writing.
 */

const MEDIA_HOST = "https://media.taylordb.ai";

/**
 * Attachment columns store relative storage paths (e.g. `files/abc.pdf`).
 * The UI needs an absolute URL it can render in <video>/<a>; prefix the
 * TaylorDB media host. Already-absolute URLs pass through unchanged.
 */
function toAbsoluteMediaUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const cleaned = url.startsWith("/") ? url.slice(1) : url;
  return `${MEDIA_HOST}/${cleaned}`;
}

const sessionResolvers: SessionResolvers<Context> = {
  async createSession(ctx) {
    const inserted = await ctx.queryBuilder
      .insertInto("candidates")
      .values({ submitted: false })
      .returning(["id"])
      .executeTakeFirst();
    if (!inserted?.id) {
      throw new FormsError(
        "INTERNAL_SERVER_ERROR",
        "Failed to create candidate session.",
      );
    }
    return inserted.id;
  },

  async loadSession(ctx, sessionId) {
    const row = await ctx.queryBuilder
      .selectFrom("candidates")
      .select([
        "id",
        "name",
        "email",
        "phone",
        "resume",
        "videoIntro",
        "submitted",
      ])
      .where("id", "=", sessionId)
      .executeTakeFirst();

    if (!row) return null;
    // Don't allow resuming a completed submission.
    if (row.submitted === true) return null;

    // Attachment columns come back as `string[]`. The query builder stores
    // and returns relative storage paths (`files/...`); for the UI to render
    // them in <video>/<a>, prepend the media host.
    const urlListToFileAnswers = (urls: unknown): FileAnswer[] => {
      if (!Array.isArray(urls)) return [];
      return urls
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .map(toAbsoluteMediaUrl)
        .map((url) => {
          const segs = url.split("/");
          const name = decodeURIComponent(segs[segs.length - 1] ?? "upload");
          // Best-effort type guess from extension; size is unknown at read time.
          const ext = name.split(".").pop()?.toLowerCase() ?? "";
          const guessedType =
            ext === "pdf"
              ? "application/pdf"
              : ext === "mp4" || ext === "webm" || ext === "mov"
                ? `video/${ext === "mov" ? "quicktime" : ext}`
                : "application/octet-stream";
          return { name, size: 0, type: guessedType, url } satisfies FileAnswer;
        });
    };

    return {
      name: row.name ?? undefined,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      resume: urlListToFileAnswers(row.resume),
      videoIntro: urlListToFileAnswers(row.videoIntro),
    };
  },

  async markCompleted(ctx, sessionId) {
    await ctx.queryBuilder
      .update("candidates")
      .set({ submitted: true })
      .where("id", "=", sessionId)
      .execute();
  },
};

const resolvers = candidateForm.resolvers<Context>({
  name: {
    save: async (ctx, sessionId, value) => {
      await ctx.queryBuilder
        .update("candidates")
        .set({ name: value })
        .where("id", "=", sessionId)
        .execute();
    },
  },
  email: {
    save: async (ctx, sessionId, value) => {
      await ctx.queryBuilder
        .update("candidates")
        .set({ email: value })
        .where("id", "=", sessionId)
        .execute();
    },
  },
  phone: {
    save: async (ctx, sessionId, value) => {
      await ctx.queryBuilder
        .update("candidates")
        .set({ phone: value })
        .where("id", "=", sessionId)
        .execute();
    },
  },
  // resume / videoIntro: bytes were already attached to the row by the
  // upload endpoint. saveAnswer just re-validates the FileAnswer[] shape.
  resume: { save: async () => {} },
  videoIntro: { save: async () => {} },
});

const actions = createFormsActions({
  sharedSteps: candidateForm.sharedSteps,
  resolvers,
  session: sessionResolvers,
  emailConfig: {
    send: async ({ html }) => {
      // No email transport wired up in this template — log the rendered HTML
      // for visibility during development.
      console.log("\n[candidate form submission]\n", html, "\n");
    },
  },
});

/** Maps FormsError → TRPCError so the client autosave layer surfaces it. */
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
        value: z.unknown(),
      }),
    )
    .mutation(({ ctx, input }) =>
      actions.saveAnswer(ctx, input).catch(toTrpcError),
    ),

  submitForm: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ ctx, input }) =>
      actions.submitForm(ctx, input).catch(toTrpcError),
    ),
});
