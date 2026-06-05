"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  hint?: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string[];                 // selected values
  onChange: (next: string[]) => void;
  multi?: boolean;
  searchable?: boolean;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
}

/**
 * Modern, theme-aware filter dropdown.
 * - Chip-style trigger shows active count
 * - Popover with optional search + multi-select checkboxes
 * - Keyboard: Escape to close
 */
export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multi = false,
  searchable = false,
  placeholder = "Select…",
  className,
  align = "left",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!q) return options;
    const needle = q.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(needle) || o.hint?.toLowerCase().includes(needle),
    );
  }, [q, options]);

  const triggerLabel = (() => {
    if (value.length === 0) return placeholder;
    if (!multi) return options.find((o) => o.value === value[0])?.label ?? placeholder;
    if (value.length === 1) return options.find((o) => o.value === value[0])?.label ?? placeholder;
    return `${value.length} selected`;
  })();

  const toggle = (v: string) => {
    if (!multi) {
      onChange([v]);
      setOpen(false);
      return;
    }
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const hasValue = value.length > 0;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full h-9 px-3 pr-2 rounded-md border bg-surface text-left flex items-center gap-2 text-sm transition-colors",
          "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring",
          hasValue
            ? "border-primary/50 text-foreground"
            : "border-border text-muted-foreground",
          open && "ring-2 ring-ring border-primary/60",
        )}
      >
        <span className="flex-1 truncate">{triggerLabel}</span>
        {hasValue && multi && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary text-primary-foreground">
            {value.length}
          </span>
        )}
        {hasValue && (
          <button
            type="button"
            onClick={clear}
            className="size-5 rounded hover:bg-surface-raised flex items-center justify-center text-muted-foreground"
            aria-label="Clear"
          >
            <X className="size-3" />
          </button>
        )}
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180 text-primary")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 min-w-full w-max max-w-xs rounded-md border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/30 overflow-hidden",
            align === "right" ? "right-0" : "left-0",
          )}
          style={{ animation: "dropdown-in 160ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {searchable && (
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full h-8 pl-7 pr-2 rounded bg-surface border border-border text-xs focus:outline-none focus:border-primary/60"
                />
              </div>
            </div>
          )}
          <ul className="py-1 max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-xs text-muted-foreground text-center">No matches</li>
            )}
            {filtered.map((opt) => {
              const active = value.includes(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2.5 text-sm text-left transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-surface-raised",
                    )}
                  >
                    {multi ? (
                      <span className={cn(
                        "size-4 rounded border flex items-center justify-center shrink-0",
                        active ? "bg-primary border-primary text-primary-foreground" : "border-border bg-surface",
                      )}>
                        {active && <Check className="size-3" />}
                      </span>
                    ) : (
                      <span className="size-4 shrink-0">{active && <Check className="size-4 text-primary" />}</span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{opt.label}</span>
                      {opt.hint && <span className="block text-[10px] text-muted-foreground truncate">{opt.hint}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {multi && hasValue && (
            <div className="p-1.5 border-t border-border flex items-center justify-between">
              <button
                onClick={() => onChange([])}
                className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear all
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
