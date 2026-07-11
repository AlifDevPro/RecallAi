/** Detect PostgREST / Postgres errors when optional mock columns are not migrated yet. */
export function isMissingCorrectIndexColumn(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error?.message?.includes("correct_index")) return false;
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    error.message.includes("does not exist") ||
    error.message.includes("schema cache")
  );
}
