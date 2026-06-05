"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Field, CustomCheckbox, SocialRow, Divider } from "@/components/auth/fields";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { signInWithGoogle } from "@/lib/auth/oauth";

function pwStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function SignupView() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const strength = pwStrength(pw);
  const labels = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];
  const colors = ["bg-again", "bg-again", "bg-hard", "bg-good", "bg-good"];
  const ready = agree && pw && strength >= 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: { full_name: name },
        },
      });

      setLoading(false);
      if (authError) {
        setError(mapAuthError(authError.message));
        return;
      }

      if (data.session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        router.push("/login?message=confirm_email");
        router.refresh();
      }
    } catch (err) {
      setLoading(false);
      setError(
        mapAuthError(err instanceof Error ? err.message : "Signup failed")
      );
    }
  }

  async function handleGoogle() {
    setOauthLoading(true);
    setError(null);
    try {
      await signInWithGoogle("/onboarding");
    } catch (err) {
      setOauthLoading(false);
      setError(mapAuthError(err instanceof Error ? err.message : "OAuth failed"));
    }
  }

  return (
    <AuthLayout
      badge="Free plan · no card needed"
      title="Create your account"
      subtitle="It takes 60 seconds. We'll build your first AI plan right after."
      footer={
        <>
          Already a member?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
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

        <Field label="Full name">
          <User className="size-4 text-muted-foreground" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            placeholder="Alex Chen"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            autoComplete="name"
            required
          />
        </Field>

        <Field label="Email">
          <Mail className="size-4 text-muted-foreground" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@studio.com"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            autoComplete="email"
            required
          />
        </Field>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-foreground">Password</label>
          <Field>
            <Lock className="size-4 text-muted-foreground" />
            <input
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type={show ? "text" : "password"}
              placeholder="At least 8 characters"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Toggle password"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </Field>
          {pw && (
            <div className="pt-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? colors[strength] : "bg-surface-raised"}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1.5 text-[11px]">
                <span className="text-muted-foreground">{labels[strength]}</span>
                <span className="font-mono text-muted-foreground">{strength}/4</span>
              </div>
            </div>
          )}
        </div>

        <label className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer select-none">
          <CustomCheckbox checked={agree} onChange={setAgree} />
          <span className="leading-snug">
            I agree to the <a className="text-primary hover:underline">Terms</a> and{" "}
            <a className="text-primary hover:underline">Privacy Policy</a>.
          </span>
        </label>

        <button
          type="submit"
          disabled={!ready || loading}
          className={`inline-flex items-center justify-center gap-2 w-full h-11 rounded-xl font-semibold text-sm transition-colors ${
            ready
              ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
              : "bg-surface-raised text-muted-foreground pointer-events-none"
          }`}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Create account <ArrowRight className="size-4" />
            </>
          )}
        </button>

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground pt-1">
          <Check className="size-3.5 text-good shrink-0 mt-0.5" />
          We&apos;ll send a one-time verification link to confirm your email.
        </div>
      </form>
    </AuthLayout>
  );
}
