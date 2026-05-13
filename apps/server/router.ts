import { router } from "./trpc";
import { candidateFormRouter, uploadRouter } from "./routers";

export const appRouter = router({
  candidateForm: candidateFormRouter,
  upload: uploadRouter,
});

export type AppRouter = typeof appRouter;
