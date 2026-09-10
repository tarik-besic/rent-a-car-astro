import type { APIRoute } from 'astro';
import { VARIANTS } from '~/lib/photos';

/**
 * Serves car photos out of R2.
 *
 * Keys embed a random photo id and a fixed width and are never reused, so
 * every URL is immutable — hence the one-year cache and no purge step. The
 * Worker is only hit on a cache miss.
 */

/** Only ever serve keys we generate. Blocks traversal and bucket probing. */
const KEY_PATTERN = new RegExp(
  `^cars/[a-z0-9-]+/[a-f0-9-]{36}-(?:${VARIANTS.join('|')})\\.webp$`,
);

export const GET: APIRoute = async ({ params, locals, request }) => {
  const key = params.key ?? '';
  if (!KEY_PATTERN.test(key)) return new Response('Not found', { status: 404 });

  const object = await locals.runtime.env.PHOTOS.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  /**
   * Headers are set explicitly rather than via `object.writeHttpMetadata()`.
   * That method takes a `Headers` instance, and in `astro dev` the R2 binding
   * is reached over miniflare's RPC proxy, which cannot serialize one
   * ("Cannot stringify arbitrary non-POJOs") and 500s. Every rendition this
   * route serves is WebP written by the uploader, so there is no metadata
   * worth reading back anyway.
   */
  const headers = new Headers({
    'content-type': 'image/webp',
    etag: object.httpEtag,
    'cache-control': 'public, max-age=31536000, immutable',
  });

  // Cheap revalidation for anything already in a browser cache.
  if (request.headers.get('if-none-match') === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }

  // Streamed, never buffered: the Worker never holds a photo in memory.
  return new Response(object.body, { headers });
};
