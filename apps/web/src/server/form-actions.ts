import { FormsError } from "@taylordb/forms-api";

import { form } from "./form-schema";
import { getTaylorDB } from "./taylordb";

export type FormServerContext = {
  queryBuilder: ReturnType<typeof getTaylorDB>;
};

export function createFormContext(): FormServerContext {
  return { queryBuilder: getTaylorDB() };
}

export const formActions = form.createActions<FormServerContext>({
  ctxToQB: (ctx) => ctx.queryBuilder,
  emailConfig: {
    send: async ({ html }) => {
      console.log("\n[form submission]\n", html, "\n");
    },
  },
});

export function toClientError(err: unknown): never {
  if (err instanceof FormsError) {
    throw new Error(err.message);
  }
  throw err;
}
