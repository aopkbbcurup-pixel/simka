const path = require('path');
const dotenv = require('dotenv');

// Load env
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env file:', result.error);
}

console.log('Checking Supabase Configuration...');
console.log('Env file path:', envPath);
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);

const { isSupabaseConfigured } = require('./services/storageService');
console.log('isSupabaseConfigured (from service):', isSupabaseConfigured);
