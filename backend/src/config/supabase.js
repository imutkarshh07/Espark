const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

if (!config.supabase.url) {
  console.warn('[Supabase] Warning: SUPABASE_URL is not set. Running in limited/mock mode.');
}

const isPlaceholderKey = (key) =>
  !key ||
  key.includes('your-supabase') ||
  key.includes('placeholder') ||
  key === 'your-supabase-service-role-key';

const publishableKey = !isPlaceholderKey(config.supabase.publishableKey)
  ? config.supabase.publishableKey
  : 'placeholder-key';

const serviceRoleKey = !isPlaceholderKey(config.supabase.serviceRoleKey)
  ? config.supabase.serviceRoleKey
  : publishableKey;

// Client for general verification with publishable key
const supabaseAuthClient = createClient(
  config.supabase.url || 'https://placeholder.supabase.co',
  publishableKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Admin client using service-role key for backend operations & storage
const supabaseAdminClient = createClient(
  config.supabase.url || 'https://placeholder.supabase.co',
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

module.exports = {
  supabaseAuthClient,
  supabaseAdminClient,
};
