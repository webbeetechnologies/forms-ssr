# shadcn/ui Dashboard Components Guide

This is the **entry point** for shadcn/ui documentation in this template. The guide is split into smaller files so agents (and humans) can jump to the topic they need.

---

## 📚 Topics

- **Installation**  
  See `SHADCN_INSTALLATION.md` for:
  - Installing individual components (core, dashboard, data display, advanced)
  - Command examples for `pnpm dlx shadcn@latest add`

- **Dashboard Patterns**  
  See `SHADCN_DASHBOARD_PATTERNS.md` for:
  - Stats cards layout
  - Data table with dropdown actions
  - Create/edit form in a dialog
  - Loading states with Skeleton
  - Tabs for different views
  - Status badges
  - Toast notifications (with tRPC mutations)
  - Form with validation (react-hook-form + zod)
  - Side sheet for details
  - Command palette (search, Cmd/Ctrl+K)

- **Design & Layout**  
  See `SHADCN_DESIGN_AND_LAYOUT.md` for:
  - Color schemes (semantic tokens)
  - Spacing conventions
  - Icons (lucide-react)
  - Responsive grids and hide-on-mobile
  - Performance tips (lazy dialogs, virtualization, skeletons, optimistic updates, debounce)

---

## How Agents Should Use These Docs

1. **Need to add a component?**  
   Use `SHADCN_INSTALLATION.md` for the exact `pnpm dlx shadcn@latest add` commands.

2. **Building a dashboard or CRUD UI?**  
   Use `SHADCN_DASHBOARD_PATTERNS.md` for copy-paste patterns (tables, dialogs, forms, toasts, sheets, etc.).

3. **Styling and layout?**  
   Use `SHADCN_DESIGN_AND_LAYOUT.md` for tokens, spacing, responsive patterns, and performance.

---

## Resources

- **shadcn/ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Lucide Icons**: https://lucide.dev/
- **React Hook Form**: https://react-hook-form.com/
