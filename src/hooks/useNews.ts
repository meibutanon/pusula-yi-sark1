import { useQuery } from "@tanstack/react-query";
import { fetchNewsFromSupabase } from "@/api/news";

const NEWS_QUERY_KEY = ["news"] as const;
const REPORTS_QUERY_KEY = ["news", "reports"] as const;

/**
 * @param reportsOnly true ise sadece Stratejik Raporlar (is_report === true) listelenir.
 */
export function useNews(reportsOnly?: boolean) {
  return useQuery({
    queryKey: reportsOnly ? REPORTS_QUERY_KEY : NEWS_QUERY_KEY,
    queryFn: () => fetchNewsFromSupabase(reportsOnly),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
