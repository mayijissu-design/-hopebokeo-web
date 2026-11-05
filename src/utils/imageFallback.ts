import React from 'react';
import { resolveUploadUrl } from './fileUploader';

/**
 * Given an image URL (such as /uploads/filename.jpg), if it fails to load via CDN/static server
 * (e.g. on Netlify or Vercel static deployments), this function fetches the high-definition
 * original image directly from Cloud Firestore's `uploaded_files` and `uploaded_file_chunks` collections.
 */
export async function getFirestoreImageFallback(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  try {
    const resolved = await resolveUploadUrl(url);
    if (resolved && resolved !== url) {
      return resolved;
    }
  } catch (err) {
    console.warn(`Failed to resolve Firestore fallback for ${url}:`, err);
  }

  return null;
}

/**
 * Universal React image error handler. Attach to <img onError={handleImageErrorWithFirestore(fallbackUrl)} />
 * to automatically rescue missing /uploads/ URLs using the high-resolution original image from Firestore.
 */
export function handleImageErrorWithFirestore(fallbackDefault?: string) {
  return async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const imgEl = e.currentTarget;
    const originalSrc =
      imgEl.dataset.originalUploadSrc ||
      imgEl.getAttribute('data-original-src') ||
      imgEl.getAttribute('src') ||
      imgEl.src;

    // Prevent infinite error loop if already attempted
    if (imgEl.getAttribute('data-fallback-attempted') === originalSrc) {
      if (fallbackDefault && imgEl.src !== fallbackDefault) {
        imgEl.src = fallbackDefault;
      }
      return;
    }
    imgEl.setAttribute('data-fallback-attempted', originalSrc);
    imgEl.setAttribute('data-original-src', originalSrc);

    const resolved = await getFirestoreImageFallback(originalSrc);
    if (resolved) {
      imgEl.src = resolved;
    } else if (fallbackDefault && imgEl.src !== fallbackDefault) {
      imgEl.src = fallbackDefault;
    }
  };
}
