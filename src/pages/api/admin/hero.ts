import type { APIRoute } from 'astro';
import { jsonError, jsonOk, requireAdminApi } from '~/lib/admin-auth';
import { VARIANTS, variantKey } from '~/lib/photos';
import { HERO_KEY, heroBaseKey, setSetting, getSetting } from '~/lib/settings';
import { MAX_FILE_BYTES, MAX_FILE_MB, RENDITION_TYPE } from '~/lib/upload-limits';

/**
 * Replaces the homepage background image.
 *
 * Stored under `site/hero/<id>` rather than under a car, which is the whole
 * point: deleting a car deletes every `cars/<carId>/...` object it owns, so a
 * backdrop borrowed from a car's gallery would disappear with the car. Nothing
 * in the car-deletion path touches the `site/` prefix.
 *
 * Renditions come from the browser, same as car photos.
 */
export const POST: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const { env } = context.locals.runtime;
  const data = await context.request.formData();

  const parts = new Map<number, ArrayBuffer>();
  for (const width of VARIANTS) {
    const part = data.get(`w${width}`);
    if (!(part instanceof File)) return jsonError(`Nedostaje veličina ${width}.`, 400);
    if (part.type !== RENDITION_TYPE) return jsonError('Neispravan format slike.', 400);
    if (part.size > MAX_FILE_BYTES) return jsonError(`Slika je veća od ${MAX_FILE_MB} MB.`, 413);
    if (part.size === 0) return jsonError('Prazna slika.', 400);
    parts.set(width, await part.arrayBuffer());
  }

  const previous = await getSetting(env.DB, HERO_KEY);
  const base = heroBaseKey(crypto.randomUUID());

  await Promise.all(
    [...parts].map(([width, bytes]) =>
      env.PHOTOS.put(variantKey(base, width), bytes, {
        httpMetadata: {
          contentType: RENDITION_TYPE,
          // New id per upload, so the URL is immutable and cacheable forever.
          cacheControl: 'public, max-age=31536000, immutable',
        },
      }),
    ),
  );

  await setSetting(env.DB, HERO_KEY, base);

  // Only now remove the old one: if the put or the setting write had failed,
  // the previous image is still live rather than the page being left blank.
  if (previous && previous !== base) {
    await env.PHOTOS.delete(VARIANTS.map((w) => variantKey(previous, w)));
  }

  return jsonOk({ key: base });
};
