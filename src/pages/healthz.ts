import type { APIRoute } from 'astro';
import { site } from '~/config/site';
import { isAdminConfigured } from '~/lib/secrets';

/**
 * Render's health check is gone; Cloudflare has no equivalent. This endpoint
 * stays because its second job is the useful one: telling you, in one request,
 * whether a fresh deployment is actually wired up.
 */
export const GET: APIRoute = async ({ locals }) => {
  const { env } = locals.runtime;

  let carCount: number | null = null;
  let photoCount: number | null = null;
  let dbError: string | null = null;

  try {
    const [cars, photos] = await env.DB.batch<{ n: number }>([
      env.DB.prepare('SELECT COUNT(*) AS n FROM cars'),
      env.DB.prepare('SELECT COUNT(*) AS n FROM car_photos'),
    ]);
    carCount = cars.results?.[0]?.n ?? 0;
    photoCount = photos.results?.[0]?.n ?? 0;
  } catch (error) {
    // Almost always "no such table" — the migration has not been applied.
    dbError = error instanceof Error ? error.message : String(error);
  }

  const body = {
    ok: dbError === null,
    siteUrl: site.url,
    whatsappConfigured: Boolean(site.whatsapp),
    adminConfigured: isAdminConfigured(env),
    db: { ok: dbError === null, cars: carCount, photos: photoCount, error: dbError },
    r2Bound: Boolean(env.PHOTOS),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: body.ok ? 200 : 503,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};
