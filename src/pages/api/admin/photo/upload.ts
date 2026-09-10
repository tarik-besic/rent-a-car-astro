import type { APIRoute } from 'astro';
import { jsonError, jsonOk, requireAdminApi } from '~/lib/admin-auth';
import { getCarById } from '~/lib/cars';
import { addPhoto, VARIANTS } from '~/lib/photos';
import { MAX_FILE_BYTES, MAX_FILE_MB, RENDITION_TYPE } from '~/lib/upload-limits';

/**
 * Stores one photo, as three pre-resized renditions produced in the browser.
 *
 * One photo per request, deliberately. The old Cloudinary endpoint accepted up
 * to 20 files of 12 MB in a single multipart body; on Workers that is up to
 * 240 MB buffered against a 128 MB memory ceiling, which kills the isolate.
 * The uploader loops instead, so each request stays small and a single failure
 * does not lose the whole batch.
 *
 * This is the one admin action that needs JavaScript. The public site still
 * works entirely without it.
 */
export const POST: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const { env } = context.locals.runtime;
  const data = await context.request.formData();

  const carId = String(data.get('carId') ?? '');
  const car = await getCarById(env.DB, carId);
  if (!car) return jsonError('Vozilo nije pronađeno.', 404);

  const renditions = new Map<number, ArrayBuffer>();

  for (const width of VARIANTS) {
    const part = data.get(`w${width}`);
    if (!(part instanceof File)) return jsonError(`Nedostaje veličina ${width}.`, 400);
    if (part.type !== RENDITION_TYPE) return jsonError('Neispravan format slike.', 400);
    if (part.size > MAX_FILE_BYTES) return jsonError(`Slika je veća od ${MAX_FILE_MB} MB.`, 413);
    if (part.size === 0) return jsonError('Prazna slika.', 400);
    renditions.set(width, await part.arrayBuffer());
  }

  const photoId = await addPhoto(env.DB, env.PHOTOS, car.id, renditions);
  return jsonOk({ photoId });
};
