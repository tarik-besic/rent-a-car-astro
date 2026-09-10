/**
 * Upload limits, shared by the admin page (which shows them) and the API
 * (which enforces them) so the two cannot drift apart.
 *
 * These now bound the *rendition* the browser produces, not the original the
 * client picked: a 40 MB phone photo is fine as input because it is downscaled
 * before anything is sent. The ceiling exists to stop a hand-crafted request
 * from pushing the Worker toward its 128 MB memory limit.
 */
export const MAX_FILE_MB = 12;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

/** Renditions are always WebP, produced by canvas.toBlob in the uploader. */
export const RENDITION_TYPE = 'image/webp';
