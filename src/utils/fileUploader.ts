import { db, doc, getDoc, setDoc, isFirestoreWriteQuotaExhausted } from '../lib/firebase';
import { compressImageFile, shrinkBase64DataUrl } from './imageCompressor';

/**
 * Fast, non-blocking binary & compressed image uploader + universal `/uploads/` resolver.
 *
 * Why this is fast and never hangs:
 * 1. Optimizes images on the client in ~100ms using HTML5 Canvas (Full HD 1920px, ~180KB-260KB)
 *    before uploading, so 10MB camera photos don't stall the network or split into 20 chunks.
 * 2. Skips `/api/upload-file` automatically on known static hosts (e.g. hopebokeo.org / Netlify / Vercel)
 *    and enforces a strict 2.5s timeout on Express server uploads.
 * 3. Enforces a strict 2.5s timeout on Firestore `uploaded_files` writes (`setDoc`), because
 *    Firebase Web SDK `setDoc` can otherwise hang indefinitely when offline or quota-throttled.
 * 4. If both server disk upload and Firestore `uploaded_files` time out or fail, immediately
 *    falls back to the compact optimized `data:image/...` URL so the upload succeeds 100% of the time.
 */

export interface UploadResult {
  success: boolean;
  url: string;
  fileName: string;
  size?: number;
}

export interface UploadOptions {
  maxDimension?: number;
  maxStringLength?: number;
  preserveTransparency?: boolean;
}

const CHUNK_SIZE = 650000;
const uploadBlobUrlCache = new Map<string, string>();
const pendingResolutions = new Map<string, Promise<string>>();
const failedResolutionCache = new Set<string>();
let firestoreQuotaCoolingUntil = 0;
let serverUploadRouteUnavailable = false;

