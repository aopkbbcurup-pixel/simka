const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://ogfgekttjcmstguburkd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service role key for server-side
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // Anon key for client-side operations

// Create Supabase client with service role (for server-side operations)
// This bypasses Row Level Security - use carefully!
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Create Supabase client with anon key (respects RLS)
const supabaseClient = supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    })
  : null;

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(supabaseUrl && (supabaseServiceKey || supabaseAnonKey));
};

// Get appropriate client based on context
const getSupabaseClient = (useAdmin = false) => {
  if (!isSupabaseConfigured()) {
    console.warn('⚠️  Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    return null;
  }
  
  return useAdmin ? supabaseAdmin : supabaseClient;
};

// Test Supabase connection
const testSupabaseConnection = async () => {
  if (!isSupabaseConfigured()) {
    console.log('ℹ️  Supabase not configured - skipping connection test');
    return false;
  }

  try {
    const client = getSupabaseClient(true);
    if (!client) return false;

    // Test connection by querying a simple table or checking auth
    const { data, error } = await client.from('users').select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table not found (acceptable during setup)
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
};

// Initialize and test connection
if (isSupabaseConfigured()) {
  testSupabaseConnection();
} else {
  console.log('ℹ️  Supabase configuration not found. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env to enable Supabase integration.');
}

module.exports = {
  supabaseAdmin,
  supabaseClient,
  getSupabaseClient,
  isSupabaseConfigured,
  testSupabaseConnection,
  supabaseUrl
};
