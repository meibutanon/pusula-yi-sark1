/**
 * Supabase'den haber listesini çeker.
 * created_at'e göre en yeniden eskiye sıralı.
 */

import { getSupabase } from "@/lib/supabase";
import { getReportCountryCodes } from "@/config/newsSources";
import type { NewsRow } from "@/types/news";

const NEWS_TABLE = "news";

/**
 * Supabase'den haber veya sadece rapor listesini çeker.
 * @param reportsOnly true ise sadece is_report === true kayıtlar döner (Stratejik Raporlar sekmesi için).
 * @param countryCode Raporlar sekmesinde ülke seçildiğinde (örn. "AU", "JP"); "All" veya boş ise uygulanmaz.
 */
export async function fetchNewsFromSupabase(
  reportsOnly?: boolean,
  countryCode?: string
): Promise<NewsRow[]> {
  const supabase = getSupabase();
  let q = supabase
    .from(NEWS_TABLE)
    .select("id, title, summary_tr, source_url, country_code, is_report, created_at")
    .order("created_at", { ascending: false });
  if (reportsOnly === true) {
    q = q.eq("is_report", true);
    if (countryCode && countryCode !== "All") {
      const reportCountries = getReportCountryCodes();
      if (reportCountries.includes(countryCode)) {
        q = q.eq("country_code", countryCode);
      }
    }
  } else {
    q = q.or("is_report.eq.false,is_report.is.null");
    if (countryCode && countryCode !== "All") {
      q = q.eq("country_code", countryCode);
    }
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
