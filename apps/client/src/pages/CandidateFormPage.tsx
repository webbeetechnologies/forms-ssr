import { useEffect, useState } from "react";
import {
  Form,
  createTrpcAutosaveClient,
  lightTheme,
  useAutosaveStatus,
  createAutosaveAdapter,
  FormAdapterProvider,
  type AutosaveAdapter,
  type FormAnswers,
  type FormTheme,
} from "@taylordb/forms-ui";
import { candidateForm } from "@repo/server/forms/candidate-form-schema";

import { trpcVanilla } from "../lib/trpc-vanilla";
import { CandidateFormBody } from "./CandidateFormBody";

/**
 * Candidate form — Typeform-style flow with autosave.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ How this page is structured                                             │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ 1. Theme            — purple accent over `lightTheme`                   │
 * │ 2. Autosave client  — tRPC-backed, created at module scope (Promise)    │
 * │ 3. File mappers     — upload bytes through `upload.uploadCandidateFile` │
 * │ 4. Provider         — bootstraps the session before rendering <Form>    │
 * │ 5. Status banner    — fixed pill showing Saving / Saved / Error         │
 * │ 6. <Form>           — wraps `<CandidateFormBody>` (the step tree).      │
 * │                       The body lives in `CandidateFormBody.tsx` so the  │
 * │                       same JSX can be statically validated at build     │
 * │                       time by `formsFormCheckPlugin` in vite.config.ts. │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * The schema (`candidateForm`) lives in the server package and is imported
 * by both sides so client and server validators stay in lockstep.
 *
 * Files (resume + 2-min video intro) are uploaded through a dedicated tRPC
 * mutation (`upload.uploadCandidateFile`) which writes the bytes to the
 * candidate row's attachment column. The form itself only stores
 * `FileAnswer[]` metadata, so on autosave the resume / videoIntro
 * `saveAnswer` resolvers are no-ops — the attachment is already on the row.
 *
 * ─── Where to look for forms-ui docs ──────────────────────────────────────
 * apps/client/node_modules/@taylordb/forms-ui/llm.txt
 * apps/client/node_modules/@taylordb/forms-ui/docs/{form-api,inputs,autosave,recipes-agents}.md
 * apps/client/node_modules/@taylordb/forms-ui/example.md
 */

// ─── 1. Theme ────────────────────────────────────────────────────────────
//
// Override individual tokens on top of `lightTheme` (or `darkTheme`). The
// full token list lives in `@taylordb/forms-ui/docs/hooks-theming-exports.md`.
// Common ones: accent, surface, text, error, fontFamily.
const purpleTheme: FormTheme = {
  ...lightTheme,
  accent: "#8b5cf6",
  surface: "rgba(139, 92, 246, 0.08)",
};

// ─── 2. Autosave client ──────────────────────────────────────────────────
//
// `createTrpcAutosaveClient` wires `<Form>` autosave to the four tRPC
// procedures defined on the server's `candidateForm` router:
//   createSession / loadSession / saveAnswer / submitForm
//
// It returns a Promise (because it boots / probes the session id from a
// cookie before resolving). We hold the promise at module scope so the
// upload mappers below can `await` it to read the resolved `sessionId`.
const autosaveClientPromise = createTrpcAutosaveClient(
  trpcVanilla.candidateForm,
  { formId: "candidate" },
);

// ─── 3. File upload mappers ──────────────────────────────────────────────
//
// `<FileUpload>` and `<VideoQuestion>` store `MediaAnswer` objects in the
// form state — they hold a `Blob` / `File` plus metadata. Before the
// autosave layer sends the answer to the server it runs the mapper, which
// uploads the bytes and returns a `FileAnswer[]` with the resulting URL.
//
// We post the file via the dedicated `upload.uploadCandidateFile`
// mutation, which:
//   • runs `qb.uploadAttachments` to push bytes to TaylorDB media storage,
//   • writes the resulting Attachment to the candidate row's column,
//   • returns `{ url, name, type, size }` (URL prefixed with the media host).
//
// The `sessionId` is read from the resolved autosave client.
const mappers = candidateForm.mappers({});

