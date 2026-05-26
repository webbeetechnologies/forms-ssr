import { createFileRoute } from "@tanstack/react-router";

import {
  createFormContext,
  formActions,
  toClientError,
} from "@/server/form-actions";
import { embedCorsPreflight, withEmbedCors } from "@/server/cors";

function uploadResponse(request: Request, body: unknown, status = 200) {
  return withEmbedCors(request, Response.json(body, { status }));
}

export const Route = createFileRoute("/api/upload-form-file")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => embedCorsPreflight(request),
      POST: async ({ request }) => {
        const input = await request.formData();
        const file = input.get("file");
        const sessionIdRaw = input.get("sessionId");
        const stepId = input.get("stepId");

        if (!(file instanceof File) || file.size === 0) {
          return uploadResponse(request, { message: "Missing file" }, 400);
        }
        if (typeof sessionIdRaw !== "string" || !sessionIdRaw) {
          return uploadResponse(request, { message: "Missing sessionId" }, 400);
        }
        const sessionId = Number(sessionIdRaw);
        if (!Number.isFinite(sessionId)) {
          return uploadResponse(request, { message: "Invalid sessionId" }, 400);
        }
        if (typeof stepId !== "string" || !stepId) {
          return uploadResponse(request, { message: "Missing stepId" }, 400);
        }

        try {
          const ctx = createFormContext();
          const result = await formActions.uploadFile(ctx, {
            sessionId,
            stepId,
            file,
            name: file.name,
          });
          return uploadResponse(request, result);
        } catch (err) {
          try {
            toClientError(err);
          } catch (clientErr) {
            const message =
              clientErr instanceof Error ? clientErr.message : "Upload failed";
            return uploadResponse(request, { message }, 400);
          }
        }
      },
    },
  },
});
