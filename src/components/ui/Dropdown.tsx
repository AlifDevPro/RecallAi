"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

/**
 * Modern, custom-styled dropdown — no native <select>. Includes search-less
 * popover, hover preview, check indicator and smooth open animation.
 */
export function Dropdown({ value, options, onChange, placeholder = "Select…", className, label }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {label && (
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-10 px-3.5 pr-2.5 rounded-xl border border-border/50 bg-surface text-left",
          "flex items-center gap-2 text-sm text-foreground",
          "hover:border-primary/40 hover:bg-surface-raised/60 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
          open && "ring-2 ring-primary/40 border-primary/50",
        )}
      >
        {selected?.icon && <span className="text-primary shrink-0">{selected.icon}</span>}
        <span className={cn("flex-1 truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180 text-primary")}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full origin-top rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/40 overflow-hidden"
          style={{ animation: "dropdown-in 180ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <ul className="py-1 max-h-72 overflow-y-auto">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2.5 text-sm text-left transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-surface-raised",
                    )}
                  >
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[11px] text-muted-foreground truncate">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {active && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
