import type { APIRoute } from 'astro';
import { requireAdminApi } from '~/lib/admin-auth';
import { getCarById } from '~/lib/cars';
import { deletePhoto } from '~/lib/photos';

export const POST: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const { env } = context.locals.runtime;
  const data = await context.request.formData();
  const carId = String(data.get('carId') ?? '');
  const photoId = String(data.get('photoId') ?? '');

  const car = await getCarById(env.DB, carId);
  if (!car) return context.redirect('/admin', 303);

  // deletePhoto re-checks that the row belongs to this car and that the key
  // sits under its prefix before touching R2.
  await deletePhoto(env.DB, env.PHOTOS, car.id, photoId);
  return context.redirect(`/admin/cars/${car.id}`, 303);
};
