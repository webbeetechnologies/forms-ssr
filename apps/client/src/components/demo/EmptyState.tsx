interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return <p className="text-center text-muted-foreground py-4">{message}</p>;
}
