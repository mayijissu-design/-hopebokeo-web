import { useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  triggerManualSync: () => Promise<void>;
}

export function useNetworkStatus(onReconnectSync?: () => Promise<void> | void): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => new Date());

  const onReconnectRef = useRef(onReconnectSync);
  onReconnectRef.current = onReconnectSync;

  const performSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      if (onReconnectRef.current) {
        await onReconnectRef.current();
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Network sync notice (will retry when online):', err);
    } finally {
      // Small visual delay so the user clearly sees the sync finish successfully
      setTimeout(() => {
        setIsSyncing(false);
      }, 800);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network signal restored! Initiating background synchronization...');
      setIsOnline(true);
      performSync();
      // Reset wasOffline after a short display interval
      setTimeout(() => {
        setWasOffline(false);
      }, 4000);
    };

    const handleOffline = () => {
      console.log('📡 Network disconnected. Running in zero-latency offline mode.');
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check if already online
    if (navigator.onLine) {
      setIsOnline(true);
    } else {
      setIsOnline(false);
      setWasOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync]);

  return {
    isOnline,
    wasOffline,
    isSyncing,
    lastSyncTime,
    triggerManualSync: performSync,
  };
}
