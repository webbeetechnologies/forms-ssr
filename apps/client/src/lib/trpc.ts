import { createTRPCReact, type CreateTRPCReact } from "@trpc/react-query";
import { httpBatchLink, httpLink, splitLink, type TRPCClient } from "@trpc/client";
import type { AppRouter } from "@repo/server/router";

/**
 * Create tRPC React hooks
 */
export const trpc: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>();

/**
 * Get the base URL for tRPC requests
 */
const BASE_URL =
  (typeof globalThis.process !== "undefined" &&
    globalThis.process.env?.VITE_TRPC_URL) ||
  import.meta.env.VITE_TRPC_URL ||
  "http://localhost:3001/api";

const trpcUrl = `${BASE_URL}/trpc`;

/**
 * Create tRPC client
 *
 * Uses splitLink so that FormData mutations (multipart/form-data) are sent
 * through httpLink (no batching), while all other requests use httpBatchLink.
 */
export const trpcClient: TRPCClient<AppRouter> = trpc.createClient({
  links: [
    splitLink({
      condition: (op) => op.input instanceof FormData,
      true: httpLink({
        url: trpcUrl,
        fetch: (url, options) =>
          fetch(url, { ...options, credentials: "include" }),
      }),
      false: httpBatchLink({
        url: trpcUrl,
        fetch: (url, options) =>
          fetch(url, { ...options, credentials: "include" }),
      }),
    }),
  ],
});
