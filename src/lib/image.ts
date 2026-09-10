import { VARIANTS, variantKey } from './photos';

/**
 * Image delivery.
 *
 * Cloudinary did format negotiation, quality and subject-aware cropping
 * (`g_auto`) on the fly. R2 has no transformation layer, and Cloudflare's
 * `/cdn-cgi/image/` resizing needs a paid plan — so renditions are produced
 * once, in the browser, at upload time (see the admin uploader). Three fixed
 * widths cover every layout on the site and cost nothing per request.
 *
 * The trade: no per-request art direction, and cropping is centred rather
 * than subject-aware. For a car photographed filling the frame that is a
 * non-issue; it would matter for logos or group shots.
 */

export const PLACEHOLDER = '/placeholder-car.svg';

type Options = {
  width: number;
  height?: number;
};

const isAbsolute = (src: string): boolean => /^https?:\/\//i.test(src);
const isLocal = (src: string): boolean => src.startsWith('/');

/** Smallest stored rendition that still covers the requested width. */
const pickVariant = (width: number): number =>
  VARIANTS.find((w) => w >= width) ?? VARIANTS[VARIANTS.length - 1];

/**
 * Resolves a stored R2 key to a delivery URL.
 *
 * Also passes through absolute URLs and /public paths untouched, because
 * PUBLIC_HERO_IMAGE and the placeholder are both configured that way.
 */
export function imageUrl(src: string, options: Options): string {
  const value = (src ?? '').trim();
  if (!value) return PLACEHOLDER;
  if (isLocal(value) || isAbsolute(value)) return value;

  // A stored photo key -> the /img route, which streams it out of R2.
  return `/img/${variantKey(value, pickVariant(options.width))}`;
}

/**
 * Builds a srcset so phones do not download desktop-sized photos.
 * Empty for sources we did not generate renditions for (the browser then
 * just uses `src`).
 */
export function imageSrcSet(src: string, options: Options): string {
  const value = (src ?? '').trim();
  if (!value || isLocal(value) || isAbsolute(value)) return '';

  const max = pickVariant(options.width * 2);
  return VARIANTS.filter((w) => w <= max)
    .map((w) => `/img/${variantKey(value, w)} ${w}w`)
    .join(', ');
}

export type ResolvedImage = {
  src: string;
  srcset: string;
  width: number;
  height: number;
};

export function resolveImage(src: string, options: Options & { height: number }): ResolvedImage {
  return {
    src: imageUrl(src, options),
    srcset: imageSrcSet(src, options),
    width: options.width,
    height: options.height,
  };
}
