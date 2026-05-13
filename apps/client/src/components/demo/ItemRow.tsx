interface ItemRowProps {
  children: React.ReactNode;
  className?: string;
}

export function ItemRow({ children, className = "" }: ItemRowProps) {
  return (
    <div
      className={`item-row flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/50 ${className}`}
    >
      {children}
    </div>
  );
}
