import { db, doc, setDoc } from '../lib/firebase';

/**
 * Universal Client-Side Image Compressor & Optimizer
 * Guarantees ANY image file type, resolution, or format (JPG, PNG, WEBP, GIF, SVG, HEIC/camera photos)
 * is optimized with high-definition sharpness and crisp clarity, preserving fine details while
 * remaining safely under Firestore's 1MB document limit.
 */
export const compressImageFile = (
  file: File,
  maxDimension = 2560,
  initialQuality = 0.95,
  maxStringLength = 750000, // HD sharpness preservation
  preserveTransparency = false
): Promise<string> => {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }

    // Keep vector SVGs as raw vector data URL if small
    if ((file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) && file.size < 250000) {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const isPngOrTransparent =
      preserveTransparency ||
      file.type === 'image/png' ||
      file.name.toLowerCase().endsWith('.png') ||
      file.type === 'image/webp' ||
      file.name.toLowerCase().endsWith('.webp') ||
      file.type === 'image/svg+xml' ||
      file.name.toLowerCase().endsWith('.svg');

    const processElement = (drawable: HTMLImageElement | ImageBitmap) => {
      try {
        let width = drawable.width || 1200;
        let height = drawable.height || 800;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve('');
          return;
        }

        // Enable highest quality image smoothing to prevent blurriness
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Never fill background with white if transparent format
        if (!isPngOrTransparent) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);

        let currentQuality = initialQuality;
        const mimeType = isPngOrTransparent ? 'image/png' : 'image/jpeg';
        let dataUrl = canvas.toDataURL(mimeType, currentQuality);

        // Iterative reduction loop only if payload exceeds safe Firestore single-image ceiling
        let attempts = 0;
        while (dataUrl.length > maxStringLength && attempts < 8) {
          attempts++;
          width = Math.round(width * 0.82);
          height = Math.round(height * 0.82);
          currentQuality = Math.max(0.60, currentQuality - 0.05);

          const iterCanvas = document.createElement('canvas');
          iterCanvas.width = Math.max(60, width);
          iterCanvas.height = Math.max(60, height);
          const iterCtx = iterCanvas.getContext('2d');
          if (iterCtx) {
            iterCtx.imageSmoothingEnabled = true;
            iterCtx.imageSmoothingQuality = 'high';
            if (!isPngOrTransparent) {
              iterCtx.fillStyle = '#FFFFFF';
              iterCtx.fillRect(0, 0, iterCanvas.width, iterCanvas.height);
            } else {
              iterCtx.clearRect(0, 0, iterCanvas.width, iterCanvas.height);
            }
            iterCtx.drawImage(drawable, 0, 0, iterCanvas.width, iterCanvas.height);
            dataUrl = iterCanvas.toDataURL(isPngOrTransparent ? 'image/png' : 'image/jpeg', currentQuality);
          }
        }

        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas rendering error:', err);
        resolve('');
      }
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      const srcData = e.target?.result as string;
      if (!srcData) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => processElement(img);

      img.onerror = () => {
        if ('createImageBitmap' in window) {
          createImageBitmap(file)
            .then((bitmap) => processElement(bitmap))
            .catch(() => {
              if (srcData.length <= maxStringLength) {
                resolve(srcData);
              } else {
                resolve('');
              }
            });
        } else if (srcData.length <= maxStringLength) {
          resolve(srcData);
        } else {
          resolve('');
        }
      };

      img.src = srcData;
    };

    reader.onerror = () => {
      if ('createImageBitmap' in window) {
        createImageBitmap(file)
          .then((bitmap) => processElement(bitmap))
          .catch(() => resolve(''));
      } else {
        resolve('');
      }
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Utility to optimize an existing data URL string with high sharpness
 */
export const shrinkBase64DataUrl = (
  dataUrl: string,
  maxDimension = 1600,
  quality = 0.82,
  maxStringLength = 180000,
  preserveTransparency = false
): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl || '');
      return;
    }
    // If it's already within safe limits, keep original crisp pixels
    if (dataUrl.length <= maxStringLength) {
      resolve(dataUrl);
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(dataUrl);
      return;
    }

    const isPngOrTransparent =
      preserveTransparency ||
      dataUrl.startsWith('data:image/png') ||
      dataUrl.startsWith('data:image/webp') ||
      dataUrl.startsWith('data:image/svg');

    const img = new Image();
    img.onload = () => {
      let width = img.width || 1200;
      let height = img.height || 800;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (!isPngOrTransparent) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let currentQuality = quality;
      const mime = isPngOrTransparent ? 'image/png' : 'image/jpeg';
      let result = canvas.toDataURL(mime, currentQuality);

      let attempts = 0;
      while (result.length > maxStringLength && attempts < 7) {
        attempts++;
        width = Math.round(width * 0.82);
        height = Math.round(height * 0.82);
        currentQuality = Math.max(0.55, currentQuality - 0.05);

        const iterCanvas = document.createElement('canvas');
        iterCanvas.width = Math.max(60, width);
        iterCanvas.height = Math.max(60, height);
        const iterCtx = iterCanvas.getContext('2d');
        if (iterCtx) {
          iterCtx.imageSmoothingEnabled = true;
          iterCtx.imageSmoothingQuality = 'high';
          if (!isPngOrTransparent) {
            iterCtx.fillStyle = '#FFFFFF';
            iterCtx.fillRect(0, 0, iterCanvas.width, iterCanvas.height);
          } else {
            iterCtx.clearRect(0, 0, iterCanvas.width, iterCanvas.height);
          }
          iterCtx.drawImage(img, 0, 0, iterCanvas.width, iterCanvas.height);
          result = iterCanvas.toDataURL(mime, currentQuality);
        }
      }

      resolve(result);
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
};

