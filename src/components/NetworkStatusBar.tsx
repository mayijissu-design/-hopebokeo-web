import React from 'react';
import { Language } from '../types';

interface NetworkStatusBarProps {
  isOnline: boolean;
  wasOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  language: Language;
  onManualSync: () => void;
}

export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = () => {
  // All offline caching and online real-time synchronization run silently in the background
  return null;
};

