"use client";

import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 h-14 bg-background/85 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="size-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <BrainCircuit className="size-3.5 text-primary-foreground" />
        </div>
        <span className="font-bold text-base">Recall AI</span>
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2 text-sm">
        <Link href="/questions" className="px-3 py-1.5 rounded-md hover:bg-surface">Question Bank</Link>
        <Link href="/contributors" className="px-3 py-1.5 rounded-md hover:bg-surface hidden sm:inline-block">Contributors</Link>
        <Link href="/questions/upload" className="px-3 py-1.5 rounded-md bg-surface border border-border hover:border-primary/50">Contribute</Link>
        <ThemeToggle />
        <Link href="/login" className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold">Sign in</Link>
      </nav>
    </header>
  );
}
