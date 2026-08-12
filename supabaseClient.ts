
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vjcfqgzbzskfihtkanza.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x_iYgckRVzAjsrR9oAreoA_wz11aNiz';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.log('Supabase falling back to default URL');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    const reasonStr = typeof reason === 'string' ? reason : JSON.stringify(reason);
    if (
      reasonStr.includes('Refresh Token') ||
      reasonStr.includes('refresh_token_not_found') ||
      reasonStr.includes('Invalid Refresh Token')
    ) {
      console.warn('Caught unhandled rejection for Invalid Refresh Token, clearing stale session tokens.');
      event.preventDefault();
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error("Error clearing auth storage keys:", e);
      }
    }
  });
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
