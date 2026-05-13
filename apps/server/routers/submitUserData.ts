import { z } from "zod";
import { router, publicProcedure } from "../trpc";

/**
 * Submit User Data Router
 *
 * tRPC 11 router demonstrating multipart/form-data input support.
 * Accepts name, email, cv, and profileImage in a single tRPC mutation.
 *
 * TaylorDB attachment pattern:
 *   const cv = input.get("cv") as File | null;
 *   const profileImage = input.get("profileImage") as File | null;
 *   const attachments = await ctx.queryBuilder.uploadAttachments([
 *     { file: cv, name: cv.name },
 *     { file: profileImage, name: profileImage.name },
 *   ]);
 *   await ctx.queryBuilder.insertInto("users").values({
 *     name,
 *     email,
 *     cv: attachments[0],
 *     profileImage: attachments[1],
 *   }).execute();
 */

export const submitUserDataRouter = router({
  /** Submit user data with named file fields via multipart/form-data (tRPC 11) */
  submit: publicProcedure
    .input(z.instanceof(FormData))
    .mutation(async ({ input }) => {
      const name = input.get("name") as string | null;
      const email = input.get("email") as string | null;
      const cv = input.get("cv") as File | null;
      const profileImage = input.get("profileImage") as File | null;

      const fileInfo = (file: File | null) =>
        file && file.size > 0
          ? { name: file.name, size: file.size, type: file.type }
          : null;

      // ──────────────────────────────────────────────────────────────────────
      // TaylorDB Attachment Example
      //
      // File objects are available directly — pass them to uploadAttachments:
      //
      //   const attachments = await ctx.queryBuilder.uploadAttachments([
      //     ...(cv ? [{ file: cv, name: cv.name }] : []),
      //     ...(profileImage ? [{ file: profileImage, name: profileImage.name }] : []),
      //   ]);
      //   await ctx.queryBuilder.insertInto("users").values({
      //     name,
      //     email,
      //     cv: attachments[0],
      //     profileImage: attachments[1],
      //   }).execute();
      // ──────────────────────────────────────────────────────────────────────

      return {
        received: {
          name,
          email,
          cv: fileInfo(cv),
          profileImage: fileInfo(profileImage),
        },
      };
    }),
});
