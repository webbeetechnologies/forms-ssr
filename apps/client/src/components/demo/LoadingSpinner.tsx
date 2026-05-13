import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  colorClass?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({
  size = "lg",
  colorClass = "text-primary",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex justify-center py-8 ${className}`}>
      <Loader2
        className={`animate-spin pulse-glow ${sizeClasses[size]} ${colorClass}`}
      />
    </div>
  );
}

export function InlineSpinner({ size = "sm" }: { size?: "sm" | "md" }) {
  return <Loader2 className={`animate-spin ${sizeClasses[size]}`} />;
}
