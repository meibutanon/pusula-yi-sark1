import { useQuery } from "@tanstack/react-query";
import { fetchNewsFromSupabase } from "@/api/news";

const NEWS_QUERY_KEY = ["news"] as const;

export function useNews() {
  return useQuery({
    queryKey: NEWS_QUERY_KEY,
    queryFn: fetchNewsFromSupabase,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
