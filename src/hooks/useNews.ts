import { useQuery } from "@tanstack/react-query";
import { fetchNewsFromSupabase } from "@/api/news";

const NEWS_QUERY_KEY = ["news"] as const;
const REPORTS_QUERY_KEY = ["news", "reports"] as const;

/**
 * @param reportsOnly true ise sadece Stratejik Raporlar (is_report === true) listelenir.
 * @param countryCode Ülke filtresi (örn. "JP", "AU"); "All" veya boş ise tümü.
 */
export function useNews(reportsOnly?: boolean, countryCode?: string) {
  return useQuery({
    queryKey: reportsOnly ? [...REPORTS_QUERY_KEY, countryCode ?? "all"] : [...NEWS_QUERY_KEY, countryCode ?? "all"],
    queryFn: () => fetchNewsFromSupabase(reportsOnly, countryCode),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