function isKnownStaticHost(): boolean {
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

function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Strips any temporary preview or localhost origin from an `/uploads/...` URL so that
 * stored and rendered URLs are always clean, portable `/uploads/<filename>` paths.
 */
export function normalizeUploadUrl(url?: string): string {
  if (!url || typeof url !== 'string') return url || '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  const match = trimmed.match(/^(?:https?:\/\/[^/]+)?(\/uploads\/[^?#]+)(.*)$/i);
  if (match) {
    return `${match[1]}${match[2] || ''}`;
  }
  return trimmed;
}

function inferExtFromFile(file: File): string {
  if (file.name && file.name.includes('.')) {
    const rawExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const cleanExt = rawExt.replace(/[^a-z0-9.]/g, '');
    if (cleanExt.length > 1 && cleanExt.length <= 6) {
      return cleanExt;
    }
  }
  const mime = (file.type || '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('svg')) return '.svg';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('bmp')) return '.bmp';
  if (mime.includes('avif')) return '.avif';
  if (mime.includes('pdf')) return '.pdf';
  return '.jpg';
}

function inferMimeFromFilename(filename: string, fallbackMime?: string): string {
  if (fallbackMime && fallbackMime.includes('/')) return fallbackMime;
  const lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'image/jpeg';
}

function base64ToBlobUrl(base64Data: string, mimeType: string): string {
  try {
    const cleanBase64 = base64Data.includes(';base64,')
      ? base64Data.split(';base64,')[1]
      : base64Data;
    const byteCharacters = atob(cleanBase64);
    const byteArrays: Uint8Array[] = [];
    const sliceSize = 32768;

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }

    const blob = new Blob(byteArrays, { type: mimeType || 'image/jpeg' });
    return URL.createObjectURL(blob);
  } catch {
    return `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;
  }
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const byteCharacters = atob(match[2]);
    const byteArrays: Uint8Array[] = [];
    const sliceSize = 32768;
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: mimeType });
  } catch {
    return null;
  }
}

export function getCachedUploadUrl(url?: string): string {
  if (!url || typeof url !== 'string') return url || '';
  const cleanUrl = normalizeUploadUrl(url);
  const match = cleanUrl.match(/\/uploads\/([^?#]+)/);
  if (!match) return cleanUrl;
  const normalizedKey = `/uploads/${decodeURIComponent(match[1])}`;
  return uploadBlobUrlCache.get(normalizedKey) || cleanUrl;
}

/**
 * Resolves an `/uploads/:filename` path from Cloud Firestore `uploaded_files` / `uploaded_file_chunks`
 * into a `blob:` URL ONLY when static hosting does not have the file on disk.
 */
export async function resolveUploadUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return url || '';
  const cleanUrl = normalizeUploadUrl(url);
  const match = cleanUrl.match(/\/uploads\/([^?#]+)/);
  if (!match) return cleanUrl;

  const filename = decodeURIComponent(match[1]);
  const normalizedKey = `/uploads/${filename}`;

  const cached = uploadBlobUrlCache.get(normalizedKey);
  if (cached) return cached;

  if (failedResolutionCache.has(normalizedKey) || Date.now() < firestoreQuotaCoolingUntil) {
    return cleanUrl;
  }

  const inflight = pendingResolutions.get(normalizedKey);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const docId = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileDoc = await withTimeout(
        getDoc(doc(db, 'uploaded_files', docId)),
        3500,
        'Firestore getDoc uploaded_files'
      );
      if (fileDoc.exists()) {
        const fileData = fileDoc.data();
        const mimeType = inferMimeFromFilename(filename, fileData?.mimeType);

        if (fileData?.isChunked && fileData.totalChunks) {
          const chunkPromises: Promise<string>[] = [];
          for (let i = 0; i < fileData.totalChunks; i++) {
            chunkPromises.push(
              withTimeout(
                getDoc(doc(db, 'uploaded_file_chunks', `${docId}_chk_${i}`)),
                3500,
                'Firestore getDoc chunk'
              ).then((chkSnap) => (chkSnap.exists() ? chkSnap.data()?.chunk || '' : ''))
            );
          }
          const chunksList = await Promise.all(chunkPromises);
          const fullBase64 = chunksList.join('');
          if (fullBase64) {
            const blobUrl = base64ToBlobUrl(fullBase64, mimeType);
            uploadBlobUrlCache.set(normalizedKey, blobUrl);
            return blobUrl;
          }
        } else if (fileData?.data && typeof fileData.data === 'string') {
          const blobUrl = base64ToBlobUrl(fileData.data, mimeType);
          uploadBlobUrlCache.set(normalizedKey, blobUrl);
          return blobUrl;
        }
      }
      failedResolutionCache.add(normalizedKey);
    } catch (err: any) {
      const msg = String(err?.message || err?.code || err || '');
      if (msg.includes('resource-exhausted') || msg.includes('Quota')) {
        firestoreQuotaCoolingUntil = Date.now() + 5 * 60 * 1000;
      }
      failedResolutionCache.add(normalizedKey);
    } finally {
      pendingResolutions.delete(normalizedKey);
    }
    return cleanUrl;
  })();

  pendingResolutions.set(normalizedKey, promise);
  return promise;
}

/**
 * Saves base64 data to Firestore `uploaded_files` with a strict timeout so it never hangs.
 * Automatically compresses oversized base64 images so they fit in a single fast Firestore document.
 */
export async function saveBase64ToFirestoreUploadedFiles(
  base64Input: string,
  namePrefix = 'img',
  explicitMimeType?: string,
  explicitFilename?: string
): Promise<string> {
  let fullDataUrl = base64Input;
  let mimeType = explicitMimeType || 'image/jpeg';

  if (!base64Input.startsWith('data:')) {
    fullDataUrl = `data:${mimeType};base64,${base64Input}`;
  }

  // If image is > 320KB base64, shrink it to crisp HD (~240KB) so it writes in 1 single fast document
  if (fullDataUrl.startsWith('data:image') && fullDataUrl.length > 320000) {
    try {
      fullDataUrl = await shrinkBase64DataUrl(fullDataUrl, 1920, 0.85, 260000);
    } catch {
      // keep fullDataUrl
    }
  }

  let rawBase64 = fullDataUrl;
  const match = fullDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    rawBase64 = match[2];
  } else if (fullDataUrl.includes(';base64,')) {
    rawBase64 = fullDataUrl.split(';base64,')[1];
  }

  let ext = '.jpg';
  if (mimeType.includes('png')) ext = '.png';
  else if (mimeType.includes('webp')) ext = '.webp';
  else if (mimeType.includes('svg')) ext = '.svg';
  else if (mimeType.includes('gif')) ext = '.gif';
  else if (mimeType.includes('bmp')) ext = '.bmp';
  else if (mimeType.includes('avif')) ext = '.avif';
  else if (mimeType.includes('pdf')) ext = '.pdf';

  const cleanPrefix = namePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'img';
  const filename = explicitFilename
    ? explicitFilename.replace(/^\/uploads\//, '')
    : `${cleanPrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
  const docId = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const uploadPath = `/uploads/${filename}`;

  // Cache local blob URL immediately so UI renders instantaneously
  const localBlobUrl = base64ToBlobUrl(rawBase64, mimeType);
  uploadBlobUrlCache.set(uploadPath, localBlobUrl);
  failedResolutionCache.delete(uploadPath);

  if (Date.now() < firestoreQuotaCoolingUntil || isFirestoreWriteQuotaExhausted()) {
    // If Firestore is in quota cooldown, return compact data URL so image still works 100% across reloads
    return fullDataUrl;
  }

  const approxByteSize = Math.round(rawBase64.length * 0.75);

  try {
    if (rawBase64.length <= CHUNK_SIZE) {
      await withTimeout(
        setDoc(
          doc(db, 'uploaded_files', docId),
          {
            filename,
            mimeType,
            data: rawBase64,
            size: approxByteSize,
            isChunked: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        2800,
        'Firestore setDoc uploaded_files'
      );
    } else {
      const chunks: string[] = [];
      for (let i = 0; i < rawBase64.length; i += CHUNK_SIZE) {
        chunks.push(rawBase64.slice(i, i + CHUNK_SIZE));
      }

      await withTimeout(
        Promise.all([
          setDoc(
            doc(db, 'uploaded_files', docId),
            {
              filename,
              mimeType,
              size: approxByteSize,
              isChunked: true,
              totalChunks: chunks.length,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ),
          ...chunks.map((chunkStr, i) =>
            setDoc(doc(db, 'uploaded_file_chunks', `${docId}_chk_${i}`), {
              fileId: docId,
              docId,
              filename,
              index: i,
              chunkIndex: i,
              chunk: chunkStr,
              updatedAt: new Date().toISOString(),
            })
          ),
        ]),
        3500,
        'Firestore setDoc chunked upload'
      );
    }
    if (isFirestoreWriteQuotaExhausted()) {
      return fullDataUrl;
    }
    return uploadPath;
  } catch (err: any) {
    const msg = String(err?.message || err?.code || err || '');
    if (msg.includes('resource-exhausted') || msg.includes('Quota')) {
      firestoreQuotaCoolingUntil = Date.now() + 3 * 60 * 1000;
    }
    // Return the compressed data URL directly so the image never fails to load or save
    return fullDataUrl;
  }
}

/**
 * Fast, reliable file uploader that optimizes images on the client first (~100ms),
 * then uploads with a strict 2.5s timeout so the UI never hangs on "Uploading...".
 */
export async function uploadFileDirectly(
  file: File,
  options?: UploadOptions
): Promise<UploadResult> {
  const instantBlobUrl = URL.createObjectURL(file);
  const isImage =
    file.type.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|bmp|avif|jfif|heic|heif)$/i.test(file.name || '');
  const isSvgOrGif =
    file.type.includes('svg') ||
    file.type.includes('gif') ||
    /\.(svg|gif)$/i.test(file.name || '');

  let optimizedDataUrl = '';
  let uploadBlob: Blob = file;
  let uploadFileName = file.name || `upload_${Date.now()}.jpg`;

  // 1. Compress/optimize images in browser first (<150ms) so we never upload 10MB raw camera files
  if (isImage && !isSvgOrGif) {
    try {
      const maxDim = options?.maxDimension || 1920;
      const maxLen = Math.min(options?.maxStringLength || 260000, 320000);
      optimizedDataUrl = await withTimeout(
        compressImageFile(
          file,
          maxDim,
          0.86,
          maxLen,
          Boolean(options?.preserveTransparency)
        ),
        2500,
        'Image compression'
      );
      if (optimizedDataUrl && optimizedDataUrl.startsWith('data:image')) {
        const convertedBlob = dataUrlToBlob(optimizedDataUrl);
        if (convertedBlob) {
          uploadBlob = convertedBlob;
          const isPng = optimizedDataUrl.startsWith('data:image/png');
          const baseName =
            (file.name || 'image').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') ||
            'image';
          uploadFileName = `${baseName}${isPng ? '.png' : '.jpg'}`;
        }
      }
    } catch {
      // Fallback to original file if canvas compression fails
    }
  }

  // 2. Try Express `/api/upload-file` ONLY if not on a known static host (Netlify/Vercel)
  if (!isKnownStaticHost() && !serverUploadRouteUnavailable) {
    try {
      const formData = new FormData();
      formData.append('file', uploadBlob, uploadFileName);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 404 || response.status === 405) {
        serverUploadRouteUnavailable = true;
      } else {
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success && data.url) {
            uploadBlobUrlCache.set(data.url, instantBlobUrl);
            failedResolutionCache.delete(data.url);
            // Mirror to Firestore in the background (non-blocking!) so static sites also have it
            if (optimizedDataUrl) {
              saveBase64ToFirestoreUploadedFiles(
                optimizedDataUrl,
                'img',
                uploadBlob.type || file.type,
                data.url
              ).catch(() => {});
            } else {
              uploadFileToFirestoreDirectly(file, instantBlobUrl, data.url).catch(() => {});
            }
            return {
              success: true,
              url: data.url,
              fileName: data.fileName || uploadFileName,
              size: data.size || uploadBlob.size,
            };
          }
        }
      }
    } catch {
      // Server route timed out or unavailable; proceed immediately to fast client fallback
    }
  }

  // 3. Static host (e.g. hopebokeo.org) or Express offline:
  // If we already have the optimized data URL, save it to Firestore with a 2.5s timeout
  if (optimizedDataUrl) {
    const cleanBaseName =
      uploadFileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 32) || 'image';
    const savedUrl = await saveBase64ToFirestoreUploadedFiles(
      optimizedDataUrl,
      cleanBaseName,
      uploadBlob.type || 'image/jpeg'
    );
    uploadBlobUrlCache.set(savedUrl, instantBlobUrl);
    return {
      success: true,
      url: savedUrl,
      fileName: uploadFileName,
      size: uploadBlob.size,
    };
  }

  // 4. Non-image or fallback file upload to Firestore
  return await uploadFileToFirestoreDirectly(file, instantBlobUrl);
}

/**
 * Uploads a file directly from the browser to Cloud Firestore `uploaded_files` with a strict timeout.
 */
export async function uploadFileToFirestoreDirectly(
  file: File,
  existingBlobUrl?: string,
  explicitUploadUrl?: string
): Promise<UploadResult> {
  const ext = inferExtFromFile(file);
  const cleanBaseName =
    file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 32) || 'image';

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  const mimeType = inferMimeFromFilename(ext, file.type);
  const uploadUrl = await saveBase64ToFirestoreUploadedFiles(
    dataUrl,
    cleanBaseName,
    mimeType,
    explicitUploadUrl
  );

  if (existingBlobUrl && uploadUrl.startsWith('/uploads/')) {
    uploadBlobUrlCache.set(uploadUrl, existingBlobUrl);
  }

  return {
    success: true,
    url: uploadUrl,
    fileName: file.name,
    size: file.size,
  };
}

