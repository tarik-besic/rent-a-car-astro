import type { APIRoute } from 'astro';
import { requireAdminApi } from '~/lib/admin-auth';
import { getCarById } from '~/lib/cars';
import { setCover } from '~/lib/photos';

/** Plain form POST answered with a 303, so it works without JavaScript. */
export const POST: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const { env } = context.locals.runtime;
  const data = await context.request.formData();
  const carId = String(data.get('carId') ?? '');
  const photoId = String(data.get('photoId') ?? '');

  const car = await getCarById(env.DB, carId);
  if (!car) return context.redirect('/admin', 303);

  // setCover scopes its UPDATE by car_id, so a crafted photoId from another
  // car matches nothing rather than being promoted.
  await setCover(env.DB, car.id, photoId);
  return context.redirect(`/admin/cars/${car.id}`, 303);
};
