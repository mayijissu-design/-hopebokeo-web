import React from 'react';

interface AutoUpdateListenerProps {
  language?: 'lo' | 'en' | 'th';
  onDataRefresh?: () => void;
}

export const AutoUpdateListener: React.FC<AutoUpdateListenerProps> = () => {
  // Safe listener: Never automatically force window.location.reload() as it causes Out-of-Memory crash loops in multi-instance Cloud Run containers
  return null;
};

