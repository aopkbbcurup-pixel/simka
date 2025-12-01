import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useOffline } from '../hooks/useOffline';
import { useSync } from '../hooks/useSync';
import { getStorageStats } from '../services/offlineStorage';

interface StorageStats {
  users: number;
  debtors: number;
  credits: number;
  collaterals: number;
  notifications: number;
  syncQueue: number;
  pendingSync: number;
}

interface SyncContextType {
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  storageStats: StorageStats | null;
  performSync: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const { isOnline, isOffline } = useOffline();
  const { isSyncing, lastSyncTime, performFullSync } = useSync();
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  // Refresh storage stats
  const refreshStats = async () => {
    const stats = await getStorageStats();
    if (stats) {
      setStorageStats(stats);
    }
  };

  // Perform sync
  const performSync = async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return;
    }

    await performFullSync();
    await refreshStats();
  };

  // Initial stats load
  useEffect(() => {
    refreshStats();
  }, []);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStats();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Refresh stats after sync
  useEffect(() => {
    if (!isSyncing && lastSyncTime) {
      refreshStats();
    }
  }, [isSyncing, lastSyncTime]);

  const value: SyncContextType = {
    isOnline,
    isOffline,
    isSyncing,
    lastSyncTime,
    storageStats,
    performSync,
    refreshStats
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSyncContext = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};

export default SyncContext;
