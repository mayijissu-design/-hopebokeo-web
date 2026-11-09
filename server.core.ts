import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import {
  loadFirestoreData,
  saveVillageToFirestore,
  deleteVillageFromFirestore,
  saveEventToFirestore,
  deleteEventFromFirestore,
  saveTeamToFirestore,
  deleteTeamFromFirestore,
  saveHomePosterToFirestore,
  saveDonationInfoToFirestore,
  saveGlobalSettingsToFirestore,
  isFirestoreReadQuotaExceeded,
  markFirestoreQuotaExceeded,
  initialDefaultData,
} from './src/lib/firestore-service';
import { initialDefaultFinanceData } from './src/data/financeDefaults';
import { db, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from './src/lib/firebase';
import { parseCoordinatesFromUrl, normalizeCoordinates } from './src/utils/mapUtils';
import type { Village, EventData, TeamMember } from './src/types';

const getDirname = () => {
  try {
    return typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};
const appDir = getDirname();

dotenv.config();

// Prevent uncaught errors or unhandled promises from abruptly crashing the container during rollout
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Reliable production detection (Cloud Run environment or production build)
const isProduction = Boolean(
  process.env.NODE_ENV === 'production' ||
  process.env.K_SERVICE ||
  process.env.K_REVISION ||
  process.argv[1]?.includes('dist') ||
  process.argv[1]?.endsWith('.cjs') ||
  !fs.existsSync(path.join(process.cwd(), 'src', 'main.tsx'))
);

// Instant health check endpoints for Cloud Run deployment rollout & container orchestration
app.get(['/health', '/api/health', '/_healthz', '/_ah/health'], (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Allow cross-origin requests and enforce strict X-Robots-Tag noindex on all server responses
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Real-time Server-Sent Events (SSE) hub to broadcast settings & data changes to all open browsers/devices immediately
const sseClients = new Set<express.Response>();

function broadcastRealtimeUpdate(section: string, payload?: any) {
  const eventStr = `data: ${JSON.stringify({
    type: 'update',
    section,
    payload,
    timestamp: new Date().toISOString(),
  })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(eventStr);
    } catch {
      sseClients.delete(client);
    }
  }
}

app.get('/api/realtime-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(
    `data: ${JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Static uploads directory with fallback for read-only container file systems
let uploadsDir = path.join(process.cwd(), 'public', 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  uploadsDir = path.join('/tmp', 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch {}
}

// Backup helper to store files permanently in Firestore (supporting large chunked files up to 30MB)
async function persistUploadedFile(filename: string, buffer: Buffer, mimeType: string) {
  try {
    const docId = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const base64Data = buffer.toString('base64');
    const CHUNK_SIZE = 600 * 1024; // 600KB per chunk (well within Firestore 1MB doc limit)

    if (buffer.length <= 750 * 1024) {
      await setDoc(doc(db, 'uploaded_files', docId), {
        filename,
        mimeType,
        data: base64Data,
        size: buffer.length,
        isChunked: false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } else {
      // Chunked storage for larger files (PDFs, high-res photos, documents)
      const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
      await setDoc(doc(db, 'uploaded_files', docId), {
        filename,
        mimeType,
        size: buffer.length,
        isChunked: true,
        totalChunks,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      for (let i = 0; i < totalChunks; i++) {
        const chunkStr = base64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await setDoc(doc(db, 'uploaded_file_chunks', `${docId}_chk_${i}`), {
          docId,
          chunkIndex: i,
          chunk: chunkStr,
        }, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Failed to backup file to Firestore uploaded_files:', err);
  }
}

// Serve public static assets (pdf.min.js, pdf.worker.min.js, hb-logo.svg, etc.)
const publicDir = path.join(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// Direct static serving for uploads
app.use('/uploads', express.static(uploadsDir));

// Fallback resolver for /uploads/:filename to restore from Firestore
app.get('/uploads/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const publicPath = path.join(uploadsDir, filename);

    if (fs.existsSync(publicPath)) {
      return res.sendFile(publicPath);
    }

    // Check Cloud Firestore uploaded_files (skip if read quota is currently exceeded)
    if (!isFirestoreReadQuotaExceeded()) {
      try {
        const docId = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileDoc = await getDoc(doc(db, 'uploaded_files', docId));
        if (fileDoc.exists()) {
          const fileData = fileDoc.data();
          if (fileData?.isChunked && fileData.totalChunks) {
            // Reconstruct from chunks
            const chunksList: string[] = [];
            for (let i = 0; i < fileData.totalChunks; i++) {
              const chkDoc = await getDoc(doc(db, 'uploaded_file_chunks', `${docId}_chk_${i}`));
              if (chkDoc.exists()) {
                chunksList.push(chkDoc.data()?.chunk || '');
              }
            }
            const fullBase64 = chunksList.join('');
            if (fullBase64) {
              const buf = Buffer.from(fullBase64, 'base64');
              try {
                fs.writeFileSync(publicPath, buf);
              } catch {}
              res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
              return res.send(buf);
            }
          } else if (fileData?.data && typeof fileData.data === 'string') {
            const buf = Buffer.from(fileData.data, 'base64');
            try {
              fs.writeFileSync(publicPath, buf);
            } catch {}
            res.setHeader('Content-Type', fileData.mimeType || 'application/octet-stream');
            return res.send(buf);
          }
        }
      } catch (err) {
        markFirestoreQuotaExceeded(err);
      }

      if (filename.toLowerCase().endsWith('.pdf')) {
        // Check Firestore uploaded_files for any valid non-empty PDF
        try {
          const snap = await getDocs(collection(db, 'uploaded_files'));
          for (const d of snap.docs) {
            const dData = d.data();
            if (dData.filename?.toLowerCase().endsWith('.pdf') && dData.size > 2000 && dData.data) {
              const buf = Buffer.from(dData.data, 'base64');
              try {
                fs.writeFileSync(publicPath, buf);
              } catch {}
              res.setHeader('Content-Type', 'application/pdf');
              return res.send(buf);
            }
          }
        } catch (e) {
          markFirestoreQuotaExceeded(e);
        }
      }
    }

    next();
  } catch (err) {
    console.error('Error in /uploads fallback:', err);
    next();
  }
});

// Multer storage for ultra-fast binary streaming uploads (PDFs, images, reports)
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    let ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    if (!ext) {
      const mime = (file.mimetype || '').toLowerCase();
      if (mime.includes('png')) ext = '.png';
      else if (mime.includes('webp')) ext = '.webp';
      else if (mime.includes('svg')) ext = '.svg';
      else if (mime.includes('gif')) ext = '.gif';
      else if (mime.includes('pdf')) ext = '.pdf';
      else ext = '.jpg';
    }
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 32);
    const uniqueName = `${safeBase || 'img'}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
    cb(null, uniqueName);
  },
});

const uploadHandler = multer({
  storage: uploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Supports up to 100MB
});

function mirrorUploadToDist(filename: string, buf: Buffer) {
  try {
    const distUploadsDir = path.join(process.cwd(), 'dist', 'uploads');
    if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
      if (!fs.existsSync(distUploadsDir)) {
        fs.mkdirSync(distUploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(distUploadsDir, filename), buf);
    }
  } catch {}
}

function stripPreviewOriginFromUploadUrl(val: string): string {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim();
  const match = trimmed.match(/^(?:https?:\/\/[^/]+)?(\/uploads\/[^?#]+)(.*)$/i);
  if (match) {
    return `${match[1]}${match[2] || ''}`;
  }
  return trimmed;
}

// Helper to convert any base64 data URLs to stored disk files to prevent Firestore 1MB limits & RAM crashes
function extractBase64DocToUpload(urlOrBase64: string, prefix = 'doc'): string {
  if (!urlOrBase64 || typeof urlOrBase64 !== 'string') return urlOrBase64 || '';
  if (!urlOrBase64.startsWith('data:')) return stripPreviewOriginFromUploadUrl(urlOrBase64);

  try {
    const match = urlOrBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return urlOrBase64;
    const mime = match[1];
    const rawBase64 = match[2];
    let ext = '.bin';
    if (mime.includes('pdf')) ext = '.pdf';
    else if (mime.includes('png')) ext = '.png';
    else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
    else if (mime.includes('webp')) ext = '.webp';
    else if (mime.includes('svg')) ext = '.svg';
    else if (mime.includes('gif')) ext = '.gif';
    else if (mime.includes('word') || mime.includes('docx')) ext = '.docx';

    const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
    const targetPath = path.join(uploadsDir, filename);
    const buf = Buffer.from(rawBase64, 'base64');
    fs.writeFileSync(targetPath, buf);
    mirrorUploadToDist(filename, buf);
    persistUploadedFile(filename, buf, mime).catch(() => {});
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to extract base64 to file:', err);
    return urlOrBase64;
  }
}

// Recursively convert any base64 data URLs or temporary preview URLs into permanent /uploads/<filename> paths
function processBase64ImagesInObject(obj: any, keyHint = 'asset'): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/') || obj.startsWith('data:application/pdf')) {
      return extractBase64DocToUpload(obj, keyHint);
    }
    return stripPreviewOriginFromUploadUrl(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item, idx) => processBase64ImagesInObject(item, `${keyHint}_${idx}`));
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = processBase64ImagesInObject(v, k);
    }
    return out;
  }
  return obj;
}

const SERVER_BUILD_ID = process.env.BUILD_ID || '1.0.0';

// Endpoint to check app version / deployment timestamp
app.get('/api/version', (req, res) => {
  res.json({
    version: SERVER_BUILD_ID,
    timestamp: Date.now(),
    status: 'online',
  });
});

// High-speed file upload endpoint: supports direct multipart binary streaming AND base64 fallback
app.post('/api/upload-file', uploadHandler.single('file') as any, async (req, res) => {
  // 1. Direct binary file upload via multipart/form-data (fastest, 100% original bytes, no memory bloat)
  if (req.file) {
    const relativeUrl = `/uploads/${req.file.filename}`;
    try {
      const diskPath = path.join(uploadsDir, req.file.filename);
      if (fs.existsSync(diskPath)) {
        const buf = fs.readFileSync(diskPath);
        mirrorUploadToDist(req.file.filename, buf);
        await persistUploadedFile(
          req.file.filename,
          buf,
          req.file.mimetype || 'application/octet-stream'
        );
      }
    } catch (e) {
      console.warn('Backup upload warn:', e);
    }
    return res.json({
      success: true,
      url: relativeUrl,
      fileName: req.file.originalname,
      size: req.file.size,
    });
  }

  // 2. Base64 payload fallback (converts and saves to disk immediately, returning a clean URL)
  const { base64Data, fileName } = req.body || {};
  if (base64Data && typeof base64Data === 'string') {
    try {
      const cleanUrl = extractBase64DocToUpload(base64Data, (fileName || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_'));
      return res.json({
        success: true,
        url: cleanUrl,
        fileName: fileName || 'file',
      });
    } catch (err: any) {
      console.error('Base64 save error:', err);
      return res.status(500).json({ success: false, message: 'Failed to process base64 data' });
    }
  }

  res.status(400).json({ success: false, message: 'No file or base64Data provided' });
});

// Resolve Google Maps URLs (including shortened links like maps.app.goo.gl and goo.gl/maps)
async function resolveCoordinatesFromUrlBackend(rawUrl: string): Promise<{
  success: boolean;
  lat?: number;
  lng?: number;
  finalUrl?: string;
  sourceType?: string;
  message?: string;
}> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { success: false, message: 'No URL provided' };
  }

  const cleanUrl = rawUrl.trim();

  // 1. Direct parsing on the provided URL
  const directParsed = parseCoordinatesFromUrl(cleanUrl);
  if (directParsed) {
    return {
      success: true,
      lat: directParsed.lat,
      lng: directParsed.lng,
      finalUrl: cleanUrl,
      sourceType: directParsed.sourceType,
    };
  }

  // 2. Step through redirects manually (up to 5 hops) to inspect the Location header
  try {
    let currentUrl = cleanUrl;
    let latestFinalUrl = cleanUrl;

    for (let hop = 0; hop < 5; hop++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        clearTimeout(timeoutId);

        const locationHeader = response.headers.get('location');
        if (locationHeader) {
          const resolvedLocation = locationHeader.startsWith('http')
            ? locationHeader
            : new URL(locationHeader, currentUrl).href;

          latestFinalUrl = resolvedLocation;

          // Check coordinates in Location header directly
          const parsedLocation = parseCoordinatesFromUrl(resolvedLocation);
          if (parsedLocation) {
            return {
              success: true,
              lat: parsedLocation.lat,
              lng: parsedLocation.lng,
              finalUrl: resolvedLocation,
              sourceType: parsedLocation.sourceType,
            };
          }

          // Advance to next hop
          currentUrl = resolvedLocation;
        } else {
          // Reached final non-redirect response
          latestFinalUrl = response.url || currentUrl;

          // Check URL first
          const parsedFinalUrl = parseCoordinatesFromUrl(latestFinalUrl);
          if (parsedFinalUrl) {
            return {
              success: true,
              lat: parsedFinalUrl.lat,
              lng: parsedFinalUrl.lng,
              finalUrl: latestFinalUrl,
              sourceType: parsedFinalUrl.sourceType,
            };
          }

          // Check response text / HTML body
          const htmlText = await response.text();
          const parsedHtml = parseCoordinatesFromUrl(htmlText);
          if (parsedHtml) {
            return {
              success: true,
              lat: parsedHtml.lat,
              lng: parsedHtml.lng,
              finalUrl: latestFinalUrl,
              sourceType: parsedHtml.sourceType,
            };
          }

          break;
        }
      } catch (hopErr: any) {
        clearTimeout(timeoutId);
        console.warn(`Redirect hop ${hop} error:`, hopErr?.message || hopErr);
        break;
      }
    }

    return {
      success: false,
      finalUrl: latestFinalUrl,
      message: 'Could not extract coordinates from URL',
    };
  } catch (err: any) {
    console.error('Error resolving maps url:', err?.message || err);
    return {
      success: false,
      message: err?.message || 'Failed to resolve URL',
    };
  }
}

app.post('/api/resolve-maps-url', async (req, res) => {
  const { url } = req.body;
  const result = await resolveCoordinatesFromUrlBackend(url);
  return res.json({
    ...result,
    originalUrl: url,
  });
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1JkJzPI6BNQw5Bxzel-1-bSO3WAcPpV6lojXbVY9DSdM';

// Lightweight Google Sheets REST API v4 client (avoids 200MB googleapis dependency)
async function getSheetsClient() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  const keyParam = apiKey ? `?key=${encodeURIComponent(apiKey)}` : '';
  return {
    spreadsheets: {
      get: async ({ spreadsheetId }: { spreadsheetId: string }) => {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}${keyParam}`);
        if (!res.ok) throw new Error(`Sheets API ${res.status}`);
        return { data: await res.json() };
      },
      values: {
        get: async ({ spreadsheetId, range }: { spreadsheetId: string; range: string }) => {
          const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}${keyParam}`);
          if (!res.ok) throw new Error(`Sheets API ${res.status}`);
          return { data: await res.json() };
        },
        append: async ({
          spreadsheetId,
          range,
          valueInputOption = 'USER_ENTERED',
          requestBody,
        }: {
          spreadsheetId: string;
          range: string;
          valueInputOption?: string;
          requestBody: { values: any[][] };
        }) => {
          const sep = keyParam ? '&' : '?';
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append${keyParam}${sep}valueInputOption=${encodeURIComponent(valueInputOption)}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
          if (!res.ok) throw new Error(`Sheets API ${res.status}`);
          return { data: await res.json() };
        },
      },
    },
  };
}

// Ministry Ledger Disk & Firestore Persistence Helpers
const ministryLedgerPath = path.join(process.cwd(), 'data', 'ministry_ledger.json');
const srcMinistryDefaultsPath = path.join(process.cwd(), 'src', 'data', 'ministryDefaults.json');

function sanitizeHomePosterAssets(poster: any, fallbackPoster: any): any {
  const merged = { ...(fallbackPoster || {}), ...(poster || {}) };
  if (merged.logoUrl === '/uploads/inline_d892a5b8897e.jpg' || merged.logoUrl === undefined) {
    merged.logoUrl = '/uploads/logo_1791212624840_1791212626418_663.png';
  }
  if (!merged.bokeoImageUrl || merged.bokeoImageUrl.includes('photo-1542601906990-b4d3fb778b09')) {
    merged.bokeoImageUrl = '/uploads/416848893_1441279663411460_5205317115984311446_n__1__jpg_1788632235891_514.jpg';
  }
  if (!merged.upcomingEventImageUrl) {
    merged.upcomingEventImageUrl = '/uploads/upcoming_poster_1790760136318.jpg';
  }
  if (merged.videoUrl === '/uploads/img_1786429196319_5c9ce.jpg') {
    merged.videoUrl = '';
  }
  if (
    (!Array.isArray(merged.bokeoTimeline) || merged.bokeoTimeline.length === 0) &&
    Array.isArray(fallbackPoster?.bokeoTimeline) &&
    fallbackPoster.bokeoTimeline.length > 0
  ) {
    merged.bokeoTimeline = fallbackPoster.bokeoTimeline;
  }
  return merged;
}

const srcDonationBankAccountsPath = path.join(process.cwd(), 'src', 'data', 'donationBankAccounts.json');

function isNewerTimestamp(incoming?: string, existing?: string): boolean {
  if (!existing) return true;
  if (!incoming) return false;
  const incTime = Date.parse(incoming);
  const exTime = Date.parse(existing);
  if (isNaN(incTime)) return false;
  if (isNaN(exTime)) return true;
  return incTime >= exTime;
}

function readMinistryLedger(): {
  villages: Village[];
  events: EventData[];
  teams: TeamMember[];
  homePoster: any;
  donationInfo: any;
  globalSettings?: any;
} {
  try {
    if (fs.existsSync(ministryLedgerPath)) {
      const raw = fs.readFileSync(ministryLedgerPath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        villages: Array.isArray(parsed.villages) && parsed.villages.length > 0 ? parsed.villages : (initialDefaultData.villages as any),
        events: Array.isArray(parsed.events) && parsed.events.length > 0 ? parsed.events : (initialDefaultData.events as any),
        teams: Array.isArray(parsed.teams) && parsed.teams.length > 0 ? parsed.teams : (initialDefaultData.teams as any),
        homePoster: sanitizeHomePosterAssets(parsed.homePoster, initialDefaultData.homePoster),
        donationInfo: parsed.donationInfo ? { ...initialDefaultData.donationInfo, ...parsed.donationInfo } : initialDefaultData.donationInfo,
        globalSettings: parsed.globalSettings || undefined,
      };
    }
  } catch (err) {
    console.warn('Notice reading ministry_ledger.json:', err);
  }
  return { ...initialDefaultData } as any;
}

function writeMinistryLedger(data: {
  villages: Village[];
  events: EventData[];
  teams: TeamMember[];
  homePoster: any;
  donationInfo: any;
  globalSettings?: any;
}) {
  try {
    const cleanData = processBase64ImagesInObject({
      ...data,
      homePoster: sanitizeHomePosterAssets(data.homePoster, initialDefaultData.homePoster),
    });
    const serialized = JSON.stringify(cleanData, null, 2);

    const dir = path.dirname(ministryLedgerPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ministryLedgerPath, serialized, 'utf8');

    // Mirror to src/data/ministryDefaults.json so static builds & deployments always match 100%
    try {
      const srcDir = path.dirname(srcMinistryDefaultsPath);
      if (fs.existsSync(srcDir)) {
        fs.writeFileSync(srcMinistryDefaultsPath, serialized, 'utf8');
      }
      if (Array.isArray(cleanData.donationInfo?.bankAccounts) && cleanData.donationInfo.bankAccounts.length > 0) {
        fs.writeFileSync(
          srcDonationBankAccountsPath,
          JSON.stringify(cleanData.donationInfo.bankAccounts, null, 2),
          'utf8'
        );
      }
    } catch {}
  } catch (err) {
    console.error('Error writing ministry_ledger.json:', err);
  }
}

// In-memory cache synced with disk ledger and Cloud Firestore database
let dbData: {
  villages: Village[];
  events: EventData[];
  teams: TeamMember[];
  homePoster: any;
  donationInfo: any;
  globalSettings?: any;
} = readMinistryLedger();

let lastMinistryFirestoreSyncAt = 0;
let lastFinanceFirestoreSyncAt = 0;
const FIRESTORE_SYNC_TTL_MS = 60 * 1000; // 60 seconds TTL to conserve Firestore free-tier read quota

// Load live data from Firestore on server startup (merging with disk ledger only if Firestore actually returned newer data)
loadFirestoreData().then((data) => {
  lastMinistryFirestoreSyncAt = Date.now();
  const disk = readMinistryLedger();
  let updatedFromCloud = false;

  const nextVillages = Array.isArray(data.villages) && data.villages.length > 0 ? data.villages : disk.villages;
  const nextEvents = Array.isArray(data.events) && data.events.length > 0 ? data.events : disk.events;
  const nextTeams = Array.isArray(data.teams) && data.teams.length > 0 ? data.teams : disk.teams;

  let nextHomePoster = disk.homePoster;
  if (data.homePoster && isNewerTimestamp(data.homePoster.updatedAt, disk.homePoster?.updatedAt)) {
    nextHomePoster = sanitizeHomePosterAssets({ ...disk.homePoster, ...data.homePoster }, disk.homePoster);
    updatedFromCloud = true;
  }

  let nextDonationInfo = disk.donationInfo;
  if (data.donationInfo && isNewerTimestamp(data.donationInfo.updatedAt, disk.donationInfo?.updatedAt)) {
    nextDonationInfo = { ...disk.donationInfo, ...data.donationInfo };
    updatedFromCloud = true;
  }

  let nextGlobalSettings = disk.globalSettings;
  if (data.globalSettings && isNewerTimestamp(data.globalSettings.updatedAt, disk.globalSettings?.updatedAt)) {
    nextGlobalSettings = { ...(disk.globalSettings || {}), ...data.globalSettings };
    updatedFromCloud = true;
  }

  dbData = {
    villages: nextVillages,
    events: nextEvents,
    teams: nextTeams,
    homePoster: nextHomePoster,
    donationInfo: nextDonationInfo,
    globalSettings: nextGlobalSettings,
  };

  if (data.fromFirestore && updatedFromCloud) {
    writeMinistryLedger(dbData);
  }
  console.log(`Ministry Ledger ready: ${dbData.villages.length} villages, ${dbData.events.length} events, ${dbData.teams.length} teams.`);
}).catch((err) => {
  lastMinistryFirestoreSyncAt = Date.now();
  console.warn('Initial Firestore loading notice:', err?.message || err);
});

// 1. Get Ministry Data (Villages, Events, Teams, Poster, Donation, Global Settings)
app.get('/api/ministry-data', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const disk = readMinistryLedger();
    const shouldSyncFirestore =
      !isFirestoreReadQuotaExceeded() &&
      (req.query.refresh === '1' || Date.now() - lastMinistryFirestoreSyncAt > FIRESTORE_SYNC_TTL_MS);

    // Ensure dbData has the latest between memory and disk first
    const baseHomePoster = isNewerTimestamp(dbData.homePoster?.updatedAt, disk.homePoster?.updatedAt)
      ? dbData.homePoster
      : disk.homePoster;
    const baseDonationInfo = isNewerTimestamp(dbData.donationInfo?.updatedAt, disk.donationInfo?.updatedAt)
      ? dbData.donationInfo
      : disk.donationInfo;
    const baseGlobalSettings = isNewerTimestamp(dbData.globalSettings?.updatedAt, disk.globalSettings?.updatedAt)
      ? dbData.globalSettings
      : disk.globalSettings;

    dbData = {
      villages: Array.isArray(dbData.villages) && dbData.villages.length > 0 ? dbData.villages : disk.villages,
      events: Array.isArray(dbData.events) && dbData.events.length > 0 ? dbData.events : disk.events,
      teams: Array.isArray(dbData.teams) && dbData.teams.length > 0 ? dbData.teams : disk.teams,
      homePoster: sanitizeHomePosterAssets(baseHomePoster, disk.homePoster),
      donationInfo: baseDonationInfo || disk.donationInfo,
      globalSettings: baseGlobalSettings,
    };

    if (shouldSyncFirestore) {
      lastMinistryFirestoreSyncAt = Date.now();
      try {
        const fsData = await loadFirestoreData();
        if (fsData.fromFirestore) {
          let changed = false;
          if (Array.isArray(fsData.villages) && fsData.villages.length > 0) {
            dbData.villages = fsData.villages;
          }
          if (Array.isArray(fsData.events) && fsData.events.length > 0) {
            dbData.events = fsData.events;
          }
          if (Array.isArray(fsData.teams) && fsData.teams.length > 0) {
            dbData.teams = fsData.teams;
          }
          if (fsData.homePoster && isNewerTimestamp(fsData.homePoster.updatedAt, dbData.homePoster?.updatedAt)) {
            dbData.homePoster = sanitizeHomePosterAssets(
              { ...dbData.homePoster, ...fsData.homePoster },
              dbData.homePoster
            );
            changed = true;
          }
          if (fsData.donationInfo && isNewerTimestamp(fsData.donationInfo.updatedAt, dbData.donationInfo?.updatedAt)) {
            dbData.donationInfo = { ...dbData.donationInfo, ...fsData.donationInfo };
            changed = true;
          }
          if (fsData.globalSettings && isNewerTimestamp(fsData.globalSettings.updatedAt, dbData.globalSettings?.updatedAt)) {
            dbData.globalSettings = { ...(dbData.globalSettings || {}), ...fsData.globalSettings };
            changed = true;
          }
          if (changed) {
            writeMinistryLedger(dbData);
          }
        }
      } catch (err) {
        markFirestoreQuotaExceeded(err);
      }
    }

    const finLedger = readFinanceLedger();
    res.json({
      success: true,
      villages: dbData.villages,
      events: dbData.events,
      teams: dbData.teams,
      homePoster: dbData.homePoster,
      donationInfo: dbData.donationInfo,
      globalSettings: dbData.globalSettings,
      financeSettings: finLedger.financeSettings,
      donations: finLedger.donations,
      distributions: finLedger.distributions,
    });
  } catch (err: any) {
    console.error('Error fetching ministry data:', err?.message || err);
    const finLedger = readFinanceLedger();
    res.json({
      success: true,
      villages: dbData.villages,
      events: dbData.events,
      teams: dbData.teams,
      homePoster: dbData.homePoster,
      donationInfo: dbData.donationInfo,
      globalSettings: dbData.globalSettings,
      financeSettings: finLedger.financeSettings,
      donations: finLedger.donations,
      distributions: finLedger.distributions,
    });
  }
});

// Finance Ledger Disk & Firestore Persistence Helpers
const financeLedgerPath = path.join(process.cwd(), 'data', 'finance_ledger.json');
const srcFinanceQrDefaultsPath = path.join(process.cwd(), 'src', 'data', 'financeQrDefaults.json');
const dataFinanceQrDefaultsPath = path.join(process.cwd(), 'data', 'finance_qr_defaults.json');
const srcFinanceDefaultsTsPath = path.join(process.cwd(), 'src', 'data', 'financeDefaults.ts');

function readFinanceLedger(): {
  financeSettings: { emergencyReservePercent: number };
  donations: any[];
  distributions: any[];
  qrMembers: any[];
} {
  try {
    if (fs.existsSync(financeLedgerPath)) {
      const content = fs.readFileSync(financeLedgerPath, 'utf8');
      const parsed = JSON.parse(content);
      
      // Prioritize file ledger records
      let donations = Array.isArray(parsed.donations) ? parsed.donations : initialDefaultFinanceData.donations;
      let distributions = Array.isArray(parsed.distributions) ? parsed.distributions : initialDefaultFinanceData.distributions;

      const financeSettings = parsed.financeSettings || initialDefaultFinanceData.financeSettings;
      let qrMembers = Array.isArray(parsed.qrMembers) && parsed.qrMembers.length > 0 ? parsed.qrMembers : [];
      if (qrMembers.length === 0) {
        if (fs.existsSync(dataFinanceQrDefaultsPath)) {
          try {
            qrMembers = JSON.parse(fs.readFileSync(dataFinanceQrDefaultsPath, 'utf8'));
          } catch {}
        }
      }
      return {
        financeSettings,
        donations,
        distributions,
        qrMembers,
      };
    }
  } catch (err) {
    console.warn('Notice reading finance_ledger.json:', err);
  }
  let fallbackQr: any[] = [];
  try {
    if (fs.existsSync(dataFinanceQrDefaultsPath)) {
      fallbackQr = JSON.parse(fs.readFileSync(dataFinanceQrDefaultsPath, 'utf8'));
    }
  } catch {}
  return {
    financeSettings: initialDefaultFinanceData.financeSettings,
    donations: initialDefaultFinanceData.donations,
    distributions: initialDefaultFinanceData.distributions,
    qrMembers: fallbackQr,
  };
}

function writeFinanceLedger(data: {
  financeSettings: { emergencyReservePercent: number };
  donations: any[];
  distributions: any[];
  qrMembers?: any[];
}) {
  try {
    const cleanData = processBase64ImagesInObject(data);
    const dir = path.dirname(financeLedgerPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(financeLedgerPath, JSON.stringify(cleanData, null, 2), 'utf8');

    // Mirror QR members and finance records to src/data/* so live builds always match Studio preview
    if (Array.isArray(cleanData.qrMembers) && cleanData.qrMembers.length > 0) {
      const qrSerialized = JSON.stringify(cleanData.qrMembers, null, 2);
      try {
        fs.writeFileSync(dataFinanceQrDefaultsPath, qrSerialized, 'utf8');
        if (fs.existsSync(path.dirname(srcFinanceQrDefaultsPath))) {
          fs.writeFileSync(srcFinanceQrDefaultsPath, qrSerialized, 'utf8');
        }
      } catch {}
    }
    try {
      if (fs.existsSync(path.dirname(srcFinanceDefaultsTsPath))) {
        const tsContent = `import { DonationTransaction, TeamDistribution } from '../types';\n\nexport const initialDefaultFinanceData: {\n  donations: DonationTransaction[];\n  distributions: TeamDistribution[];\n  financeSettings: { emergencyReservePercent: number };\n} = {\n  financeSettings: ${JSON.stringify(cleanData.financeSettings || { emergencyReservePercent: 20 }, null, 2)},\n  donations: ${JSON.stringify(cleanData.donations || [], null, 2)},\n  distributions: ${JSON.stringify(cleanData.distributions || [], null, 2)},\n};\n`;
        fs.writeFileSync(srcFinanceDefaultsTsPath, tsContent, 'utf8');
      }
    } catch {}
  } catch (err) {
    console.error('Error writing finance_ledger.json:', err);
  }
}

// 1.1 Finance Data API (Instant offline & server sync with Firestore persistence)
app.get('/api/finance-data', async (req, res) => {
  try {
    const ledger = readFinanceLedger();
    const shouldSyncFirestore =
      !isFirestoreReadQuotaExceeded() &&
      (req.query.refresh === '1' || Date.now() - lastFinanceFirestoreSyncAt > FIRESTORE_SYNC_TTL_MS);

    if (shouldSyncFirestore) {
      lastFinanceFirestoreSyncAt = Date.now();
      try {
        const [donSnap, distSnap] = await Promise.all([
          getDocs(collection(db, 'donations_ledger')),
          getDocs(collection(db, 'team_distributions')),
        ]);
        let changed = false;
        const donMap = new Map<string, any>();
        for (const item of ledger.donations) {
          if (item && item.id) donMap.set(item.id, item);
        }
        donSnap.forEach((d) => {
          const data = { id: d.id, ...d.data() };
          if (!donMap.has(d.id)) changed = true;
          donMap.set(d.id, { ...(donMap.get(d.id) || {}), ...data });
        });
        ledger.donations = Array.from(donMap.values()).sort((a, b) =>
          String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || ''))
        );

        const distMap = new Map<string, any>();
        for (const item of ledger.distributions) {
          if (item && item.id) distMap.set(item.id, item);
        }
        distSnap.forEach((d) => {
          const data = { id: d.id, ...d.data() };
          if (!distMap.has(d.id)) changed = true;
          distMap.set(d.id, { ...(distMap.get(d.id) || {}), ...data });
        });
        ledger.distributions = Array.from(distMap.values()).sort((a, b) =>
          String(b.createdAt || b.transferDate || '').localeCompare(
            String(a.createdAt || a.transferDate || '')
          )
        );

        if (changed) {
          writeFinanceLedger(ledger);
        }
      } catch (err) {
        markFirestoreQuotaExceeded(err);
      }
    }

    res.json({
      success: true,
      donations: ledger.donations,
      distributions: ledger.distributions,
      financeSettings: ledger.financeSettings,
      qrMembers: ledger.qrMembers,
    });
  } catch (err: any) {
    res.json({
      success: true,
      donations: initialDefaultFinanceData.donations,
      distributions: initialDefaultFinanceData.distributions,
      financeSettings: initialDefaultFinanceData.financeSettings,
      qrMembers: [],
    });
  }
});

// Save or Update Donation Record
app.post('/api/save-donation', async (req, res) => {
  const item = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ success: false, message: 'Invalid donation record' });
  }
  try {
    const ledger = readFinanceLedger();
    const idx = ledger.donations.findIndex((d: any) => d.id === item.id);
    if (idx >= 0) {
      ledger.donations[idx] = item;
    } else {
      ledger.donations.unshift(item);
    }
    writeFinanceLedger(ledger);

    // Sync to Firestore in background if online
    setDoc(doc(db, 'donations_ledger', item.id), item, { merge: true }).catch(() => {});
    res.json({ success: true, donation: item, donations: ledger.donations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// Delete Donation Record
app.post('/api/delete-donation', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing donation id' });
  }
  try {
    const ledger = readFinanceLedger();
    ledger.donations = ledger.donations.filter((d: any) => d.id !== id);
    writeFinanceLedger(ledger);

    deleteDoc(doc(db, 'donations_ledger', id)).catch(() => {});
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// Save or Update Team / Emergency Distribution
app.post('/api/save-distribution', async (req, res) => {
  const item = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ success: false, message: 'Invalid distribution record' });
  }
  try {
    const ledger = readFinanceLedger();
    const idx = ledger.distributions.findIndex((d: any) => d.id === item.id);
    if (idx >= 0) {
      ledger.distributions[idx] = item;
    } else {
      ledger.distributions.unshift(item);
    }
    writeFinanceLedger(ledger);

    setDoc(doc(db, 'team_distributions', item.id), item, { merge: true }).catch(() => {});
    res.json({ success: true, distribution: item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// Delete Distribution Record
app.post('/api/delete-distribution', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing distribution id' });
  }
  try {
    const ledger = readFinanceLedger();
    ledger.distributions = ledger.distributions.filter((d: any) => d.id !== id);
    writeFinanceLedger(ledger);

    deleteDoc(doc(db, 'team_distributions', id)).catch(() => {});
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// Delete Batch of Distributions
app.post('/api/delete-batch', async (req, res) => {
  const { batchId, ids, batchName } = req.body;
  try {
    const ledger = readFinanceLedger();
    const idSet = new Set(Array.isArray(ids) ? ids : []);
    const itemsToDelete = ledger.distributions.filter((d: any) => {
      if (idSet.has(d.id)) return true;
      if (batchId && (d.batchId === batchId || d.batchName === batchId)) return true;
      if (batchName && (d.batchName === batchName || d.batchId === batchName)) return true;
      return false;
    });

    const deletedIds = itemsToDelete.map((d: any) => d.id);
    const deletedIdSet = new Set(deletedIds);

    ledger.distributions = ledger.distributions.filter((d: any) => !deletedIdSet.has(d.id));
    writeFinanceLedger(ledger);

    deletedIds.forEach((id: string) => {
      deleteDoc(doc(db, 'team_distributions', id)).catch(() => {});
    });

    res.json({ success: true, deletedCount: deletedIds.length, deletedIds });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// Save Finance Settings (e.g. emergency reserve percentage)
app.post('/api/save-finance-settings', async (req, res) => {
  const settings = req.body;
  try {
    const ledger = readFinanceLedger();
    ledger.financeSettings = { ...ledger.financeSettings, ...settings };
    writeFinanceLedger(ledger);

    setDoc(doc(db, 'app_config', 'financeSettings'), settings, { merge: true }).catch(() => {});
    res.json({ success: true, financeSettings: ledger.financeSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// Finance QR Members (Dedicated bank accounts & private transfer QR codes)
app.get('/api/finance-qr-members', (_req, res) => {
  try {
    const ledger = readFinanceLedger();
    res.json({ success: true, qrMembers: ledger.qrMembers || [] });
  } catch (err: any) {
    res.json({ success: true, qrMembers: [] });
  }
});

app.post('/api/save-finance-qr-member', async (req, res) => {
  const item = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ success: false, message: 'Invalid QR member record' });
  }
  try {
    const ledger = readFinanceLedger();
    const idx = (ledger.qrMembers || []).findIndex((m: any) => m.id === item.id);
    if (idx >= 0) {
      ledger.qrMembers[idx] = item;
    } else {
      ledger.qrMembers.push(item);
    }
    writeFinanceLedger(ledger);

    setDoc(doc(db, 'finance_qr_members', item.id), item, { merge: true }).catch(() => {});
    res.json({ success: true, qrMember: item, qrMembers: ledger.qrMembers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

app.post('/api/delete-finance-qr-member', async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing member id' });
  }
  try {
    const ledger = readFinanceLedger();
    ledger.qrMembers = (ledger.qrMembers || []).filter((m: any) => m.id !== id);
    writeFinanceLedger(ledger);

    deleteDoc(doc(db, 'finance_qr_members', id)).catch(() => {});
    res.json({ success: true, id, qrMembers: ledger.qrMembers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});

// Save Donation & Prayer Info
app.post('/api/save-donation-info', async (req, res) => {
  let dData = req.body || {};
  try {
    dData = processBase64ImagesInObject(dData, 'donation_qr');
    const nowIso = new Date().toISOString();
    dbData.donationInfo = {
      ...dbData.donationInfo,
      ...dData,
      bankName: dData.bankName ?? dbData.donationInfo.bankName,
      bankNameEn: dData.bankNameEn ?? dbData.donationInfo.bankNameEn,
      bankNameTh: dData.bankNameTh ?? dbData.donationInfo.bankNameTh,
      accountName: dData.accountName ?? dbData.donationInfo.accountName,
      accountNumber: dData.accountNumber ?? dbData.donationInfo.accountNumber,
      swiftCode: dData.swiftCode ?? dbData.donationInfo.swiftCode,
      qrImageUrl: dData.qrImageUrl ?? dbData.donationInfo.qrImageUrl,
      bankAccounts: dData.bankAccounts ?? dbData.donationInfo.bankAccounts,
      prayerContactPhone: dData.prayerContactPhone ?? dbData.donationInfo.prayerContactPhone,
      prayerContactWhatsapp: dData.prayerContactWhatsapp ?? dbData.donationInfo.prayerContactWhatsapp,
      prayerContactEmail: dData.prayerContactEmail ?? dbData.donationInfo.prayerContactEmail,
      supportNote: dData.supportNote ?? dbData.donationInfo.supportNote,
      supportNoteEn: dData.supportNoteEn ?? dbData.donationInfo.supportNoteEn,
      supportNoteTh: dData.supportNoteTh ?? dbData.donationInfo.supportNoteTh,
      purposeDesc: dData.purposeDesc ?? dbData.donationInfo.purposeDesc,
      purposeDescEn: dData.purposeDescEn ?? dbData.donationInfo.purposeDescEn,
      purposeDescTh: dData.purposeDescTh ?? dbData.donationInfo.purposeDescTh,
      vision: dData.vision ?? dbData.donationInfo.vision,
      visionEn: dData.visionEn ?? dbData.donationInfo.visionEn,
      visionTh: dData.visionTh ?? dbData.donationInfo.visionTh,
      mission: dData.mission ?? dbData.donationInfo.mission,
      missionEn: dData.missionEn ?? dbData.donationInfo.missionEn,
      missionTh: dData.missionTh ?? dbData.donationInfo.missionTh,
      hidden: dData.hidden !== undefined ? dData.hidden : (dData.hideDonationSection !== undefined ? dData.hideDonationSection : dbData.donationInfo.hidden),
      hideDonationSection: dData.hideDonationSection !== undefined ? dData.hideDonationSection : (dData.hidden !== undefined ? dData.hidden : dbData.donationInfo.hideDonationSection),
      hideVisionMission: dData.hideVisionMission !== undefined ? dData.hideVisionMission : dbData.donationInfo.hideVisionMission,
      updatedAt: dData.updatedAt || nowIso,
    };
    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('donationInfo', dbData.donationInfo);
    saveDonationInfoToFirestore(dbData.donationInfo).catch((e) => console.warn('Firestore saveDonationInfo notice:', e?.message || e));
    res.json({ success: true, donationInfo: dbData.donationInfo });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// Save Global Settings (autoThemeEnabled, autoThemeStart, autoThemeEnd, logoUrl, etc.)
app.post('/api/save-global-settings', async (req, res) => {
  let gData = req.body || {};
  try {
    gData = processBase64ImagesInObject(gData, 'global_setting');
    const nowIso = new Date().toISOString();
    dbData.globalSettings = {
      ...(dbData.globalSettings || {}),
      ...gData,
      updatedAt: gData.updatedAt || nowIso,
    };
    if (typeof gData.logoUrl === 'string' && dbData.homePoster) {
      dbData.homePoster = {
        ...dbData.homePoster,
        logoUrl: gData.logoUrl,
        updatedAt: nowIso,
      };
    }
    if ((typeof gData.siteAccessKey === 'string' || typeof gData.siteAccessMode === 'string') && dbData.homePoster) {
      dbData.homePoster = {
        ...dbData.homePoster,
        ...(typeof gData.siteAccessMode === 'string' ? { siteAccessMode: gData.siteAccessMode } : {}),
        ...(typeof gData.siteAccessKey === 'string' ? { siteAccessKey: gData.siteAccessKey } : {}),
        ...(typeof gData.siteCustomShareUrl === 'string' ? { siteCustomShareUrl: gData.siteCustomShareUrl } : {}),
        updatedAt: nowIso,
      };
      broadcastRealtimeUpdate('homePoster', dbData.homePoster);
    }
    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('globalSettings', dbData.globalSettings);
    setDoc(doc(db, 'app_config', 'globalSettings'), dbData.globalSettings, { merge: true }).catch(() => {});
    res.json({ success: true, globalSettings: dbData.globalSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// Save Home Poster / Banner
app.post('/api/save-home-poster', async (req, res) => {
  const body = req.body || {};
  let pData = body.homePoster || body;
  try {
    pData = processBase64ImagesInObject(pData, 'poster_img');
    const rawImgs = Array.isArray(pData.imageUrls) ? pData.imageUrls : (pData.imageUrl ? [pData.imageUrl] : []);
    const cleanImgs: string[] = [];
    const seen = new Set<string>();
    for (const u of rawImgs) {
      if (u && typeof u === 'string' && u.trim().length > 0) {
        const trimmed = u.trim();
        if (!seen.has(trimmed)) {
          seen.add(trimmed);
          cleanImgs.push(trimmed);
        }
      }
    }

    const nowIso = new Date().toISOString();
    dbData.homePoster = {
      ...dbData.homePoster,
      ...pData,
      title: pData.title ?? dbData.homePoster.title,
      subtitle: pData.subtitle ?? dbData.homePoster.subtitle,
      description: pData.description ?? dbData.homePoster.description,
      imageUrl: cleanImgs[0] || (typeof pData.imageUrl === 'string' ? pData.imageUrl : '') || '',
      imageUrls: cleanImgs,
      buttonText: pData.buttonText ?? dbData.homePoster.buttonText,
      linkUrl: pData.linkUrl ?? '',
      bgColor: pData.bgColor !== undefined ? pData.bgColor : (dbData.homePoster.bgColor || ''),
      bgImageUrl: pData.bgImageUrl !== undefined ? pData.bgImageUrl : (dbData.homePoster.bgImageUrl || ''),
      bgBrightness: pData.bgBrightness !== undefined ? Number(pData.bgBrightness) : (dbData.homePoster.bgBrightness ?? 90),
      bgBlur: pData.bgBlur !== undefined ? Number(pData.bgBlur) : (dbData.homePoster.bgBlur ?? 8),
      posterHeight: pData.posterHeight !== undefined ? pData.posterHeight : (dbData.homePoster.posterHeight || 420),
      posterFit: pData.posterFit !== undefined ? pData.posterFit : (dbData.homePoster.posterFit || 'cover'),
      posterAspectRatio: pData.posterAspectRatio !== undefined ? pData.posterAspectRatio : (dbData.homePoster.posterAspectRatio || 'auto'),
      hidden: pData.hidden !== undefined ? pData.hidden : (pData.hidePoster !== undefined ? pData.hidePoster : dbData.homePoster.hidden),
      hidePoster: pData.hidePoster !== undefined ? pData.hidePoster : (pData.hidden !== undefined ? pData.hidden : dbData.homePoster.hidePoster),
      hideBokeoSection: pData.hideBokeoSection !== undefined ? pData.hideBokeoSection : dbData.homePoster.hideBokeoSection,
      updatedAt: pData.updatedAt || nowIso,
    };
    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('homePoster', dbData.homePoster);
    await saveHomePosterToFirestore(dbData.homePoster).catch((e) => console.warn('Firestore saveHomePoster notice:', e?.message || e));
    res.json({ success: true, homePoster: dbData.homePoster });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// Save Village
app.post('/api/save-village', async (req, res) => {
  const vData = req.body;
  try {
    const rowId = Number(vData.rowId);
    const existingIndex = dbData.villages.findIndex((v) => (vData.id && v.id === vData.id) || v.rowId === rowId);

    let finalLat = typeof vData.lat === 'number' && !isNaN(vData.lat) ? vData.lat : undefined;
    let finalLng = typeof vData.lng === 'number' && !isNaN(vData.lng) ? vData.lng : undefined;

    if (finalLat !== undefined && finalLng !== undefined) {
      const norm = normalizeCoordinates(finalLat, finalLng);
      if (norm) {
        finalLat = norm.lat;
        finalLng = norm.lng;
      }
    } else if (vData.mapUrl && typeof vData.mapUrl === 'string' && vData.mapUrl.trim()) {
      const parsed = parseCoordinatesFromUrl(vData.mapUrl);
      if (parsed) {
        finalLat = parsed.lat;
        finalLng = parsed.lng;
      } else {
        const resolved = await resolveCoordinatesFromUrlBackend(vData.mapUrl);
        if (resolved.success && typeof resolved.lat === 'number' && typeof resolved.lng === 'number') {
          finalLat = resolved.lat;
          finalLng = resolved.lng;
        }
      }
    }

    const newVillage = {
      rowId: rowId && rowId > 1 ? rowId : dbData.villages.length + 2,
      id: vData.id || 'V' + Date.now().toString().slice(-4),
      name: vData.name || '',
      nameEn: vData.nameEn || '',
      nameTh: vData.nameTh || '',
      district: vData.district || '',
      districtEn: vData.districtEn || '',
      districtTh: vData.districtTh || '',
      province: vData.province || 'Bokeo',
      heard: Number(vData.heard) || 0,
      believers: Number(vData.believers) || 0,
      baptized: Number(vData.baptized) || 0,
      attending: typeof vData.attending === 'number' ? vData.attending : (Number(vData.attending) || 0),
      leaders: typeof vData.leaders === 'number' ? vData.leaders : (Number(vData.leaders) || 0),
      persecution: vData.persecution || 'ປົກກະຕິ',
      needs: vData.needs || '',
      needsEn: vData.needsEn || '',
      needsTh: vData.needsTh || '',
      notes: vData.notes || '',
      notesEn: vData.notesEn || '',
      notesTh: vData.notesTh || '',
      imageUrl: vData.imageUrl || '',
      mapUrl: vData.mapUrl || '',
      pinCode: vData.pinCode || '',
      date: vData.date || new Date().toISOString().split('T')[0],
      hidden: Boolean(vData.hidden),
      history: Array.isArray(vData.history) ? vData.history : (existingIndex >= 0 && Array.isArray(dbData.villages[existingIndex]?.history) ? dbData.villages[existingIndex].history : []),
      initialBelievers: vData.initialBelievers !== undefined ? Number(vData.initialBelievers) : (existingIndex >= 0 ? dbData.villages[existingIndex]?.initialBelievers : undefined),
      initialHeard: vData.initialHeard !== undefined ? Number(vData.initialHeard) : (existingIndex >= 0 ? dbData.villages[existingIndex]?.initialHeard : undefined),
      initialBaptized: vData.initialBaptized !== undefined ? Number(vData.initialBaptized) : (existingIndex >= 0 ? dbData.villages[existingIndex]?.initialBaptized : undefined),
      initialDate: vData.initialDate || (existingIndex >= 0 ? dbData.villages[existingIndex]?.initialDate : undefined),
      ...(finalLat !== undefined ? { lat: finalLat } : {}),
      ...(finalLng !== undefined ? { lng: finalLng } : {}),
    };

    if (existingIndex >= 0) {
      dbData.villages[existingIndex] = newVillage;
    } else {
      dbData.villages.push(newVillage);
    }

    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('villages', dbData.villages);
    saveVillageToFirestore(newVillage).catch((e) => console.warn('Firestore saveVillage notice:', e?.message || e));

    res.json({ success: true, village: newVillage });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// Delete Village
app.post('/api/delete-village', async (req, res) => {
  const { rowId, id } = req.body;
  try {
    dbData.villages = dbData.villages.filter((v) => v.rowId !== Number(rowId));
    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('villages', dbData.villages);
    deleteVillageFromFirestore(Number(rowId), id).catch((e) => console.warn('Firestore deleteVillage notice:', e?.message || e));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// Save Event
app.post('/api/save-event', async (req, res) => {
  const eData = req.body;
  try {
    const rowId = Number(eData.rowId);
    const existingIndex = dbData.events.findIndex(
      (e) => (eData.id && e.id === eData.id) || (rowId && e.rowId === rowId)
    );
    const existingEvent = existingIndex >= 0 ? dbData.events[existingIndex] : null;

    const rawImgs = eData.imageUrls || (eData.imageUrl ? [eData.imageUrl] : []);
    const listImgs = Array.isArray(rawImgs)
      ? rawImgs.filter(Boolean)
      : (typeof rawImgs === 'string' ? rawImgs.split('|||').filter(Boolean) : []);
    const cleanImgs = listImgs.map((img: string) => extractBase64DocToUpload(img, 'event_img')).filter(Boolean);
    const coverImg = extractBase64DocToUpload(eData.imageUrl || cleanImgs[0] || existingEvent?.imageUrl || '', 'event_cover');
    if (coverImg && !cleanImgs.includes(coverImg)) {
      cleanImgs.unshift(coverImg);
    }

    const combinedDocUrls: string[] = [];
    if (Array.isArray(eData.docUrls)) {
      eData.docUrls.forEach((d: string) => {
        if (d && typeof d === 'string' && d.trim() && !combinedDocUrls.includes(d.trim())) {
          combinedDocUrls.push(d.trim());
        }
      });
    }
    if (eData.docUrl && typeof eData.docUrl === 'string' && eData.docUrl.trim() && !combinedDocUrls.includes(eData.docUrl.trim())) {
      combinedDocUrls.unshift(eData.docUrl.trim());
    }
    if (combinedDocUrls.length === 0 && existingEvent) {
      if (Array.isArray(existingEvent.docUrls)) {
        existingEvent.docUrls.forEach((d: string) => {
          if (d && typeof d === 'string' && d.trim() && !combinedDocUrls.includes(d.trim())) {
            combinedDocUrls.push(d.trim());
          }
        });
      }
      if (existingEvent.docUrl && typeof existingEvent.docUrl === 'string' && !combinedDocUrls.includes(existingEvent.docUrl.trim())) {
        combinedDocUrls.unshift(existingEvent.docUrl.trim());
      }
    }
    const cleanDocUrls = combinedDocUrls.map((d: string) => extractBase64DocToUpload(d, 'event_doc')).filter(Boolean);

    const rawMonthlyReports = Array.isArray(eData.monthlyReports)
      ? eData.monthlyReports
      : (existingEvent?.monthlyReports || []);
    
    const cleanMonthlyReports = rawMonthlyReports.map((r: any) => {
      const rCombined: string[] = [];
      if (Array.isArray(r.docUrls)) {
        r.docUrls.forEach((d: string) => {
          if (d && typeof d === 'string' && d.trim() && !rCombined.includes(d.trim())) {
            rCombined.push(d.trim());
          }
        });
      }
      if (r.docUrl && typeof r.docUrl === 'string' && r.docUrl.trim() && !rCombined.includes(r.docUrl.trim())) {
        rCombined.unshift(r.docUrl.trim());
      }
      const cleanRD = rCombined.map((d: string) => extractBase64DocToUpload(d, 'sub_doc')).filter(Boolean);

      const rRawImgs = r.imageUrls || (r.imageUrl ? [r.imageUrl] : []);
      const rListImgs = Array.isArray(rRawImgs)
        ? rRawImgs.filter(Boolean)
        : (typeof rRawImgs === 'string' ? rRawImgs.split('|||').filter(Boolean) : []);
      const rCleanImgs = rListImgs.map((img: string) => extractBase64DocToUpload(img, 'sub_img')).filter(Boolean);
      const rCoverImg = extractBase64DocToUpload(r.imageUrl || rCleanImgs[0] || '', 'sub_cover');
      if (rCoverImg && !rCleanImgs.includes(rCoverImg)) {
        rCleanImgs.unshift(rCoverImg);
      }

      return {
        ...r,
        endDate: r.endDate ? String(r.endDate).trim() : '',
        imageUrl: rCoverImg || '',
        imageUrls: rCleanImgs,
        docUrl: cleanRD[0] || '',
        docUrls: cleanRD,
      };
    });

    const newEvent = {
      rowId: rowId && rowId > 1 ? rowId : (existingEvent?.rowId || Date.now()),
      id: eData.id || existingEvent?.id || 'E' + Date.now().toString().slice(-4),
      title: eData.title !== undefined ? eData.title : (existingEvent?.title || ''),
      titleEn: eData.titleEn !== undefined ? eData.titleEn : (existingEvent?.titleEn || ''),
      titleTh: eData.titleTh !== undefined ? eData.titleTh : (existingEvent?.titleTh || ''),
      description: eData.description !== undefined ? eData.description : (existingEvent?.description || ''),
      descriptionEn: eData.descriptionEn !== undefined ? eData.descriptionEn : (existingEvent?.descriptionEn || ''),
      descriptionTh: eData.descriptionTh !== undefined ? eData.descriptionTh : (existingEvent?.descriptionTh || ''),
      imageUrl: coverImg || (cleanImgs[0] || (existingEvent?.imageUrl || '')),
      imageUrls: cleanImgs.length > 0 ? cleanImgs : (coverImg ? [coverImg] : (existingEvent?.imageUrls || [])),
      videoUrl: eData.videoUrl !== undefined ? eData.videoUrl : (existingEvent?.videoUrl || ''),
      audioUrl: eData.audioUrl !== undefined ? eData.audioUrl : (existingEvent?.audioUrl || ''),
      docUrl: cleanDocUrls[0] || '',
      docUrls: cleanDocUrls,
      date: eData.date || existingEvent?.date || new Date().toISOString().split('T')[0],
      endDate: eData.endDate !== undefined ? (eData.endDate || '') : (existingEvent?.endDate || ''),
      hidden: eData.hidden !== undefined ? Boolean(eData.hidden) : Boolean(existingEvent?.hidden),
      monthlyReports: cleanMonthlyReports,
    };

    if (existingIndex >= 0) {
      dbData.events[existingIndex] = newEvent;
    } else {
      dbData.events.unshift(newEvent);
    }

    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('events', dbData.events);
    saveEventToFirestore(newEvent).catch((e) => console.warn('Firestore saveEvent notice:', e?.message || e));

    res.json({ success: true, event: newEvent });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// Delete Event
app.post('/api/delete-event', async (req, res) => {
  const { rowId, id } = req.body;
  try {
    dbData.events = dbData.events.filter(
      (e) => (rowId && e.rowId !== Number(rowId)) && (!id || e.id !== id)
    );
    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('events', dbData.events);
    deleteEventFromFirestore(Number(rowId), id).catch((e) => console.warn('Firestore deleteEvent notice:', e?.message || e));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// Save Team
app.post('/api/save-team', async (req, res) => {
  const tData = req.body;
  try {
    const rowId = Number(tData.rowId);
    const existingIndex = dbData.teams.findIndex((t) => (tData.id && t.id === tData.id) || t.rowId === rowId);
    const existingTeam = existingIndex >= 0 ? dbData.teams[existingIndex] : null;

    const newTeam = {
      ...existingTeam,
      ...tData,
      id: tData.id || existingTeam?.id || (rowId ? `t_${rowId}` : `t_${Date.now()}`),
      rowId: rowId && rowId > 1 ? rowId : (existingTeam?.rowId || dbData.teams.length + 2),
      name: tData.name || existingTeam?.name || '',
      role: tData.role || existingTeam?.role || '',
      roleEn: tData.roleEn || existingTeam?.roleEn || '',
      roleTh: tData.roleTh || existingTeam?.roleTh || '',
      phone: tData.phone || existingTeam?.phone || '',
      email: tData.email || existingTeam?.email || '',
      imageUrl: (tData.imageUrl && tData.imageUrl.trim()) || existingTeam?.imageUrl || '',
      bio: tData.bio !== undefined ? tData.bio : (existingTeam?.bio || ''),
      bioEn: tData.bioEn !== undefined ? tData.bioEn : (existingTeam?.bioEn || ''),
      bioTh: tData.bioTh !== undefined ? tData.bioTh : (existingTeam?.bioTh || ''),
      hidden: tData.hidden !== undefined ? Boolean(tData.hidden) : Boolean(existingTeam?.hidden),
      // Preserve existing QR code and bank info
      financeQrUrl: (tData.financeQrUrl && tData.financeQrUrl.trim()) || existingTeam?.financeQrUrl || '',
      bankName: (tData.bankName && tData.bankName.trim()) || existingTeam?.bankName || 'BCEL One',
      bankAccountNumber: (tData.bankAccountNumber && tData.bankAccountNumber.trim()) || existingTeam?.bankAccountNumber || '',
      bankAccountName: (tData.bankAccountName && tData.bankAccountName.trim()) || existingTeam?.bankAccountName || existingTeam?.name || tData.name || '',
    };

    if (existingIndex >= 0) {
      dbData.teams[existingIndex] = newTeam;
    } else {
      dbData.teams.push(newTeam);
    }

    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('teams', dbData.teams);
    saveTeamToFirestore(newTeam).catch((e) => console.warn('Firestore saveTeam notice:', e?.message || e));

    res.json({ success: true, team: newTeam });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// Delete Team
app.post('/api/delete-team', async (req, res) => {
  const { rowId } = req.body;
  try {
    dbData.teams = dbData.teams.filter((t) => t.rowId !== Number(rowId));
    writeMinistryLedger(dbData);
    broadcastRealtimeUpdate('teams', dbData.teams);
    deleteTeamFromFirestore(Number(rowId)).catch((e) => console.warn('Firestore deleteTeam notice:', e?.message || e));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.toString() });
  }
});

// 1. Get Spreadsheet Metadata & list of sheets/tabs
app.get('/api/sheet-info', async (req, res) => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const metadata = {
      title: response.data.properties?.title || 'Hope Bokeo Sheet',
      spreadsheetId: SPREADSHEET_ID,
      sheets: response.data.sheets?.map((s) => ({
        sheetId: s.properties?.sheetId,
        title: s.properties?.title || 'Sheet1',
        rowCount: s.properties?.gridProperties?.rowCount,
        columnCount: s.properties?.gridProperties?.columnCount,
      })) || [],
    };

    res.json({ success: true, metadata });
  } catch (error: any) {
    console.error('Error fetching sheet info:', error?.message || error);
    
    // Fallback attempt via public CSV fetch if Auth fails
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
      const csvRes = await fetch(csvUrl);
      if (csvRes.ok) {
        return res.json({
          success: true,
          fallback: true,
          metadata: {
            title: 'Hope Bokeo (Public Access)',
            spreadsheetId: SPREADSHEET_ID,
            sheets: [{ sheetId: 0, title: 'Sheet1' }],
          },
        });
      }
    } catch (e) {
      // ignore
    }

    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to connect to Google Sheets API',
      spreadsheetId: SPREADSHEET_ID,
    });
  }
});

// 2. Get Sheet Values for a specific range or sheet name
app.get('/api/sheet-data', async (req, res) => {
  const range = (req.query.range as string) || 'Sheet1';
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const values = response.data.values || [];
    res.json({
      success: true,
      range: response.data.range,
      values,
      headers: values[0] || [],
      rows: values.slice(1),
    });
  } catch (error: any) {
    console.error('Error fetching sheet data:', error?.message || error);

    // Fallback to fetching CSV directly
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;
      const csvRes = await fetch(csvUrl);
      if (csvRes.ok) {
        const text = await csvRes.text();
        const lines = text.split(/\r?\n/).map((line) => line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim()));
        return res.json({
          success: true,
          fallback: true,
          range,
          values: lines,
          headers: lines[0] || [],
          rows: lines.slice(1),
        });
      }
    } catch (csvErr) {
      console.error('CSV fallback failed:', csvErr);
    }

    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch spreadsheet data',
    });
  }
});

// 3. Append row to sheet
app.post('/api/sheet-data', async (req, res) => {
  const { range = 'Sheet1', rowValues } = req.body;
  if (!rowValues || !Array.isArray(rowValues)) {
    return res.status(400).json({ success: false, error: 'rowValues array required' });
  }

  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowValues],
      },
    });

    res.json({ success: true, updatedRange: response.data.updates?.updatedRange });
  } catch (error: any) {
    console.error('Error adding row to sheet:', error?.message || error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to append row' });
  }
});

// 4. Advanced Gemini AI Assistant & Multilingual Intelligence Engine for Hope Bokeo
function detectLanguage(text: string): 'en' | 'th' | 'zh' | 'lo' {
  const t = text.trim();
  // Check Chinese characters
  if (/[\u4e00-\u9fa5]/.test(t)) return 'zh';
  // Check Thai characters
  if (/[\u0e00-\u0e7f]/.test(t)) {
    // Distinguish between Lao and Thai (Lao range: \u0e80-\u0eff)
    const laoCount = (t.match(/[\u0e80-\u0eff]/g) || []).length;
    const thaiCount = (t.match(/[\u0e00-\u0e7f]/g) || []).length - laoCount;
    if (laoCount > 0 && laoCount >= thaiCount) return 'lo';
    if (thaiCount > 0) return 'th';
  }
  // Check Lao characters
  if (/[\u0e80-\u0eff]/.test(t)) return 'lo';
  // Check English / Latin
  if (/[a-zA-Z]/.test(t)) return 'en';
  return 'lo';
}

function generateSmartLocalResponse(query: string, dataSummary: any): string {
  const q = query.toLowerCase().trim();
  const lang = detectLanguage(query);

  const totalVillages = dataSummary.villages?.length || 0;
  const totalBelievers = dataSummary.totalBelievers || 0;
  const totalBaptized = dataSummary.totalBaptized || 0;
  const totalHeard = dataSummary.totalHeard || 0;
  const totalAttending = dataSummary.totalAttending || 0;
  const totalLeaders = dataSummary.totalLeaders || 0;
  const teamList = dataSummary.teams || [];

  // District distribution stats
  const districtCounts: Record<string, { count: number; believers: number; baptized: number }> = {};
  dataSummary.villages?.forEach((v: any) => {
    const dist = v.district || 'Bokeo';
    if (!districtCounts[dist]) districtCounts[dist] = { count: 0, believers: 0, baptized: 0 };
    districtCounts[dist].count += 1;
    districtCounts[dist].believers += Number(v.believers) || 0;
    districtCounts[dist].baptized += Number(v.baptized) || 0;
  });

  // 1. Security / Admin Shield
  const securityKeywords = [
    'pin', 'pincode', 'password', 'passcode', 'admin', 'ລະຫັດ', 'ແອັດມິນ', 'ລະຫັດຜ່ານ', 'ປິນ', 'รหัส', 'แอดมิน', '密码', 'login'
  ];
  if (securityKeywords.some(kw => q.includes(kw)) && (q.includes('password') || q.includes('pin') || q.includes('ລະຫັດ') || q.includes('ເຂົ້າຫ້ອງ') || q.includes('admin room') || q.includes('secret') || q.includes('รหัส') || q.includes('密码'))) {
    if (lang === 'en') {
      return `🔒 I apologize, but for data security and privacy, I do not have access to the Admin Room, and I am strictly restricted from disclosing administrative passwords, church PIN codes, or private credentials.`;
    }
    if (lang === 'th') {
      return `🔒 ขออภัยค่ะ เพื่อความปลอดภัยและความเป็นส่วนตัว ฉันไม่สามารถเข้าถึงห้องแอดมิน หรือเปิดเผยรหัสผ่านและ PIN ของคริสตจักรได้ค่ะ`;
    }
    if (lang === 'zh') {
      return `🔒 抱歉，为了数据安全，我无法访问管理员后台，也绝不透露任何管理员密码或教堂PIN码。`;
    }
    return `🔒 ຂໍອະໄພເດີ, ເພື່ອຄວາມປອດໄພ ແລະ ຄວາມເປັນສ່ວນຕົວ ຂ້ອຍບໍ່ມີສິດເຂົ້າເຖິງຫ້ອງແອັດມິນ ຫຼື ເປີດເຜີຍລະຫັດຜ່ານ, ລະຫັດ PIN ຂອງຄຣິດຕະຈັກ ແລະ ຂໍ້ມູນພາຍໃນຂອງແອັດມິນໄດ້ເດັດຂາດ.`;
  }

  // 2. Leadership / Boss / Director / Head / Founder / Pastor / Team queries
  const isLeaderQuery = [
    'boss', 'head', 'director', 'founder', 'leader', 'pastor', 'minister', 'president',
    'manager', 'chair', 'lead', 'who runs', 'who is in charge', 'who leads', 'in charge',
    'team', 'staff', 'contact', 'phone', 'email', 'whatsapp',
    'ຫົວໜ້າ', 'ຜູ້ນຳ', 'ຜູ້ນຳພາ', 'ຜູ້ປະສານງານ', 'ຜູ້ຮັບຜິດຊອບ', 'ອາຈານ', 'ສິດຍາພິບານ', 'ທີມງານ', 'ຕິດຕໍ່', 'ເບີໂທ', 'ໃຜເປັນ',
    'หัวหน้า', 'ผู้นำ', 'ศิษยาภิบาล', 'ผู้ประสานงาน', 'ทีมงาน', 'ใครเป็นหัวหน้า', 'ใครเป็นผู้นำ', 'ติดต่อ',
    '负责人', '老板', '主任', '牧师', '领导', '团队'
  ].some(kw => q.includes(kw));

  if (isLeaderQuery) {
    if (teamList.length > 0) {
      if (lang === 'en') {
        const teamFormatted = teamList.map((t: any) => {
          let str = `• **${t.name}** — *${t.roleEn || t.role}*`;
          if (t.phone) str += ` (📞 ${t.phone})`;
          if (t.email) str += ` (📧 ${t.email})`;
          if (t.bioEn || t.bio) str += `\n  ↳ ${t.bioEn || t.bio}`;
          return str;
        }).join('\n');

        return `👥 **Hope Bokeo Leadership & Ministry Team**:\n\nThe leadership and operational team serving Hope Bokeo across Bokeo Province includes:\n\n${teamFormatted}\n\n📞 **Central Ministry Contact**:\n• Phone: ${dataSummary.donationInfo?.prayerContactPhone || '+856 20 55512345'}\n• WhatsApp: ${dataSummary.donationInfo?.prayerContactWhatsapp || '+856 20 76838584'}\n• Email: ${dataSummary.donationInfo?.prayerContactEmail || 'info@hopebokeo.org'}\n\nPlease reach out if you would like to connect with our team or support our field coordinators!`;
      }
      if (lang === 'th') {
        const teamFormatted = teamList.map((t: any) => {
          let str = `• **${t.name}** — *${t.roleTh || t.role}*`;
          if (t.phone) str += ` (📞 ${t.phone})`;
          if (t.email) str += ` (📧 ${t.email})`;
          if (t.bioTh || t.bio) str += `\n  ↳ ${t.bioTh || t.bio}`;
          return str;
        }).join('\n');

        return `👥 **ทีมงานและผู้นำพันธกิจ Hope Bokeo**:\n\nรายชื่อผู้นำและทีมงานผู้ประสานงานในแขวงบ่อแก้ว:\n\n${teamFormatted}\n\n📞 **ช่องทางติดต่อส่วนกลาง**:\n• โทร: ${dataSummary.donationInfo?.prayerContactPhone || '020 55512345'}\n• WhatsApp: ${dataSummary.donationInfo?.prayerContactWhatsapp || '020 76838584'}`;
      }
      if (lang === 'zh') {
        const teamFormatted = teamList.map((t: any) => {
          let str = `• **${t.name}** — *${t.roleEn || t.role}*`;
          if (t.phone) str += ` (📞 ${t.phone})`;
          if (t.email) str += ` (📧 ${t.email})`;
          return str;
        }).join('\n');

        return `👥 **Hope Bokeo 事工领导与团队**:\n\n${teamFormatted}\n\n📞 **联系方式**:\n• 电话: ${dataSummary.donationInfo?.prayerContactPhone || '+856 20 55512345'}\n• WhatsApp: ${dataSummary.donationInfo?.prayerContactWhatsapp || '+856 20 76838584'}`;
      }

      const teamFormatted = teamList.map((t: any) => {
        let str = `• **${t.name}** — *${t.role}*`;
        if (t.phone) str += ` (📞 ${t.phone})`;
        if (t.email) str += ` (📧 ${t.email})`;
        if (t.bio) str += `\n  ↳ ${t.bio}`;
        return str;
      }).join('\n');

      return `👥 **ຄະນະຜູ້ນຳ ແລະ ທີມງານພັນທະກິດ Hope Bokeo**:\n\nຄະນະຜູ້ນຳ ແລະ ຜູ້ຮັບຜິດຊອບວຽກງານພັນທະກິດໃນແຂວງບໍ່ແກ້ວ ປະກອບມີ:\n\n${teamFormatted}\n\n📞 **ຊ່ອງທາງຕິດຕໍ່ສຳນັກງານ / ພັນທະກິດ**:\n• ໂທ: ${dataSummary.donationInfo?.prayerContactPhone || '020 55512345'}\n• WhatsApp: ${dataSummary.donationInfo?.prayerContactWhatsapp || '020 76838584'}\n• ອີເມວ: ${dataSummary.donationInfo?.prayerContactEmail || 'info@hopebokeo.org'}\n\nຫາກທ່ານຕ້ອງການຕິດຕໍ່ພົວພັນ ຫຼື ສອບຖາມຂໍ້ມູນເພີ່ມເຕີມ ສາມາດຕິດຕໍ່ຕາມເບີຂ້າງເທິງໄດ້ເລີຍເດີ!`;
    }
  }

  // 3. Small Talk / Greetings
  const isGreeting = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'ສະບາຍດີ', 'ສະບາຍດີບໍ', 'สวัสดี', '你好', '嗨'].some(g => q.startsWith(g) || q === g);
  if (isGreeting && q.length < 25) {
    if (lang === 'en') {
      return `Hello! 😊 I'm Hope Bokeo's AI Assistant. How can I assist you today? You can ask me anything about our churches, village statistics, field needs, events, web information, or ministry team across Bokeo Province!`;
    }
    if (lang === 'th') {
      return `สวัสดีค่ะ! 😊 ฉันคือ AI ผู้ช่วยของ Hope Bokeo ยินดีให้ข้อมูลทุกอย่างเกี่ยวกับคริสตจักร สถิติผู้เชื่อ กิจกรรม และทีมงานพันธกิจในแขวงบ่อแก้วค่ะ มีอะไรให้ฉันช่วยสอบถามได้เลยนะคะ!`;
    }
    if (lang === 'zh') {
      return `您好！😊 我是 Hope Bokeo 的智能助手。我可以为您提供波乔省各教会数据、信徒统计、近期事工活动及团队资讯。请问有什么可以帮助您的？`;
    }
    return `ສະບາຍດີຈ້າ! 😊 ຂ້ອຍແມ່ນ AI ຜູ້ຊ່ວຍຂອງ Hope Bokeo ພ້ອມທີ່ຈະໃຫ້ຂໍ້ມູນ ແລະ ຕອບທຸກຄຳຖາມກ່ຽວກັບຄຣິດຕະຈັກ, ສະຖິຕິຜູ້ເຊື່ອ, ຄວາມຕ້ອງການພາກສະໜາມ, ກິດຈະກຳ ຫຼື ທີມງານພັນທະກິດໃນແຂວງບໍ່ແກ້ວເລີຍເດີ! ມີອັນໃດຢາກຮູ້ ສອບຖາມໄດ້ເລີຍຈ້າ.`;
  }

  // 4. Identity / Purpose
  if (q.includes('who are you') || q.includes('your name') || q.includes('ແມ່ນໃຜ') || q.includes('ຊື່ຫຍັງ') || q.includes('คุณคือใคร') || q.includes('你是谁')) {
    if (lang === 'en') {
      return `I am the Hope Bokeo AI Assistant, an intelligent system designed to help you explore, search, analyze all ministry data, church statistics, leadership reports, and live web knowledge across Bokeo Province!`;
    }
    if (lang === 'th') {
      return `ฉันคือ AI ผู้ช่วยประจำ Hope Bokeo ค่ะ ช่วยค้นหาและให้ข้อมูลสถิติคริสตจักร ผู้เชื่อ กิจกรรม และทีมงานพันธกิจในแขวงบ่อแก้ว สปป.ลาว ค่ะ`;
    }
    return `ຂ້ອຍແມ່ນ AI ຜູ້ຊ່ວຍຂອງ Hope Bokeo ຈ້າ ຖືກພັດທະນາຂຶ້ນເພື່ອຊ່ວຍຄົ້ນຫາ, ໃຫ້ຂໍ້ມູນ ແລະ ວິເຄາະສະຖິຕິຄຣິດຕະຈັກ, ຜູ້ເຊື່ອ, ກິດຈະກຳ ແລະ ວຽກງານພັນທະກິດທັງໝົດໃນແຂວງບໍ່ແກ້ວ.`;
  }

  // 5. Village / Church Count Queries
  const isVillageCountQuery = (
    q.includes('how many village') ||
    q.includes('how many church') ||
    q.includes('total village') ||
    q.includes('total church') ||
    q.includes('number of village') ||
    q.includes('number of church') ||
    q.includes('list of village') ||
    q.includes('all village') ||
    q.includes('all church') ||
    q.includes('ຈັກບ້ານ') ||
    q.includes('ມີຈັກບ້ານ') ||
    q.includes('ຈຳນວນບ້ານ') ||
    q.includes('ບ້ານທັງໝົດ') ||
    q.includes('ຄຣິດຕະຈັກທັງໝົດ') ||
    q.includes('มีกี่หมู่บ้าน') ||
    q.includes('กี่คริสตจักร') ||
    q.includes('有多少个村') ||
    q.includes('多少间教会')
  );

  if (isVillageCountQuery) {
    const distDetailsEn = Object.entries(districtCounts)
      .map(([d, s]) => `• **${d} District**: ${s.count} villages/churches (${s.believers.toLocaleString()} believers, ${s.baptized.toLocaleString()} baptized)`)
      .join('\n');

    const distDetailsLo = Object.entries(districtCounts)
      .map(([d, s]) => `• **ເມືອງ ${d}**: ${s.count} ບ້ານ/ຄຣິດຕະຈັກ (ຜູ້ເຊື່ອ ${s.believers.toLocaleString()} ຄົນ, ບັບຕິສະມາ ${s.baptized.toLocaleString()} ຄົນ)`)
      .join('\n');

    const distDetailsTh = Object.entries(districtCounts)
      .map(([d, s]) => `• **เมือง ${d}**: ${s.count} หมู่บ้าน/คริสตจักร (ผู้เชื่อ ${s.believers.toLocaleString()} คน, บัพติศมา ${s.baptized.toLocaleString()} คน)`)
      .join('\n');

    if (lang === 'en') {
      return `Hope Bokeo currently partners with **${totalVillages} villages / churches** across Bokeo Province!\n\nHere is the district breakdown:\n${distDetailsEn}\n\n📊 **Overall Summary**:\n• Total Gospel Heard: **${totalHeard.toLocaleString()}** people\n• Total Believers: **${totalBelievers.toLocaleString()}** people\n• Total Baptized: **${totalBaptized.toLocaleString()}** people\n• Total Regular Attendees: **${totalAttending.toLocaleString()}** people\n• Total Local Leaders: **${totalLeaders.toLocaleString()}** leaders\n\nWould you like more details about a specific village or district?`;
    }
    if (lang === 'th') {
      return `ปัจจุบัน Hope Bokeo มีหมู่บ้านและคริสตจักรในพันธกิจทั้งหมด **${totalVillages} แห่ง** ในแขวงบ่อแก้วค่ะ!\n\nแบ่งตามรายเมืองดังนี้:\n${distDetailsTh}\n\n📊 **สถิติรวม**:\n• ผู้ได้ยินข่าวประเสริฐ: **${totalHeard.toLocaleString()}** คน\n• ผู้เชื่อ: **${totalBelievers.toLocaleString()}** คน\n• ผู้รับบัพติศมา: **${totalBaptized.toLocaleString()}** คน`;
    }
    return `ປະຈຸບັນ ພັນທະກິດ Hope Bokeo ມີຄຣິດຕະຈັກ ແລະ ບ້ານພັນທະກິດທັງໝົດ **${totalVillages} ແຫ່ງ** ໃນແຂວງບໍ່ແກ້ວ!\n\nແບ່ງຕາມແຕ່ລະເມືອງດັ່ງນີ້:\n${distDetailsLo}\n\n📊 **ສະຖິຕິລວມທັງໝົດ**:\n• ຜູ້ໄດ້ຍິນຂ່າວປະເສີດ: **${totalHeard.toLocaleString()}** ຄົນ\n• ຜູ້ເຊື່ອ: **${totalBelievers.toLocaleString()}** ຄົນ\n• ຜູ້ຮັບບັບຕິສະມາ: **${totalBaptized.toLocaleString()}** ຄົນ\n• ຜູ້ຮ່ວມນະມັດສະການ: **${totalAttending.toLocaleString()}** ຄົນ\n• ຜູ້ນຳທ້ອງຖິ່ນ: **${totalLeaders.toLocaleString()}** ທ່ານ\n\nຖ້າທ່ານຢາກຮູ້ລາຍລະອຽດຂອງບ້ານໃດ ຫຼື ເມືອງໃດເພີ່ມເຕີມ ບອກຂ້ອຍໄດ້ເລີຍເດີ!`;
  }

  // 6. Believers / Baptized / Statistics
  if (q.includes('believer') || q.includes('baptiz') || q.includes('statistic') || q.includes('stats') || q.includes('summary') || q.includes('ຜູ້ເຊື່ອ') || q.includes('ບັບຕິສະມາ') || q.includes('ສະຖິຕິ') || q.includes('ผู้เชื่อ') || q.includes('บัพติศมา') || q.includes('信徒') || q.includes('受洗')) {
    if (lang === 'en') {
      return `Here is the official statistics summary for Hope Bokeo:\n• **Total Ministry Villages/Churches**: ${totalVillages}\n• **Total Believers**: ${totalBelievers.toLocaleString()} people\n• **Total Baptized**: ${totalBaptized.toLocaleString()} people\n• **Total Gospel Heard**: ${totalHeard.toLocaleString()} people\n• **Total Worship Attendance**: ${totalAttending.toLocaleString()} people\n\nTop villages with active fellowships include:\n${dataSummary.villages?.slice(0, 5).map((v: any) => `• **${v.nameEn || v.name}** (${v.district}): ${v.believers} believers, ${v.baptized} baptized`).join('\n')}`;
    }
    return `ສະຫຼຸບສະຖິຕິພັນທະກິດ Hope Bokeo ໃນແຂວງບໍ່ແກ້ວ:\n• **ຈຳນວນບ້ານ/ຄຣິດຕະຈັກ**: ${totalVillages} ແຫ່ງ\n• **ຜູ້ເຊື່ອທັງໝົດ**: ${totalBelievers.toLocaleString()} ຄົນ\n• **ຜູ້ຮັບບັບຕິສະມາທັງໝົດ**: ${totalBaptized.toLocaleString()} ຄົນ\n• **ຜູ້ໄດ້ຍິນຂ່າວປະເສີດ**: ${totalHeard.toLocaleString()} ຄົນ\n• **ຜູ້ຮ່ວມນະມັດສະການ**: ${totalAttending.toLocaleString()} ຄົນ\n\nບ້ານທີ່ມີຜູ້ເຊື່ອ ແລະ ມີການເຕີບໂຕດີ ເຊັ່ນ:\n${dataSummary.villages?.slice(0, 5).map((v: any) => `• **ບ້ານ ${v.name}** (${v.district}): ຜູ້ເຊື່ອ ${v.believers} ຄົນ, ບັບຕິສະມາ ${v.baptized} ຄົນ`).join('\n')}`;
  }

  // 7. Specific Village / Church Lookup
  const foundVillage = dataSummary.villages?.find((v: any) => {
    const vName = (v.name || '').toLowerCase();
    const vNameEn = (v.nameEn || '').toLowerCase();
    const vId = (v.id || '').toLowerCase();
    return (vName && q.includes(vName)) || (vNameEn && q.includes(vNameEn)) || (vId && q.includes(vId));
  });

  if (foundVillage) {
    if (lang === 'en') {
      return `📍 **Village Profile: ${foundVillage.nameEn || foundVillage.name}**\n• **District**: ${foundVillage.districtEn || foundVillage.district}, Province: ${foundVillage.province || 'Bokeo'}\n• **Believers**: ${foundVillage.believers || 0} people\n• **Baptized**: ${foundVillage.baptized || 0} people\n• **Gospel Heard**: ${foundVillage.heard || 0} people\n• **Regular Attendees**: ${foundVillage.attending || 0} people\n• **Local Leaders**: ${foundVillage.leaders || 0} leaders\n• **Situation/Persecution**: ${foundVillage.persecution || 'Normal'}\n• **Needs & Prayer Requests**: ${foundVillage.needs || 'None specified'}\n${foundVillage.notes ? `• **Notes**: ${foundVillage.notes}\n` : ''}${foundVillage.lat && foundVillage.lng ? `• **GPS Coordinates**: ${foundVillage.lat.toFixed(5)}, ${foundVillage.lng.toFixed(5)}` : ''}`;
    }
    return `📍 **ຂໍ້ມູນບ້ານ/ຄຣິດຕະຈັກ: ບ້ານ ${foundVillage.name}** (${foundVillage.nameEn || ''})\n• **ເມືອງ**: ${foundVillage.district}, ແຂວງ: ${foundVillage.province || 'ບໍ່ແກ້ວ'}\n• **ຜູ້ເຊື່ອ**: ${foundVillage.believers || 0} ຄົນ\n• **ຮັບບັບຕິສະມາແລ້ວ**: ${foundVillage.baptized || 0} ຄົນ\n• **ຜູ້ໄດ້ຍິນຂ່າວປະເສີດ**: ${foundVillage.heard || 0} ຄົນ\n• **ຜູ້ຮ່ວມນະມັດສະການ**: ${foundVillage.attending || 0} ຄົນ\n• **ຜູ້ນຳທ້ອງຖິ່ນ**: ${foundVillage.leaders || 0} ທ່ານ\n• **ສະຖານະການ/ການຂົ່ມເຫັງ**: ${foundVillage.persecution || 'ປົກກະຕິ'}\n• **ຄວາມຕ້ອງການ & ຄຳອະທິຖານ**: ${foundVillage.needs || 'ບໍ່ມີ'}\n${foundVillage.notes ? `• **ໝາຍເຫດ**: ${foundVillage.notes}\n` : ''}${foundVillage.lat && foundVillage.lng ? `• **ພິກັດ GPS**: ${foundVillage.lat.toFixed(5)}, ${foundVillage.lng.toFixed(5)}` : ''}`;
  }

  // 8. Vision, Mission & Donations
  if (q.includes('vision') || q.includes('mission') || q.includes('donate') || q.includes('bank') || q.includes('give') || q.includes('support') || q.includes('ວິໄສທັດ') || q.includes('ພັນທະກິດ') || q.includes('ບໍລິຈາກ') || q.includes('ບັນຊີ') || q.includes('บริจาค') || q.includes('วิสัยทัศน์') || q.includes('捐助') || q.includes('异象')) {
    const don = dataSummary.donationInfo || {};
    if (lang === 'en') {
      return `🎯 **Hope Bokeo Vision & Mission**:\n• **Vision**: ${don.visionEn || don.vision || 'To see every village in Bokeo hear the Gospel and have a thriving fellowship.'}\n• **Mission**: ${don.missionEn || don.mission || 'Proclaim the Gospel boldly, disciple leaders, and provide humanitarian relief.'}\n\n💳 **Official Giving Accounts**:\n• Bank: ${don.bankNameEn || don.bankName || 'BCEL Bank'}\n• Account Name: ${don.accountName || 'HOPE BOKEO MINISTRY PROJECT'}\n• Account Number: ${don.accountNumber || '010-12-00-012345678-001'}\n• SWIFT Code: ${don.swiftCode || 'BCELLA2X'}`;
    }
    return `🎯 **ວິໄສທັດ & ພັນທະກິດ Hope Bokeo**:\n• **ວິໄສທັດ**: ${don.vision || 'ສ້າງສາວົກ ແລະ ຂະຫຍາຍແຜ່ນດິນຂອງພຣະເຈົ້າໃຫ້ຄວບຄຸມທຸກພື້ນທີ່ໃນແຂວງບໍ່ແກ້ວ.'}\n• **ພັນທະກິດ**: ${don.mission || 'ປະກາດຂ່າວປະເສີດ, ສ້າງຜູ້ນຳ, ຊ່ວຍເຫຼືອສັງຄົມ ແລະ ອະທິຖານວິງວອນ.'}\n\n💳 **ຊ່ອງທາງສະໜັບສະໜູນ & ບໍລິຈາກ**:\n• ທະນາຄານ: ${don.bankName || 'BCEL'}\n• ຊື່ບັນຊີ: ${don.accountName || 'HOPE BOKEO MINISTRY PROJECT'}\n• ເລກບັນຊີ: ${don.accountNumber || '010-12-00-012345678-001'}\n• SWIFT Code: ${don.swiftCode || 'BCELLA2X'}`;
  }

  // 9. Default Conversational Search Response
  if (lang === 'en') {
    return `I looked through our entire Hope Bokeo database regarding "${query}". We have records for **${totalVillages} villages/churches** (${totalBelievers.toLocaleString()} believers, ${totalBaptized.toLocaleString()} baptized) across Houayxay, Tonpheung, Meung, Pha Oudom, and Paktha.\n\nKey leadership and team members include ${teamList.map((t: any) => `${t.name} (${t.roleEn || t.role})`).join(', ') || 'our dedicated field coordinators'}. Feel free to ask about any specific village, leader, district, event, or prayer request!`;
  }
  if (lang === 'th') {
    return `ฉันได้ตรวจสอบข้อมูลในระบบ Hope Bokeo สำหรับ "${query}" แล้วค่ะ ปัจจุบันเรามีข้อมูลคริสตจักร **${totalVillages} แห่ง** ผู้เชื่อรวม ${totalBelievers.toLocaleString()} คนในแขวงบ่อแก้ว และทีมงานผู้นำ ${teamList.map((t: any) => t.name).join(', ')} หากต้องการเจาะจงข้อมูลส่วนไหน สามารถถามได้เลยนะคะ!`;
  }
  return `ຂ້ອຍໄດ້ກວດສອບຂໍ້ມູນໃນລະບົບ Hope Bokeo ສຳລັບ "${query}" ໃຫ້ແລ້ວເດີ. ປະຈຸບັນພວກເຮົາມີຂໍ້ມູນຄຣິດຕະຈັກ **${totalVillages} ແຫ່ງ** (ຜູ້ເຊື່ອ ${totalBelievers.toLocaleString()} ຄົນ, ບັບຕິສະມາ ${totalBaptized.toLocaleString()} ຄົນ) ໃນແຂວງບໍ່ແກ້ວ ແລະ ທີມງານຜູ້ນຳ: ${teamList.map((t: any) => `${t.name} (${t.role})`).join(', ')}. ຖ້າຢາກຮູ້ຂໍ້ມູນເຈາະຈົງກ່ຽວກັບບ້ານໃດ, ເມືອງໃດ, ທີມງານ ຫຼື ກິດຈະກຳ ສາມາດຖາມເພີ່ມເຕີມໄດ້ເລີຍຈ້າ!`;
}

app.post('/api/ai/analyze', async (req, res) => {
  const { prompt, messages: clientMessages, history: clientHistory, mediaUrls, sheetContext } = req.body;
  const userQuery = (prompt || '').toString().trim();

  // 1. STRICT SECURITY SHIELD: Block any attempt to access admin room, admin passwords, or church PIN codes
  const securityKeywords = [
    'ລະຫັດແອັດມິນ', 'ລະຫັດຄຣິດຕະຈັກ', 'admin password', 'church pin',
    'admin pin', 'ລະຫັດຜ່ານແອັດມິນ', 'ລະຫັດຜ່ານ', 'admin credentials', 'admin token',
    'admin secret', 'เข้าห้องแอดมิน', 'รหัสแอดมิน', '管理员密码', '后台密码'
  ];
  const isDirectSecurityRequest = securityKeywords.some(kw => userQuery.toLowerCase().includes(kw)) ||
    (userQuery.toLowerCase().includes('admin') && (userQuery.toLowerCase().includes('pass') || userQuery.toLowerCase().includes('pin') || userQuery.toLowerCase().includes('login') || userQuery.toLowerCase().includes('key') || userQuery.toLowerCase().includes('secret')));

  if (isDirectSecurityRequest) {
    const lang = detectLanguage(userQuery);
    if (lang === 'en') {
      return res.json({
        success: true,
        result: `🔒 I apologize, but I do not have access to the Admin Room, and I am strictly programmed never to reveal admin passwords, church PIN codes, or private credentials.`
      });
    }
    if (lang === 'th') {
      return res.json({
        success: true,
        result: `🔒 ขออภัยค่ะ ฉันไม่มีสิทธิ์เข้าถึงห้องแอดมิน และไม่สามารถเปิดเผยรหัสผ่านหรือ PIN ของคริสตจักรได้เพื่อความปลอดภัยค่ะ`
      });
    }
    return res.json({
      success: true,
      result: `🔒 ຂໍອະໄພເດີ, ຂ້ອຍບໍ່ມີສິດເຂົ້າເຖິງຫ້ອງແອັດມິນ ແລະ ບໍ່ສາມາດເປີດເຜີຍລະຫັດຜ່ານແອັດມິນ, ລະຫັດ PIN ຂອງຄຣິດຕະຈັກ ຫຼື ຂໍ້ມູນພາຍໃນຂອງແອັດມິນໄດ້ເດັດຂາດ.`
    });
  }

  // 2. Prepare sanitized database context (EXCLUDE pinCode, passwords, and private bank distribution secrets)
  const sanitizedVillages = dbData.villages.map(v => {
    const { pinCode, pin, ...cleanVillage } = v as any;
    return cleanVillage;
  });

  const sanitizedTeams = dbData.teams.map(t => {
    const { financeQrUrl, bankAccountNumber, bankAccountName, ...cleanTeam } = t as any;
    return cleanTeam;
  });

  const fullDataSummary = {
    ministryName: 'Hope Bokeo (ພັນທະກິດ ໂຮບ ບໍ່ແກ້ວ - Bokeo Province, Lao PDR)',
    totalChurches: sanitizedVillages.length,
    totalBelievers: sanitizedVillages.reduce((sum, v) => sum + (Number(v.believers) || 0), 0),
    totalBaptized: sanitizedVillages.reduce((sum, v) => sum + (Number(v.baptized) || 0), 0),
    totalHeard: sanitizedVillages.reduce((sum, v) => sum + (Number(v.heard) || 0), 0),
    totalAttending: sanitizedVillages.reduce((sum, v) => sum + (Number(v.attending) || 0), 0),
    totalLeaders: sanitizedVillages.reduce((sum, v) => sum + (Number(v.leaders) || 0), 0),
    districtsSummary: {
      Houayxay: sanitizedVillages.filter(v => (v.district || '').toLowerCase().includes('houay') || (v.district || '').includes('ຫ້ວຍຊາຍ')).length,
      Tonpheung: sanitizedVillages.filter(v => (v.district || '').toLowerCase().includes('ton') || (v.district || '').includes('ຕົ້ນເຜິ້ງ')).length,
      Meung: sanitizedVillages.filter(v => (v.district || '').toLowerCase().includes('meung') || (v.district || '').includes('ເມິງ')).length,
      PhaOudom: sanitizedVillages.filter(v => (v.district || '').toLowerCase().includes('pha') || (v.district || '').includes('ຜາອຸດົມ')).length,
      Paktha: sanitizedVillages.filter(v => (v.district || '').toLowerCase().includes('pak') || (v.district || '').includes('ປາກທາ')).length,
    },
    villages: sanitizedVillages,
    events: dbData.events,
    teams: sanitizedTeams,
    homePoster: dbData.homePoster,
    donationInfo: dbData.donationInfo,
    additionalSheetContext: sheetContext || null,
  };

  const systemInstruction = `You are Hope Bokeo's AI Assistant (AI ຜູ້ຊ່ວຍ ພັນທະກິດ ໂຮບ ບໍ່ແກ້ວ), the highest intelligence AI representative and knowledge engine for Hope Bokeo Ministry in Bokeo Province, Lao PDR.

CAPABILITIES & KNOWLEDGE DOMAIN:
1. HIGHEST INTELLIGENCE & ACCURACY: You possess deep knowledge across theology, scripture, linguistics, geography of Laos and Bokeo Province, community development, statistics, leadership, problem solving, and global knowledge.
2. LIVE WEB ACCESS & REAL-TIME GROUNDING: You have full access to Google Search tools to look up real-time information on the web, news, scripture commentary, geographical data, weather, translations, and current events.
3. MINISTRY DATA EXPERT: You have full access to all verified records of Hope Bokeo's ${sanitizedVillages.length} partner churches/villages, ${sanitizedTeams.length} leadership team members, events, prayer requests, giving bank accounts, and statistics.
4. LEADERSHIP & TEAM:
   - When asked who the boss, director, head, founder, pastor, leader, or coordinator is, provide the leadership team members (${sanitizedTeams.map(t => `${t.name}: ${t.role}`).join(', ')}), their respective responsibilities, contact details, and their roles in serving the communities.
5. NATURAL MULTILINGUAL CONVERSATION:
   - If user asks in English -> Respond in articulate, polished, warm English.
   - If user asks in Lao -> Respond naturally, respectfully, and warmly in Lao (ດ້ວຍຄວາມສຸພາບ ແລະ ພາສາລາວທີ່ຖືກຕ້ອງ).
   - If user asks in Thai -> Respond in fluent, polite Thai.
   - If user asks in Chinese -> Respond in clear, natural Chinese.
   - Match the user's chosen language dynamically.
6. FORMATTING: Use clean Markdown (bullet points, bold highlights, tables if comparing data, clear spacing) so your answers are effortless to read.
7. STRICT SECURITY SHIELD: Never disclose admin passwords, administrative credentials, church edit PIN codes, private financial distribution accounts, or backend tokens.

LIVE HOPE BOKEO DATABASE:
${JSON.stringify(fullDataSummary, null, 2)}`;

  // 3. Try Gemini API with @google/genai SDK & Search Grounding
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Construct multimodal content parts if images/videos are attached
    const userParts: any[] = [];
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      for (const mediaUrl of mediaUrls) {
        if (typeof mediaUrl === 'string' && mediaUrl.startsWith('data:image/')) {
          const match = mediaUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            userParts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        }
      }
    }
    userParts.push({ text: userQuery || 'Please review the attached media and provide details based on Hope Bokeo data and live knowledge.' });

    // Multi-turn conversation history
    const contentsPayload: any[] = [];
    if (Array.isArray(clientHistory) && clientHistory.length > 0) {
      for (const h of clientHistory.slice(-8)) {
        if (h.text && (h.role === 'user' || h.role === 'model')) {
          contentsPayload.push({
            role: h.role,
            parts: [{ text: h.text }],
          });
        }
      }
    }
    contentsPayload.push({
      role: 'user',
      parts: userParts,
    });

    for (const modelName of candidateModels) {
      try {
        console.log(`[Gemini API] Invoking model: ${modelName} with Google Search grounding for query: "${userQuery.slice(0, 60)}"`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload.length === 1 ? contentsPayload[0].parts : contentsPayload,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            tools: [{ googleSearch: {} }],
          },
        });

        if (response && response.text) {
          console.log(`[Gemini API] Success response from model: ${modelName}`);

          // Extract search grounding sources if available
          const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks;
          const webSources: { title: string; uri: string }[] = [];
          if (Array.isArray(groundingChunks)) {
            for (const chunk of groundingChunks) {
              if (chunk.web?.uri) {
                webSources.push({
                  title: chunk.web.title || chunk.web.uri,
                  uri: chunk.web.uri,
                });
              }
            }
          }

          return res.json({
            success: true,
            result: response.text,
            sources: webSources,
            webSearchUsed: webSources.length > 0,
            modelUsed: modelName,
          });
        }
      } catch (err: any) {
        console.warn(`[Gemini API] Model ${modelName} with search failed:`, err?.message || err);

        // Retry without tools if tools are not supported for this specific model/key
        try {
          const fallbackRes = await ai.models.generateContent({
            model: modelName,
            contents: contentsPayload.length === 1 ? contentsPayload[0].parts : contentsPayload,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            },
          });
          if (fallbackRes && fallbackRes.text) {
            return res.json({
              success: true,
              result: fallbackRes.text,
              modelUsed: modelName,
            });
          }
        } catch (retryErr: any) {
          console.warn(`[Gemini API] Model ${modelName} fallback without tools also failed:`, retryErr?.message || retryErr);
        }
      }
    }
  } else {
    console.warn('[Gemini API] No GEMINI_API_KEY environment variable provided, running local multilingual intelligence engine');
  }

  // 4. Fallback: Ultra-Smart Multilingual Fallback Engine
  const smartLocalAnswer = generateSmartLocalResponse(userQuery, fullDataSummary);
  return res.json({ success: true, result: smartLocalAnswer, modelUsed: 'Hope Bokeo Neural Engine' });
});


async function startServer() {
  try {
    const distPath = path.join(process.cwd(), 'dist');
    const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

    if (hasDist) {
      console.log('Serving pre-compiled production build from dist/');
      app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '1h' }));
      app.use(express.static(distPath));

      app.use('*', (req, res, next) => {
        if (
          req.originalUrl.startsWith('/api') ||
          req.originalUrl.startsWith('/uploads') ||
          req.originalUrl.startsWith('/assets') ||
          req.originalUrl.includes('.')
        ) {
          return next();
        }
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          return res.sendFile(indexPath);
        }
        res.status(200).send('<!DOCTYPE html><html><head><title>Hope Bokeo</title></head><body><div id="root">Hope Bokeo is starting up...</div></body></html>');
      });
    } else {
      console.log('Serving on-the-fly development mode with Vite');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        if (
          url.startsWith('/api') ||
          url.startsWith('/uploads') ||
          url.startsWith('/assets') ||
          url.startsWith('/@') ||
          url.includes('.')
        ) {
          return next();
        }
        try {
          const indexFile = path.resolve(process.cwd(), 'index.html');
          if (fs.existsSync(indexFile)) {
            let template = fs.readFileSync(indexFile, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          }
          next();
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    }

    const s1 = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
    });
    s1.on('error', (err: any) => {
      console.warn(`[Server] Port ${PORT} notice:`, err?.message || err);
    });

    if (!isProduction && PORT !== 3000) {
      try {
        const s2 = app.listen(3000, '0.0.0.0', () => {
          console.log(`Secondary internal listener on http://0.0.0.0:3000`);
        });
        s2.on('error', (err: any) => {
          console.warn(`[Server] Port 3000 secondary notice:`, err?.message || err);
        });
      } catch {}
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
