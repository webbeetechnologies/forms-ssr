# shadcn/ui — Dashboard Patterns

Examples of using shadcn/ui components to build dashboard interfaces for TaylorDB applications.

---

## 1. Dashboard Layout with Stats Cards

```typescript
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground mt-1">
              +20% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$45,231</div>
            <p className="text-xs text-muted-foreground mt-1">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        {/* More stats cards... */}
      </div>
    </div>
  );
}
```

---

## 2. Data Table with Actions

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";

export default function UsersTable({ users }: { users: User[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage your user accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.status === "active" ? "default" : "secondary"}
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

---

## 3. Create/Edit Form in Dialog

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { PlusIcon } from "lucide-react";

export default function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setName("");
      setEmail("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new user to your database</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate({ name, email })}
            disabled={createMutation.isPending}
          >
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Loading States with Skeleton

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-8">
      <Skeleton className="h-10 w-48 mb-6" />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Usage in main component
export default function DashboardPage() {
  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <div>{/* Actual dashboard */}</div>;
}
```

---

## 5. Tabs for Different Views

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DataExplorer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Explorer</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Overview content */}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Analytics content */}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            {/* Reports content */}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

---

## 6. Status Badges

```typescript
import { Badge } from "@/components/ui/badge";

function StatusBadge({ status }: { status: string }) {
  const variants = {
    active: "default",
    pending: "secondary",
    inactive: "outline",
    error: "destructive",
  } as const;

  return (
    <Badge variant={variants[status as keyof typeof variants] || "outline"}>
      {status}
    </Badge>
  );
}

// Usage
<StatusBadge status="active" />;
```

---

## 7. Toast Notifications

```typescript
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function ActionsPage() {
  const { toast } = useToast();

  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Item deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Button onClick={() => deleteMutation.mutate({ id: 1 })}>
      Delete Item
    </Button>
  );
}

// Don't forget to add <Toaster /> in your App.tsx or layout
```

---

## 8. Form with Validation

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  age: z.number().min(0).max(120),
});

export default function UserForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      age: 0,
    },
  });

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      form.reset();
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormDescription>
                Your full name as it appears on documents.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 9. Side Sheet for Details

```typescript
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function UserDetailsSheet({ userId }: { userId: number }) {
  const { data: user } = trpc.users.getById.useQuery({ id: userId });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">View Details</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>Information about this user</SheetDescription>
        </SheetHeader>

        {user && (
          <div className="mt-6 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                Name
              </h4>
              <p className="text-base">{user.name}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                Email
              </h4>
              <p className="text-base">{user.email}</p>
            </div>
            {/* More fields... */}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

---

## 10. Command Palette (Search)

```typescript
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState, useEffect } from "react";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Users">
          <CommandItem>John Doe</CommandItem>
          <CommandItem>Jane Smith</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Projects">
          <CommandItem>Project Alpha</CommandItem>
          <CommandItem>Project Beta</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

---

For installation and design/layout, see:

- **Installation**: `SHADCN_INSTALLATION.md`
- **Design & layout**: `SHADCN_DESIGN_AND_LAYOUT.md`
- **Main guide index**: `SHADCN_COMPONENTS_GUIDE.md`
