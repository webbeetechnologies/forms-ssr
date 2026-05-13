# TaylorDB Full-Stack Template

A production-ready template for building modern, type-safe web applications with TaylorDB. Designed for AI-assisted development with comprehensive documentation and best practices built-in.

## 🎯 What This Template Provides

- **Full-Stack Setup**: React frontend + Node.js backend in a monorepo
- **Type Safety**: End-to-end TypeScript from database to UI
- **Modern UI**: shadcn/ui components with Tailwind CSS
- **Type-Safe API**: tRPC for seamless client-server communication
- **TaylorDB Integration**: Query builder with generated types
- **AI-Ready**: Comprehensive documentation for AI-assisted development

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

---

## 📁 Project Structure

```
taylordb-fullstack-template/
├── apps/
│   ├── client/                 # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/ui/  # shadcn/ui components
│   │   │   ├── pages/          # Route pages
│   │   │   ├── lib/            # Utilities & tRPC client
│   │   │   └── index.css       # Design tokens
│   │   └── package.json
│   │
│   └── server/                 # Node.js backend
│       ├── taylordb/
│       │   ├── types.ts        # Generated schema types
│       │   └── query-builder.ts # Database operations
│       ├── router.ts           # tRPC API routes
│       └── package.json
│
├── docs/                       # Comprehensive guides
│   ├── TAYLORDB_QUERY_REFERENCE.md
│   └── SHADCN_COMPONENTS_GUIDE.md
│
├── AGENTS.md                   # AI agent instructions
└── taylordb.yml                # Deployment config
```

---

## 📚 Documentation

This template includes comprehensive documentation for both human and AI developers:

### For AI Agents

- **[AGENTS.md](./AGENTS.md)**: Complete AI agent instructions
  - Development workflow (Planning → Execution → Verification)
  - Design guidelines for modern UIs
  - Code organization best practices
  - Type safety patterns
  - Example implementations

### For Developers

- **[docs/TAYLORDB_QUERY_REFERENCE.md](./docs/TAYLORDB_QUERY_REFERENCE.md)**: Query builder reference

  - All CRUD operations with examples
  - Field type handling
  - Advanced patterns (aggregations, pagination)
  - Common pitfalls and solutions

- **[docs/SHADCN_COMPONENTS_GUIDE.md](./docs/SHADCN_COMPONENTS_GUIDE.md)**: UI component guide
  - Dashboard patterns
  - Form examples
  - Data tables
  - Responsive design tips

---

## 🎨 Tech Stack

### Frontend

- **React 19** with TypeScript
- **Vite 7** for fast builds
- **TailwindCSS 4** for styling
- **shadcn/ui** for UI components
- **React Router v6** for routing
- **tRPC React Query** for API calls

### Backend

- **Node.js** with TypeScript
- **Express 5** web server
- **tRPC 11** for type-safe APIs
- **Zod** for validation
- **TaylorDB Query Builder** for database

---

## 🎯 Key Features

### ✅ Full Type Safety

```typescript
// Backend defines the API
export const appRouter = router({
  users: {
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => { ... }),
  },
});

// Frontend gets full autocomplete
const { data: user } = trpc.users.getById.useQuery({ id: 1 });
//    ^? User | undefined (fully typed!)
```

### ✅ Modern UI Components

All components from shadcn/ui with:

- Full dark mode support
- Responsive design
- Accessible by default
- Customizable with Tailwind

### ✅ Database Integration

Type-safe queries with TaylorDB:

```typescript
// Auto-generated types from your schema
export async function getAllUsers() {
  return await queryBuilder
    .selectFrom("users")
    .select(["id", "name", "email"])
    .execute();
}
```

---

## 🤖 AI-Assisted Development

This template is optimized for AI-assisted development:

1. **Read AGENTS.md**: Comprehensive instructions for AI agents
2. **Follow the workflow**: Planning → Execution → Verification
3. **Use type safety**: All examples use strict TypeScript
4. **Reference docs**: Query patterns, component examples, best practices

The AI agent will:

- Understand your TaylorDB schema
- Design appropriate color schemes
- Build type-safe CRUD operations
- Create modern, responsive UIs
- Follow best practices automatically

---

## 🚢 Deployment

This template is designed to deploy to TaylorDB's platform using the included `taylordb.yml` configuration.

**Environment Variables Required:**

- `TAYLORDB_BASE_URL`
- `TAYLORDB_SERVER_ID`

---

## 📖 Usage Examples

### 1. Add a New Feature

1. Create database functions in `apps/server/taylordb/query-builder.ts`
2. Expose via tRPC in `apps/server/router.ts`
3. Build UI in `apps/client/src/pages/`
4. Add route in `apps/client/src/main.tsx`

### 2. Add shadcn/ui Component

```bash
pnpm dlx shadcn@latest add <component-name>
```

Example:

```bash
pnpm dlx shadcn@latest add table dialog toast
```

### 3. Customize Design

Edit `apps/client/src/index.css` to change colors, fonts, and spacing.

---

## 🔗 Resources

- **shadcn/ui**: https://ui.shadcn.com/
- **tRPC**: https://trpc.io/
- **TaylorDB**: https://taylordb.ai/
- **Tailwind CSS**: https://tailwindcss.com/

---

## 📄 License

MIT - Use freely for any project!

---

**Built for modern, type-safe full-stack development with AI assistance** ✨
