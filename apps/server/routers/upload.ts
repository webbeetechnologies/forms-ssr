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
    .mutation(async ({ input, ctx }) => {
      const file = input.get("file") as File | null;
      const sessionIdRaw = input.get("sessionId") as string | null;
      const column = input.get("column") as string | null;

      if (!file || file.size === 0) {
        throw new Error("Missing file");
      }
      if (!sessionIdRaw) {
        throw new Error("Missing sessionId");
      }
      const sessionId = Number(sessionIdRaw);
      if (!Number.isFinite(sessionId)) {
        throw new Error("Invalid sessionId");
      }
      if (column !== "resume" && column !== "videoIntro") {
        throw new Error("Invalid column");
      }

      // 1. Upload bytes to TaylorDB media storage.
      const attachments = await ctx.queryBuilder.uploadAttachments([
        { file, name: file.name },
      ]);

      // 2. Replace whatever is currently in the column on this row.
      //
      //    IMPORTANT: on `AttachmentColumnType`, `.set({ col: Attachment[] })`
      //    APPENDS to the existing attachments — it does NOT overwrite. To
      //    truly replace (so re-uploading the same question doesn't
      //    accumulate duplicates), we must read the current URLs and pass
      //    them as `deletedUrls` alongside the new attachment.
      //
      //    See: apps/server/node_modules/@taylordb/query-builder/docs/file-upload.md
      const existing = await ctx.queryBuilder
        .selectFrom("candidates")
        .select(["id", column as "resume" | "videoIntro"])
        .where("id", "=", sessionId)
        .executeTakeFirst();

      const existingUrls = Array.isArray(existing?.[column as "resume" | "videoIntro"])
        ? (existing![column as "resume" | "videoIntro"] as string[]).filter(
            (u): u is string => typeof u === "string" && u.length > 0,
          )
        : [];

      await ctx.queryBuilder
        .update("candidates")
        .set({
          [column]: {
            newAttachments: attachments,
            deletedUrls: existingUrls,
          },
        } as Record<string, unknown>)
        .where("id", "=", sessionId)
        .execute();

      // 3. Return media metadata for the UI. `cv.url` is a relative
      //    storage path (e.g. `files/abc.pdf`); prepend the media host so
      //    <video> / <a> can use it directly. `loadSession` does the same
      //    when rehydrating a resumed session.
      const uploaded = attachments[0];
      const cv = uploaded.toColumnValue();
      return {
        url: toAbsoluteMediaUrl(cv.url),
        name: file.name,
        type: cv.fileType,
        size: cv.size,
      };
    }),
});

const MEDIA_HOST = "https://media.taylordb.ai";

/** Prefix the TaylorDB media host onto a relative storage path. */
function toAbsoluteMediaUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const cleaned = url.startsWith("/") ? url.slice(1) : url;
  return `${MEDIA_HOST}/${cleaned}`;
}
