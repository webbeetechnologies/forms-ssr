# shadcn/ui — Design & Layout

Design tokens, spacing, icons, responsive layouts, and performance tips for shadcn/ui dashboards.

---

## Design Tips

### Color Schemes

Use semantic color tokens:

- `bg-background` / `text-foreground` — Main background and text
- `bg-card` / `text-card-foreground` — Card surfaces
- `bg-primary` / `text-primary-foreground` — Primary actions
- `bg-destructive` — Destructive actions (delete, etc.)
- `bg-muted` / `text-muted-foreground` — Subtle UI elements

### Spacing

Use consistent spacing:

- `space-y-4` / `gap-4` — Between related items
- `space-y-6` / `gap-6` — Between sections
- `p-4` / `p-6` — Card padding
- `p-8` — Page padding

### Icons

Use `lucide-react` for consistent icons:

```typescript
import { Home, Users, Settings, Plus, Edit, Trash, Search } from "lucide-react";

<Button>
  <Plus className="mr-2 h-4 w-4" />
  Add Item
</Button>;
```

---

## Responsive Design

### Grid Layouts

```typescript
// 1 column on mobile, 2 on tablet, 4 on desktop
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* cards */}
</div>

// 1 column on mobile, 3 on desktop
<div className="grid gap-6 lg:grid-cols-3">
  {/* cards */}
</div>
```

### Hide on Mobile

```typescript
// Hide text on mobile, show on desktop
<span className="hidden sm:inline">Dashboard</span>

// Different layout on mobile
<div className="flex flex-col md:flex-row gap-4">
  {/* content */}
</div>
```

---

## Performance Tips

1. **Lazy load dialogs** — Only render dialog content when open
2. **Virtualize long lists** — Use libraries like `react-window`
3. **Skeleton loaders** — Always show loading states
4. **Optimistic updates** — Update UI before server confirms
5. **Debounce search** — Don't query on every keystroke

---

**Remember**: Always test your components in both light and dark mode, and on different screen sizes.

---

For more, see:

- **Installation**: `SHADCN_INSTALLATION.md`
- **Dashboard patterns**: `SHADCN_DASHBOARD_PATTERNS.md`
- **Main guide index**: `SHADCN_COMPONENTS_GUIDE.md`
