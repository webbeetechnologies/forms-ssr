# TaylorDB Forms Template

A starter template for building Typeform-style conversational forms backed by TaylorDB.

The template ships with a complete, working **Candidate application form** —
name, email, phone, resume upload, and a 2-minute video introduction — wired
up to autosave each answer to a row in the `candidates` table. Use it as a
reference and adapt it to your own form.

---

## What's in the box

| Layer | Library | Purpose |
| --- | --- | --- |
| Form runtime (UI) | [`@taylordb/forms-ui`][forms-ui] | React components — `<Form>`, `<Question>`, inputs, autosave provider |
| Form schema + handlers | [`@taylordb/forms-core`][forms-core] | Pure validation + email rendering, shared between client & server |
| Form HTTP/tRPC layer | [`@taylordb/forms-api`][forms-api] | `createSession` / `loadSession` / `saveAnswer` / `submitForm` actions |
| Database | [`@taylordb/query-builder`][qb] | Typed reads, writes, and `uploadAttachments` |
| Transport | [tRPC v11](https://trpc.io) | Type-safe client ⇆ server |
| Build | Vite + tsx + esbuild | |

[forms-ui]: ./apps/client/node_modules/@taylordb/forms-ui/llm.txt
[forms-core]: ./apps/client/node_modules/@taylordb/forms-core/llm.txt
[forms-api]: ./apps/server/node_modules/@taylordb/forms-api/llm.txt
[qb]: ./apps/server/node_modules/@taylordb/query-builder/llm.txt

---

## Repo layout

```
app/
├── apps/
│   ├── client/                                # React + Vite frontend
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx                       # Entry point — mounts CandidateFormPage
│   │       ├── index.css                      # Minimal page reset
│   │       ├── lib/
│   │       │   ├── trpc.ts                    # React-Query tRPC hooks
│   │       │   └── trpc-vanilla.ts            # Vanilla proxy (used by forms-ui autosave)
│   │       └── pages/
│   │           └── CandidateFormPage.tsx      # ← THE form
│   │
│   └── server/                                # Express + tRPC backend
│       ├── index.ts                           # Express bootstrap
│       ├── trpc.ts                            # Context (auth + queryBuilder per request)
│       ├── router.ts                          # Top-level appRouter
│       ├── forms/
│       │   └── candidate-form-schema.ts       # ← Shared schema (sharedSteps + validate)
│       ├── routers/
│       │   ├── candidateForm.ts               # ← Form actions wired to tRPC
│       │   └── upload.ts                      # ← File upload endpoint
│       └── taylordb/
│           └── types.ts                       # Auto-generated DB schema types
│
├── AGENTS.md                                  # Instructions for AI coding agents
├── README.md                                  # ← you are here
├── taylordb.yml                               # TaylorDB deploy config
└── pnpm-workspace.yaml
```

---

## Architecture in 30 seconds

```
                               ┌────────────────────────┐
   ┌──────────────────┐ tRPC   │  apps/server/routers/  │
   │ CandidateFormPage├───────►│  candidateForm.ts      │
   │  (forms-ui)      │        │  ─ createSession       │
   │                  │        │  ─ loadSession         │
   │                  │        │  ─ saveAnswer          │
   │                  │        │  ─ submitForm          │
   │                  │        │   ▲                    │
   │                  │ tRPC   │   │ resolvers          │
   │                  ├───────►│   ▼                    │
   │                  │ upload │  candidates row        │ ──► TaylorDB
   └──────────────────┘        └────────────────────────┘
            ▲                            ▲
            │ same source                │
            │                            │
            └─────── forms/candidate-form-schema.ts (shared)
```

* **Schema is shared.** `forms/candidate-form-schema.ts` defines every step
  (`id` + `type` + `validate`) once. The client uses it for in-browser
  validation and autosave bootstrap; the server uses it for typed save
  resolvers and re-validation.
* **One row = one session.** `createSession` inserts an empty row in
  `candidates`. Each `saveAnswer` updates one column on that row.
  `submitForm` flips `submitted = true`.
* **Files bypass autosave.** `<FileUpload>` / `<VideoQuestion>` send bytes
  through a separate `upload.uploadCandidateFile` mutation that writes
  directly into the row's attachment column. The autosave value for those
  steps is just `FileAnswer[]` metadata.

---

## Run it

Local dev is managed by TaylorDB tooling — you don't run pnpm dev manually.
The dev process is supervised by `pm2` and you restart it from your AI
agent or the dashboard.

To verify everything builds:

```bash
pnpm install
pnpm build
```

The candidate form opens at the root URL of the client service (configured
in `taylordb.yml`).

---

## How to customise

### Add or change a question

Open these three files in order:

1. **`apps/server/forms/candidate-form-schema.ts`** — add a step with a
   stable `id`, a handler `type` (`text`, `email`, `phone_number`,
   `file_upload`, `multiple_choice`, `rating`, `yes_no`, …), and an
   optional `validate(value)`.
2. **`apps/client/src/pages/CandidateFormPage.tsx`** — add a `<Question
   id="…">` whose `id` matches the schema. Pick the right input from
   `@taylordb/forms-ui` (see the inputs reference linked below).
3. **`apps/server/routers/candidateForm.ts`** — add a `save` resolver
   that writes the value to the database.

If the value needs a new column, run a TaylorDB schema mutation to add it
to the `candidates` table. The `apps/server/taylordb/types.ts` file is
regenerated automatically.

### Restyle

The form uses `lightTheme` from `@taylordb/forms-ui` with a purple accent
override. Change it in `CandidateFormPage.tsx`:

```tsx
const purpleTheme: FormTheme = {
  ...lightTheme,
  accent: "#8b5cf6",
  surface: "rgba(139, 92, 246, 0.08)",
};
```

The full token list is in
`apps/client/node_modules/@taylordb/forms-ui/docs/hooks-theming-exports.md`.

The page background sits in `apps/client/src/index.css` — feel free to
replace the gradient.

### Wire up real email on submit

`apps/server/routers/candidateForm.ts` currently logs the rendered
submission HTML. Replace the body of `emailConfig.send` with a call to
your mailer (Resend, SES, SendGrid, Nodemailer, etc.). The HTML is
self-contained and ready to send.

### Add another file question

1. Add a `file_upload` step to the schema.
2. Add the column to the `candidates` table (attachment type).
3. Extend the `column` discriminator in
   `apps/server/routers/upload.ts`.
4. Add a `<FileUpload>` / `<VideoQuestion>` / `<AudioQuestion>` and a
   matching mapper entry in `CandidateFormPage.tsx`.

---

## Reference docs (already on disk)

The form libraries ship `llm.txt` + a `docs/` folder inside their packages.
These are the authoritative references — read them before changing
behaviour:

| Topic | Path |
| --- | --- |
| forms-ui overview | `apps/client/node_modules/@taylordb/forms-ui/llm.txt` |
| forms-ui inputs (TextInput, FileUpload, …) | `apps/client/node_modules/@taylordb/forms-ui/docs/inputs.md` |
| Autosave (fetch + tRPC variants) | `apps/client/node_modules/@taylordb/forms-ui/docs/autosave.md` |
| Theming, hooks, exports | `apps/client/node_modules/@taylordb/forms-ui/docs/hooks-theming-exports.md` |
| Recipes & gotchas | `apps/client/node_modules/@taylordb/forms-ui/docs/recipes-agents.md` |
| forms-core handlers / `defineForm` | `apps/client/node_modules/@taylordb/forms-core/docs/api.md` |
| forms-api server actions | `apps/server/node_modules/@taylordb/forms-api/docs/api.md` |
| Query builder | `apps/server/node_modules/@taylordb/query-builder/llm.txt` |

For AI agents working in this repo, see [`AGENTS.md`](./AGENTS.md).

---

## License

MIT.
