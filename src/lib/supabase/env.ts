/** Matches `project_id` in supabase/config.toml for local CLI stacks. */
const DEFAULT_LOCAL_PROJECT_REF = "recall-platform";

function parseJwtRef(jwt: string): string | null {
  try {
    const part = jwt.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof globalThis.atob === "function"
        ? globalThis.atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { ref?: string };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

function isLocalSupabaseUrl(url: string) {
  return /localhost|127\.0\.0\.1/.test(url);
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Resolves the Supabase API URL. If `.env` points at localhost but the anon key
 * belongs to a hosted project (JWT `ref`), use the hosted URL so auth does not
 * fail with "Failed to fetch".
 */
export function getSupabaseUrl() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configured) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");

  const forceLocal = process.env.NEXT_PUBLIC_SUPABASE_FORCE_LOCAL === "true";
  if (forceLocal) return configured;

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const jwtRef = key ? parseJwtRef(key) : null;
  const localRef =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_REF ?? DEFAULT_LOCAL_PROJECT_REF;

  if (
    isLocalSupabaseUrl(configured) &&
    jwtRef &&
    jwtRef !== localRef
  ) {
    return `https://${jwtRef}.supabase.co`;
  }

  return configured;
}

export function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
