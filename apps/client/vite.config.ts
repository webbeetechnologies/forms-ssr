import react from "@vitejs/plugin-react";
import { formsFormCheckPlugin } from "@taylordb/forms-ui/vite-plugin-form-check";
import path from "node:path";
import { PassThrough } from "stream";
import { defineConfig, type ViteDevServer } from "vite";

// ──────────────────────────────────────────────────────────────────────────────
// SSE log forwarder
// ─────────────────────────────────────────────────────────────────────────────
//
// TaylorDB's local dev tooling streams browser console output back to the
// shell over `/sse-logs`. This block intercepts `console.*` calls and pipes
// each line out as Server-Sent Events. It only runs in `vite dev`. If you
// don't need it, you can delete this whole section without affecting the
// form template.

const clients = new Set<PassThrough>();

type ConsoleLevel = "log" | "warn" | "error" | "info";

function sendLog(message: { level: ConsoleLevel; message: string }) {
  clients.forEach((client) =>
    client.write(`data: ${JSON.stringify(message)}\n\n`),
  );
}

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
};

Object.keys(originalConsole).forEach((level) => {
  console[level as ConsoleLevel] = (
    ...args: Parameters<Console[ConsoleLevel]>
  ) => {
    sendLog({ level: level as ConsoleLevel, message: args.join(" ") });
    originalConsole[level as ConsoleLevel](...args);
  };
});

// ──────────────────────────────────────────────────────────────────────────────
// Vite config
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [
    react(),
    // ──────────────────────────────────────────────────────────────────────
    // Forms config check — DO NOT REMOVE
    // ─────────────────────────────────────────────────────────────────────
    //
    // `formsFormCheckPlugin` (from `@taylordb/forms-ui`) SSR-loads
    // `src/candidate-form-check.tsx`, mounts it in jsdom, and fails
    // `vite build` if the JSX step tree drifts from `sharedSteps`
    // (wrong order, missing or duplicate step ids, etc.).
    //
    // This is our build-time guard against schema/JSX drift. Keep this
    // plugin enabled, keep `jsdom` in devDependencies, and keep
    // `@taylordb/forms-ui` up to date so the check stays in sync with
    // the runtime error boundary. See:
    //   apps/client/node_modules/@taylordb/forms-ui/docs/vite-plugin-form-check.md
    formsFormCheckPlugin({
      entry: "src/candidate-form-check.tsx",
      // Default exportName is "default" — matches CandidateFormCheck.
    }),
    {
      name: "sse-plugin",
      apply: "serve" as const,
      configureServer(server: ViteDevServer) {
        server.middlewares.use("/sse-logs", (req, res) => {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });

          const stream = new PassThrough();
          clients.add(stream);
          sendLog({ level: "info", message: "Client connected to SSE logs" });

          stream.pipe(res);

          req.on("close", () => {
            clients.delete(stream);
            sendLog({
              level: "info",
              message: "Client disconnected from SSE logs",
            });
          });
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    allowedHosts: [".develop.taylordb.ai", "localhost", "127.0.0.1"],
    host: true,
    port: 5173,
    hmr: {
      host: "",
      protocol: "wss",
      clientPort: 443,
      path: "/__vite_hmr",
    },
  },
});
