import { z } from "zod";
import { router, publicProcedure } from "../trpc";

/**
 * Upload router — file ingestion for the candidate form.
 *
 * Form state on the client only carries JSON; uploading a `Blob` / `File`
 * is a separate concern. The autosave layer's `createFileUploadMapper`
 * calls this endpoint, swaps in the resulting URL, and only THEN sends the
 * answer through `saveAnswer`. By the time the form-api validator runs,
 * the file is already attached to the candidate row.
 *
 * ─── Wire format ─────────────────────────────────────────────────────────
 *
 *   POST /api/trpc/upload.uploadCandidateFile
 *   Content-Type: multipart/form-data
 *
 *     file:       File          — the bytes
 *     sessionId:  string        — candidate row id (autosave session id)
 *     column:     "resume" | "videoIntro"
 *
 *   →  { url, name, type, size }   // shape required by `UploadedMediaFile`
 *
 * ─── Steps ───────────────────────────────────────────────────────────────
 *
 *   1. Push bytes to TaylorDB media storage via `qb.uploadAttachments`.
 *   2. Write the resulting `Attachment` to the candidate row's column,
 *      overwriting any previous upload (re-uploads don't accumulate).
 *   3. Return the storage URL prefixed with the TaylorDB media host so the
 *      UI can render it directly in <video> / <a>.
 *
 * ─── Adding a new file column ────────────────────────────────────────────
 *
 *   • Extend the `column` discriminator below.
 *   • Make sure that column exists on the `candidates` table (schema
 *     mutation).
 *   • Add a matching `<FileUpload>` / `<VideoQuestion>` / `<AudioQuestion>`
 *     to `CandidateFormPage.tsx` and a mapper in the same file.
 */
export const uploadRouter = router({
  uploadCandidateFile: publicProcedure
    .input(z.instanceof(FormData))
    .mutation(async () => {
      throw new Error("No file columns exist anymore.");
    }),
});


