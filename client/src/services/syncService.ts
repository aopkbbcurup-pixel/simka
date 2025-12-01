import { supabase, TABLES, isSupabaseConfigured } from '../config/supabase';
import {
  db,
  saveToOffline,
  getAllFromOffline,
  getPendingSyncItems,
  updateSyncQueueStatus,
  clearCompletedSyncItems,
  saveMetadata,
  getMetadata,
  ISyncQueueItem
} from './offlineStorage';

// Sync status type
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// Sync result interface
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Sync Service - Handles data synchronization between local and Supabase
 */
class SyncService {
  private isSyncing = false;
  private syncListeners: Array<(status: SyncStatus) => void> = [];
  private lastSyncTime: Date | null = null;

  constructor() {
    this.loadLastSyncTime();
  }

  /**
   * Load last sync time from metadata
   */
  private async loadLastSyncTime() {
    const lastSync = await getMetadata('lastSyncTime');
    if (lastSync) {
      this.lastSyncTime = new Date(lastSync);
    }
  }

  /**
   * Add sync status listener
   */
  addSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync status listener
   */
  removeSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach(listener => listener(status));
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Check if currently syncing
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Sync all data from Supabase to local storage
   */
  async syncFromSupabase(tables: string[] = []): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Supabase is not configured']
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Sync already in progress']
      };
    }

    this.isSyncing = true;
    this.notifyListeners('syncing');

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      // Default tables to sync
      const tablesToSync = tables.length > 0 ? tables : [
        TABLES.DEBTORS,
        TABLES.CREDITS,
        TABLES.COLLATERALS,
        TABLES.NOTIFICATIONS
      ];

      for (const table of tablesToSync) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('is_active', true);

          if (error) {
            result.failed++;
            result.errors.push(`Error syncing ${table}: ${error.message}`);
            continue;
          }

          if (data && data.length > 0) {
            await saveToOffline(table as any, data);
            result.synced += data.length;
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Error syncing ${table}: ${error.message}`);
        }
      }

      // Update last sync time
      this.lastSyncTime = new Date();
      await saveMetadata('lastSyncTime', this.lastSyncTime.toISOString());

      this.notifyListeners('success');
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
      this.notifyListeners('error');
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync pending changes to Supabase
   */
  async syncToSupabase(): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Supabase is not configured']
      };
    }

    if (this.isSyncing) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Sync already in progress']
      };
    }

    this.isSyncing = true;
    this.notifyListeners('syncing');

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      const pendingItems = await getPendingSyncItems();

      for (const item of pendingItems) {
        try {
          await updateSyncQueueStatus(item.id!, 'processing');

          let error = null;

          switch (item.operation) {
            case 'create':
            case 'update':
              const { error: upsertError } = await supabase
                .from(item.entity_type)
                .upsert(item.data);
              error = upsertError;
              break;

            case 'delete':
              const { error: deleteError } = await supabase
                .from(item.entity_type)
                .delete()
                .eq('id', item.entity_id);
              error = deleteError;
              break;
          }

          if (error) {
            await updateSyncQueueStatus(item.id!, 'failed', error.message);
            result.failed++;
            result.errors.push(`Failed to sync ${item.entity_type} ${item.entity_id}: ${error.message}`);
          } else {
            await updateSyncQueueStatus(item.id!, 'completed');
            result.synced++;
          }
        } catch (error: any) {
          await updateSyncQueueStatus(item.id!, 'failed', error.message);
          result.failed++;
          result.errors.push(`Error syncing ${item.entity_type} ${item.entity_id}: ${error.message}`);
        }
      }

      // Clean up completed items
      await clearCompletedSyncItems();

      this.notifyListeners('success');
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Sync to Supabase failed: ${error.message}`);
      this.notifyListeners('error');
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Full bidirectional sync
   */
  async fullSync(): Promise<SyncResult> {
    // First sync pending local changes to Supabase
    const uploadResult = await this.syncToSupabase();

    // Then sync latest data from Supabase to local
    const downloadResult = await this.syncFromSupabase();

    return {
      success: uploadResult.success && downloadResult.success,
      synced: uploadResult.synced + downloadResult.synced,
      failed: uploadResult.failed + downloadResult.failed,
      errors: [...uploadResult.errors, ...downloadResult.errors]
    };
  }

  /**
   * Sync specific entity
   */
  async syncEntity(table: string, id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error syncing entity ${table}/${id}:`, error);
        return false;
      }

      if (data) {
        await saveToOffline(table as any, data);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error syncing entity ${table}/${id}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to realtime changes
   */
  subscribeToChanges(table: string, callback: (payload: any) => void) {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        async (payload: any) => {
          // Update local storage with the change
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            await saveToOffline(table as any, payload.new);
          } else if (payload.eventType === 'DELETE') {
            const tableRef = db[table as keyof typeof db];
            if (tableRef && typeof tableRef === 'object' && 'delete' in tableRef) {
              await (tableRef as any).delete(payload.old.id);
            }
          }

          // Notify callback
          callback(payload);
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from realtime changes
   */
  unsubscribeFromChanges(channel: any) {
    if (channel) {
      supabase.removeChannel(channel);
    }
  }
}

// Create singleton instance
export const syncService = new SyncService();

export default syncService;