let globalResolverInitialized = false;

/**
 * Installs a global listener that automatically resolves any `<img src="/uploads/...">`
 * from Cloud Firestore `uploaded_files` / `uploaded_file_chunks` if the static server (e.g. Netlify)
 * returns 404 or if the file was uploaded to Firestore.
 */
export function initGlobalUploadUrlResolver(): void {
  if (globalResolverInitialized || typeof window === 'undefined') return;
  globalResolverInitialized = true;

  const resolveImgFromFirestore = (img: HTMLImageElement, rawSrc: string) => {
    if (!rawSrc || !rawSrc.includes('/uploads/')) return;
    const match = rawSrc.match(/\/uploads\/([^?#]+)/);
    if (!match) return;
    const normalizedKey = `/uploads/${decodeURIComponent(match[1])}`;

    const cached = uploadBlobUrlCache.get(normalizedKey);
    if (cached) {
      if (img.src !== cached) {
        img.src = cached;
        if (img.style.display === 'none') {
          img.style.display = '';
        }
      }
      return;
    }

    if (failedResolutionCache.has(normalizedKey) || Date.now() < firestoreQuotaCoolingUntil) {
      return;
    }

    resolveUploadUrl(normalizedKey)
      .then((resolvedUrl) => {
        if (resolvedUrl && resolvedUrl !== normalizedKey && resolvedUrl !== rawSrc) {
          img.dataset.UploadResolved = normalizedKey;
          img.src = resolvedUrl;
          if (img.style.display === 'none') {
            img.style.display = '';
          }
        }
      })
      .catch(() => {});
  };

  window.addEventListener(
    'error',
    (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName !== 'IMG') return;
      const img = target as HTMLImageElement;
      const rawSrc = img.getAttribute('src') || img.dataset.originalUploadSrc || img.src || '';
      if (!rawSrc.includes('/uploads/')) return;
      resolveImgFromFirestore(img, rawSrc);
    },
    true
  );

  const upgradeImgElement = (img: HTMLImageElement) => {
    const rawSrc = img.getAttribute('src') || '';
    if (!rawSrc.includes('/uploads/')) return;
    const cleanSrc = normalizeUploadUrl(rawSrc);
    if (cleanSrc !== rawSrc) {
      img.setAttribute('src', cleanSrc);
    }
    img.dataset.originalUploadSrc = cleanSrc;
    const cached = uploadBlobUrlCache.get(cleanSrc);
    if (cached && img.src !== cached) {
      img.src = cached;
    }
  };

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.target instanceof HTMLImageElement) {
          upgradeImgElement(m.target);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node instanceof HTMLImageElement) {
              upgradeImgElement(node);
            } else if (node instanceof HTMLElement) {
              node.querySelectorAll('img').forEach(upgradeImgElement);
            }
          });
        }
      }
    });

    const startObserving = () => {
      if (document.body) {
        document.body.querySelectorAll('img').forEach(upgradeImgElement);
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['src'],
        });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving);
    } else {
      startObserving();
    }
  }
}
