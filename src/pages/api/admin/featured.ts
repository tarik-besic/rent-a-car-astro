import type { APIRoute } from 'astro';
import { requireAdminApi } from '~/lib/admin-auth';
import { FEATURED_COUNT } from '~/lib/cars';

/**
 * Saves the fleet order. The first FEATURED_COUNT cars are the homepage.
 *
 * Position IS selection, which is the whole point: there is no way to pick a
 * fifth car, so "at most four" needs no validation, no warning and no error
 * state. The previous version had a checkbox, a number field and three
 * different count warnings for what is really one decision.
 *
 * `featured` is still written so the rest of the codebase keeps working
 * unchanged — it is derived here rather than chosen by the client.
 */
export const POST: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const { env } = context.locals.runtime;
  const data = await context.request.formData();

  // The list posts one `id` per row, in the order the client arranged them.
  const ids = data.getAll('id').map(String).filter(Boolean);
  if (ids.length === 0) return context.redirect('/admin', 303);

  const statements = ids.map((id, index) =>
    env.DB.prepare(
      `UPDATE cars SET featured = ?1, sort_order = ?2, updated_at = datetime('now')
       WHERE id = ?3`,
    ).bind(index < FEATURED_COUNT ? 1 : 0, index * 10, id),
  );

  // One batch: the order is never briefly half-applied.
  await env.DB.batch(statements);
  return context.redirect('/admin?gotovo=naslovna', 303);
};
