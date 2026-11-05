import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  setLogLevel,
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress transient backend unreachable notices during network switches
setLogLevel('error');

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

let dbInstance: ReturnType<typeof getFirestore>;

try {
  // Use memoryLocalCache to eliminate IndexedDB primary lease contention in multi-tab / iframe preview environments
  // (prevents: "Failed to obtain primary lease for action 'Apply remote event' / 'Collect garbage' / 'Backfill Indexes'")
  // and experimentalForceLongPolling to avoid WebSocket handshake issues in Cloud Run / iframe environments
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  enableNetwork,
  disableNetwork,
};
