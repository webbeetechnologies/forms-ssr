import { createServerFn } from "@tanstack/react-start";
import type { SerializableFormSession } from "@taylordb/forms-ui";

import { toClientError } from "./form-actions";
import { bootstrapFormSession } from "./form-session";

export const getFormSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SerializableFormSession> => {
    try {
      return await bootstrapFormSession();
    } catch (err) {
      toClientError(err);
    }
  },
);
