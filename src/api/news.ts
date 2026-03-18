/**
 * Supabase'den haber listesini çeker.
 * created_at'e göre en yeniden eskiye sıralı.
 */

import { getSupabase } from "@/lib/supabase";
import type { NewsRow } from "@/types/news";

const NEWS_TABLE = "news";

/**
 * Supabase'den haber veya rapor listesini çeker.
 * Sorgu: is_report = (reportsOnly) AND (country_code = selectedCountry when not Tümü/All).
 */
export async function fetchNewsFromSupabase(
  reportsOnly?: boolean,
  selectedCountry?: string
): Promise<NewsRow[]> {
  const supabase = getSupabase();
  let q = supabase
    .from(NEWS_TABLE)
    .select("id, title, summary_tr, source_url, country_code, is_report, created_at")
    .order("created_at", { ascending: false });

  if (reportsOnly === true) {
    q = q.eq("is_report", true);
  } else {
    q = q.or("is_report.eq.false,is_report.is.null");
  }
  if (selectedCountry && selectedCountry !== "All") {
    q = q.eq("country_code", selectedCountry);
  }

  const { data, error } = await q;

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("JWT") || msg.includes("PGRST301") || msg.includes("Row level security"))
      throw new Error("Supabase izin hatası. Anon key ve RLS politikalarını kontrol edin.");
    throw new Error(`Haberler alınamadı: ${msg}`);
  }
  return (data ?? []) as NewsRow[];
}
