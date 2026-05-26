import { createFileRoute } from "@tanstack/react-router";

import { embedCorsPreflight, withEmbedCors } from "@/server/cors";
import { handleFormsApiAction } from "@/server/forms-api-handlers";

export const Route = createFileRoute("/api/forms/$action")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => embedCorsPreflight(request),
      POST: async ({ request, params }) =>
        withEmbedCors(
          request,
          await handleFormsApiAction(params.action, request),
        ),
    },
  },
});
