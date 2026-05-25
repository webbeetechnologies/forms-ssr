# Example — Candidate Application Form

A complete, copy-pasteable reference for building a real Typeform-style
candidate application backed by TaylorDB, using the same template this
repo ships. Every snippet below maps 1:1 to a file in this template.

This example covers the **most common question types** you'd want in a
job application:

| # | Question | Input | TaylorDB column type |
| - | -------- | ----- | -------------------- |
| 1 | Full name | `TextInput` | `singlelineText` |
| 2 | Work email | `TextInput` (email) | `singlelineText` |
| 3 | Phone | `PhoneInput` | `phoneNumber` |
| 4 | Role applying for | `Dropdown` | `select` (single) |
| 5 | Years of experience | `NumberInput` | `number` |
| 6 | Top skills | `MultipleChoice` | `select` (multi) |
| 7 | Why this role? | `TextArea` | `longText` |
| 8 | Resume (PDF) | `FileUpload` | `attachment` |
| 9 | Two-minute video intro | `VideoQuestion` | `attachment` |
| 10 | Available start date | `DateInput` | `date` |
| 11 | Willing to relocate? | `YesNo` | `checkbox` |
| 12 | Consent to background check | `Legal` | `checkbox` |

It also demonstrates a **conditional question** (`showWhen`) and the
**single shared `uploadFile`** that handles every file question
automatically — the upload router doesn't grow when you add more file
questions.

---

## 1. Schema (`apps/server/forms/candidate-form-schema.ts`)

The shared source of truth — imported by both the client and the server.

```ts
import { defineTaylorForm } from "@taylordb/forms-taylordb";
import type { FileAnswer } from "@taylordb/forms-core";
import { taylorSchema } from "../taylordb/types";

/**
 * In-progress answers map. One optional key per shared step's
 * `taylordbFieldName`. Used by `showWhen` and `validate` callbacks.
 *
 * Value types per `questionType`:
 *   text / email / phone_number / dropdown → string
 *   long_text                              → string
 *   number / rating                        → number
 *   yes_no / legal                         → boolean
 *   multiple_choice                        → string[]
 *   date                                   → string (ISO)
 *   file_upload                            → FileAnswer[]
 */
type CandidateAnswers = {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  yearsExperience?: number;
  skills?: string[];
  motivation?: string;
  resume?: FileAnswer[];
  videoIntro?: FileAnswer[];
  startDate?: string;
  willingToRelocate?: boolean;
  backgroundCheckConsent?: boolean;
};

export const candidateForm = defineTaylorForm(taylorSchema)
  .withAnswers<CandidateAnswers>()({
  sharedSteps: [
    { taylordbFieldName: "fullName",        questionType: "text" },
    { taylordbFieldName: "email",           questionType: "email" },
    { taylordbFieldName: "phone",           questionType: "phone_number" },
    { taylordbFieldName: "role",            questionType: "dropdown" },
    { taylordbFieldName: "yearsExperience", questionType: "number" },
    { taylordbFieldName: "skills",          questionType: "multiple_choice" },
    { taylordbFieldName: "motivation",      questionType: "long_text" },

    // File questions. Both columns are `attachment` in TaylorDB, so the
    // adapter auto-wires save = 'noop' and a built-in load that turns
    // stored `string[]` paths into `FileAnswer[]`.
    { taylordbFieldName: "resume",          questionType: "file_upload" },
    { taylordbFieldName: "videoIntro",      questionType: "file_upload" },

    { taylordbFieldName: "startDate",       questionType: "date" },
    { taylordbFieldName: "willingToRelocate", questionType: "yes_no" },

    // Conditional — only show the background-check consent if the
    // candidate gave consent to be contacted. (Toy example; real
    // forms use this for branch logic.)
    {
      taylordbFieldName: "backgroundCheckConsent",
      questionType: "legal",
      showWhen: (answers) => answers.willingToRelocate === true,
    },
  ] as const,
  taylordb: {
    table: "candidates",
    completedColumn: "submitted",
    initialValues: { submitted: false },
  },
});
```

### Required TaylorDB schema

Run a `schema-mutation` so the `candidates` table has these columns:

