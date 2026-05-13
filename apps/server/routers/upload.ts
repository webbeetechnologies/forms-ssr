import { z } from "zod";
import { router, publicProcedure } from "../trpc";

/**
 * Upload router
 *
 * Handles file uploads for the candidate form. Each upload is associated with
 * a candidate session id (the row id in the `candidates` table) and a target
 * column ("resume" | "videoIntro"). The endpoint:
 *
 *   1. Reads the File from FormData
 *   2. Calls `qb.uploadAttachments` to push the bytes to TaylorDB media storage
 *   3. Updates the candidate row, replacing whatever was previously in the
 *      target column (so re-uploads don't accumulate dead attachments)
 *
 * Returns the same `UploadedMediaFile` shape that `@taylordb/forms-ui`
 * expects from `createFileUploadMapper({ uploadFile })`:
 *
 *   { url, name, type, size }
 *
 * The form's `saveAnswer` for the file step then just receives the resulting
 * FileAnswer[] for re-validation; no further DB write is needed because the
 * attachment is already on the row.
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

      // 1. Upload bytes to TaylorDB media storage
      const attachments = await ctx.queryBuilder.uploadAttachments([
        { file, name: file.name },
      ]);

      // 2. Replace whatever is currently in the column on this candidate row.
      //    Pass `Attachment[]`; the query builder calls .toColumnValue() under
      //    the hood. Replacing is achieved by simply setting the new value
      //    (TaylorDB attachment column overwrites on direct array set).
      await ctx.queryBuilder
        .update("candidates")
        .set({ [column]: attachments } as Record<string, unknown>)
        .where("id", "=", sessionId)
        .execute();

      // 3. Return the media metadata the form-ui expects.
      //    `cv.url` is a relative storage path (e.g. `files/abc.pdf`); the UI
      //    needs an absolute URL it can render in <video>/<a>, so prepend the
      //    TaylorDB media host. The same prefix is applied in
      //    `candidateForm.loadSession` when rehydrating an existing session.
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
