import { db, collection, doc, getDocs, getDoc, setDoc, deleteDoc } from './firebase';
import { optimizePosterForFirestore, emergencyCompressObject } from '../utils/imageCompressor';
import { parseCoordinatesFromUrl, normalizeCoordinates } from '../utils/mapUtils';
import { DEFAULT_BOKEO_TIMELINE } from '../data/timelineDefaults';
import { initialDefaultFinanceData } from '../data/financeDefaults';
import initialDefaultFinanceQrMembers from '../data/financeQrDefaults.json';
import ministryDefaults from '../data/ministryDefaults.json';

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data as any;
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj as T;
}

const VILLAGES_COL = 'villages';
const EVENTS_COL = 'events';
const TEAMS_COL = 'teams';
const DONATIONS_COL = 'donations_ledger';
const DISTRIBUTIONS_COL = 'team_distributions';
const FINANCE_QR_MEMBERS_COL = 'finance_qr_members';
const CONFIG_COL = 'app_config';

export const initialDefaultData = {
  ...ministryDefaults,
  homePoster: {
    ...ministryDefaults.homePoster,
    bokeoTimeline:
      Array.isArray(ministryDefaults.homePoster?.bokeoTimeline) &&
      ministryDefaults.homePoster.bokeoTimeline.length > 0
        ? ministryDefaults.homePoster.bokeoTimeline
        : DEFAULT_BOKEO_TIMELINE,
  },
};

let firestoreReadCooldownUntil = 0;

export function isFirestoreReadQuotaExceeded(): boolean {
  return Date.now() < firestoreReadCooldownUntil;
}

export function markFirestoreQuotaExceeded(err: any): boolean {
  const msg = String(err?.message || err?.code || err || '');
  if (
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded')
  ) {
    firestoreReadCooldownUntil = Date.now() + 3 * 60 * 1000;
    return true;
  }
  return false;
}

