# AI Agent Instructions — TaylorDB Full-Stack Template

## Architecture Overview

```
HTTP Request (with app_access_token cookie)
  ↓
Express + tRPC (apps/server/index.ts, apps/server/trpc.ts)
  ↓
Routers (apps/server/routers/) — tRPC procedures using ctx.queryBuilder directly
  ↓
tRPC Client (apps/client/src/lib/trpc.ts)
  ↓
React Pages (apps/client/src/pages/) — consume via tRPC React Query hooks
```

---

## Critical Files — Read in This Order

1. **[apps/server/taylordb/types.ts](apps/server/taylordb/types.ts)** — Database schema (tables, columns, types). Generated, never edit.
2. **[apps/server/routers/](apps/server/routers/)** — tRPC procedures. Call `ctx.queryBuilder` here.
3. **[apps/client/src/lib/trpc.ts](apps/client/src/lib/trpc.ts)** — tRPC client setup. Sends cookies with `credentials: "include"`.

Do NOT read `apps/server/taylordb/query-builder.ts` — it does not exist as a source file. The query builder is an npm package (`@taylordb/query-builder`).

---

## Authentication & Cookies

**TaylorDB login flow sets an `app_access_token` cookie.** This cookie is:
- An `HttpOnly` cookie (safe from XSS)
- Automatically sent on every request because:
  - Server has `credentials: true` in CORS
  - tRPC client has `credentials: "include"` on both links
  - Browser sends cookies on same-site and cross-origin requests

**In `apps/server/trpc.ts`:**
```typescript
const appAccessToken = req.cookies?.app_access_token;
if (!appAccessToken) throw new Error("Unauthorized");
// Use token to create per-request queryBuilder
```

**You do not add auth guards to individual procedures.** The context factory throws before any procedure runs, so all procedures are automatically protected.

---

## Context (ctx)

Every tRPC request gets a fresh context containing `ctx.queryBuilder`. Use `ctx.queryBuilder` directly within your router procedures for all database reads, writes, and uploads.

---

## File Organization — Where to Put What

| What | Where |
|---|---|
| Database read/write methods for one table | `apps/server/repositories/index.ts` — add function `createXRepository(qb)` |
| Business logic, computed fields, cross-repo logic | `apps/server/services/index.ts` — add function `createXService(repos)` |
| tRPC query/mutation endpoint | `apps/server/routers/[domain].ts` — import and use `ctx.repositories` or `ctx.services` |
| Wire new router to app | `apps/server/router.ts` + `apps/server/routers/index.ts` |
| React page (dashboard, form, etc.) | `apps/client/src/pages/[Name]Page.tsx` |
| Reusable UI component | `apps/client/src/components/[name].tsx` |
| shadcn/ui component | Install with `pnpm dlx shadcn@latest add [component]`, auto-placed in `apps/client/src/components/ui/` |
| Design tokens (colors, spacing, etc.) | `apps/client/src/index.css` |
| Database schema (generated) | `apps/server/taylordb/types.ts` — DO NOT EDIT |

---

## Adding a New Domain (Step-by-Step)

### 1. Add Repository Function

**File:** `apps/server/repositories/index.ts`

```typescript
export function createProjectsRepository(qb: QB) {
  return {
    getAll: () =>
      qb.selectFrom("projects").select(["id", "name", "status"]).execute(),
    getById: (id: number) =>
      qb.selectFrom("projects").where("id", "=", id).executeTakeFirst(),
    create: (data: Partial<TableInserts<"projects">>) =>
      qb.insertInto("projects").values(data).executeTakeFirst(),
    update: (id: number, data: Partial<TableUpdates<"projects">>) =>
      qb.update("projects").set(data).where("id", "=", id).execute(),
    delete: (id: number) =>
      qb.deleteFrom("projects").where("id", "=", id).execute(),
  };
}
```

Then add to `createRepositories`:
```typescript
export function createRepositories(qb: QB) {
  return {
    // ... existing
    projects: createProjectsRepository(qb),
  };
}
```

### 2. (Optional) Add Service

**File:** `apps/server/services/index.ts`

If the domain needs computed logic or spans multiple tables:

```typescript
export function createProjectsService(repos: Repositories) {
  return {
    getAll: () => repos.projects.getAll(),
    // Add computed operations here
  };
}
```

Then add to `createServices`:
```typescript
export function createServices(repos: Repositories) {
  return {
    // ... existing
    projects: createProjectsService(repos),
  };
}
```

### 3. Create Router File

**File:** `apps/server/routers/projects.ts`

