
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vjcfqgzbzskfihtkanza.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x_iYgckRVzAjsrR9oAreoA_wz11aNiz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
