import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Global Vitest setup for client-side form tests.
 *
 * - Pulls in `@testing-library/jest-dom`'s custom matchers so we can use
 *   things like `.toBeVisible()` / `.toHaveTextContent()` directly on
 *   Vitest's `expect`.
 * - Runs `cleanup()` after every test to unmount any leftover React
 *   trees, which is essential because forms-ui renders portaled content
 *   (e.g. dropdown options) into `document.body`.
 */
afterEach(() => {
  cleanup();
});
