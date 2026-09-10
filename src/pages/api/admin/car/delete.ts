import type { APIRoute } from 'astro';
import { requireAdminApi } from '~/lib/admin-auth';
import { getCarById } from '~/lib/cars';
import { deleteCar } from '~/lib/car-write';

export const POST: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const { env } = context.locals.runtime;
  const data = await context.request.formData();
  const car = await getCarById(env.DB, String(data.get('carId') ?? ''));
  if (!car) return context.redirect('/admin', 303);

  await deleteCar(env.DB, env.PHOTOS, car.id);
  return context.redirect('/admin?gotovo=obrisano', 303);
};
