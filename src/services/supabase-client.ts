import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 클라이언트.
 * URL과 anon 키는 환경 변수로만 주입한다 (.env / Vercel 환경 변수).
 * 미설정 시 null — 각 서비스는 mock adapter로 폴백한다.
 * anon 키는 클라이언트 공개용 키이며, service_role 키는 절대 프런트엔드에 두지 않는다.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;
