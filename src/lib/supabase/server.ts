// 서버 전용 Supabase 래퍼
// 기존 코드 호환을 위해 createClient() 시그니처를 제공
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'

export function createClient() {
  return supabase
}

export { supabaseAdmin }

