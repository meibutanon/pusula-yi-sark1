/**
 * Asya-Pasifik ülkeleri için haber çekme servisi.
 * RSS beslemelerini ve (opsiyonel) haber API'larını kullanır,
 * başlık ve özeti Türkçe'ye çevirir; yeni haberleri Supabase'e kaydeder.
 */

import Parser from "rss-parser";
import type { NewsItem, RawNewsItem } from "@/types/news";
import { translateToTurkish, translateToTurkishSummary } from "@/lib/translate";
import { getSupabase } from "@/lib/supabase";
import {
  ASIA_PACIFIC_NEWS_CONFIG,
  getConfigByCountryCode,
  type CountryNewsConfig,
  type NewsSourceItem,
} from "@/config/newsSources";

const NEWS_TABLE = "news";

const BATCH_SIZE = 80;
/** Ülke başına en fazla kaç yeni haber çevrilip kaydedilir (süre ve API kotası için). */
const MAX_NEW_ITEMS_PER_COUNTRY = 25;

/**
 * Veritabanında zaten bulunan source_url'leri döndürür.
 * Bu URL'ler için çeviri yapılmaz ve tekrar insert edilmez.
 * Çok sayıda URL için batch'ler halinde sorgular (sınır aşımı önlenir).
 */
export async function getExistingSourceUrls(
  sourceUrls: string[]
): Promise<Set<string>> {
  if (sourceUrls.length === 0) return new Set();
  const supabase = getSupabase();
  const existing = new Set<string>();
  for (let i = 0; i < sourceUrls.length; i += BATCH_SIZE) {
    const batch = sourceUrls.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .select("source_url")
      .in("source_url", batch);
    if (error) throw new Error(`Supabase getExistingSourceUrls: ${error.message}`);
    (data ?? []).forEach((r: { source_url: string }) => existing.add(r.source_url));
  }
  return existing;
}

/**
 * Haberleri Supabase news tablosuna ekler.
 * source_url unique olduğu için tekrar varsa DB hatası alınır; önce getExistingSourceUrls ile filtreleyin.
 */
export async function saveNewsToSupabase(items: NewsItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const supabase = getSupabase();
  const rows = items.map((item) => ({
    title: item.title,
    summary_tr: item.summary_tr,
    source_url: item.source_url,
    country_code: item.country_code,
    created_at: item.timestamp,
  }));
  const { data, error } = await supabase.from(NEWS_TABLE).insert(rows).select("id");
  if (error) throw new Error(`Supabase saveNews: ${error.message}`);
  const inserted = Array.isArray(data) ? data.length : 0;
  console.log(`[newsScraper] Supabase'e ${inserted} haber yazıldı.`);
  return inserted;
}

const rssParser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "AsyaPasifikHaber/1.0 (News aggregator; +https://github.com/asya-pasifik-haber)",
  },
});

/**
 * Tek bir RSS feed URL'inden haberleri çeker.
 */
export async function fetchRssFeed(feedUrl: string): Promise<RawNewsItem[]> {
  const feed = await rssParser.parseURL(feedUrl);
  const items: RawNewsItem[] = (feed.items ?? [])
    .map((item) => ({
      title: item.title ?? "",
      summary: item.contentSnippet ?? item.content ?? item.summary ?? "",
      link: item.link ?? item.guid ?? "",
      pubDate: item.pubDate,
      isoDate: item.isoDate,
    }))
    .filter((i) => i.title && i.link)
    .slice(0, 10); // İŞTE FREN SİSTEMİMİZ BURASI! Sadece ilk 10 haber geçebilir.
    
  return items;
}

/**
 * Tek bir haber kaynağından (RSS veya API) ham öğeleri döndürür.
 */
async function fetchFromSource(
  source: NewsSourceItem,
  _countryCode: string
): Promise<RawNewsItem[]> {
  if (source.kind === "rss") {
    return fetchRssFeed(source.url);
  }
  // API kaynakları ileride eklenebilir (örn. NewsAPI, GNews)
  return [];
}

/**
 * Ham haberi Türkçe başlık/özet ile NewsItem'a dönüştürür.
 */
