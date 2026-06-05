export function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Cannot reach Supabase. If using local dev, run `npx supabase start`. Otherwise set NEXT_PUBLIC_SUPABASE_URL to your project URL (https://<ref>.supabase.co) and restart the dev server.";
  }
  if (m.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (m.includes("user already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (m.includes("password")) {
    return message;
  }
  if (m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return message || "Something went wrong. Please try again.";
}