export async function loadFirestoreData(): Promise<{
  villages: any[] | null;
  events: any[] | null;
  teams: any[] | null;
  homePoster: any | null;
  donationInfo: any | null;
  globalSettings: any | null;
  fromFirestore: boolean;
  quotaExceeded?: boolean;
}> {
  if (isFirestoreReadQuotaExceeded()) {
    return {
      villages: null,
      events: null,
      teams: null,
      homePoster: null,
      donationInfo: null,
      globalSettings: null,
      fromFirestore: false,
      quotaExceeded: true,
    };
  }

  try {
    let villages: any[] = [];
    let events: any[] = [];
    let teams: any[] = [];
    let loadedVillages = false;
    let loadedEvents = false;
    let loadedTeams = false;

    try {
      const villagesSnap = await getDocs(collection(db, VILLAGES_COL));
      if (!villagesSnap.empty) {
        loadedVillages = true;
        villages = villagesSnap.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id || data.id,
            heard: Number(data.heard) || 0,
            believers: Number(data.believers) || 0,
            baptized: Number(data.baptized) || 0,
            attending: typeof data.attending === 'number' ? data.attending : (Number(data.attending) || 0),
            leaders: typeof data.leaders === 'number' ? Math.max(0, data.leaders) : Math.max(0, Number(data.leaders) || 0),
          };
        });
      }
    } catch (e: any) {
      markFirestoreQuotaExceeded(e);
      if (isFirestoreReadQuotaExceeded()) {
        return {
          villages: null,
          events: null,
          teams: null,
          homePoster: null,
          donationInfo: null,
          globalSettings: null,
          fromFirestore: false,
          quotaExceeded: true,
        };
      }
    }

    try {
      const eventsSnap = await getDocs(collection(db, EVENTS_COL));
      if (!eventsSnap.empty) {
        loadedEvents = true;
        events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e: any) {
      markFirestoreQuotaExceeded(e);
    }

    try {
      const teamsSnap = await getDocs(collection(db, TEAMS_COL));
      if (!teamsSnap.empty) {
        loadedTeams = true;
        teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e: any) {
      markFirestoreQuotaExceeded(e);
    }

    // Merge teams with default reference teams so QR codes and bank details are never lost
    const defTeamsMap = new Map((initialDefaultData.teams || []).map((t: any) => [t.name?.trim().toLowerCase(), t]));
    if (loadedTeams && teams.length > 0) {
      teams = teams.map((t: any) => {
        const def = defTeamsMap.get(t.name?.trim().toLowerCase());
        if (def) {
          return {
            ...def,
            ...t,
            financeQrUrl: (t.financeQrUrl && t.financeQrUrl.trim() !== '') ? t.financeQrUrl : (def.financeQrUrl || ''),
            bankName: (t.bankName && t.bankName.trim() !== '') ? t.bankName : (def.bankName || 'BCEL One'),
            bankAccountNumber: (t.bankAccountNumber && t.bankAccountNumber.trim() !== '') ? t.bankAccountNumber : (def.bankAccountNumber || ''),
            bankAccountName: (t.bankAccountName && t.bankAccountName.trim() !== '') ? t.bankAccountName : (def.bankAccountName || t.name),
            imageUrl: (t.imageUrl && t.imageUrl.trim() !== '') ? t.imageUrl : (def.imageUrl || ''),
          };
        }
        return t;
      });
    }

    let homePoster: any | null = null;
    if (!isFirestoreReadQuotaExceeded()) {
      try {
        const homePosterDoc = await getDoc(doc(db, CONFIG_COL, 'homePoster'));
        if (homePosterDoc.exists()) {
          homePoster = { ...initialDefaultData.homePoster, ...homePosterDoc.data() };
        }
      } catch (e: any) {
        markFirestoreQuotaExceeded(e);
      }
    }

    let donationInfo: any | null = null;
    if (!isFirestoreReadQuotaExceeded()) {
      try {
        const donationDoc = await getDoc(doc(db, CONFIG_COL, 'donationInfo'));
        if (donationDoc.exists()) {
          donationInfo = { ...initialDefaultData.donationInfo, ...donationDoc.data() };
        }
      } catch (e: any) {
        markFirestoreQuotaExceeded(e);
      }
    }

    let globalSettings: any | null = null;
    if (!isFirestoreReadQuotaExceeded()) {
      try {
        const globalDoc = await getDoc(doc(db, CONFIG_COL, 'globalSettings'));
        if (globalDoc.exists()) {
          globalSettings = globalDoc.data();
        }
      } catch (e: any) {
        markFirestoreQuotaExceeded(e);
      }
    }

    const fromFirestore = Boolean(
      loadedVillages || loadedEvents || loadedTeams || homePoster || donationInfo || globalSettings
    );

    return {
      villages: loadedVillages && villages.length > 0 ? villages : null,
      events: loadedEvents && events.length > 0 ? events : null,
      teams: loadedTeams && teams.length > 0 ? teams : null,
      homePoster,
      donationInfo,
      globalSettings,
      fromFirestore,
      quotaExceeded: isFirestoreReadQuotaExceeded(),
    };
  } catch (err: any) {
    markFirestoreQuotaExceeded(err);
    return {
      villages: null,
      events: null,
      teams: null,
      homePoster: null,
      donationInfo: null,
      globalSettings: null,
      fromFirestore: false,
      quotaExceeded: isFirestoreReadQuotaExceeded(),
    };
  }
}

