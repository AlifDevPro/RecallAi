"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, MailCheck, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Field } from "@/components/auth/fields";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { getSiteUrl } from "@/lib/supabase/env";

export function ForgotPasswordView() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (authError) {
      setError(mapAuthError(authError.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout
        badge="Check your inbox"
        title="Reset link sent"
        subtitle={`We sent a secure recovery link to ${email || "your email"}. It expires in 15 minutes.`}
        footer={
          <Link href="/login" className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline">
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        }
      >
        <div className="rounded-2xl border border-good/30 bg-good/10 p-5 flex items-start gap-3">
          <div className="size-10 rounded-lg bg-good/20 text-good flex items-center justify-center shrink-0">
            <MailCheck className="size-5" />
          </div>
          <div className="text-sm leading-relaxed text-foreground">
            <p className="font-semibold mb-1">One last step</p>
            <p className="text-muted-foreground">
              Open the email and click <span className="text-foreground font-medium">&quot;Reset password&quot;</span>.
              If you don&apos;t see it within 2 minutes, check spam or{" "}
              <button onClick={() => setSent(false)} className="text-primary hover:underline">try a different email</button>.
            </p>
          </div>
        </div>
        <button
          onClick={() => setSent(false)}
          className="mt-4 w-full h-11 rounded-xl border border-border bg-surface hover:bg-surface-raised text-sm font-medium text-foreground transition-colors"
        >
          Resend
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="No worries — enter your email and we'll send you a secure reset link."
      footer={
        <Link href="/login" className="inline-flex items-center gap-1.5 text-primary font-semibold hover:underline">
          <ArrowLeft className="size-3.5" /> Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <p className="text-sm text-again bg-again/10 border border-again/30 rounded-lg px-3 py-2">{error}</p>
        )}
        <Field label="Email">
          <Mail className="size-4 text-muted-foreground" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            autoComplete="email"
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-70"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <>Send reset link <ArrowRight className="size-4" /></>}
        </button>

        <p className="text-[11px] text-muted-foreground text-center pt-1">
          Link expires after 15 minutes for security.
        </p>
      </form>
    </AuthLayout>
  );
}
