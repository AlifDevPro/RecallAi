import { Sparkles } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AIButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

/**
 * Premium AI-feel button with animated gradient sheen, pulsing sparkle and
 * conic-rotating border. Use for any "Generate with AI / Ask AI / Auto-plan"
 * call to action so it stands out from neutral buttons.
 */
export const AIButton = forwardRef<HTMLButtonElement, AIButtonProps>(
  ({ className, children, icon, size = "md", loading, disabled, ...props }, ref) => {
    const sizes = {
      sm: "h-9 px-3.5 text-xs",
      md: "h-10 px-5 text-sm",
      lg: "h-12 px-7 text-base",
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "ai-btn group relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
          "text-white shadow-[0_8px_30px_-8px_oklch(0.65_0.18_255/0.7)]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          "transition-transform active:scale-[0.97]",
          sizes[size],
          className,
        )}
        {...props}
      >
        <span className="ai-btn__border" aria-hidden />
        <span className="ai-btn__bg" aria-hidden />
        <span className="ai-btn__sheen" aria-hidden />
        <span className="relative z-10 inline-flex items-center justify-center">
          {loading ? (
            <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            icon ?? <Sparkles className="size-4 ai-spark" />
          )}
        </span>
        <span className="relative z-10">{children}</span>
      </button>
    );
  },
);
AIButton.displayName = "AIButton";
