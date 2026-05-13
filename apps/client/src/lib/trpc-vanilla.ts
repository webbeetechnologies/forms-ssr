import {
  createTRPCProxyClient,
  httpBatchLink,
  httpLink,
  splitLink,
  type TRPCClient,
} from "@trpc/client";
import type { AppRouter } from "@repo/server/router";

/**
 * Vanilla tRPC proxy client (non-React).
 *
 * `@taylordb/forms-ui`'s `createTrpcAutosaveClient` expects a router proxy
 * exposing `.mutate(...)` / `.query(...)` directly, not the React hooks
 * produced by `createTRPCReact`. This file provides that proxy alongside the
 * React client used everywhere else.
 */
const BASE_URL =
  (typeof globalThis.process !== "undefined" &&
    globalThis.process.env?.VITE_TRPC_URL) ||
  import.meta.env.VITE_TRPC_URL ||
  "http://localhost:3001/api";

const trpcUrl = `${BASE_URL}/trpc`;

export const trpcVanilla: TRPCClient<AppRouter> =
  createTRPCProxyClient<AppRouter>({
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