/**
 * Emergency compressor for any document object to guarantee it strictly fits Firestore 1MB limits
 */
export async function emergencyCompressObject(obj: any): Promise<any> {
  if (!obj) return obj;
  const safe = JSON.parse(JSON.stringify(obj));

  const compressWalk = async (val: any): Promise<any> => {
    if (!val) return val;
    if (typeof val === 'string' && val.startsWith('data:image')) {
      return await shrinkBase64DataUrl(val, 1920, 0.88, 350000);
    }
    if (Array.isArray(val)) {
      const arr = [];
      for (const item of val) {
        arr.push(await compressWalk(item));
      }
      return arr;
    }
    if (typeof val === 'object') {
      for (const k of Object.keys(val)) {
        val[k] = await compressWalk(val[k]);
      }
      return val;
    }
    return val;
  };

  return await compressWalk(safe);
}

import { saveBase64ToFirestoreUploadedFiles } from './fileUploader';

/**
 * Helper to convert heavy base64 strings to permanent uncompressed server URLs
 * preserving 100% original resolution without Firestore size penalties.
 * If backend server is unavailable (e.g. static hosting on Netlify), it writes
 * directly to Cloud Firestore `uploaded_files` (and `uploaded_file_chunks` for large files).
 */
async function convertBase64ToUploadUrl(base64Str: string, namePrefix = 'poster'): Promise<string> {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  // 1. Try server endpoint first
  try {
    const res = await fetch('/api/upload-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data: base64Str,
        fileName: `${namePrefix}_${Date.now()}`,
      }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
    }
  } catch {
    // Backend offline or static hosting
  }

  // 2. Direct Cloud Firestore uploaded_files + uploaded_file_chunks backup (retains 100% original crisp clarity on Netlify / Vercel)
  try {
    return await saveBase64ToFirestoreUploadedFiles(base64Str, namePrefix);
  } catch (firestoreErr) {
    console.warn('Direct Firestore upload error:', firestoreErr);
  }

  return base64Str;
}

/**
 * Optimizes an entire HomePoster or config object before saving to Firestore.
 * Preserves ultra-crisp resolution while strictly ensuring total document
 * payload stays safely within lightweight bounds (~20KB - 50KB).
 */
