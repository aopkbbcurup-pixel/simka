import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncStatus, SyncResult } from '../services/syncService';
import { useOffline } from './useOffline';

/**
 * Custom hook for sync functionality
 */
export const useSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const { isOnline, wasOffline } = useOffline();

  // Update last sync time
  useEffect(() => {
    setLastSyncTime(syncService.getLastSyncTime());
  }, []);

  // Listen to sync status changes
  useEffect(() => {
    const handleSyncStatus = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    syncService.addSyncListener(handleSyncStatus);

    return () => {
      syncService.removeSyncListener(handleSyncStatus);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      console.log('📡 Connection restored, syncing data...');
      performFullSync();
    }
  }, [wasOffline, isOnline]);

  /**
   * Perform full bidirectional sync
   */
  const performFullSync = useCallback(async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return null;
    }

    try {
      const result = await syncService.fullSync();
      setSyncResult(result);
      setLastSyncTime(new Date());
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      return null;
    }
  }, [isOnline]);

  /**
   * Sync from Supabase to local
   */
  const syncFromSupabase = useCallback(async (tables?: string[]) => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return null;
    }

    try {
      const result = await syncService.syncFromSupabase(tables);
      setSyncResult(result);
      setLastSyncTime(new Date());
      return result;
    } catch (error) {
      console.error('Sync from Supabase error:', error);
      return null;
    }
  }, [isOnline]);

  /**
   * Sync to Supabase from local
   */
  const syncToSupabase = useCallback(async () => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return null;
    }

    try {
      const result = await syncService.syncToSupabase();
      setSyncResult(result);
      return result;
    } catch (error) {
      console.error('Sync to Supabase error:', error);
      return null;
    }
  }, [isOnline]);

  /**
   * Sync specific entity
   */
  const syncEntity = useCallback(async (table: string, id: string) => {
    if (!isOnline) {
      console.warn('Cannot sync while offline');
      return false;
    }

    try {
      return await syncService.syncEntity(table, id);
    } catch (error) {
      console.error('Sync entity error:', error);
      return false;
    }
  }, [isOnline]);

  return {
    syncStatus,
    lastSyncTime,
    syncResult,
    isSyncing: syncStatus === 'syncing',
    performFullSync,
    syncFromSupabase,
    syncToSupabase,
    syncEntity,
    canSync: isOnline
  };
};

export default useSync;
