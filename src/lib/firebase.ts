import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  setLogLevel,
  collection,
  doc,
  getDocs as rawGetDocs,
  getDoc as rawGetDoc,
  getDocFromServer as rawGetDocFromServer,
  setDoc as rawSetDoc,
  deleteDoc as rawDeleteDoc,
  onSnapshot as rawOnSnapshot,
  enableNetwork,
  disableNetwork,
  type DocumentReference,
  type DocumentData,
  type SetOptions,
  type Query,
  type QuerySnapshot,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal @firebase/firestore SDK console.error logs during free-tier quota backoff or network transitions
setLogLevel('silent');

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

let dbInstance: ReturnType<typeof getFirestore>;

try {
  dbInstance = initializeFirestore(
    app,
    {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    },
    databaseId
  );
} catch {
  dbInstance = getFirestore(app, databaseId);
}

export const db = dbInstance;

const WRITE_QUOTA_KEY = 'hb_fs_write_quota_cooldown_until';
const READ_QUOTA_KEY = 'hb_fs_read_quota_cooldown_until';
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown when daily free quota is exhausted

function getStoredCooldown(key: string): number {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const val = Number(sessionStorage.getItem(key) || '0');
      return isNaN(val) ? 0 : val;
    }
  } catch {}
  return 0;
}

function setStoredCooldown(key: string, until: number): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, String(until));
    }
  } catch {}
}

let writeQuotaCooldownUntil = getStoredCooldown(WRITE_QUOTA_KEY);
let readQuotaCooldownUntil = getStoredCooldown(READ_QUOTA_KEY);
let networkDisabledForQuota = false;

export function isFirestoreWriteQuotaExhausted(): boolean {
  if (Date.now() < writeQuotaCooldownUntil) return true;
  writeQuotaCooldownUntil = getStoredCooldown(WRITE_QUOTA_KEY);
  return Date.now() < writeQuotaCooldownUntil;
}

export function isFirestoreQuotaExhaustedError(err: unknown): boolean {
  const msg = String((err as any)?.message || (err as any)?.code || err || '');
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded')
  );
}

function tripWriteQuotaCircuitBreaker(): void {
  writeQuotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
  setStoredCooldown(WRITE_QUOTA_KEY, writeQuotaCooldownUntil);
  if (!networkDisabledForQuota) {
    networkDisabledForQuota = true;
    // Halts Firestore's internal WriteStream exponential-backoff retry loop immediately
    disableNetwork(dbInstance).catch(() => {});
  }
}

function tripReadQuotaCircuitBreaker(): void {
  readQuotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
  setStoredCooldown(READ_QUOTA_KEY, readQuotaCooldownUntil);
  if (!networkDisabledForQuota) {
    networkDisabledForQuota = true;
    disableNetwork(dbInstance).catch(() => {});
  }
}

// If sessionStorage already recorded a quota exhaustion in this session, keep Firestore network disabled
if (Date.now() < writeQuotaCooldownUntil || Date.now() < readQuotaCooldownUntil) {
  networkDisabledForQuota = true;
  disableNetwork(dbInstance).catch(() => {});
}

/**
 * Quota-safe wrapper around Firestore `setDoc`.
 * - Short-circuits immediately if daily free-tier write quota is exhausted.
 * - Enforces a 2.5s timeout; if Firestore's WriteStream hangs (which happens when the server
 *   returns RESOURCE_EXHAUSTED and the SDK enters exponential backoff), trips the circuit breaker
 *   and calls `disableNetwork` so the SDK stops retrying in the background.
 */
export async function setDoc<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>,
  data: any,
  options?: SetOptions
): Promise<void> {
  if (isFirestoreWriteQuotaExhausted()) {
    return;
  }

  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      // WriteStream did not acknowledge within 2.5s (likely backing off due to quota exhaustion)
      tripWriteQuotaCircuitBreaker();
      resolve();
    }, 2500);

    const writePromise = options
      ? rawSetDoc(reference, data, options)
      : rawSetDoc(reference, data);

    writePromise
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((err) => {
        clearTimeout(timer);
        if (isFirestoreQuotaExhaustedError(err)) {
          tripWriteQuotaCircuitBreaker();
        }
        resolve();
      });
  });
}

/**
 * Quota-safe wrapper around Firestore `deleteDoc`.
 */
export async function deleteDoc<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>
): Promise<void> {
  if (isFirestoreWriteQuotaExhausted()) {
    return;
  }

  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      tripWriteQuotaCircuitBreaker();
      resolve();
    }, 2500);

    rawDeleteDoc(reference)
      .then(() => {
        clearTimeout(timer);
        resolve();
      })
      .catch((err) => {
        clearTimeout(timer);
        if (isFirestoreQuotaExhaustedError(err)) {
          tripWriteQuotaCircuitBreaker();
        }
        resolve();
      });
  });
}

/**
 * Quota-safe wrapper around Firestore `getDoc`.
 */
export async function getDoc<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(
  reference: DocumentReference<AppModelType, DbModelType>
): Promise<DocumentSnapshot<AppModelType, DbModelType>> {
  if (Date.now() < readQuotaCooldownUntil) {
    throw new Error('resource-exhausted: Firestore read cooldown active');
  }
  try {
    return await rawGetDoc(reference);
  } catch (err) {
    if (isFirestoreQuotaExhaustedError(err)) {
      tripReadQuotaCircuitBreaker();
    }
    throw err;
  }
}

/**
 * Quota-safe wrapper around Firestore `getDocs`.
 */
export async function getDocs<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(
  query: Query<AppModelType, DbModelType>
): Promise<QuerySnapshot<AppModelType, DbModelType>> {
  if (Date.now() < readQuotaCooldownUntil) {
    throw new Error('resource-exhausted: Firestore read cooldown active');
  }
  try {
    return await rawGetDocs(query);
  } catch (err) {
    if (isFirestoreQuotaExhaustedError(err)) {
      tripReadQuotaCircuitBreaker();
    }
    throw err;
  }
}

export const getDocFromServer = rawGetDocFromServer;

/**
 * Quota-safe wrapper around Firestore `onSnapshot`.
 */
export const onSnapshot: typeof rawOnSnapshot = ((...args: any[]) => {
  if (Date.now() < readQuotaCooldownUntil) {
    return (() => {}) as Unsubscribe;
  }
  try {
    return (rawOnSnapshot as any)(...args);
  } catch (err) {
    if (isFirestoreQuotaExhaustedError(err)) {
      tripReadQuotaCircuitBreaker();
    }
    return (() => {}) as Unsubscribe;
  }
}) as typeof rawOnSnapshot;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore notice: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export {
  collection,
  doc,
  enableNetwork,
  disableNetwork,
};
