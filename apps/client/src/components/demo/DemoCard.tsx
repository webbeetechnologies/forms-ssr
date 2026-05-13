import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface DemoCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColorClass?: string;
  glowClass?: string;
  children: React.ReactNode;
}

export function DemoCard({
  title,
  description,
  icon: Icon,
  iconColorClass = "bg-primary/10 text-primary",
  glowClass = "glow-primary",
  children,
}: DemoCardProps) {
  return (
    <Card className="card-hover glass-card overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconColorClass} ${glowClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
