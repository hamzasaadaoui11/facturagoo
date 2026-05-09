
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vjcfqgzbzskfihtkanza.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x_iYgckRVzAjsrR9oAreoA_wz11aNiz';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.log('Supabase falling back to default URL');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: (() => {
      try {
        return window.localStorage;
      } catch (e) {
        return undefined;
      }
    })()
  }
});
