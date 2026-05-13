import { createQueryBuilder } from "@taylordb/query-builder";
import { initTRPC } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { TaylorDatabase } from "./taylordb/types";

/**
 * Create context for each tRPC request
 * This is where you can add user session, database clients, etc.
 */
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  // Extract app_access_token from cookies
  const appAccessToken = req.cookies?.app_access_token;
  
  if (!appAccessToken) {
    throw new Error("Unauthorized: app_access_token cookie is required");
  }
  
  const queryBuilder = createQueryBuilder<TaylorDatabase>({
    baseUrl: process.env.TAYLORDB_BASE_URL!,
    baseId: process.env.TAYLORDB_SERVER_ID!,
    apiKey: appAccessToken,
  });

  return {
    req,
    res,
    queryBuilder,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialize tRPC instance
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;
