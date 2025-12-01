import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ogfgekttjcmstguburkd.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZmdla3R0amNtc3RndWJ1cmtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5Nzc1MDgsImV4cCI6MjA3NTU1MzUwOH0.yyWhshoAshsxgRRgM7Vzvr6NNzTbVpSmL6WOQUUMfNo';

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Database table names
export const TABLES = {
  USERS: 'users',
  DEBTORS: 'debtors',
  CREDITS: 'credits',
  COLLATERALS: 'collaterals',
  DOCUMENTS: 'documents',
  PAYMENTS: 'payments',
  INSURANCES: 'insurances',
  INSURANCE_CLAIMS: 'insurance_claims',
  NOTIFICATIONS: 'notifications',
  SYNC_QUEUE: 'sync_queue'
} as const;

// Realtime channels
export const CHANNELS = {
  DEBTORS: 'debtors-changes',
  CREDITS: 'credits-changes',
  COLLATERALS: 'collaterals-changes',
  NOTIFICATIONS: 'notifications-changes'
} as const;

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (!error) return 'Unknown error occurred';

  // Handle specific error codes
  if (error.code === 'PGRST116') {
    return 'Table not found. Please ensure database is properly set up.';
  }

  if (error.code === '23505') {
    return 'This record already exists.';
  }

  if (error.code === '23503') {
    return 'Cannot delete this record as it is referenced by other records.';
  }

  return error.message || 'An error occurred';
};

// Test Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️  Supabase is not configured');
    return false;
  }

  try {
    const { error } = await supabase.from(TABLES.USERS).select('count', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }

    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
};

export default supabase;
