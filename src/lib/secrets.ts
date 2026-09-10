/**
 * Runtime-only secrets, read from the Cloudflare binding for the current
 * request. Never module-scope: `env` does not exist until a request arrives.
 *
 * Set them with:
 *   npx wrangler secret put ADMIN_PASSWORD
 *   npx wrangler secret put ADMIN_SESSION_SECRET
 *
 * Locally they come from .dev.vars (git-ignored).
 */
export type Secrets = {
  adminPassword: string;
  adminSessionSecret: string;
  sessionHours: number;
};

const str = (env: Env, key: string): string => {
  const value = (env as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
};

export function secrets(env: Env): Secrets {
  const hours = Number(str(env, 'ADMIN_SESSION_HOURS'));
  return {
    adminPassword: str(env, 'ADMIN_PASSWORD'),
    adminSessionSecret: str(env, 'ADMIN_SESSION_SECRET'),
    sessionHours: Number.isFinite(hours) && hours > 0 ? hours : 12,
  };
}

/** Both values are required — a password with no signing secret is unusable. */
export const isAdminConfigured = (env: Env): boolean => {
  const s = secrets(env);
  return Boolean(s.adminPassword && s.adminSessionSecret);
};