// ─── 4. Bootstrap provider ───────────────────────────────────────────────
//
// A custom component that sequentializes the boot process:
//   1. Awaits the autosave client (cookie probe + boot).
//   2. Creates the autosave adapter.
//   3. Loads the session defaults from the database.
//
// This avoids double unmounts/remounts of the loading fallback
// and prevents the "double load / animation flicker" glitch entirely.
function CandidateAutosaveProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<
    | { status: "loading"; adapter: null; defaultValues: null; error: null }
    | { status: "ready"; adapter: AutosaveAdapter; defaultValues: FormAnswers; error: null }
    | { status: "error"; adapter: null; defaultValues: null; error: Error }
  >({ status: "loading", adapter: null, defaultValues: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const client = await autosaveClientPromise;
        if (cancelled) return;

        const adapter = createAutosaveAdapter({
          sharedSteps: candidateForm.sharedSteps,
          client,
          mappers,
        });

        const defaultValues = await adapter.loadSession();
        if (cancelled) return;

        setState({
          status: "ready",
          adapter,
          defaultValues,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          adapter: null,
          defaultValues: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "error") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          fontFamily: "var(--tf-font-family, system-ui, -apple-system, sans-serif)",
          padding: 24,
          gap: 16,
          textAlign: "center",
          maxWidth: 400,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ef4444",
            marginBottom: 4,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#111827",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Could not start a session
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#4b5563",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {state.error.message || "An unexpected error occurred. Please check your network connection and try again."}
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          fontFamily: "var(--tf-font-family, system-ui, -apple-system, sans-serif)",
          padding: 24,
          gap: 20,
          textAlign: "center",
        }}
      >
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <svg
          style={{
            animation: "spin 1s linear infinite",
            width: 44,
            height: 44,
            color: "#8b5cf6",
          }}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            style={{ opacity: 0.15 }}
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            style={{ opacity: 0.85 }}
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#1f2937",
              margin: 0,
              letterSpacing: "-0.01em",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          >
            Starting your session
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Preparing your application form...
          </p>
        </div>
      </div>
    );
  }

  return (
    <FormAdapterProvider
      adapter={state.adapter}
      defaultValues={state.defaultValues}
      sharedSteps={candidateForm.sharedSteps}
    >
      {children}
    </FormAdapterProvider>
  );
}

// ─── 5. Save status banner ───────────────────────────────────────────────
//
// Optional UX. Reads autosave state from the form store via
// `useAutosaveStatus()`. Safe to delete entirely if you don't want the pill.
function SessionBanner() {
  const { saveStatus, saveError, isHydrating } = useAutosaveStatus();

  const label = (() => {
    if (isHydrating) return "Restoring previous session…";
    if (saveStatus === "saving") return "Saving…";
    if (saveStatus === "saved") return "Saved";
    if (saveStatus === "error") return `Save failed: ${saveError ?? "unknown"}`;
    return "Idle";
  })();

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontFamily: "var(--tf-font-family)",
        background:
          saveStatus === "error"
            ? "rgba(255, 90, 90, 0.18)"
            : saveStatus === "saved"
              ? "rgba(72, 187, 120, 0.18)"
              : "var(--tf-surface)",
        color: "var(--tf-text)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
      }}
    >
      {label}
    </div>
  );
}

// ─── 6. The form itself ──────────────────────────────────────────────────
//
// The step tree lives in `CandidateFormBody`. Question `id` must match
// the shared schema step `id`. Welcome / Statement / EndScreen don't
// appear in `sharedSteps` (they don't collect answers).
//
// To add a new question:
//   1. Add the step to `sharedSteps` in `candidate-form-schema.ts`.
//   2. Add a matching `<Question id="...">` in `CandidateFormBody.tsx`.
//   3. Add a `save` resolver in `apps/server/routers/candidateForm.ts`.
//   4. Add the column to the `candidates` table via schema mutation.
//
// The `formsFormCheckPlugin` in `vite.config.ts` will fail `pnpm build`
// if the body and `sharedSteps` drift out of sync.
export default function CandidateFormPage() {
  return (
    <CandidateAutosaveProvider>
      <Form keyboard theme={purpleTheme}>
        <SessionBanner />
        <CandidateFormBody />
      </Form>
    </CandidateAutosaveProvider>
  );
}