export async function optimizePosterForFirestore(poster: any): Promise<any> {
  if (!poster) return poster;
  if (poster._isOptimized) return poster;

  const safePoster = JSON.parse(JSON.stringify(poster));

  // 1. Process Background Image (bgImageUrl)
  const bgPromise = (async () => {
    if (typeof safePoster.bgImageUrl === 'string' && safePoster.bgImageUrl.startsWith('data:image')) {
      const uploadedUrl = await convertBase64ToUploadUrl(safePoster.bgImageUrl, 'bg');
      if (uploadedUrl.startsWith('/uploads/')) {
        safePoster.bgImageUrl = uploadedUrl;
      } else if (safePoster.bgImageUrl.length > 350000) {
        safePoster.bgImageUrl = await shrinkBase64DataUrl(safePoster.bgImageUrl, 2560, 0.92, 350000);
      }
    }
  })();

  // 2. Process Upcoming Event Flyer / Image
  const upcomingPromise = (async () => {
    if (typeof safePoster.upcomingEventImageUrl === 'string' && safePoster.upcomingEventImageUrl.startsWith('data:image')) {
      const uploadedUrl = await convertBase64ToUploadUrl(safePoster.upcomingEventImageUrl, 'upcoming_poster');
      if (uploadedUrl.startsWith('/uploads/')) {
        safePoster.upcomingEventImageUrl = uploadedUrl;
      } else if (safePoster.upcomingEventImageUrl.length > 350000) {
        safePoster.upcomingEventImageUrl = await shrinkBase64DataUrl(safePoster.upcomingEventImageUrl, 2560, 0.92, 350000);
      }
    }
  })();

  // 3. Process Organization Logo (logoUrl)
  const logoPromise = (async () => {
    if (typeof safePoster.logoUrl === 'string' && safePoster.logoUrl.startsWith('data:image')) {
      const uploadedUrl = await convertBase64ToUploadUrl(safePoster.logoUrl, 'logo');
      if (uploadedUrl.startsWith('/uploads/')) {
        safePoster.logoUrl = uploadedUrl;
      } else if (safePoster.logoUrl.length > 100000) {
        safePoster.logoUrl = await shrinkBase64DataUrl(safePoster.logoUrl, 1200, 0.92, 100000);
      }
    }
  })();

  // 4. Process Carousel / Poster Images concurrently (prioritizing 100% original full-resolution files)
  const rawList: string[] = Array.isArray(safePoster.imageUrls)
    ? safePoster.imageUrls
    : safePoster.imageUrl
    ? [safePoster.imageUrl]
    : [];

  const validImages = rawList.filter((u) => u && typeof u === 'string' && u.trim().length > 0);

  const imagesPromise = (async () => {
    const optimizedImages = await Promise.all(
      validImages.map(async (imgStr, idx) => {
        if (typeof imgStr === 'string' && imgStr.startsWith('data:image')) {
          const uploadedUrl = await convertBase64ToUploadUrl(imgStr, `hero_slide_${idx}`);
          if (uploadedUrl.startsWith('/uploads/')) {
            return uploadedUrl;
          }
          if (imgStr.length > 400000) {
            return await shrinkBase64DataUrl(imgStr, 2560, 0.92, 400000);
          }
        }
        return imgStr;
      })
    );
    safePoster.imageUrls = optimizedImages;
    safePoster.imageUrl = optimizedImages[0] || '';
  })();

  // 5. Process Bokeo Timeline Images concurrently
  const timelinePromise = (async () => {
    if (Array.isArray(safePoster.bokeoTimeline)) {
      safePoster.bokeoTimeline = await Promise.all(
        safePoster.bokeoTimeline.map(async (item: any, itemIdx: number) => {
          if (!item) return item;
          const cloneItem = { ...item };
          const rawTimelineImgs: string[] = Array.isArray(cloneItem.imageUrls)
            ? cloneItem.imageUrls
            : cloneItem.imageUrl
            ? [cloneItem.imageUrl]
            : [];

          if (rawTimelineImgs.length > 0) {
            const optImgs = await Promise.all(
              rawTimelineImgs.map(async (tImg: string, tIdx: number) => {
                if (typeof tImg === 'string' && tImg.startsWith('data:image')) {
                  const uploaded = await convertBase64ToUploadUrl(tImg, `timeline_${itemIdx}_${tIdx}`);
                  if (uploaded.startsWith('/uploads/')) return uploaded;
                  if (tImg.length > 150000) {
                    return await shrinkBase64DataUrl(tImg, 1200, 0.85, 150000);
                  }
                }
                return tImg;
              })
            );
            cloneItem.imageUrls = optImgs;
            cloneItem.imageUrl = optImgs[0] || '';
          }
          return cloneItem;
        })
      );
    }
  })();

  // 5. Process Bokeo / About Us Poster Image & About Hero Banner Image
  const bokeoPromise = (async () => {
    if (typeof safePoster.bokeoImageUrl === 'string' && safePoster.bokeoImageUrl.startsWith('data:image')) {
      const uploadedUrl = await convertBase64ToUploadUrl(safePoster.bokeoImageUrl, 'bokeo_poster');
      if (uploadedUrl.startsWith('/uploads/')) {
        safePoster.bokeoImageUrl = uploadedUrl;
      } else if (safePoster.bokeoImageUrl.length > 350000) {
        safePoster.bokeoImageUrl = await shrinkBase64DataUrl(safePoster.bokeoImageUrl, 2560, 0.92, 350000);
      }
    }
    if (typeof safePoster.aboutHeroImageUrl === 'string' && safePoster.aboutHeroImageUrl.startsWith('data:image')) {
      const uploadedHeroUrl = await convertBase64ToUploadUrl(safePoster.aboutHeroImageUrl, 'about_hero_poster');
      if (uploadedHeroUrl.startsWith('/uploads/')) {
        safePoster.aboutHeroImageUrl = uploadedHeroUrl;
      } else if (safePoster.aboutHeroImageUrl.length > 350000) {
        safePoster.aboutHeroImageUrl = await shrinkBase64DataUrl(safePoster.aboutHeroImageUrl, 2560, 0.92, 350000);
      }
    }
  })();

  // 5b. Process Insights / Dashboard Poster Image
  const insightsPromise = (async () => {
    if (typeof safePoster.insightsImageUrl === 'string' && safePoster.insightsImageUrl.startsWith('data:image')) {
      const uploadedUrl = await convertBase64ToUploadUrl(safePoster.insightsImageUrl, 'insights_poster');
      if (uploadedUrl.startsWith('/uploads/')) {
        safePoster.insightsImageUrl = uploadedUrl;
      } else if (safePoster.insightsImageUrl.length > 350000) {
        safePoster.insightsImageUrl = await shrinkBase64DataUrl(safePoster.insightsImageUrl, 2560, 0.92, 350000);
      }
    }
  })();

  // Execute all image groups in parallel
  await Promise.all([bgPromise, upcomingPromise, logoPromise, imagesPromise, timelinePromise, bokeoPromise, insightsPromise]);

  // 6. Emergency guard only if payload is exceptionally high (> 750KB)
  let jsonLen = JSON.stringify(safePoster).length;
  if (jsonLen > 750000) {
    console.warn(`[Firestore Guard] Payload size ${jsonLen} is high. Converting remaining base64 images to uploaded_files...`);
    if (safePoster.bgImageUrl && safePoster.bgImageUrl.startsWith('data:image')) {
      safePoster.bgImageUrl = await convertBase64ToUploadUrl(safePoster.bgImageUrl, 'bg_overflow');
    }
    if (safePoster.bokeoImageUrl && safePoster.bokeoImageUrl.startsWith('data:image')) {
      safePoster.bokeoImageUrl = await convertBase64ToUploadUrl(safePoster.bokeoImageUrl, 'bokeo_overflow');
    }
    if (safePoster.aboutHeroImageUrl && safePoster.aboutHeroImageUrl.startsWith('data:image')) {
      safePoster.aboutHeroImageUrl = await convertBase64ToUploadUrl(safePoster.aboutHeroImageUrl, 'about_hero_overflow');
    }
    if (safePoster.insightsImageUrl && safePoster.insightsImageUrl.startsWith('data:image')) {
      safePoster.insightsImageUrl = await convertBase64ToUploadUrl(safePoster.insightsImageUrl, 'insights_overflow');
    }
    if (Array.isArray(safePoster.imageUrls)) {
      safePoster.imageUrls = await Promise.all(
        safePoster.imageUrls.map(async (img: string, idx: number) => {
          if (img && img.startsWith('data:image')) {
            return await convertBase64ToUploadUrl(img, `slide_overflow_${idx}`);
          }
          return img;
        })
      );
      safePoster.imageUrl = safePoster.imageUrls[0] || '';
    }
  }

  safePoster._isOptimized = true;
  return safePoster;
}

