import type { APIRoute } from 'astro';
import { endSession, LOGIN_PATH } from '~/lib/admin-auth';

/** Dropping the cookie is the whole logout — there is no session store. */
export const POST: APIRoute = (context) => {
  endSession(context);
  return context.redirect(LOGIN_PATH, 303);
};
