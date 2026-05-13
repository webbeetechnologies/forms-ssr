import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";
import { createContext } from "./trpc.js";
const app = express();
const PORT = process.env.PORT || 3001;

// Parse cookies
app.use(cookieParser());

// Enable CORS for frontend (adjust origin in production)
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// tRPC middleware
app.use(
  "/api/trpc",
  (req, res, next) => {
    // Handle root path access with a friendly message instead of a tRPC error
    if (req.path === "/" || req.path === "") {
      return res.json({
        message: "TaylorDB tRPC server is running!",
        health: `http://${req.headers.host}/api/trpc/health`,
        timestamp: new Date().toISOString(),
      });
    }
    next();
  },
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});
