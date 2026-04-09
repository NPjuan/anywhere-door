import { createClient } from '@supabase/supabase-js'

/* ============================================================
   Supabase 客户端
   支持标准 anon key 和 publishable key 两种命名
   ============================================================ */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!url || !key) {
  throw new Error(
    'Missing Supabase env vars.\n' +
    'Add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) to .env.local\n' +
    'See: https://supabase.com/dashboard/project/_/settings/api'
  )
}

export const supabase = createClient(url, key)
