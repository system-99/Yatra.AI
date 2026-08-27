import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient = null

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project-ref')) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.info('[Yatra.AI] Supabase frontend client initialized in fallback mode (Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to connect live database).')
}

export const supabase = supabaseClient
