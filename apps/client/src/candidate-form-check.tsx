import { Form } from "@taylordb/forms-ui";
import { candidateForm } from "@repo/server/forms/candidate-form-schema";

import { CandidateFormBody } from "./pages/CandidateFormBody";

/**
 * Build-time form configuration check entry.
 *
 * `formsFormCheckPlugin` (see `vite.config.ts`) SSR-loads this module
 * and mounts `<CandidateFormCheck />` in jsdom before each `vite build`.
 * It uses the runtime error boundary in `@taylordb/forms-ui` to fail
 * the build when the JSX step tree drifts from `sharedSteps` — wrong
 * order, missing ids, duplicate ids, etc.
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  candidate-form-schema.ts  ◄────────►  CandidateFormBody.tsx     │
 *   │           │                                       │              │
 *   │           └─── this entry validates both ─────────┘              │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * IMPORTANT
 * ─────────
 *   • Do NOT use the autosave bootstrap here. The check runs without a
 *     network, so we render `<Form sharedSteps={…}>` directly.
 *   • Do NOT add side effects, network calls, or browser-only APIs
 *     (MediaRecorder, cookies, etc). The same body component used by
 *     real users renders here too — keep it side-effect free.
 *   • This component is never imported by the app bundle. It exists
 *     only for the plugin.
 *
 * Docs: apps/client/node_modules/@taylordb/forms-ui/docs/vite-plugin-form-check.md
 */
export default function CandidateFormCheck() {
  return (
    <Form sharedSteps={candidateForm.sharedSteps}>
      <CandidateFormBody />
    </Form>
  );
}
