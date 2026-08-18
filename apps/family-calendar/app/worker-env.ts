/**
 * The Worker environment, published by the Worker entry point on each request.
 *
 * Route handlers read it from here rather than importing `cloudflare:workers`
 * directly. That keeps a dynamic import off the request path and lets tests
 * drive the built Worker with an environment of their choosing, the same way
 * they already pass `ASSETS`.
 *
 * Callers name the shape they need; there is no ambient Worker type here.
 */
let current: Record<string, unknown> | null = null;

export function setWorkerEnv(env: unknown) {
  current = (env ?? null) as Record<string, unknown> | null;
}

export function workerEnv<T>(): T {
  if (!current) throw new Error("Shared calendar storage is unavailable.");
  return current as T;
}
