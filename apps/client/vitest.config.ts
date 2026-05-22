import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest config for the candidate form unit tests.
 *
 * Kept separate from `vite.config.ts` so the build pipeline (which loads
 * the form-config check plugin and SSE log forwarder) is not invoked
 * during tests.
 *
 * The `environment: "jsdom"` setting gives us a DOM so
 * `@testing-library/react` can mount the form and we can query the
 * `data-testid` hooks documented in
 *   apps/client/node_modules/@taylordb/forms-ui/docs/test-ids.md
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
