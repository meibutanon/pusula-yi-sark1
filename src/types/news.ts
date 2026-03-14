/**
 * Haber ile ilgili tip tanımları.
 */

export interface NewsItem {
  title: string;
  summary_tr: string;
  source_url: string;
  country_code: string;
  timestamp: string; // ISO 8601
}

/** Veritabanındaki news tablosu satırı */
export interface NewsRow {
  id: string;
  title: string;
  summary_tr: string;
  source_url: string;
  country_code: string;
  created_at: string; // ISO 8601
}

export interface RawNewsItem {
  title: string;
  summary: string;
  link: string;
  pubDate?: string;
  isoDate?: string;
}