| Column                   | Type                       |
| ------------------------ | -------------------------- |
| `id`                     | `autoNumber` (primary key) |
| `fullName`               | `singlelineText`           |
| `email`                  | `singlelineText`           |
| `phone`                  | `phoneNumber`              |
| `role`                   | `select` (single — options: `Engineer`, `Designer`, `PM`, `Other`) |
| `yearsExperience`        | `number`                   |
| `skills`                 | `select` (multi — options: `TypeScript`, `React`, `Node.js`, `Python`, `SQL`, `Design`) |
| `motivation`             | `longText`                 |
| `resume`                 | `attachment`               |
| `videoIntro`             | `attachment`               |
| `startDate`              | `date`                     |
| `willingToRelocate`      | `checkbox`                 |
| `backgroundCheckConsent` | `checkbox`                 |
| `submitted`              | `checkbox`                 |

---

## 2. Server router (`apps/server/routers/candidateForm.ts`)

`candidateForm.createActions(...)` does ALL the work — including
`uploadFile`. The router below is the entire server-side surface for
both autosave and file uploads.

```ts
import { z } from "zod";
import { FormsError } from "@taylordb/forms-api";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import type { Context } from "../trpc";
import { candidateForm } from "../forms/candidate-form-schema";

export const candidateFormActions = candidateForm.createActions<Context>({
  ctxToQB: (ctx) => ctx.queryBuilder,
  emailConfig: {
    send: async ({ html, to }) => {
      // Wire up your mailer of choice here (Resend, SES, SendGrid, …).
      console.log("[candidate submission]", to, html);
    },
  },
});

export function toTrpcError(err: unknown): never {
  if (err instanceof FormsError) {
    const code =
      err.code === "NOT_FOUND" ? "NOT_FOUND" :
      err.code === "BAD_REQUEST" ? "BAD_REQUEST" :
      "INTERNAL_SERVER_ERROR";
    throw new TRPCError({
      code,
      message: err.message,
      cause: { stepId: err.stepId, fieldName: err.fieldName },
    });
  }
  throw err;
}

export const candidateFormRouter = router({
  createSession: publicProcedure.mutation(({ ctx }) =>
    candidateFormActions.createSession(ctx).catch(toTrpcError),
  ),
  loadSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ ctx, input }) =>
      candidateFormActions.loadSession(ctx, input).catch(toTrpcError),
    ),
  saveAnswer: publicProcedure
    .input(z.object({
      sessionId: z.number(),
      stepId: z.string(),
      value: z.unknown().optional(),
    }))
    .mutation(({ ctx, input }) =>
      candidateFormActions.saveAnswer(ctx, input).catch(toTrpcError),
    ),
  submitForm: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ ctx, input }) =>
      candidateFormActions.submitForm(ctx, input).catch(toTrpcError),
    ),
});
```

---

## 3. Upload router (`apps/server/routers/upload.ts`)

One generic file-ingestion procedure that handles `resume` AND
`videoIntro` (and any future `attachment` step) — no per-column
discriminator, no `qb.uploadAttachments` boilerplate.

```ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { candidateFormActions, toTrpcError } from "./candidateForm";

export const uploadRouter = router({
  uploadCandidateFile: publicProcedure
    .input(z.instanceof(FormData))
    .mutation(async ({ input, ctx }) => {
      const file = input.get("file") as File | null;
      const sessionIdRaw = input.get("sessionId") as string | null;
      const stepId = input.get("stepId") as string | null;

      if (!file || file.size === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing file" });
      }
      if (!sessionIdRaw) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing sessionId" });
      }
      const sessionId = Number(sessionIdRaw);
      if (!Number.isFinite(sessionId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid sessionId" });
      }
      if (!stepId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Missing stepId" });
      }

      return candidateFormActions
        .uploadFile(ctx, { sessionId, stepId, file, name: file.name })
        .catch(toTrpcError);
    }),
});
```

---

## 4. Client form body (`apps/client/src/pages/CandidateFormBody.tsx`)

The JSX step tree, in the SAME order as `sharedSteps`. Each `<Question
id="…">` `id` matches the schema's `taylordbFieldName`. The
build-time `formsFormCheckPlugin` will fail `pnpm build` on any drift.