export async function saveVillageToFirestore(village: any) {
  const docId = village.id || `v_${village.rowId || Date.now()}`;
  let finalLat = typeof village.lat === 'number' && !isNaN(village.lat) ? village.lat : undefined;
  let finalLng = typeof village.lng === 'number' && !isNaN(village.lng) ? village.lng : undefined;

  if (finalLat !== undefined && finalLng !== undefined) {
    const norm = normalizeCoordinates(finalLat, finalLng);
    if (norm) {
      finalLat = norm.lat;
      finalLng = norm.lng;
    }
  } else if (village.mapUrl && typeof village.mapUrl === 'string' && village.mapUrl.trim()) {
    const parsed = parseCoordinatesFromUrl(village.mapUrl);
    if (parsed) {
      finalLat = parsed.lat;
      finalLng = parsed.lng;
    }
  }

  const payload = {
    ...village,
    id: docId,
    updatedAt: new Date().toISOString(),
    heard: Number(village.heard) || 0,
    believers: Number(village.believers) || 0,
    baptized: Number(village.baptized) || 0,
    attending: typeof village.attending === 'number' ? dataNumOrZero(village.attending) : (Number(village.attending) || 0),
    leaders: typeof village.leaders === 'number' ? dataNumOrZero(village.leaders) : (Number(village.leaders) || 0),
    hidden: Boolean(village.hidden),
    ...(finalLat !== undefined ? { lat: finalLat } : {}),
    ...(finalLng !== undefined ? { lng: finalLng } : {}),
  };
  await setDoc(doc(db, VILLAGES_COL, docId), sanitizeForFirestore(payload), { merge: true });

  return payload;
}

