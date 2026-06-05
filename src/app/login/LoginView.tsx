"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Field, CustomCheckbox, SocialRow, Divider } from "@/components/auth/fields";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { signInWithGoogle } from "@/lib/auth/oauth";
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(mapAuthError(authError.message));
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleGoogle() {
    setOauthLoading(true);
    setError(null);
    try {
      await signInWithGoogle(next);
    } catch (err) {
      setOauthLoading(false);
      setError(mapAuthError(err instanceof Error ? err.message : "OAuth failed"));
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your retention streak. Today's queue is waiting."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <SocialRow providers={["google"]} onGoogleClick={handleGoogle} googleLoading={oauthLoading} />
        <Divider />

        {error && (
          <p className="text-sm text-again bg-again/10 border border-again/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Field label="Email">
          <Mail className="size-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            autoComplete="email"
            required
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Field>
            <Lock className="size-4 text-muted-foreground" />
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none">
          <CustomCheckbox checked={remember} onChange={setRemember} />
          Keep me signed in for 30 days
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-70"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <>Sign in <ArrowRight className="size-4" /></>}
        </button>
      </form>
    </AuthLayout>
  );
}

export function LoginView() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