```tsx
import {
  AudioQuestion, // unused but illustrative
  Description,
  Dropdown,
  EndScreen,
  FileUpload,
  Legal,
  MultipleChoice,
  NumberInput,
  PhoneInput,
  Question,
  Statement,
  TextArea,
  TextInput,
  Title,
  VideoQuestion,
  WelcomeScreen,
  YesNo,
  DateInput,
} from "@taylordb/forms-ui";

export function CandidateFormBody() {
  return (
    <>
      <WelcomeScreen id="welcome" buttonText="Start application">
        <Title>Apply to join our team</Title>
        <Description>
          Takes about three minutes. Your answers save as you go — close
          the tab and come back any time.
        </Description>
      </WelcomeScreen>

      <Question id="fullName">
        <Title>What's your full name?</Title>
        <TextInput placeholder="Jane Smith" />
      </Question>

      <Question id="email">
        <Title>What's the best email to reach you at?</Title>
        <TextInput placeholder="jane@example.com" inputMode="email" />
      </Question>

      <Question id="phone">
        <Title>And your phone number?</Title>
        <PhoneInput defaultCountry="US" />
      </Question>

      <Question id="role">
        <Title>Which role are you applying for?</Title>
        <Dropdown options={[
          { value: "Engineer", label: "Engineer" },
          { value: "Designer", label: "Designer" },
          { value: "PM",       label: "Product Manager" },
          { value: "Other",    label: "Something else" },
        ]} />
      </Question>

      <Question id="yearsExperience">
        <Title>How many years of relevant experience do you have?</Title>
        <NumberInput min={0} max={50} step={1} />
      </Question>

      <Question id="skills">
        <Title>Pick up to three skills you'd describe yourself with.</Title>
        <Description>Choose anywhere from one to three.</Description>
        <MultipleChoice
          max={3}
          options={[
            { value: "TypeScript", label: "TypeScript" },
            { value: "React",      label: "React" },
            { value: "Node.js",    label: "Node.js" },
            { value: "Python",     label: "Python" },
            { value: "SQL",        label: "SQL" },
            { value: "Design",     label: "Design" },
          ]}
        />
      </Question>

      <Question id="motivation">
        <Title>Why are you excited about this role?</Title>
        <Description>One or two paragraphs is plenty.</Description>
        <TextArea placeholder="I'm drawn to this because…" />
      </Question>

      <Statement id="resume-intro" buttonText="Continue">
        <Title>Almost there — let's see your work.</Title>
        <Description>
          Drop in a PDF resume next, then a short video introduction.
        </Description>
      </Statement>

      <Question id="resume">
        <Title>Attach your resume</Title>
        <Description>PDF, DOC, or DOCX. Up to 10 MB.</Description>
        <FileUpload accept=".pdf,.doc,.docx" maxSizeBytes={10 * 1024 * 1024} />
      </Question>

      <Question id="videoIntro">
        <Title>Record a two-minute video intro</Title>
        <Description>
          Tell us who you are and why you're interested. You can also
          upload a pre-recorded clip.
        </Description>
        <VideoQuestion maxDurationSeconds={120} />
      </Question>

      <Question id="startDate">
        <Title>When could you start?</Title>
        <DateInput />
      </Question>

      <Question id="willingToRelocate">
        <Title>Would you relocate for this role?</Title>
        <YesNo />
      </Question>

      {/* Only renders when `willingToRelocate === true` (see schema). */}
      <Question id="backgroundCheckConsent">
        <Title>Background check consent</Title>
        <Legal>
          I authorize the company to conduct a background check as part
          of the hiring process. I understand I can withdraw consent at
          any time.
        </Legal>
      </Question>

      <EndScreen id="done" buttonText="Submit application">
        <Title>Ready to send it in?</Title>
        <Description>
          Thanks for taking the time. Our team will review your
          application and reach out within a few days.
        </Description>
      </EndScreen>
    </>
  );
}
```

---

## 5. Client page (`apps/client/src/pages/CandidateFormPage.tsx`)

The page wires up the autosave provider and the **single shared
`uploadFile`** that handles every file question. Note that the mapper
boilerplate is gone — you don't reference `resume` or `videoIntro` by
name anywhere on the client side.

