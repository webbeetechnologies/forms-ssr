import { z } from "zod";
import { router, publicProcedure } from "./trpc";
import { usersRouter, postsRouter, submitUserDataRouter } from "./routers";

export const appRouter = router({
  users: usersRouter,
  posts: postsRouter,
  submitUserData: submitUserDataRouter,

  hello: publicProcedure
    .input(
      z
        .object({
          name: z.string().optional(),
        })
        .optional()
    )
    .query(({ input }) => {
      return {
        message: `Hello ${input?.name ?? "World"}!`,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    }),
});

export type AppRouter = typeof appRouter;