function dataNumOrZero(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export async function deleteVillageFromFirestore(rowId: number, id?: string) {
  if (id) {
    await deleteDoc(doc(db, VILLAGES_COL, id));
  } else if (!isFirestoreReadQuotaExceeded()) {
    try {
      const snap = await getDocs(collection(db, VILLAGES_COL));
      for (const d of snap.docs) {
        if (d.data().rowId === rowId) {
          await deleteDoc(doc(db, VILLAGES_COL, d.id));
        }
      }
    } catch (e) {
      markFirestoreQuotaExceeded(e);
    }
  }
}

export async function saveEventToFirestore(event: any) {
  const docId = event.id || `e_${event.rowId || Date.now()}`;
  let safeEvent = { ...event, updatedAt: new Date().toISOString() };

  // Guard against Firestore 1MB document limit:
  // If docUrl or docUrls contain oversized base64 data URIs (>100KB), prevent Firestore rejection
  if (typeof safeEvent.docUrl === 'string' && safeEvent.docUrl.startsWith('data:') && safeEvent.docUrl.length > 100000) {
    console.warn('saveEventToFirestore: docUrl contains oversized base64 (>100KB), sanitizing for Firestore.');
    safeEvent.docUrl = '';
  }
  if (Array.isArray(safeEvent.docUrls)) {
    safeEvent.docUrls = safeEvent.docUrls.map((u: string) => {
      if (typeof u === 'string' && u.startsWith('data:') && u.length > 100000) {
        return '';
      }
      return u;
    }).filter(Boolean);
  }

  if (Array.isArray(safeEvent.monthlyReports)) {
    safeEvent.monthlyReports = safeEvent.monthlyReports.map((r: any) => {
      let rDoc = r.docUrl;
      if (typeof rDoc === 'string' && rDoc.startsWith('data:') && rDoc.length > 100000) {
        rDoc = '';
      }
      let rDocs = Array.isArray(r.docUrls) ? r.docUrls.map((u: string) => {
        if (typeof u === 'string' && u.startsWith('data:') && u.length > 100000) {
          return '';
        }
        return u;
      }).filter(Boolean) : [];

      let rImgs = Array.isArray(r.imageUrls) ? r.imageUrls.map((u: string) => {
        if (typeof u === 'string' && u.startsWith('data:') && u.length > 200000) {
          return '';
        }
        return u;
      }).filter(Boolean) : [];

      return {
        ...r,
        docUrl: rDoc,
        docUrls: rDocs,
        imageUrls: rImgs,
      };
    });
  }

  // Guard against Firestore 1MB document limit for images
  if (Array.isArray(safeEvent.imageUrls)) {
    safeEvent.imageUrls = safeEvent.imageUrls.map((u: string) => {
      if (typeof u === 'string' && u.startsWith('data:') && u.length > 250000) {
        return '';
      }
      return u;
    }).filter(Boolean);
  }

  if (JSON.stringify(safeEvent).length > 800000) {
    if (Array.isArray(safeEvent.imageUrls)) {
      safeEvent.imageUrls = safeEvent.imageUrls.slice(0, 5);
    }
  }
  await setDoc(doc(db, EVENTS_COL, docId), sanitizeForFirestore(safeEvent), { merge: true });
  return safeEvent;
}

export async function deleteEventFromFirestore(rowId: number, id?: string) {
  if (id) {
    await deleteDoc(doc(db, EVENTS_COL, id));
  } else if (!isFirestoreReadQuotaExceeded()) {
    try {
      const snap = await getDocs(collection(db, EVENTS_COL));
      for (const d of snap.docs) {
        if (d.data().rowId === rowId) {
          await deleteDoc(doc(db, EVENTS_COL, d.id));
        }
      }
    } catch (e) {
      markFirestoreQuotaExceeded(e);
    }
  }
}

export async function saveTeamToFirestore(team: any) {
  const docId = team.id || `t_${team.rowId || Date.now()}`;
  let existingData: any = {};
  if (!isFirestoreReadQuotaExceeded()) {
    try {
      const snap = await getDoc(doc(db, TEAMS_COL, docId));
      if (snap.exists()) {
        existingData = snap.data() || {};
      }
    } catch (e) {
      markFirestoreQuotaExceeded(e);
    }
  }

  const teamPayload = {
    ...existingData,
    ...team,
    id: docId,
    updatedAt: new Date().toISOString(),
    hidden: team.hidden !== undefined ? Boolean(team.hidden) : Boolean(existingData.hidden),
    financeQrUrl: (team.financeQrUrl && team.financeQrUrl.trim() !== '')
      ? team.financeQrUrl.trim()
      : (existingData.financeQrUrl || ''),
    imageUrl: (team.imageUrl && team.imageUrl.trim() !== '')
      ? team.imageUrl.trim()
      : (existingData.imageUrl || ''),
    bankAccountNumber: (team.bankAccountNumber && team.bankAccountNumber.trim() !== '')
      ? team.bankAccountNumber.trim()
      : (existingData.bankAccountNumber || ''),
    bankName: (team.bankName && team.bankName.trim() !== '')
      ? team.bankName.trim()
      : (existingData.bankName || 'BCEL One'),
    bankAccountName: (team.bankAccountName && team.bankAccountName.trim() !== '')
      ? team.bankAccountName.trim()
      : (existingData.bankAccountName || existingData.name || team.name || ''),
  };

  await setDoc(doc(db, TEAMS_COL, docId), sanitizeForFirestore(teamPayload), { merge: true });
  return teamPayload;
}

export async function deleteTeamFromFirestore(rowId: number, id?: string) {
  if (id) {
    await deleteDoc(doc(db, TEAMS_COL, id)).catch(() => {});
  }
  if (!isFirestoreReadQuotaExceeded()) {
    try {
      const snap = await getDocs(collection(db, TEAMS_COL));
      for (const d of snap.docs) {
        if (d.data().rowId === rowId || d.id === id || d.id === `t_${rowId}`) {
          await deleteDoc(doc(db, TEAMS_COL, d.id)).catch(() => {});
        }
      }
    } catch (e) {
      markFirestoreQuotaExceeded(e);
    }
  }
}

function withFirestoreWriteTimeout<T>(promise: Promise<T>, ms = 3500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Firestore write timed out after ${ms}ms`));
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

export async function saveHomePosterToFirestore(poster: any) {
  let safePoster = { ...poster, updatedAt: poster?.updatedAt || new Date().toISOString() };
  if (!safePoster?._isOptimized) {
    safePoster = await optimizePosterForFirestore(safePoster);
  }
  const jsonSize = JSON.stringify(safePoster).length;

  if (jsonSize > 850000) {
    console.warn(`saveHomePosterToFirestore: Document size ${jsonSize} is high. Running emergency compression...`);
    safePoster = await emergencyCompressObject(safePoster);
  }

  try {
    await withFirestoreWriteTimeout(
      setDoc(doc(db, CONFIG_COL, 'homePoster'), sanitizeForFirestore(safePoster), { merge: true }),
      3500
    );
  } catch (err: any) {
    console.warn('Firestore setDoc initial attempt warning:', err);
    if (
      err?.message?.includes('exceeds the maximum allowed size') ||
      err?.message?.includes('too large') ||
      jsonSize > 850000
    ) {
      console.warn('Retrying saveHomePoster with deep compression...');
      safePoster = await emergencyCompressObject(safePoster);
      await withFirestoreWriteTimeout(
        setDoc(doc(db, CONFIG_COL, 'homePoster'), sanitizeForFirestore(safePoster), { merge: true }),
        3500
      ).catch(() => {});
      return;
    }
    markFirestoreQuotaExceeded(err);
  }
}

export async function saveDonationInfoToFirestore(info: any) {
  try {
    await withFirestoreWriteTimeout(
      setDoc(
        doc(db, CONFIG_COL, 'donationInfo'),
        sanitizeForFirestore({ ...info, updatedAt: info?.updatedAt || new Date().toISOString() }),
        { merge: true }
      ),
      3500
    );
  } catch (err: any) {
    markFirestoreQuotaExceeded(err);
  }
}

export async function saveGlobalSettingsToFirestore(settings: {
  autoThemeEnabled?: boolean;
  autoThemeStart?: string;
  autoThemeEnd?: string;
  darkModeDefault?: boolean;
  logoUrl?: string;
}) {
  const stamped = { ...settings, updatedAt: new Date().toISOString() };
  try {
    if (typeof localStorage !== 'undefined') {
      const existing = localStorage.getItem('hb_cached_global_settings');
      const merged = existing ? { ...JSON.parse(existing), ...stamped } : stamped;
      localStorage.setItem('hb_cached_global_settings', JSON.stringify(merged));
    }
  } catch {}

  if (typeof fetch !== 'undefined') {
    fetch('/api/save-global-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stamped),
    }).catch(() => {});
  }

  try {
    await setDoc(
      doc(db, CONFIG_COL, 'globalSettings'),
      sanitizeForFirestore(stamped),
      { merge: true }
    );
  } catch (e) {
    console.warn('saveGlobalSettingsToFirestore notice:', e);
  }
}

function mergeWithDefaultDonations(loaded: any[]): any[] {
  if (Array.isArray(loaded)) {
    return loaded;
  }
  return initialDefaultFinanceData.donations;
}

function mergeWithDefaultDistributions(loaded: any[]): any[] {
  if (Array.isArray(loaded)) {
    return loaded;
  }
  return initialDefaultFinanceData.distributions;
}

export async function loadFinanceData() {
  // 1. Check local storage cache for instant offline access
  let cachedDonations: any[] = [];
  let cachedDistributions: any[] = [];
  let cachedSettings: any = null;

  try {
    if (typeof localStorage !== 'undefined') {
      const donRaw = localStorage.getItem('hb_cached_donations');
      if (donRaw) {
        const parsed = JSON.parse(donRaw) || [];
        if (parsed.some((d: any) => d.id === 'don_20260805_001')) {
          localStorage.removeItem('hb_cached_donations');
          localStorage.removeItem('hb_cached_distributions');
          cachedDonations = [];
          cachedDistributions = [];
        } else {
          cachedDonations = parsed;
        }
      }
      const distRaw = localStorage.getItem('hb_cached_distributions');
      if (distRaw) cachedDistributions = JSON.parse(distRaw) || [];
      const setRaw = localStorage.getItem('hb_cached_finance_settings');
      if (setRaw) cachedSettings = JSON.parse(setRaw);
    }
  } catch {}

  let apiDonations: any[] = [];
  let apiDistributions: any[] = [];
  let apiSettings: any = null;

  // 2. Fetch from backend /api/finance-data (disk ledger backup)
  try {
    const res = await fetch('/api/finance-data');
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        apiDonations = Array.isArray(json.donations) ? json.donations : [];
        apiDistributions = Array.isArray(json.distributions) ? json.distributions : [];
        apiSettings = json.financeSettings || null;
      }
    }
  } catch {}

  // 3. Read from Firestore (online or cache) so records and settings added on live deployments are always prioritized
  let fsDonations: any[] = [];
  let fsDistributions: any[] = [];
  let fsSettings: any = null;
  if (!isFirestoreReadQuotaExceeded()) {
    try {
      const donSnap = await getDocs(collection(db, DONATIONS_COL));
      fsDonations = donSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const distSnap = await getDocs(collection(db, DISTRIBUTIONS_COL));
      fsDistributions = distSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const settingsSnap = await getDoc(doc(db, CONFIG_COL, 'financeSettings'));
      if (settingsSnap.exists()) {
        fsSettings = settingsSnap.data();
      }
    } catch (e: any) {
      markFirestoreQuotaExceeded(e);
    }
  }

  // Merge by ID (prioritizing live Firestore records over disk ledger)
  const mergeById = (primary: any[], secondary: any[]) => {
    const map = new Map<string, any>();
    for (const item of secondary) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const item of primary) {
      if (item && item.id) {
        const existing = map.get(item.id);
        map.set(item.id, existing ? { ...existing, ...item } : item);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      String(b.createdAt || b.date || b.transferDate || '').localeCompare(
        String(a.createdAt || a.date || a.transferDate || '')
      )
    );
  };

  const combinedDonations =
    fsDonations.length > 0 || apiDonations.length > 0
      ? mergeById(fsDonations, apiDonations)
      : cachedDonations;

  const combinedDistributions =
    fsDistributions.length > 0 || apiDistributions.length > 0
      ? mergeById(fsDistributions, apiDistributions)
      : cachedDistributions;

  const finalDonations = mergeWithDefaultDonations(
    combinedDonations.length > 0 ? combinedDonations : initialDefaultFinanceData.donations
  );
  const finalDistributions = mergeWithDefaultDistributions(
    combinedDistributions.length > 0 ? combinedDistributions : initialDefaultFinanceData.distributions
  );
  const finalSettings = fsSettings || apiSettings || cachedSettings || initialDefaultFinanceData.financeSettings;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hb_cached_donations', JSON.stringify(finalDonations));
      localStorage.setItem('hb_cached_distributions', JSON.stringify(finalDistributions));
      localStorage.setItem('hb_cached_finance_settings', JSON.stringify(finalSettings));
    }
  } catch {}

  return {
    donations: finalDonations,
    distributions: finalDistributions,
    financeSettings: finalSettings,
  };
}

export async function saveFinanceSettingsToFirestore(settings: { emergencyReservePercent: number }) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hb_cached_finance_settings', JSON.stringify(settings));
    }
  } catch {}

  fetch('/api/save-finance-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  }).catch(() => {});

  try {
    await setDoc(doc(db, CONFIG_COL, 'financeSettings'), sanitizeForFirestore(settings), { merge: true });
  } catch (e) {
    console.warn('Firestore setDoc notice for financeSettings:', e);
  }
}

export async function saveDonationTransactionToFirestore(item: any) {
  const docId = item.id || `don_${Date.now()}`;
  const payload = { ...item, id: docId };

  // 1. Update localStorage cache immediately
  try {
    if (typeof localStorage !== 'undefined') {
      const donRaw = localStorage.getItem('hb_cached_donations');
      const list = donRaw ? JSON.parse(donRaw) : [];
      const idx = list.findIndex((x: any) => x.id === docId);
      if (idx >= 0) list[idx] = payload;
      else list.unshift(payload);
      localStorage.setItem('hb_cached_donations', JSON.stringify(list));
    }
  } catch {}

  // 2. Dispatch to server backend for disk persistence
  fetch('/api/save-donation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});

  // 3. Persist to Firestore
  try {
    await setDoc(doc(db, DONATIONS_COL, docId), sanitizeForFirestore(payload), { merge: true });
  } catch (e) {
    console.warn('Firestore setDoc notice for donation transaction:', e);
  }

  return payload;
}

export async function deleteDonationTransactionFromFirestore(id: string) {
  try {
    if (typeof localStorage !== 'undefined') {
      const donRaw = localStorage.getItem('hb_cached_donations');
      const list = donRaw ? JSON.parse(donRaw) : [];
      const filtered = list.filter((x: any) => x.id !== id);
      localStorage.setItem('hb_cached_donations', JSON.stringify(filtered));
    }
  } catch {}

  try {
    await fetch('/api/delete-donation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {}

  try {
    await deleteDoc(doc(db, DONATIONS_COL, id));
  } catch (e) {
    console.warn('Firestore deleteDoc notice for donation transaction:', e);
  }
}

export async function saveTeamDistributionToFirestore(item: any) {
  const docId = item.id || `dist_${Date.now()}`;
  const payload = { ...item, id: docId };

  // 1. Update localStorage cache immediately
  try {
    if (typeof localStorage !== 'undefined') {
      const distRaw = localStorage.getItem('hb_cached_distributions');
      const list = distRaw ? JSON.parse(distRaw) : [];
      const idx = list.findIndex((x: any) => x.id === docId);
      if (idx >= 0) list[idx] = payload;
      else list.unshift(payload);
      localStorage.setItem('hb_cached_distributions', JSON.stringify(list));
    }
  } catch {}

  // 2. Dispatch to server backend for disk persistence
  fetch('/api/save-distribution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});

  // 3. Persist to Firestore
  try {
    await setDoc(doc(db, DISTRIBUTIONS_COL, docId), sanitizeForFirestore(payload), { merge: true });
  } catch (e) {
    console.warn('Firestore setDoc notice for team distribution:', e);
  }

  return payload;
}

export async function deleteTeamDistributionFromFirestore(id: string) {
  try {
    if (typeof localStorage !== 'undefined') {
      const distRaw = localStorage.getItem('hb_cached_distributions');
      const list = distRaw ? JSON.parse(distRaw) : [];
      const filtered = list.filter((x: any) => x.id !== id);
      localStorage.setItem('hb_cached_distributions', JSON.stringify(filtered));
    }
  } catch {}

  try {
    await fetch('/api/delete-distribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch {}

  try {
    await deleteDoc(doc(db, DISTRIBUTIONS_COL, id));
  } catch (e) {
    console.warn('Firestore deleteDoc notice for team distribution:', e);
  }
}

export async function deleteBatchDistributionsFromFirestore(batchId: string, itemIds?: string[], batchName?: string) {
  const ids = Array.isArray(itemIds) ? itemIds : [];
  const idSet = new Set(ids);

  try {
    if (typeof localStorage !== 'undefined') {
      const distRaw = localStorage.getItem('hb_cached_distributions');
      const list = distRaw ? JSON.parse(distRaw) : [];
      const filtered = list.filter((x: any) => {
        if (idSet.has(x.id)) return false;
        if (batchId && (x.batchId === batchId || x.batchName === batchId)) return false;
        if (batchName && (x.batchName === batchName || x.batchId === batchName)) return false;
        return true;
      });
      localStorage.setItem('hb_cached_distributions', JSON.stringify(filtered));
    }
  } catch {}

  try {
    await fetch('/api/delete-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId, ids, batchName }),
    });
  } catch {}

  for (const id of ids) {
    try {
      await deleteDoc(doc(db, DISTRIBUTIONS_COL, id));
    } catch {}
  }
}

export async function loadFinanceQrMembers() {
  const defaultList = (initialDefaultFinanceQrMembers as any[]) || [];
  let cachedQr: any[] = [];
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('hb_cached_qr_members');
      if (raw) cachedQr = JSON.parse(raw) || [];
    }
  } catch {}

  const mergeWithDefaults = (primaryList: any[]): any[] => {
    const map = new Map<string, any>();
    (defaultList || []).forEach((def: any) => {
      map.set(def.name?.trim().toLowerCase(), { ...def });
    });
    (primaryList || []).forEach((p: any) => {
      const key = p.name?.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          ...p,
          financeQrUrl: (p.financeQrUrl && p.financeQrUrl.trim() !== '') ? p.financeQrUrl : (existing.financeQrUrl || ''),
          imageUrl: (p.imageUrl && p.imageUrl.trim() !== '') ? p.imageUrl : (existing.imageUrl || ''),
          bankName: (p.bankName && p.bankName.trim() !== '') ? p.bankName : (existing.bankName || 'BCEL One'),
          bankAccountName: (p.bankAccountName && p.bankAccountName.trim() !== '') ? p.bankAccountName : (existing.bankAccountName || p.name),
          bankAccountNumber: (p.bankAccountNumber && p.bankAccountNumber.trim() !== '') ? p.bankAccountNumber : (existing.bankAccountNumber || ''),
        });
      } else {
        map.set(key || p.id, p);
      }
    });
    return Array.from(map.values());
  };

  // 1. Prioritize live Cloud Firestore first when quota is available
  if (!isFirestoreReadQuotaExceeded()) {
    try {
      const snap = await getDocs(collection(db, FINANCE_QR_MEMBERS_COL));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (list.length > 0) {
        const merged = mergeWithDefaults(list);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('hb_cached_qr_members', JSON.stringify(merged));
          }
        } catch {}
        return merged;
      }
    } catch (e: any) {
      markFirestoreQuotaExceeded(e);
    }
  }

  // 2. Fallback to server backend if Firestore collection was empty or quota exceeded
  try {
    const res = await fetch('/api/finance-qr-members');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.qrMembers) && json.qrMembers.length > 0) {
        const merged = mergeWithDefaults(json.qrMembers);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('hb_cached_qr_members', JSON.stringify(merged));
          }
        } catch {}
        return merged;
      }
    }
  } catch {}

  const finalResult = mergeWithDefaults(cachedQr);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hb_cached_qr_members', JSON.stringify(finalResult));
    }
  } catch {}
  return finalResult;
}

export async function saveFinanceQrMemberToFirestore(item: any) {
  const docId = item.id || `fq_${Date.now()}`;

  let existingData: any = {};
  if (!isFirestoreReadQuotaExceeded()) {
    try {
      const snap = await getDoc(doc(db, FINANCE_QR_MEMBERS_COL, docId));
      if (snap.exists()) {
        existingData = snap.data() || {};
      }
    } catch (e: any) {
      markFirestoreQuotaExceeded(e);
    }
  }

  const payload = {
    ...existingData,
    ...item,
    id: docId,
    updatedAt: new Date().toISOString(),
    financeQrUrl: (item.financeQrUrl && item.financeQrUrl.trim() !== '')
      ? item.financeQrUrl.trim()
      : (existingData.financeQrUrl || ''),
    imageUrl: (item.imageUrl && item.imageUrl.trim() !== '')
      ? item.imageUrl.trim()
      : (existingData.imageUrl || ''),
    bankAccountNumber: (item.bankAccountNumber && item.bankAccountNumber.trim() !== '')
      ? item.bankAccountNumber.trim()
      : (existingData.bankAccountNumber || ''),
    bankName: (item.bankName && item.bankName.trim() !== '')
      ? item.bankName.trim()
      : (existingData.bankName || 'BCEL One'),
    bankAccountName: (item.bankAccountName && item.bankAccountName.trim() !== '')
      ? item.bankAccountName.trim()
      : (existingData.bankAccountName || existingData.name || item.name || ''),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('hb_cached_qr_members');
      const list = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((x: any) => x.id === docId);
      if (idx >= 0) list[idx] = payload;
      else list.push(payload);
      localStorage.setItem('hb_cached_qr_members', JSON.stringify(list));
    }
  } catch {}

  fetch('/api/save-finance-qr-member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});

  try {
    await setDoc(doc(db, FINANCE_QR_MEMBERS_COL, docId), sanitizeForFirestore(payload), { merge: true });
  } catch (e) {
    console.warn('Firestore setDoc notice for QR member:', e);
  }

  return payload;
}

export async function deleteFinanceQrMemberFromFirestore(id: string) {
  if (!id) return;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('hb_cached_qr_members');
      const list = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((x: any) => x.id !== id);
      localStorage.setItem('hb_cached_qr_members', JSON.stringify(filtered));
    }
  } catch {}

  fetch('/api/delete-finance-qr-member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  }).catch(() => {});

  try {
    await deleteDoc(doc(db, FINANCE_QR_MEMBERS_COL, id));
  } catch {}
}