```typescript
import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const projectsRouter = router({
  getAll: publicProcedure.query(({ ctx }) =>
    ctx.repositories.projects.getAll()
  ),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) =>
      ctx.repositories.projects.getById(input.id)
    ),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1), status: z.string() }))
    .mutation(({ input, ctx }) =>
      ctx.repositories.projects.create(input)
    ),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) =>
      ctx.repositories.projects.delete(input.id)
    ),
});
```

### 4. Export from Router Index

**File:** `apps/server/routers/index.ts`

```typescript
export { projectsRouter } from "./projects";
```

### 5. Wire to App Router

**File:** `apps/server/router.ts`

```typescript
import { projectsRouter } from "./routers";

export const appRouter = router({
  // ... existing
  projects: projectsRouter,
});
```

---

## File Uploads (FormData + Multipart)

File uploads are the **one exception** where `ctx.queryBuilder` is used directly:

```typescript
upload: publicProcedure
  .input(z.instanceof(FormData))
  .mutation(async ({ input, ctx }) => {
    const file = input.get("avatar") as File | null;
    const name = input.get("name") as string;

    const attachments = file
      ? await ctx.queryBuilder.uploadAttachments([
          { file, name: file.name }
        ])
      : [];

    // After uploading, use repository for the insert
    return ctx.repositories.users.create({ name, avatar: attachments });
  }),
```

Client-side: use `FormData` + the splitLink in `trpc.ts` routes FormData through `httpLink` (no batching).

---

## Client-Side Data Fetching

### Queries (Reads)

```typescript
const { data, isLoading, error } = trpc.projects.getAll.useQuery();

// With input
const { data } = trpc.projects.getById.useQuery({ id: 42 });
```

### Mutations (Writes)

```typescript
const createMutation = trpc.projects.create.useMutation({
  onSuccess: () => {
    // Re-fetch list after create
    utils.projects.getAll.invalidate();
  },
});

createMutation.mutate({ name: "New Project", status: "active" });
```

---

## UI Components

- Use **shadcn/ui only**. No hand-rolled primitives.
- Install: `pnpm dlx shadcn@latest add [component-name]`
- Design tokens in `apps/client/src/index.css` (HSL colors, spacing, typography)

See:
- `docs/SHADCN_COMPONENTS_GUIDE.md` — index of all components
- `docs/SHADCN_INSTALLATION.md` — install commands by category
- `docs/SHADCN_DASHBOARD_PATTERNS.md` — 10 copy-paste patterns (tables, dialogs, forms, etc.)

---

## Database Query Patterns

For detailed query builder reference, you MUST read the documentation provided inside the package:
`apps/server/node_modules/@taylordb/query-builder/llm.txt`

This file is the entrypoint to understanding the query builder. Always consult `apps/server/node_modules/@taylordb/query-builder/llm.txt` and the `docs/` folder next to it when you need to understand how to interact with the database.

**IMPORTANT:** Always check for an `llm.txt` file when interacting with ANY package starting with `@taylordb/`. All `@taylordb/` packages expose an `llm.txt` in their root which acts as the official documentation. You MUST read it before using the package.

---

## Critical Rules

1. **NEVER use in-memory data.** Always connect via `ctx.queryBuilder`.
2. **NEVER edit `apps/server/taylordb/types.ts`.** It is auto-generated.
3. **NEVER add per-procedure auth.** Auth is centralized in `createContext`.
4. **NEVER start, stop, or manage the server process manually.** The application is strictly managed by a root `pm2` process. You are operating as an unprivileged `taylordb` user. If you need to restart the server, you MUST use the `dev-server-restart` tool. Do not run `npm start`, `pm2 restart`, `node index.js`, or similar commands.
5. **ALWAYS run `pnpm build`** to verify TypeScript before declaring work done.
6. **ALWAYS use `executeTakeFirst()`** for single-record queries, `execute()` for lists.
7. **ALWAYS use `["exactDay", "YYYY-MM-DD"]`** format for date equality filters.
8. **ALWAYS handle `undefined`** from `executeTakeFirst()` — it can return undefined.
9. **ALWAYS use shadcn/ui** for UI components, not hand-rolled HTML.
10. **ALWAYS use `Partial<TableInserts<"table">>`** for type-safe insert/update parameters.

---

## Success Criteria

- `pnpm build` passes with zero TypeScript errors
- `pnpm lint` passes with zero errors
- All tRPC procedures use `ctx.queryBuilder`
- No in-memory data stores in routers
- UI uses shadcn/ui components with proper loading/error states
