import Dexie, { Table } from 'dexie';

// Define interfaces for our data models
export interface IUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface IDebtor {
  id: string;
  debtor_code: string;
  full_name: string;
  ktp_number?: string;
  birth_date?: string;
  birth_place?: string;
  gender?: string;
  marital_status?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  occupation?: string;
  company_name?: string;
  company_address?: string;
  monthly_income?: number;
  spouse_name?: string;
  spouse_ktp?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  notes?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ICredit {
  id: string;
  contract_number: string;
  account_number?: string;
  debtor_id: string;
  credit_type: string;
  plafond: number;
  outstanding: number;
  interest_rate: number;
  tenor_months: number;
  monthly_payment?: number;
  start_date: string;
  maturity_date: string;
  purpose?: string;
  status: string;
  collectibility: string;
  last_payment_date?: string;
  days_past_due: number;
  restructure_count: number;
  last_restructure_date?: string;
  account_officer?: string;
  branch_code?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ICollateral {
  id: string;
  credit_id: string;
  type: string;
  description?: string;
  estimated_value: number;
  appraisal_value?: number;
  appraisal_date?: string;
  appraisal_company?: string;
  certificate_number?: string;
  certificate_type?: string;
  certificate_date?: string;
  owner_name?: string;
  address?: string;
  city?: string;
  province?: string;
  land_area?: number;
  building_area?: number;
  year_built?: number;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_plate_number?: string;
  vehicle_engine_number?: string;
  vehicle_chassis_number?: string;
  insurance_policy_number?: string;
  insurance_company?: string;
  insurance_expiry_date?: string;
  tax_expiry_date?: string;
  binding_type?: string;
  binding_date?: string;
  binding_number?: string;
  storage_location?: string;
  physical_condition?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface INotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  is_read: boolean;
  read_at?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ISyncQueueItem {
  id?: string;
  entity_type: string;
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface IMetadata {
  key: string;
  value: any;
  updated_at: string;
}

// Dexie database class
class SimkaOfflineDB extends Dexie {
  users!: Table<IUser, string>;
  debtors!: Table<IDebtor, string>;
  credits!: Table<ICredit, string>;
  collaterals!: Table<ICollateral, string>;
  notifications!: Table<INotification, string>;
  syncQueue!: Table<ISyncQueueItem, string>;
  metadata!: Table<IMetadata, string>;

  constructor() {
    super('SimkaOfflineDB');
    
    this.version(1).stores({
      users: 'id, username, email, role',
      debtors: 'id, debtor_code, full_name, ktp_number, created_by',
      credits: 'id, contract_number, debtor_id, status, collectibility, maturity_date',
      collaterals: 'id, credit_id, type, insurance_expiry_date, tax_expiry_date',
      notifications: 'id, user_id, is_read, created_at',
      syncQueue: '++id, entity_type, entity_id, status, created_at',
      metadata: 'key'
    });
  }
}

// Create database instance
export const db = new SimkaOfflineDB();

// Helper functions for offline storage

/**
 * Save data to offline storage
 */
export const saveToOffline = async <T extends { id: string }>(
  table: keyof SimkaOfflineDB,
  data: T | T[]
): Promise<void> => {
  try {
    const tableRef = db[table] as Table<T, string>;
    if (Array.isArray(data)) {
      await tableRef.bulkPut(data);
    } else {
      await tableRef.put(data);
    }
  } catch (error) {
    console.error(`Error saving to offline storage (${table}):`, error);
    throw error;
  }
};

/**
 * Get data from offline storage
 */
export const getFromOffline = async <T>(
  table: keyof SimkaOfflineDB,
  id: string
): Promise<T | undefined> => {
  try {
    const tableRef = db[table] as Table<T, string>;
    return await tableRef.get(id);
  } catch (error) {
    console.error(`Error getting from offline storage (${table}):`, error);
    return undefined;
  }
};

/**
 * Get all data from offline storage
 */
export const getAllFromOffline = async <T>(
  table: keyof SimkaOfflineDB
): Promise<T[]> => {
  try {
    const tableRef = db[table] as Table<T, string>;
    return await tableRef.toArray();
  } catch (error) {
    console.error(`Error getting all from offline storage (${table}):`, error);
    return [];
  }
};

/**
 * Delete data from offline storage
 */
export const deleteFromOffline = async (
  table: keyof SimkaOfflineDB,
  id: string
): Promise<void> => {
  try {
    const tableRef = db[table] as Table<any, string>;
    await tableRef.delete(id);
  } catch (error) {
    console.error(`Error deleting from offline storage (${table}):`, error);
    throw error;
  }
};

/**
 * Clear all data from a table
 */
export const clearOfflineTable = async (
  table: keyof SimkaOfflineDB
): Promise<void> => {
  try {
    const tableRef = db[table] as Table<any, string>;
    await tableRef.clear();
  } catch (error) {
    console.error(`Error clearing offline storage (${table}):`, error);
    throw error;
  }
};

/**
 * Add item to sync queue
 */
export const addToSyncQueue = async (
  entityType: string,
  entityId: string,
  operation: 'create' | 'update' | 'delete',
  data: any
): Promise<void> => {
  try {
    const queueItem: ISyncQueueItem = {
      entity_type: entityType,
      entity_id: entityId,
      operation,
      data,
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.syncQueue.add(queueItem);
  } catch (error) {
    console.error('Error adding to sync queue:', error);
    throw error;
  }
};

/**
 * Get pending sync queue items
 */
export const getPendingSyncItems = async (): Promise<ISyncQueueItem[]> => {
  try {
    return await db.syncQueue
      .where('status')
      .equals('pending')
      .or('status')
      .equals('failed')
      .and((item: ISyncQueueItem) => item.retry_count < 3)
      .toArray();
  } catch (error) {
    console.error('Error getting pending sync items:', error);
    return [];
  }
};

/**
 * Update sync queue item status
 */
export const updateSyncQueueStatus = async (
  id: string,
  status: 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> => {
  try {
    const updates: Partial<ISyncQueueItem> = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (errorMessage) {
      updates.error_message = errorMessage;
    }
    
    if (status === 'failed') {
      const item = await db.syncQueue.get(id);
      if (item) {
        updates.retry_count = (item.retry_count || 0) + 1;
      }
    }
    
    await db.syncQueue.update(id, updates);
  } catch (error) {
    console.error('Error updating sync queue status:', error);
    throw error;
  }
};

/**
 * Clear completed sync queue items
 */
export const clearCompletedSyncItems = async (): Promise<void> => {
  try {
    await db.syncQueue.where('status').equals('completed').delete();
  } catch (error) {
    console.error('Error clearing completed sync items:', error);
  }
};

/**
 * Save metadata
 */
export const saveMetadata = async (key: string, value: any): Promise<void> => {
  try {
    await db.metadata.put({
      key,
      value,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving metadata:', error);
    throw error;
  }
};

/**
 * Get metadata
 */
export const getMetadata = async (key: string): Promise<any> => {
  try {
    const item = await db.metadata.get(key);
    return item?.value;
  } catch (error) {
    console.error('Error getting metadata:', error);
    return null;
  }
};

/**
 * Get database statistics
 */
export const getStorageStats = async () => {
  try {
    const stats = {
      users: await db.users.count(),
      debtors: await db.debtors.count(),
      credits: await db.credits.count(),
      collaterals: await db.collaterals.count(),
      notifications: await db.notifications.count(),
      syncQueue: await db.syncQueue.count(),
      pendingSync: await db.syncQueue.where('status').equals('pending').count()
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return null;
  }
};

export default db;
