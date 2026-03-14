/**
 * Supabase client ve auth/DB bağlantı yapılandırması.
 * - Web (Vercel): EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY (sadece bunlar tarayıcıya gömülür)
 * - Node (script/CI): SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY veya SUPABASE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const isWeb = typeof window !== "undefined";

// Web'de sadece EXPO_PUBLIC_* kullan (Vercel build'ta bunlar gömülür; diğerleri tarayıcıda yok)
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = isWeb
  ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ""
  : process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    "";

let _client: SupabaseClient | null = null;

const ENV_HINT =
  "Web (Vercel) için: EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlayın.";

export function getSupabase(): SupabaseClient {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error(
        `Supabase ayarları eksik. ${ENV_HINT} (SUPABASE_URL / SUPABASE_ANON_KEY veya SERVICE_ROLE_KEY)`
      );
    }
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}

export function createSupabaseClient(
  url: string = SUPABASE_URL,
  key: string = SUPABASE_KEY
): SupabaseClient {
  return createClient(url, key);
}