async function toNewsItem(
  raw: RawNewsItem,
  countryCode: string
): Promise<NewsItem> {
  const timestamp = raw.isoDate ?? raw.pubDate ?? new Date().toISOString();
  const titleTr = await translateToTurkish(raw.title);
  const summaryTr = await translateToTurkishSummary(
    raw.title,
    raw.summary?.slice(0, 2000) || raw.title
  );
  return {
    title: titleTr,
    summary_tr: summaryTr,
    source_url: raw.link,
    country_code: countryCode,
    timestamp,
  };
}

/**
 * Belirli bir ülkenin tüm kaynaklarından haberleri çeker, Türkçe'ye çevirir ve döndürür.
 */
export async function scrapeCountry(countryCode: string): Promise<NewsItem[]> {
  const config = getConfigByCountryCode(countryCode);
  if (!config) {
    throw new Error(`Unknown country code: ${countryCode}`);
  }
  return scrapeFromConfig(config);
}

/**
 * Tek bir ülke konfigürasyonundan haberleri çeker.
 */
export async function scrapeFromConfig(
  config: CountryNewsConfig
): Promise<NewsItem[]> {
  const allRaw: RawNewsItem[] = [];
  for (const source of config.sources) {
    try {
      const items = await fetchFromSource(source, config.country_code);
      allRaw.push(...items);
    } catch (err) {
      console.warn(
        `[newsScraper] Failed to fetch ${source.name ?? source.url}:`,
        err
      );
    }
  }
  // Tarihe göre yeniden eskiye, aynı link tekrarlarını kaldır
  const seen = new Set<string>();
  const unique = allRaw.filter((i) => {
    if (seen.has(i.link)) return false;
    seen.add(i.link);
    return true;
  });
  unique.sort((a, b) => {
    const tA = a.isoDate ?? a.pubDate ?? "";
    const tB = b.isoDate ?? b.pubDate ?? "";
    return tB.localeCompare(tA);
  });

  // Veritabanında zaten varsa çeviri yapma ve tekrar kaydetme (API tasarrufu + temiz DB)
  const urls = unique.map((i) => i.link);
  const existingUrls = await getExistingSourceUrls(urls);
  const newRaw = unique.filter((i) => !existingUrls.has(i.link));
  const toProcess = newRaw.slice(0, MAX_NEW_ITEMS_PER_COUNTRY);
  console.log(
    `[newsScraper] ${config.country_code}: ${unique.length} RSS öğesi, ${existingUrls.size} zaten DB'de, ${newRaw.length} yeni (çeviri + kayıt)`
  );
  if (newRaw.length > MAX_NEW_ITEMS_PER_COUNTRY) {
    console.log(
      `[newsScraper] ${config.country_code}: ${newRaw.length} yeni var, ilk ${MAX_NEW_ITEMS_PER_COUNTRY} işlenecek.`
    );
  }

  const results: NewsItem[] = [];
  for (const raw of toProcess) {
    try {
      results.push(await toNewsItem(raw, config.country_code));
    } catch (err) {
      console.warn("[newsScraper] Translate failed for:", raw.link, err);
    }
  }

  if (results.length > 0) {
    const saved = await saveNewsToSupabase(results);
    if (saved === 0) console.warn("[newsScraper] Kayıt yapıldı ama insert sonucu 0 döndü.");
  }
  return results;
}

/**
 * Tüm Asya-Pasifik ülkelerinden haberleri çeker.
 * @param countryCodes Opsiyonel; verilmezse tüm ülkeler. Örn. ['JP', 'KR', 'AU']
 */
export async function scrapeAll(
  countryCodes?: string[]
): Promise<NewsItem[]> {
  const configs = countryCodes?.length
    ? countryCodes
        .map((c) => getConfigByCountryCode(c))
        .filter((c): c is CountryNewsConfig => !!c)
    : ASIA_PACIFIC_NEWS_CONFIG;

  const all: NewsItem[] = [];
  for (const config of configs) {
    try {
      const items = await scrapeFromConfig(config);
      all.push(...items);
    } catch (err) {
      console.warn(`[newsScraper] Failed for ${config.country_code}:`, err);
    }
  }
  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  if (all.length === 0) {
    console.log(
      "[newsScraper] Yeni haber yok: RSS’teki tüm linkler zaten veritabanında. Scraper bitti. Yeni link yok — tüm RSS linkleri zaten veritabanında, ek kayıt yazılmadı. (Zaten var olan linkleri yaptım.)"
    );
  } else {
    console.log(`[newsScraper] Toplam ${all.length} yeni haber eklendi.`);
  }
  return all;
}
