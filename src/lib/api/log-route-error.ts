export function logRouteError(
  route: string,
  error: unknown,
  extra?: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[api] ${route}`, {
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    ...extra,
  });
}
