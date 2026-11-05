import { db, doc, getDoc, setDoc } from '../lib/firebase';

/**
 * Fast direct binary file uploader & universal /uploads/ resolver.
 * Preserves 100% of the original uncompressed image bytes and quality.
 *
 * 1. Streams the file as multipart/form-data to /api/upload-file when running on the Express server.
 * 2. When on static hosting (e.g. Netlify, Vercel, GitHub Pages) or if the server route is unreachable,
 *    saves the full-resolution original binary data directly to Cloud Firestore in `uploaded_files`
 *    (and `uploaded_file_chunks` for files > 650KB so there is no size limit and zero compression).
 * 3. Automatically resolves `/uploads/:filename` URLs from Cloud Firestore into native `blob:` URLs
 *    whenever an `<img>` or background image requests an `/uploads/` file that isn't statically bundled.
 */

export interface UploadResult {
  success: boolean;
  url: string;
  fileName: string;
  size?: number;
}

const CHUNK_SIZE = 650000; // ~650KB base64 per chunk, well below Firestore's 1MB limit
const uploadBlobUrlCache = new Map<string, string>();
const pendingResolutions = new Map<string, Promise<string>>();
const failedResolutionCache = new Set<string>();
let firestoreQuotaCoolingUntil = 0;

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
 * into a 100% original-quality `blob:` URL ONLY when static hosting does not have the file on disk.
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
      const fileDoc = await getDoc(doc(db, 'uploaded_files', docId));
      if (fileDoc.exists()) {
        const fileData = fileDoc.data();
        const mimeType = inferMimeFromFilename(filename, fileData?.mimeType);

        if (fileData?.isChunked && fileData.totalChunks) {
          const chunkPromises: Promise<string>[] = [];
          for (let i = 0; i < fileData.totalChunks; i++) {
            chunkPromises.push(
              getDoc(doc(db, 'uploaded_file_chunks', `${docId}_chk_${i}`)).then((chkSnap) =>
                chkSnap.exists() ? chkSnap.data()?.chunk || '' : ''
              )
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
 * Saves raw base64 data (with or without `data:...;base64,` prefix) to Firestore `uploaded_files`
 * (and `uploaded_file_chunks` if > 650KB) with 100% original uncompressed bytes.
 */
export async function saveBase64ToFirestoreUploadedFiles(
  base64Input: string,
  namePrefix = 'img',
  explicitMimeType?: string,
  explicitFilename?: string
): Promise<string> {
  let mimeType = explicitMimeType || 'image/jpeg';
  let rawBase64 = base64Input;

  const match = base64Input.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    rawBase64 = match[2];
  } else if (base64Input.includes(';base64,')) {
    rawBase64 = base64Input.split(';base64,')[1];
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

  // Cache local blob URL immediately so UI renders instantaneously at 100% quality
  const localBlobUrl = base64ToBlobUrl(rawBase64, mimeType);
  uploadBlobUrlCache.set(uploadPath, localBlobUrl);

  const approxByteSize = Math.round(rawBase64.length * 0.75);

  if (rawBase64.length <= CHUNK_SIZE) {
    await setDoc(
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
    );
  } else {
    const chunks: string[] = [];
    for (let i = 0; i < rawBase64.length; i += CHUNK_SIZE) {
      chunks.push(rawBase64.slice(i, i + CHUNK_SIZE));
    }

    await setDoc(
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
    );

    await Promise.all(
      chunks.map((chunkStr, i) =>
        setDoc(doc(db, 'uploaded_file_chunks', `${docId}_chk_${i}`), {
          fileId: docId,
          docId,
          filename,
          index: i,
          chunkIndex: i,
          chunk: chunkStr,
          updatedAt: new Date().toISOString(),
        })
      )
    );
  }

  return uploadPath;
}

export async function uploadFileDirectly(file: File): Promise<UploadResult> {
  const instantBlobUrl = URL.createObjectURL(file);

  // 1. Try server endpoint first (Multipart binary stream - zero quality modification)
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.success && data.url) {
        uploadBlobUrlCache.set(data.url, instantBlobUrl);
        // Also ensure the file is persisted in client-side Cloud Firestore under the exact same /uploads/ filename
        // so that all other devices/deployments (e.g. Netlify) immediately resolve it in real time
        try {
          await uploadFileToFirestoreDirectly(file, instantBlobUrl, data.url);
        } catch (fsErr) {
          console.warn('Client Firestore mirror notice:', fsErr);
        }
        return {
          success: true,
          url: data.url,
          fileName: data.fileName || file.name,
          size: data.size || file.size,
        };
      }
    }
  } catch (backendErr) {
    console.warn(
      'Direct server upload route unavailable (static hosting), saving 100% original file to Cloud Firestore:',
      backendErr
    );
  }

  // 2. Client-side Cloud Firestore chunked upload fallback (Works 100% on Netlify, Vercel & GitHub Pages for ANY file size)
  return await uploadFileToFirestoreDirectly(file, instantBlobUrl);
}

/**
 * Uploads a file directly from the browser to Cloud Firestore `uploaded_files` (& `uploaded_file_chunks` if > 650KB).
 * Preserves 100% of the original uncompressed image bytes with no size limit.
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

  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const b64 = res.includes(';base64,') ? res.split(';base64,')[1] : res;
      resolve(b64);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  const mimeType = inferMimeFromFilename(ext, file.type);
  const uploadUrl = await saveBase64ToFirestoreUploadedFiles(
    base64Data,
    cleanBaseName,
    mimeType,
    explicitUploadUrl
  );

  if (existingBlobUrl) {
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

  // 1. Capture-phase error listener on <img> elements for `/uploads/...`
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

  // 2. Observer that normalizes any temporary preview host prefix (`https://ais-dev-.../uploads/...`)
  //    to a clean relative `/uploads/...` path and applies in-memory blob cache if present,
  //    without querying Firestore unless the static file fails to load.
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
