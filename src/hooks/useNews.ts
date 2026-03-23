import { useQuery } from "@tanstack/react-query";
import { fetchNewsFromSupabase } from "@/api/news";

const NEWS_QUERY_KEY = ["news"] as const;
const REPORTS_QUERY_KEY = ["news", "reports"] as const;
const ALL_COUNTRIES_VALUE = "All";

/**
 * @param activeTab aktif sekme (haberler | raporlar).
 * @param selectedCountry Seçili ülke kodu (örn. "JP", "AU"); "All" veya boş ise tümü.
 */
export function useNews(activeTab: "haberler" | "raporlar", selectedCountry?: string) {
  const reportsOnly = activeTab === "raporlar";
  const countryParam =
    selectedCountry === ALL_COUNTRIES_VALUE || !selectedCountry ? undefined : selectedCountry;
  const queryKey = reportsOnly
    ? [...REPORTS_QUERY_KEY, countryParam ?? "all"]
    : [...NEWS_QUERY_KEY, countryParam ?? "all"];
  return useQuery({
    queryKey,
    queryFn: () => fetchNewsFromSupabase(reportsOnly, countryParam),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
