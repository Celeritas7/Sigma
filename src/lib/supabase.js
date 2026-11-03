import { createClient } from '@supabase/supabase-js'

// =============================================================================
// CONFIG (UNCHANGED from original — same Supabase project, same tables)
// =============================================================================
export const SUPABASE_URL = 'https://wylxvmkcrexwfpjpbhyy.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_e3pDOuxIdstaC7s0a680kQ_R10TrAyv'

export let supabase = null
export let supabaseInitError = null
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} catch (e) {
  supabaseInitError = e.message || String(e)
}
if (supabase && window.AkatsukiBroadcast) window.AkatsukiBroadcast(supabase, 'sigma').start()
