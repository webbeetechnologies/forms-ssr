interface StatusBadgeProps {
  status: "success" | "warning" | "info";
  children: React.ReactNode;
}

const badgeClasses = {
  success: "badge-success",
  warning: "badge-warning",
  info: "bg-blue-500/10 text-blue-500",
};

export function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClasses[status]}`}
    >
      {children}
    </span>
  );
}
