import type { APIContext, AstroGlobal } from 'astro';
import { SITE_URL } from '~/config/site';
import { isAdminConfigured, secrets } from './secrets';

/**
 * Single-password authentication for /admin.
 *
 * There is exactly one operator (the owner) and nothing to store per user, so
 * there is no user table, no signup, no reset flow and no session store —
 * just a cookie carrying an expiry, signed with a server-side secret.
 *
 * Ported from node:crypto to Web Crypto for workerd. Two consequences worth
 * knowing:
 *
 *  - Everything that verifies is now async. A missed `await` on a guard
 *    returns a truthy Promise, which locks everyone out rather than letting
 *    them in — noisy rather than dangerous, but check the call sites.
 *  - Secrets are read per request from the Cloudflare binding, because `env`
 *    does not exist at module scope. Reading them at import time (as this
 *    file used to) would make the admin area permanently "not configured".
 */

const COOKIE_NAME = 'ar_admin';
const enc = new TextEncoder();

/** Cookies are only marked Secure when the site is actually served over TLS. */
const SECURE = SITE_URL.startsWith('https://');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: SECURE,
  // Strict is safe here: /admin is reached by typing the URL or a bookmark,
  // both of which send Strict cookies, and it removes cross-site POST risk.
  sameSite: 'strict' as const,
  path: '/',
};

const base64url = (bytes: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

const sign = async (secret: string, payload: string): Promise<string> =>
  base64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(payload)));

/**
 * Compares two secrets in constant time.
 *
 * Both sides are hashed to a fixed 32 bytes first, so the comparison runs over
 * equal-length inputs and nothing about the expected value leaks — not even
 * its length.
 *
 * The XOR loop is hand-rolled rather than using `crypto.subtle.timingSafeEqual`:
 * that is a Cloudflare extension which the DOM and Node type libraries do not
 * know about, and forcing the type through a cast would hide a real
 * incompatibility if this ever ran elsewhere. Over two fixed 32-byte digests
 * this is equivalent — no early exit, one accumulator.
 */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);

  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/* ------------------------------------------------------------------ *
 * Login throttling
 * ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

/**
 * With a single shared password, an unthrottled login form is a free brute
 * force oracle. The counter lives in D1 rather than in a module variable:
 * on Workers a module variable is per-isolate, so an attacker would get 10
 * attempts per isolate across every colo — effectively no limit at all.
 */
export async function isThrottled(db: D1Database): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE at > datetime('now', ?1)`,
    )
    .bind(`-${WINDOW_MINUTES} minutes`)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= MAX_ATTEMPTS;
}

async function recordFailure(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`INSERT INTO login_attempts (id) VALUES (?1)`).bind(crypto.randomUUID()),
    // Keep the table from growing without bound.
    db.prepare(`DELETE FROM login_attempts WHERE at <= datetime('now', '-1 day')`),
  ]);
}

const clearFailures = (db: D1Database): Promise<unknown> =>
  db.prepare(`DELETE FROM login_attempts`).run();

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

export async function checkPassword(env: Env, db: D1Database, input: string): Promise<boolean> {
  const { adminPassword } = secrets(env);
  if (!isAdminConfigured(env) || !input) return false;

  if (!(await safeEqual(input, adminPassword))) {
    await recordFailure(db);
    return false;
  }
  await clearFailures(db);
  return true;
}

/** `<expiry>.<nonce>.<signature>` — stateless, so nothing to store server-side. */
async function createToken(env: Env): Promise<string> {
  const { adminSessionSecret, sessionHours } = secrets(env);
  const expires = Date.now() + sessionHours * 3600 * 1000;
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(8)).buffer);
  const payload = `${expires}.${nonce}`;
  return `${payload}.${await sign(adminSessionSecret, payload)}`;
}

async function verifyToken(env: Env, token: string | undefined): Promise<boolean> {
  if (!isAdminConfigured(env) || !token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [expires, nonce, signature] = parts;
  const { adminSessionSecret } = secrets(env);
  if (!(await safeEqual(signature, await sign(adminSessionSecret, `${expires}.${nonce}`)))) {
    return false;
  }

  const expiresAt = Number(expires);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

type CookieHost = Pick<APIContext, 'cookies'> | AstroGlobal;

export async function startSession(env: Env, context: CookieHost): Promise<void> {
  context.cookies.set(COOKIE_NAME, await createToken(env), {
    ...COOKIE_OPTIONS,
    maxAge: secrets(env).sessionHours * 3600,
  });
}

export function endSession(context: CookieHost): void {
  context.cookies.delete(COOKIE_NAME, { path: COOKIE_OPTIONS.path });
}

export async function isLoggedIn(env: Env, context: CookieHost): Promise<boolean> {
  return verifyToken(env, context.cookies.get(COOKIE_NAME)?.value);
}

/* ------------------------------------------------------------------ *
 * Guards
 * ------------------------------------------------------------------ */

export const LOGIN_PATH = '/admin/login';

/**
 * Page guard. Returns a redirect Response when the visitor is not logged in;
 * the caller returns it directly:
 *
 *   const denied = await requireAdminPage(Astro);
 *   if (denied) return denied;
 */
export async function requireAdminPage(astro: AstroGlobal): Promise<Response | null> {
  if (await isLoggedIn(astro.locals.runtime.env, astro)) return null;
  return astro.redirect(LOGIN_PATH, 303);
}

/** API guard. Returns a 401 JSON Response, or null when authorised. */
export async function requireAdminApi(context: APIContext): Promise<Response | null> {
  if (await isLoggedIn(context.locals.runtime.env, context)) return null;
  return jsonError('Nije prijavljeno.', 401);
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function jsonOk(data: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
