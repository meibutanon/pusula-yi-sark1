/**
 * Supabase'den haber listesini çeker.
 * created_at'e göre en yeniden eskiye sıralı.
 */

import { getSupabase } from "@/lib/supabase";
import type { NewsRow } from "@/types/news";

const NEWS_TABLE = "news";

export async function fetchNewsFromSupabase(): Promise<NewsRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(NEWS_TABLE)
    .select("id, title, summary_tr, source_url, country_code, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("JWT") || msg.includes("PGRST301") || msg.includes("Row level security"))
      throw new Error("Supabase izin hatası. Anon key ve RLS politikalarını kontrol edin.");
    throw new Error(`Haberler alınamadı: ${msg}`);
  }
  return (data ?? []) as NewsRow[];
}
