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

## 1. Schema (`apps/web/src/server/form-schema.ts`)

The shared source of truth — imported by both the client and the server.

```ts
import { defineTaylorForm } from "@taylordb/forms-taylordb";
import type { FileAnswer } from "@taylordb/forms-core";

import {
  FORM_COMPLETED_COLUMN,
  FORM_TABLE,
} from "@/shared/form.constants";

import { taylorSchema } from "./taylordb/types";

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
type FormAnswers = {
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

export const form = defineTaylorForm(taylorSchema)
  .withAnswers<FormAnswers>()({
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
    // applicant said they'd relocate. (Toy example; real forms use
    // this for branch logic.)
    {
      taylordbFieldName: "backgroundCheckConsent",
      questionType: "legal",
      showWhen: (answers) => answers.willingToRelocate === true,
    },
  ] as const,
  taylordb: {
    table: FORM_TABLE,
    completedColumn: FORM_COMPLETED_COLUMN,
    initialValues: { [FORM_COMPLETED_COLUMN]: false },
  },
});
```

### Required TaylorDB schema

Run a `schema-mutation` so the `submissions` table (see `FORM_TABLE` in
`apps/web/src/shared/form.constants.ts`) has these columns:

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

## 2. Server actions + functions (`form-actions.ts`, `form-session.ts`, `form.functions.ts`)

`form.createActions(...)` does ALL the work — including `uploadFile`.
TanStack Start exposes SSR session bootstrap via `createServerFn`; autosave
mutations go through `/api/forms/$action`.

```ts
// apps/web/src/server/form-actions.ts
import { FormsError } from "@taylordb/forms-api";

import { form } from "./form-schema";
import { getTaylorDB } from "./taylordb";

export type FormServerContext = {
  queryBuilder: ReturnType<typeof getTaylorDB>;
};

export function createFormContext(): FormServerContext {
  return { queryBuilder: getTaylorDB() };
}

export const formActions = form.createActions<FormServerContext>({
  ctxToQB: (ctx) => ctx.queryBuilder,
  emailConfig: {
    send: async ({ html }) => {
      console.log("[form submission]", html);
    },
  },
});

export function toClientError(err: unknown): never {
  if (err instanceof FormsError) throw new Error(err.message);
  throw err;
}
```

```ts
// apps/web/src/server/form.functions.ts
import { createServerFn } from "@tanstack/react-start";
import type { SerializableFormSession } from "@taylordb/forms-ui";

import { toClientError } from "./form-actions";
import { bootstrapFormSession } from "./form-session";

export const getFormSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<SerializableFormSession> => {
    try {
      return await bootstrapFormSession();
    } catch (err) {
      toClientError(err);
    }
  },
);
```

Autosave (`create-session`, `load-session`, `save-answer`, `submit-form`) is
handled by `apps/web/src/server/forms-api-handlers.ts` at
`/api/forms/$action` — you do not add a server function per action.

---

## 3. Upload server route (`apps/web/src/routes/api/upload-form-file.ts`)

One generic file-ingestion endpoint that handles `resume` AND
`videoIntro` (and any future `attachment` step) — no per-column
discriminator, no `qb.uploadAttachments` boilerplate.

```ts
import { createFileRoute } from "@tanstack/react-router";
import {
  createFormContext,
  formActions,
  toClientError,
} from "@/server/form-actions";

export const Route = createFileRoute("/api/upload-form-file")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await request.formData();
        const file = input.get("file");
        const sessionIdRaw = input.get("sessionId");
        const stepId = input.get("stepId");
        // …validate file, sessionId, stepId…
        try {
          const ctx = createFormContext();
          const result = await formActions.uploadFile(ctx, {
            sessionId: Number(sessionIdRaw),
            stepId: String(stepId),
            file: file as File,
            name: (file as File).name,
          });
          return Response.json(result);
        } catch (err) {
          toClientError(err);
        }
      },
    },
  },
});
```

---

## 4. Client form body (`apps/web/src/pages/landing/FormBody.tsx`)

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

