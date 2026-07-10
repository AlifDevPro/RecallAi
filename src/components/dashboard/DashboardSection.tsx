import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type DashboardSectionProps = {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children: ReactNode;
  className?: string;
};

export function DashboardSection({
  title,
  description,
  action,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 shrink-0"
          >
            {action.label}
            <ChevronRight className="size-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
