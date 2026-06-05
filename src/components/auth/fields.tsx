"use client";

export function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-foreground">{label}</label>}
      <div className="flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-border bg-surface focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30 transition-colors">
        {children}
      </div>
    </div>
  );
}

export function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`size-[18px] rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
        checked ? "bg-primary border-primary" : "bg-surface border-border hover:border-primary/60"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="size-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3.5 3.5L13 5" />
        </svg>
      )}
    </button>
  );
}

export function SocialRow({
  providers = ["google", "apple"],
  onGoogleClick,
  googleLoading = false,
}: {
  providers?: ("google" | "apple")[];
  onGoogleClick?: () => void;
  googleLoading?: boolean;
} = {}) {
  const google = (
    <button
      key="google"
      type="button"
      disabled={googleLoading}
      onClick={onGoogleClick}
      className="h-11 w-full rounded-xl border border-border bg-surface hover:bg-surface-raised flex items-center justify-center gap-2 text-sm font-medium text-foreground transition-colors disabled:opacity-70"
    >
      <svg viewBox="0 0 24 24" className="size-4"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18a11 11 0 0 0 0 9.87l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
      Continue with Google
    </button>
  );
  const apple = (
    <button key="apple" type="button" className="h-11 w-full rounded-xl border border-border bg-surface hover:bg-surface-raised flex items-center justify-center gap-2 text-sm font-medium text-foreground transition-colors">
      <svg viewBox="0 0 24 24" className="size-4 fill-foreground"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
      Continue with Apple
    </button>
  );
  const map = { google, apple };
  const items = providers.map((p) => map[p]);
  return <div className={providers.length > 1 ? "grid grid-cols-2 gap-2.5" : "flex"}>{items}</div>;
}

export function Divider({ label = "or continue with email" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
