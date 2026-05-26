import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PassThrough } from "node:stream";
import { nitro } from "nitro/vite";
import { defineConfig, type ViteDevServer } from "vite";
import { formsFormCheckPlugin } from "@taylordb/forms-ui/vite-plugin-form-check";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

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

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  plugins: [
    devtools(),
    tanstackStart({}),
    viteReact(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    formsFormCheckPlugin({ entry: "src/form-check.tsx" }),
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
  server: {
    allowedHosts: [".develop.taylordb.ai", "localhost", "127.0.0.1"],
    host: true,
    port: 3000,
    hmr: {
      host: "",
      protocol: "wss",
      clientPort: 443,
      path: "/__vite_hmr",
    },
  },
});