export function FormBody() {
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

## 5. Client page (`apps/web/src/pages/landing/FormPage.tsx`)

The page wires up SSR autosave and delegates file uploads to
`createFormMappers` in `form-mappers.ts`.

```tsx
// apps/web/src/pages/landing/FormPage.tsx (excerpt)
import { useMemo } from "react";
import {
  Form,
  FormAdapterProvider,
  createSsrFetchAutosaveClient,
  useFormSession,
  type SerializableFormSession,
} from "@taylordb/forms-ui";

import { FormBody } from "@/pages/landing/FormBody";
import { createFormMappers } from "@/pages/landing/form-mappers";
import { purpleTheme } from "@/pages/landing/form-theme";
import { FORM_ID } from "@/shared/form.constants";
import { form } from "@/server/form-schema";

export default function FormPage({ initialSession }: { initialSession: SerializableFormSession }) {
  const client = useMemo(
    () =>
      createSsrFetchAutosaveClient({
        formId: FORM_ID,
        apiUrl: "/api/forms",
        sessionId: initialSession.sessionId,
      }),
    [initialSession.sessionId],
  );

  const mappers = useMemo(
    () =>
      createFormMappers({
        credentials: "include",
        getSessionId: () => client.sessionId,
      }),
    [client],
  );

  const session = useFormSession({
    client,
    sharedSteps: form.sharedSteps,
    mappers,
    initialSession,
  });

  if (!session.ready) return null;

  return (
    <FormAdapterProvider
      adapter={session.adapter}
      defaultValues={session.defaultValues}
      sharedSteps={form.sharedSteps}
    >
      <Form keyboard theme={purpleTheme}>
        <FormBody />
      </Form>
    </FormAdapterProvider>
  );
}
```

```ts
// apps/web/src/pages/landing/form-mappers.ts (excerpt)
export function createFormMappers({ getSessionId, apiOrigin, credentials }) {
  return form.mappers({}, {
    uploadFile: async ({ stepId, file, name }) => {
      const body = new FormData();
      body.set("file", file, name);
      body.set("sessionId", String(getSessionId()));
      body.set("stepId", stepId);
      const response = await fetch("/api/upload-form-file", {
        method: "POST",
        body,
        credentials,
      });
      if (!response.ok) throw new Error("File upload failed");
      return response.json();
    },
  });
}
```

The route loader (`apps/web/src/routes/index.tsx`) calls `getFormSession()`
to hydrate the first paint with cookie-backed session data.

---

## 6. Build-time check (`apps/web/src/form-check.tsx`)

This file does NOT change when you add steps — it always renders the
same body inside a non-autosave `<Form sharedSteps={…}>`.

```tsx
import { Form } from "@taylordb/forms-ui";
import { FormBody } from "@/pages/landing/FormBody";
import { purpleTheme } from "@/pages/landing/form-theme";
import { form } from "@/server/form-schema";

export default function FormCheck() {
  return (
    <Form sharedSteps={form.sharedSteps} theme={purpleTheme}>
      <FormBody />
    </Form>
  );
}
```

---

## What's gone, vs. older templates

| Old pattern                                         | New pattern                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| `qb.uploadAttachments` + column discriminator in upload route | `formActions.uploadFile(ctx, { sessionId, stepId, file, name })` |
| `column: "resume" \| "videoIntro"` discriminator     | Just send the `stepId` — schema knows which column it maps to    |
| Per-step `createFileUploadMapper` calls             | One `form.mappers({}, { uploadFile })` covers every attachment step |
| `createFormsActions({ sharedSteps, resolvers, session, emailConfig })` | `form.createActions({ ctxToQB, emailConfig })`           |
| `form.adapter(ctx => ctx.queryBuilder)`             | Implicit — happens inside `createActions`                        |
| Per-action tRPC / server functions for autosave     | `/api/forms/$action` + `createSsrFetchAutosaveClient` on the page |

---

## Adding ANOTHER file question (e.g. portfolio link PDF)

1. Add a `portfolio: attachment` column to `submissions` via
   `schema-mutation`.
2. Add a step to `sharedSteps`:
   ```ts
   { taylordbFieldName: "portfolio", questionType: "file_upload" },
   ```
3. Add a `<Question id="portfolio">` with `<FileUpload>` to
   `FormBody.tsx`.
4. Add `portfolio?: FileAnswer[]` to the `FormAnswers` type.

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
