/**
 * Origins allowed to call the embed API from the browser.
 *
 * Default: `["*"]` — any customer site can embed the form.
 * For production, replace with explicit origins:
 *
 *   export const EMBED_ALLOWED_ORIGINS = [
 *     "https://customer-site.example",
 *     "https://www.customer-site.example",
 *   ] as const;
 */
export const EMBED_ALLOWED_ORIGINS = ["*"] as const;

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowed = EMBED_ALLOWED_ORIGINS;
  if (allowed.includes("*")) return "*";
  return (allowed as readonly string[]).includes(origin) ? origin : null;
}

export function withEmbedCors(request: Request, response: Response) {
  const origin = allowedOrigin(request);
  if (origin === null) return response;

  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "POST, OPTIONS");
  headers.set(
    "access-control-allow-headers",
    request.headers.get("access-control-request-headers") ?? "content-type",
  );
  headers.set("access-control-max-age", "86400");
  headers.append("vary", "Origin");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function embedCorsPreflight(request: Request) {
  if (request.headers.has("origin") && allowedOrigin(request) === null) {
    return new Response(null, { status: 403 });
  }

  return withEmbedCors(request, new Response(null, { status: 204 }));
}
