"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, Check, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Field } from "@/components/auth/fields";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { useUser } from "@/hooks/use-user";

export function ResetPasswordView() {
  const { displayName } = useUser();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rules = [
    { ok: pw.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Z]/.test(pw), label: "One uppercase letter" },
    { ok: /[0-9]/.test(pw), label: "One number" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "One special character" },
  ];
  const match = pw && pw === confirm;
  const ready = rules.every((r) => r.ok) && match;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (authError) {
      setError(mapAuthError(authError.message));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in with your new password.">
        <div className="rounded-2xl border border-good/30 bg-good/10 p-6 flex flex-col items-center text-center">
          <div className="size-14 rounded-full bg-good/20 text-good flex items-center justify-center mb-3">
            <ShieldCheck className="size-7" />
          </div>
          <p className="text-foreground font-semibold">All set, {displayName.split(" ")[0]}.</p>
          <p className="text-sm text-muted-foreground mt-1">Your password is secure and active.</p>
        </div>
        <Link
          href="/login"
          className="mt-5 inline-flex items-center justify-center w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90"
        >
          Continue to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      badge="Recovery"
      title="Set a new password"
      subtitle="Make it long, mix in characters and avoid reusing passwords from other apps."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <p className="text-sm text-again bg-again/10 border border-again/30 rounded-lg px-3 py-2">{error}</p>
        )}
        <Field label="New password">
          <Lock className="size-4 text-muted-foreground" />
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Enter a new password"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button type="button" onClick={() => setShow((v) => !v)} className="p-1 text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </Field>

        <Field label="Confirm password">
          <Lock className="size-4 text-muted-foreground" />
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </Field>

        <ul className="space-y-1.5 rounded-xl bg-surface/60 border border-border/40 p-3">
          {rules.map((r) => (
            <li key={r.label} className={`flex items-center gap-2 text-xs ${r.ok ? "text-good" : "text-muted-foreground"}`}>
              <span className={`size-4 rounded-full flex items-center justify-center ${r.ok ? "bg-good/20" : "bg-surface-raised"}`}>
                <Check className={`size-3 ${r.ok ? "text-good" : "text-muted-foreground/50"}`} />
              </span>
              {r.label}
            </li>
          ))}
          <li className={`flex items-center gap-2 text-xs ${match ? "text-good" : "text-muted-foreground"}`}>
            <span className={`size-4 rounded-full flex items-center justify-center ${match ? "bg-good/20" : "bg-surface-raised"}`}>
              <Check className={`size-3 ${match ? "text-good" : "text-muted-foreground/50"}`} />
            </span>
            Passwords match
          </li>
        </ul>

        <button
          type="submit"
          disabled={!ready || loading}
          className={`inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl font-semibold text-sm transition-colors ${
            ready
              ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
              : "bg-surface-raised text-muted-foreground cursor-not-allowed"
          }`}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
