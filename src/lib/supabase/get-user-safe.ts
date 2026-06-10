import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isInvalidRefreshTokenError } from "./clear-auth-cookies";

export type SafeGetUserResult = {
  user: User | null;
  invalidSession: boolean;
};

export async function getUserSafe(supabase: SupabaseClient): Promise<SafeGetUserResult> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && isInvalidRefreshTokenError(error)) {
      return { user: null, invalidSession: true };
    }
    return { user: data.user ?? null, invalidSession: false };
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      return { user: null, invalidSession: true };
    }
    throw error;
  }
}
