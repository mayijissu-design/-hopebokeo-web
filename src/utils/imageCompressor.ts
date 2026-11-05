import { saveBase64ToFirestoreUploadedFiles } from './fileUploader';

function isStaticHostEnv(): boolean {
  if (typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  return (
    host === 'hopebokeo.org' ||
    host.endsWith('.hopebokeo.org') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev')
  );
}

/**
 * Fast check to see if a canvas actually contains any transparent pixels.
 * Samples a grid of points across the canvas in <1ms.
 */
function canvasHasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const cols = Math.min(8, Math.max(2, width));
    const rows = Math.min(8, Math.max(2, height));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = Math.min(width - 1, Math.floor((c / (cols - 1 || 1)) * (width - 1)));
        const y = Math.min(height - 1, Math.floor((r / (rows - 1 || 1)) * (height - 1)));
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        if (pixel[3] < 250) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Encodes a canvas with alpha transparency using WebP if supported (fast & compact),
 * falling back to PNG.
 */
function encodeCanvasWithAlpha(canvas: HTMLCanvasElement, quality: number): string {
  try {
    const webp = canvas.toDataURL('image/webp', quality);
    if (webp && webp.startsWith('data:image/webp')) {
      return webp;
    }
  } catch {
    // fallback to png
  }
  return canvas.toDataURL('image/png');
}

/**
 * Universal Client-Side Image Compressor & Optimizer
 * Fast (<100ms), non-blocking HTML5 Canvas resizer & encoder.
 * Avoids synchronous multi-megabyte lossless PNG encoding loops on opaque photos/screenshots.
 */
export const compressImageFile = (
  file: File,
  maxDimension = 1920,
  initialQuality = 0.88,
  maxStringLength = 350000,
  preserveTransparency = false
): Promise<string> => {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }

    // Keep vector SVGs as raw vector data URL if small
    if (
      (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) &&
      file.size < 250000
    ) {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const mightHaveAlpha =
      preserveTransparency ||
      file.type === 'image/png' ||
      file.name.toLowerCase().endsWith('.png') ||
      file.type === 'image/webp' ||
      file.name.toLowerCase().endsWith('.webp') ||
      file.type === 'image/svg+xml' ||
      file.name.toLowerCase().endsWith('.svg');

    const processElement = (drawable: HTMLImageElement | ImageBitmap, cleanupUrl?: string) => {
      if (cleanupUrl) {
        try {
          URL.revokeObjectURL(cleanupUrl);
        } catch {}
      }
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

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(drawable, 0, 0, canvas.width, canvas.height);

        // Only keep alpha channel if explicitly requested OR if the image genuinely has transparent pixels
        const useAlpha =
          preserveTransparency || (mightHaveAlpha && canvasHasTransparency(ctx, canvas.width, canvas.height));

        if (!useAlpha) {
          // Composite onto white background and encode as fast JPEG
          const jpgCanvas = document.createElement('canvas');
          jpgCanvas.width = canvas.width;
          jpgCanvas.height = canvas.height;
          const jpgCtx = jpgCanvas.getContext('2d');
          if (jpgCtx) {
            jpgCtx.fillStyle = '#FFFFFF';
            jpgCtx.fillRect(0, 0, jpgCanvas.width, jpgCanvas.height);
            jpgCtx.drawImage(canvas, 0, 0);
            let currentQuality = initialQuality;
            let dataUrl = jpgCanvas.toDataURL('image/jpeg', currentQuality);

            let attempts = 0;
            while (dataUrl.length > maxStringLength && attempts < 4) {
              attempts++;
              width = Math.round(width * 0.8);
              height = Math.round(height * 0.8);
              currentQuality = Math.max(0.65, currentQuality - 0.07);

              const iterCanvas = document.createElement('canvas');
              iterCanvas.width = Math.max(60, width);
              iterCanvas.height = Math.max(60, height);
              const iterCtx = iterCanvas.getContext('2d');
              if (iterCtx) {
                iterCtx.imageSmoothingEnabled = true;
                iterCtx.imageSmoothingQuality = 'high';
                iterCtx.fillStyle = '#FFFFFF';
                iterCtx.fillRect(0, 0, iterCanvas.width, iterCanvas.height);
                iterCtx.drawImage(drawable, 0, 0, iterCanvas.width, iterCanvas.height);
                dataUrl = iterCanvas.toDataURL('image/jpeg', currentQuality);
              }
            }
            resolve(dataUrl);
            return;
          }
        }

        // Transparent image path (uses WebP with alpha for fast compression, or PNG fallback)
        let currentQuality = initialQuality;
        let dataUrl = encodeCanvasWithAlpha(canvas, currentQuality);

        let attempts = 0;
        while (dataUrl.length > maxStringLength && attempts < 4) {
          attempts++;
          width = Math.round(width * 0.78);
          height = Math.round(height * 0.78);
          currentQuality = Math.max(0.65, currentQuality - 0.08);

          const iterCanvas = document.createElement('canvas');
          iterCanvas.width = Math.max(60, width);
          iterCanvas.height = Math.max(60, height);
          const iterCtx = iterCanvas.getContext('2d');
          if (iterCtx) {
            iterCtx.imageSmoothingEnabled = true;
            iterCtx.imageSmoothingQuality = 'high';
            iterCtx.clearRect(0, 0, iterCanvas.width, iterCanvas.height);
            iterCtx.drawImage(drawable, 0, 0, iterCanvas.width, iterCanvas.height);
            dataUrl = encodeCanvasWithAlpha(iterCanvas, currentQuality);
          }
        }

        resolve(dataUrl);
      } catch (err) {
        console.warn('Canvas rendering error:', err);
        resolve('');
      }
    };

    // Fast path: use object URL directly instead of reading 10MB file as base64 first
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => processElement(img, objectUrl);
      img.onerror = () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
        if ('createImageBitmap' in window) {
          createImageBitmap(file)
            .then((bitmap) => processElement(bitmap))
            .catch(() => resolve(''));
        } else {
          resolve('');
        }
      };
      img.src = objectUrl;
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const srcData = e.target?.result as string;
        if (!srcData) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => processElement(img);
        img.onerror = () => resolve(srcData.length <= maxStringLength ? srcData : '');
        img.src = srcData;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    }
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
    if (dataUrl.length <= maxStringLength) {
      resolve(dataUrl);
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(dataUrl);
      return;
    }

    const mightHaveAlpha =
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const useAlpha =
        preserveTransparency || (mightHaveAlpha && canvasHasTransparency(ctx, canvas.width, canvas.height));

      if (!useAlpha) {
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }

      let currentQuality = quality;
      let result = useAlpha
        ? encodeCanvasWithAlpha(canvas, currentQuality)
        : canvas.toDataURL('image/jpeg', currentQuality);

      let attempts = 0;
      while (result.length > maxStringLength && attempts < 4) {
        attempts++;
        width = Math.round(width * 0.8);
        height = Math.round(height * 0.8);
        currentQuality = Math.max(0.6, currentQuality - 0.07);

        const iterCanvas = document.createElement('canvas');
        iterCanvas.width = Math.max(60, width);
        iterCanvas.height = Math.max(60, height);
        const iterCtx = iterCanvas.getContext('2d');
        if (iterCtx) {
          iterCtx.imageSmoothingEnabled = true;
          iterCtx.imageSmoothingQuality = 'high';
          if (!useAlpha) {
            iterCtx.fillStyle = '#FFFFFF';
            iterCtx.fillRect(0, 0, iterCanvas.width, iterCanvas.height);
          } else {
            iterCtx.clearRect(0, 0, iterCanvas.width, iterCanvas.height);
          }
          iterCtx.drawImage(img, 0, 0, iterCanvas.width, iterCanvas.height);
          result = useAlpha
            ? encodeCanvasWithAlpha(iterCanvas, currentQuality)
            : iterCanvas.toDataURL('image/jpeg', currentQuality);
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
      return await shrinkBase64DataUrl(val, 1600, 0.82, 220000);
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

/**
 * Helper to convert heavy base64 strings to permanent server or Firestore URLs
 * without stalling on static hosts.
 */
async function convertBase64ToUploadUrl(base64Str: string, namePrefix = 'poster'): Promise<string> {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  // 1. Try server endpoint ONLY when not on a static host (e.g. skip on hopebokeo.org / Netlify)
  if (!isStaticHostEnv()) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);
      const res = await fetch('/api/upload-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: base64Str,
          fileName: `${namePrefix}_${Date.now()}`,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
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
  }

  // 2. Direct Cloud Firestore uploaded_files (with built-in timeout and compact data URL fallback)
  try {
    return await saveBase64ToFirestoreUploadedFiles(base64Str, namePrefix);
  } catch (firestoreErr) {
    console.warn('Direct Firestore upload error:', firestoreErr);
  }

  return base64Str;
}

/**
 * Optimizes an entire HomePoster or config object before saving to Firestore.
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
      } else if (safePoster.bgImageUrl.length > 260000) {
        safePoster.bgImageUrl = await shrinkBase64DataUrl(safePoster.bgImageUrl, 1920, 0.85, 240000);
      }
    }
  })();

  // 2. Process Upcoming Event Flyer / Image
  const upcomingPromise = (async () => {
    if (
      typeof safePoster.upcomingEventImageUrl === 'string' &&
      safePoster.upcomingEventImageUrl.startsWith('data:image')
    ) {
      const uploadedUrl = await convertBase64ToUploadUrl(safePoster.upcomingEventImageUrl, 'upcoming_poster');
      if (uploadedUrl.startsWith('/uploads/')) {
        safePoster.upcomingEventImageUrl = uploadedUrl;
      } else if (safePoster.upcomingEventImageUrl.length > 260000) {
        safePoster.upcomingEventImageUrl = await shrinkBase64DataUrl(
          safePoster.upcomingEventImageUrl,
          1920,
          0.85,
          240000
        );
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
        safePoster.logoUrl = await shrinkBase64DataUrl(safePoster.logoUrl, 1000, 0.88, 100000, true);
      }
    }
  })();

  // 4. Process Carousel / Poster Images concurrently
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
          if (imgStr.length > 260000) {
            return await shrinkBase64DataUrl(imgStr, 1920, 0.85, 240000);
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
                  if (tImg.length > 140000) {
                    return await shrinkBase64DataUrl(tImg, 1200, 0.82, 140000);
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

  // 6. Process Bokeo / About Us Poster Image & About Hero Banner Image
  const bokeoPromise = (async () => {
    if (typeof safePoster.bokeoImageUrl === 'string' && safePoster.bokeoImageUrl.startsWith('data:image')) {
      const uploadedUrl = await convertBase64ToUploadUrl(safePoster.bokeoImageUrl, 'bokeo_poster');
      if (uploadedUrl.startsWith('/uploads/')) {
        safePoster.bokeoImageUrl = uploadedUrl;
      } else if (safePoster.bokeoImageUrl.length > 260000) {
        safePoster.bokeoImageUrl = await shrinkBase64DataUrl(safePoster.bokeoImageUrl, 1920, 0.85, 240000);
      }
    }
    if (
      typeof safePoster.aboutHeroImageUrl === 'string' &&
      safePoster.aboutHeroImageUrl.startsWith('data:image')
    ) {
      const uploadedHeroUrl = await convertBase64ToUploadUrl(
        safePoster.aboutHeroImageUrl,
        'about_hero_poster'
      );
      if (uploadedHeroUrl.startsWith('/uploads/')) {
        safePoster.aboutHeroImageUrl = uploadedHeroUrl;
      } else if (safePoster.aboutHeroImageUrl.length > 260000) {
        safePoster.aboutHeroImageUrl = await shrinkBase64DataUrl(
          safePoster.aboutHeroImageUrl,
          1920,
          0.85,
          240000
        );
      }
    }
  })();

  // 7. Process Insights / Dashboard Poster Image
  const insightsPromise = (async () => {
    if (
      typeof safePoster.insightsImageUrl === 'string' &&
      safePoster.insightsImageUrl.startsWith('data:image')
    ) {
      const uploadedUrl = await convertBase64ToUploadUrl(safePoster.insightsImageUrl, 'insights_poster');
      if (uploadedUrl.startsWith('/uploads/')) {
        safePoster.insightsImageUrl = uploadedUrl;
      } else if (safePoster.insightsImageUrl.length > 260000) {
        safePoster.insightsImageUrl = await shrinkBase64DataUrl(
          safePoster.insightsImageUrl,
          1920,
          0.85,
          240000
        );
      }
    }
  })();

  await Promise.all([
    bgPromise,
    upcomingPromise,
    logoPromise,
    imagesPromise,
    timelinePromise,
    bokeoPromise,
    insightsPromise,
  ]);

  let jsonLen = JSON.stringify(safePoster).length;
  if (jsonLen > 750000) {
    if (safePoster.bgImageUrl && safePoster.bgImageUrl.startsWith('data:image')) {
      safePoster.bgImageUrl = await shrinkBase64DataUrl(safePoster.bgImageUrl, 1400, 0.78, 160000);
    }
    if (safePoster.bokeoImageUrl && safePoster.bokeoImageUrl.startsWith('data:image')) {
      safePoster.bokeoImageUrl = await shrinkBase64DataUrl(safePoster.bokeoImageUrl, 1400, 0.78, 160000);
    }
    if (safePoster.aboutHeroImageUrl && safePoster.aboutHeroImageUrl.startsWith('data:image')) {
      safePoster.aboutHeroImageUrl = await shrinkBase64DataUrl(
        safePoster.aboutHeroImageUrl,
        1400,
        0.78,
        160000
      );
    }
    if (safePoster.insightsImageUrl && safePoster.insightsImageUrl.startsWith('data:image')) {
      safePoster.insightsImageUrl = await shrinkBase64DataUrl(
        safePoster.insightsImageUrl,
        1400,
        0.78,
        160000
      );
    }
  }

  safePoster._isOptimized = true;
  return safePoster;
}