```tsx
import { useEffect, useState } from "react";
import {
  Form,
  createTrpcAutosaveClient,
  lightTheme,
  createAutosaveAdapter,
  FormAdapterProvider,
  type AutosaveAdapter,
  type FormAnswers,
  type FormTheme,
} from "@taylordb/forms-ui";
import { candidateForm } from "@repo/server/forms/candidate-form-schema";
import { trpcVanilla } from "../lib/trpc-vanilla";
import { CandidateFormBody } from "./CandidateFormBody";

const purpleTheme: FormTheme = {
  ...lightTheme,
  accent: "#8b5cf6",
  surface: "rgba(139, 92, 246, 0.08)",
};

const autosaveClientPromise = createTrpcAutosaveClient(
  trpcVanilla.candidateForm,
  { formId: "candidate" },
);

// ─── Single uploader handles ALL file questions ──────────────────────────
// `form.mappers({}, { uploadFile })` auto-wires `toApiValue` for every
// `file_upload` / `multi_format` step — no per-step mappers, no per-step
// upload functions. Adding a new file question just means a new step in
// the schema + a new column in TaylorDB.
async function buildMappers() {
  const client = await autosaveClientPromise;
  return candidateForm.mappers(
    {},
    {
      uploadFile: async ({ stepId, file, name }) => {
        const body = new FormData();
        body.set("file", file, name);
        body.set("sessionId", String(client.sessionId));
        body.set("stepId", stepId);
        return trpcVanilla.upload.uploadCandidateFile.mutate(body);
      },
    },
  );
}

function CandidateAutosaveProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<
    | { status: "loading"; adapter: null; defaultValues: null }
    | { status: "ready"; adapter: AutosaveAdapter; defaultValues: FormAnswers }
    | { status: "error"; error: Error }
  >({ status: "loading", adapter: null, defaultValues: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = await autosaveClientPromise;
        if (cancelled) return;
        const mappers = await buildMappers();
        if (cancelled) return;
        const adapter = createAutosaveAdapter({
          sharedSteps: candidateForm.sharedSteps,
          client,
          mappers,
        });
        const defaultValues = await adapter.loadSession();
        if (cancelled) return;
        setState({ status: "ready", adapter, defaultValues });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.status === "error") return <div>Could not start: {state.error.message}</div>;
  if (state.status === "loading") return <div>Starting session…</div>;

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

export default function CandidateFormPage() {
  return (
    <CandidateAutosaveProvider>
      <Form keyboard theme={purpleTheme}>
        <CandidateFormBody />
      </Form>
    </CandidateAutosaveProvider>
  );
}
```

---

## 6. Build-time check (`apps/client/src/candidate-form-check.tsx`)

This file does NOT change when you add steps — it always renders the
same body inside a non-autosave `<Form sharedSteps={…}>`.

```tsx
import { Form } from "@taylordb/forms-ui";
import { candidateForm } from "@repo/server/forms/candidate-form-schema";
import { CandidateFormBody } from "./pages/CandidateFormBody";

export default function CandidateFormCheck() {
  return (
    <Form sharedSteps={candidateForm.sharedSteps}>
      <CandidateFormBody />
    </Form>
  );
}
```

---

## What's gone, vs. older templates

| Old pattern                                         | New pattern                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `qb.uploadAttachments` + column discriminator in `upload.ts` | `candidateFormActions.uploadFile(ctx, { sessionId, stepId, file, name })` |
| `column: "resume" | "videoIntro"` discriminator     | Just send the `stepId` — schema knows which column it maps to    |
| Per-step `createFileUploadMapper` calls             | One `form.mappers({}, { uploadFile })` covers every attachment step |
| `createFormsActions({ sharedSteps, resolvers, session, emailConfig })` | `candidateForm.createActions({ ctxToQB, emailConfig })`           |
| `candidateForm.adapter(ctx => ctx.queryBuilder)`     | Implicit — happens inside `createActions`                        |

---

## Adding ANOTHER file question (e.g. portfolio link PDF)

1. Add a `portfolio: attachment` column to `candidates` via
   `schema-mutation`.
2. Add a step to `sharedSteps`:
   ```ts
   { taylordbFieldName: "portfolio", questionType: "file_upload" },
   ```
3. Add a `<Question id="portfolio">` with `<FileUpload>` to
   `CandidateFormBody.tsx`.
4. Add `portfolio?: FileAnswer[]` to the `CandidateAnswers` type.

Done. The upload router doesn't change. The page mappers don't change.
The server actions don't change. That's the whole point of the new
`uploadFile`.

---

## Common pitfalls

* **Step ids must match.** `taylordbFieldName` in `sharedSteps` ↔
  `<Question id="…">` ↔ TaylorDB column name.
* **`required`, `validate`, `showWhen` live on the shared step**, not
  on `<Question>`. The UI reads required-ness from the step's
  `optional` flag.
* **`AddressInput` / `ContactInfoInput`** collect multiple sub-fields.
  They need a `kind: "composite"` step plus a `steps[id].column = { … }`
  mapping. See `AGENTS.md` rule 4a.
* **`MultipleChoice`** is for multi-select only. Use `Dropdown` or
  `SingleChoice` for single-value choices — wiring `<MultipleChoice>`
  to a `dropdown` / `picture_choice` step will fail the build-time
  check.
* **`YesNo` stores `true` / `false`** since `@taylordb/forms-ui` 0.2.10
  — pair with a `checkbox` column, no `toApiValue` needed.
* **Don't import `qb.uploadAttachments` directly.** Use
  `actions.uploadFile`; it handles the read-modify-write so re-uploads
  don't accumulate.
