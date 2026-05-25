import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { candidateFormActions, toTrpcError } from "./candidateForm";

/**
 * Upload router — file ingestion for the candidate form.
 *
 * Form state on the client only carries JSON; uploading a `Blob` / `File`
 * is a separate concern. The autosave layer's `form.mappers(..., {
 * uploadFile })` calls this endpoint, swaps the resulting URL into the
 * answer, and only THEN sends it through `saveAnswer`. By the time the
 * form-api validator runs, the file is already attached to the candidate
 * row.
 *
 * ─── Wire format ─────────────────────────────────────────────────────────
 *
 *   POST /api/trpc/upload.uploadCandidateFile
 *   Content-Type: multipart/form-data
 *
 *     file:       File          — the bytes
 *     sessionId:  string        — candidate row id (autosave session id)
 *     stepId:     string        — shared step id (= taylordbFieldName), e.g.
 *                                 "resume" or "videoIntro"
 *
 *   →  { url, name, type, size }   // shape consumed by the autosave mapper
 *
 * ─── What does the heavy lifting ────────────────────────────────────────
 *
 * Everything below the `FormData` parsing is provided by
 * `candidateFormActions.uploadFile` (from
 * `@taylordb/forms-taylordb` ≥ 0.1.9). It:
 *
 *   1. Verifies `stepId` is a shared simple step targeting an
 *      `attachment` column on `taylordb.table`.
 *   2. Reads the row and collects any existing attachment URLs.
 *   3. Calls `qb.uploadAttachments([{ file, name }])`.
 *   4. Replaces the column with `{ newAttachments, deletedUrls }` so a
 *      re-upload does NOT accumulate old files.
 *   5. Returns media metadata prefixed with `taylordb.mediaHost`.
 *
 * ─── Adding a new file question ──────────────────────────────────────────
 *
 * You don't touch this file. Steps:
 *
 *   1. Add a `file_upload` (or `multi_format`) step to `sharedSteps` in
 *      `candidate-form-schema.ts`.
 *   2. Add a matching `attachment` column to the table via
 *      `schema-mutation`.
 *   3. Add a `<FileUpload>` / `<VideoQuestion>` / `<AudioQuestion>` to
 *      `CandidateFormBody.tsx`.
 *
 * The page's `form.mappers({}, { uploadFile })` call already auto-wires
 * `toApiValue` for every attachment step, so a single upload procedure
 * handles all of them. See
 * `apps/server/node_modules/@taylordb/forms-taylordb/docs/api.md` →
 * "Generated `uploadFile`".
 */
export const uploadRouter = router({
  uploadCandidateFile: publicProcedure
    .input(z.instanceof(FormData))
    .mutation(async ({ input, ctx }) => {
      const file = input.get("file") as File | null;
      const sessionIdRaw = input.get("sessionId") as string | null;
      const stepId = input.get("stepId") as string | null;

      if (!file || file.size === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing file" });
      }
      if (!sessionIdRaw) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing sessionId",
        });
      }
      const sessionId = Number(sessionIdRaw);
      if (!Number.isFinite(sessionId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid sessionId",
        });
      }
      if (!stepId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing stepId" });
      }

      return candidateFormActions
        .uploadFile(ctx, {
          sessionId,
          stepId,
          file,
          name: file.name,
        })
        .catch(toTrpcError);
    }),
});
