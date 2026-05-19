import { createBrowserClient } from '@supabase/ssr'
import { DEFAULT_SUPABASE_KEY, DEFAULT_SUPABASE_URL } from './config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  DEFAULT_SUPABASE_KEY

export function createClient() {
  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  )
}
