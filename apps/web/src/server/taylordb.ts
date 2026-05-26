import { createQueryBuilder } from "@taylordb/query-builder";
import { getRequestHeader } from "@tanstack/react-start/server";

import type { TaylorDatabase } from "./taylordb/types";

function readCookie(name: string) {
  const header = getRequestHeader("cookie");
  if (!header) return null;

  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }

  return null;
}

function resolveApiKey() {
  const fromCookie = readCookie("app_access_token");
  if (fromCookie) return fromCookie;

  const fromEnv = process.env.TAYLORDB_API_KEY;
  if (fromEnv) return fromEnv;

  throw new Error(
    "Unauthorized: sign in to set app_access_token, or set TAYLORDB_API_KEY for local server-to-server use.",
  );
}

export function getTaylorDB() {
  const baseUrl = process.env.TAYLORDB_BASE_URL;
  const baseId = process.env.TAYLORDB_SERVER_ID;
  if (!baseUrl || !baseId) {
    throw new Error("Missing TAYLORDB_BASE_URL or TAYLORDB_SERVER_ID");
  }

  return createQueryBuilder<TaylorDatabase>({
    baseUrl,
    baseId,
    apiKey: resolveApiKey(),
  });
}
