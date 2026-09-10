/**
 * Build-time configuration.
 *
 * On Cloudflare Workers, bindings and secrets are NOT reachable at module
 * scope — only inside a request handler. `src/config/site.ts` builds its
 * whole config at module scope and is imported by 20+ files, so plumbing a
 * runtime `env` through all of them would mean rewriting every component.
 *
 * Instead the split is:
 *
 *   PUBLIC_*  -> build time. Vite inlines `import.meta.env.PUBLIC_*` from
 *                .env locally and from the CI environment on deploy. These
 *                are public business details (phone, address, city) that
 *                change roughly never, and a change costs one redeploy.
 *
 *   secrets   -> runtime only, read from `Astro.locals.runtime.env` inside
 *                the handler that needs them. See src/lib/secrets.ts.
 *                Never referenced here, so they can never be inlined into a
 *                bundle.
 *
 * The things that genuinely change day to day — the cars — live in D1 and are
 * edited live at /admin, so nothing operational needs a redeploy.
 */
export function envVar(key: string, fallback = ''): string {
  const value = (import.meta.env as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

export const envFlag = (key: string, fallback = false): boolean => {
  const value = envVar(key).toLowerCase();
  if (value === '') return fallback;
  return value === 'true' || value === '1' || value === 'yes';
};

export const envNumber = (key: string, fallback: number): number => {
  const value = Number(envVar(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
