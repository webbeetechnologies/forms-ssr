import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";
import type { SerializableFormSession } from "@taylordb/forms-ui";
import {
  formsSessionClearCookieHeader,
  formsSessionSetCookieHeader,
  readFormsSessionCookie,
} from "@taylordb/forms-ui/server";

import { FORM_ID } from "@/shared/form.constants";

import {
  createFormContext,
  formActions,
} from "./form-actions";

const cookieOptions = {
  secure: process.env.NODE_ENV === "production",
};

function readSessionCookie(): number | null {
  return readFormsSessionCookie(getRequestHeader("cookie"), FORM_ID);
}

function writeSessionCookie(sessionId: number) {
  setResponseHeader(
    "set-cookie",
    formsSessionSetCookieHeader(FORM_ID, sessionId, cookieOptions),
  );
}

function clearSessionCookie() {
  setResponseHeader(
    "set-cookie",
    formsSessionClearCookieHeader(FORM_ID, cookieOptions),
  );
}

/**
 * Resolve or create a form session on the server.
 * Reads the forms session cookie, loads existing answers, or inserts a new row.
 */
export async function bootstrapFormSession(): Promise<SerializableFormSession> {
  const ctx = createFormContext();
  const stored = readSessionCookie();

  if (stored !== null) {
    try {
      const { answers } = await formActions.loadSession(ctx, {
        sessionId: stored,
      });
      writeSessionCookie(stored);
      return { sessionId: stored, answers };
    } catch {
      clearSessionCookie();
    }
  }

  const { sessionId } = await formActions.createSession(ctx);
  writeSessionCookie(sessionId);

  const { answers } = await formActions.loadSession(ctx, { sessionId });

  return { sessionId, answers };
}
