import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Users, Plus, Edit2, Check, X, Trash2 } from "lucide-react";
import {
  DemoCard,
  LoadingSpinner,
  InlineSpinner,
  EmptyState,
  ItemRow,
  Avatar,
} from "@/components/demo";

interface User {
  id: number;
  name: string;
  email: string;
}

export function UsersExample() {
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.getAll.useQuery();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      setNewName("");
      setNewEmail("");
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.getAll.invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => utils.users.getAll.invalidate(),
  });

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
  };

  const handleCreate = () => {
    createMutation.mutate({ name: newName, email: newEmail });
  };

  const handleUpdate = (id: number) => {
    updateMutation.mutate({ id, name: editName, email: editEmail });
  };

  return (
    <DemoCard
      title="Users"
      description="Full CRUD operations example"
      icon={Users}
      iconColorClass="bg-secondary/10 text-secondary"
      glowClass="glow-secondary"
    >
      {/* Create Form */}
      <CreateUserForm
        name={newName}
        email={newEmail}
        onNameChange={setNewName}
        onEmailChange={setNewEmail}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Users List */}
      {isLoading ? (
        <LoadingSpinner colorClass="text-secondary" />
      ) : (
        <div className="space-y-2">
          {users?.length === 0 && (
            <EmptyState message="No users yet. Create one above!" />
          )}
          {users?.map((user) => {
            if (!user.id || !user.name || !user.email) return null;
            return (
            <UserRow
              key={user.id}
              user={user as User}
              isEditing={editingId === user.id}
              editName={editName}
              editEmail={editEmail}
              onEditNameChange={setEditName}
              onEditEmailChange={setEditEmail}
              onStartEdit={() => startEditing(user as User)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={() => handleUpdate(user.id!)}
              onDelete={() => deleteMutation.mutate({ id: user.id! })}
            />
          )})}
        </div>
      )}
    </DemoCard>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface CreateUserFormProps {
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

function CreateUserForm({
  name,
  email,
  onNameChange,
  onEmailChange,
  onSubmit,
  isLoading,
}: CreateUserFormProps) {
  return (
    <div className="flex gap-3">
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Name"
        className="flex-1"
      />
      <Input
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="Email"
        className="flex-1"
      />
      <Button
        onClick={onSubmit}
        disabled={!name || !email || isLoading}
        size="icon"
        className="shrink-0"
      >
        {isLoading ? <InlineSpinner /> : <Plus className="h-4 w-4" />}
      </Button>
    </div>
  );
}

interface UserRowProps {
  user: User;
  isEditing: boolean;
  editName: string;
  editEmail: string;
  onEditNameChange: (value: string) => void;
  onEditEmailChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

function UserRow({
  user,
  isEditing,
  editName,
  editEmail,
  onEditNameChange,
  onEditEmailChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: UserRowProps) {
  if (isEditing) {
    return (
      <ItemRow>
        <Input
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          className="flex-1"
        />
        <Input
          value={editEmail}
          onChange={(e) => onEditEmailChange(e.target.value)}
          className="flex-1"
        />
        <Button
          size="icon"
          variant="ghost"
          className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
          onClick={onSaveEdit}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={onCancelEdit}
        >
          <X className="h-4 w-4" />
        </Button>
      </ItemRow>
    );
  }

  return (
    <ItemRow>
      <Avatar name={user.name} />
      <div className="flex-1">
        <div className="font-medium">{user.name}</div>
        <div className="text-sm text-muted-foreground">{user.email}</div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground hover:text-primary"
        onClick={onStartEdit}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </ItemRow>
  );
}
