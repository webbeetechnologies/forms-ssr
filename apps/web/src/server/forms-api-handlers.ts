import { z } from "zod";

import {
  createFormContext,
  formActions,
  toClientError,
} from "./form-actions";

function formsApiError(err: unknown): Response {
  try {
    toClientError(err);
  } catch (clientErr) {
    const message =
      clientErr instanceof Error ? clientErr.message : "Request failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function handleFormsApiAction(
  action: string,
  request: Request,
): Promise<Response> {
  const body = await request.json().catch(() => ({}));

  try {
    const ctx = createFormContext();

    switch (action) {
      case "create-session": {
        const result = await formActions.createSession(ctx);
        return Response.json(result);
      }
      case "load-session": {
        const { sessionId } = z.object({ sessionId: z.number() }).parse(body);
        const result = await formActions.loadSession(ctx, { sessionId });
        return Response.json(result);
      }
      case "save-answer": {
        const data = z
          .object({
            sessionId: z.number(),
            stepId: z.string(),
            value: z.unknown().optional(),
          })
          .parse(body);
        await formActions.saveAnswer(ctx, {
          sessionId: data.sessionId,
          stepId: data.stepId,
          value: data.value,
        });
        return Response.json({});
      }
      case "submit-form": {
        const { sessionId } = z.object({ sessionId: z.number() }).parse(body);
        await formActions.submitForm(ctx, { sessionId });
        return Response.json({});
      }
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 404 });
    }
  } catch (err) {
    return formsApiError(err);
  }
}
