import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://mnwockpzhhbcavqehrdy.supabase.co';
const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_R3yoD44f33EvVPUu0A7jbg_mc_DJKTF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
