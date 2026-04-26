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
  REPORT_COUNTRY_CODE,
  reportSources,
  type CountryNewsConfig,
  type NewsSourceItem,
} from "@/config/newsSources";

const NEWS_TABLE = "news";

const BATCH_SIZE = 80;
/** Ülke başına en fazla kaç yeni haber çevrilip kaydedilir (süre ve API kotası için). */
const MAX_NEW_ITEMS_PER_COUNTRY = 25;
const OPENAI_MODEL = "gpt-4o-mini";

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
 * Raporlar için item.is_report === true ve item.country_code genelde REPORT_COUNTRY_CODE olmalı.
 */
export async function saveNewsToSupabase(items: NewsItem[]): Promise<number> {
  if (items.length === 0) return 0;
  const supabase = getSupabase();
  const rows = items.map((item) => ({
    title: item.title,
    summary_tr: item.summary_tr,
    source_url: item.source_url,
    country_code: item.country_code,
    is_report: item.is_report ?? false,
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

type AITagResult = {
  is_asia_pacific: boolean;
  country_code: string;
};

/**
 * Haberin gerçek odağını AI ile etiketler.
 * Asya-Pasifik dışı haberlerde is_asia_pacific=false döner ve kayıt atlanır.
 */
async function classifyNewsWithAI(
  raw: RawNewsItem,
  fallbackCountryCode: string
): Promise<AITagResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // OpenAI anahtarı yoksa mevcut davranışı bozmayalım.
    return { is_asia_pacific: true, country_code: fallbackCountryCode };
  }

  const systemPrompt =
    "Sen Asya-Pasifik editörsün. Haber başlığı+özeti okuyup haberin asıl odağını tek ülke kodu ile etiketle. " +
    "Sadece JSON döndür: {\"is_asia_pacific\": boolean, \"country_code\": \"CN|JP|KR|KP|TW|TH|VN|ID|MY|SG|PH|IN|AU|NZ|RP\"}. " +
    "Birden fazla ülke veya bölgesel konuysa country_code='RP'. Asya-Pasifik dışıysa is_asia_pacific=false ve country_code='RP'.";
  const userPrompt = `Title: ${raw.title}\nSummary: ${raw.summary}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 120,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI classify failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return { is_asia_pacific: true, country_code: fallbackCountryCode };

  try {
    const parsed = JSON.parse(content) as Partial<AITagResult>;
    const isAP = Boolean(parsed.is_asia_pacific);
    const code = String(parsed.country_code ?? fallbackCountryCode)
      .toUpperCase()
      .slice(0, 2);
    const allowed = new Set([
      "CN", "JP", "KR", "KP", "TW", "TH", "VN", "ID", "MY", "SG", "PH", "IN", "AU", "NZ", "RP",
    ]);
    return {
      is_asia_pacific: isAP,
      country_code: allowed.has(code) ? code : fallbackCountryCode,
    };
  } catch {
    return { is_asia_pacific: true, country_code: fallbackCountryCode };
  }
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
      const tag = await classifyNewsWithAI(raw, config.country_code);
      if (!tag.is_asia_pacific) {
        console.log(`[newsScraper] Skip non-AP: ${raw.link}`);
        continue;
      }
      results.push(await toNewsItem(raw, tag.country_code));
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

/** Raporlar için ülke başına işlenecek maksimum yeni öğe (API kotası). */
const MAX_REPORT_ITEMS_PER_SOURCE = 15;

/** Kaynak bilgisi ile etiketlenmiş ham rapor öğesi (sadece countAsReport kaynaklardan gelenler rapor sayılır). */
type RawWithSource = { raw: RawNewsItem; source: (typeof reportSources)[number] };

/**
 * IPRC yayın sayfasından son analiz linklerini çeker (RSS yoksa fallback).
 */
async function fetchIprcAnalyses(listUrl: string): Promise<RawNewsItem[]> {
  const res = await fetch(listUrl, {
    headers: {
      "User-Agent":
        "AsyaPasifikHaber/1.0 (News aggregator; +https://github.com/asya-pasifik-haber)",
    },
  });
  if (!res.ok) throw new Error(`IPRC page fetch failed: ${res.status}`);
  const html = await res.text();

  // /tr/yayinlar/... linklerini çek
  const regex = /href="([^"]*\/tr\/yayinlar\/[^"#?]+)"/gi;
  const links = new Set<string>();
  let m: RegExpExecArray | null = null;
  while ((m = regex.exec(html)) !== null) {
    const href = m[1];
    const abs = href.startsWith("http") ? href : `https://www.iprc.tr${href.startsWith("/") ? "" : "/"}${href}`;
    if (!abs.includes("/tr/yayinlar/")) continue;
    links.add(abs);
    if (links.size >= 12) break;
  }

  const items: RawNewsItem[] = [];
  for (const link of Array.from(links).slice(0, 10)) {
    // başlığı URL slug'ından üret; özeti AI sonradan üretecek
    const slug = link.split("/").filter(Boolean).pop() ?? "iprc-analiz";
    const title = slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    items.push({
      title,
      summary: "IPRC analiz yayını",
      link,
      isoDate: new Date().toISOString(),
    });
  }
  return items;
}

function absoluteUrl(base: string, href: string): string {
  if (href.startsWith("http")) return href;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/**
 * HTML sayfalarda analiz/yayın linklerini (RSS yoksa) çekmek için genel toplayıcı.
 */
async function fetchHtmlAnalysesByPatterns(
  listUrl: string,
  linkPathHints: string[]
): Promise<RawNewsItem[]> {
  const res = await fetch(listUrl, {
    headers: {
      "User-Agent":
        "AsyaPasifikHaber/1.0 (News aggregator; +https://github.com/asya-pasifik-haber)",
    },
  });
  if (!res.ok) throw new Error(`HTML page fetch failed: ${res.status}`);
  const html = await res.text();

  const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const links = new Map<string, string>();
  let m: RegExpExecArray | null = null;
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1];
    const textRaw = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const abs = absoluteUrl(listUrl, href);
    const lower = abs.toLowerCase();
    const matchesHint = linkPathHints.some((h) => lower.includes(h));
    if (!matchesHint) continue;
    if (abs.includes("#") || abs.includes("?")) continue;
    if (!textRaw || textRaw.length < 8) continue;
    if (!links.has(abs)) links.set(abs, textRaw);
    if (links.size >= 12) break;
  }

  return Array.from(links.entries())
    .slice(0, 10)
    .map(([link, title]) => ({
      title,
      summary: title,
      link,
      isoDate: new Date().toISOString(),
    }));
}

async function fetchHtmlAnalyses(source: (typeof reportSources)[number]): Promise<RawNewsItem[]> {
  const name = source.name.toLowerCase();
  if (name.includes("iprc")) {
    return fetchIprcAnalyses(source.url);
  }
  if (name.includes("tasam")) {
    return fetchHtmlAnalysesByPatterns(source.url, ["/blog/", "/analiz", "/yayin"]);
  }
  if (name.includes("ankasam")) {
    return fetchHtmlAnalysesByPatterns(source.url, ["/analiz", "/degerlendirme", "/yazi"]);
  }
  if (name.includes("ciis")) {
    return fetchHtmlAnalysesByPatterns(source.url, ["/english/", "/opinion", "/research", "/article"]);
  }
  if (name.includes("jiia")) {
    return fetchHtmlAnalysesByPatterns(source.url, ["/en/", "/research", "/column", "/analysis"]);
  }
  if (name.includes("asan")) {
    return fetchHtmlAnalysesByPatterns(source.url, ["/contents/", "/analysis", "/issue-brief", "/report"]);
  }
  return fetchHtmlAnalysesByPatterns(source.url, ["/analysis", "/report", "/research", "/article"]);
}

/**
 * Stratejik rapor kaynaklarından (reportSources) RSS çeker. Sadece countAsReport: true olan kaynaklardan gelenler is_report: true ile kaydedilir; The Diplomat, SCMP vb. is_report: false.
 */
export async function scrapeReports(): Promise<NewsItem[]> {
  const allRawWithSource: RawWithSource[] = [];
  for (const source of reportSources) {
    try {
      const items =
        source.kind === "rss"
          ? await fetchRssFeed(source.url)
          : await fetchHtmlAnalyses(source);
      items.forEach((raw) => allRawWithSource.push({ raw, source }));
    } catch (err) {
      console.warn(`[newsScraper] Report source failed ${source.name}:`, err);
    }
  }
  const seen = new Set<string>();
  const unique = allRawWithSource.filter(({ raw }) => {
    if (seen.has(raw.link)) return false;
    seen.add(raw.link);
    return true;
  });
  unique.sort((a, b) => {
    const tA = a.raw.isoDate ?? a.raw.pubDate ?? "";
    const tB = b.raw.isoDate ?? b.raw.pubDate ?? "";
    return tB.localeCompare(tA);
  });

  const urls = unique.map(({ raw }) => raw.link);
  const existingUrls = await getExistingSourceUrls(urls);
  const newItems = unique.filter(({ raw }) => !existingUrls.has(raw.link));
  const toProcess = newItems.slice(0, MAX_REPORT_ITEMS_PER_SOURCE * reportSources.length);
  console.log(
    `[newsScraper] Raporlar: ${unique.length} RSS öğesi, ${existingUrls.size} zaten DB'de, ${newItems.length} yeni (çeviri + kayıt)`
  );

  const results: NewsItem[] = [];
  for (const { raw, source } of toProcess) {
    try {
      const baseCountryCode = source.country_code ?? REPORT_COUNTRY_CODE;
      const tag = await classifyNewsWithAI(raw, baseCountryCode);
      if (!tag.is_asia_pacific) {
        console.log(`[newsScraper] Skip non-AP report/news: ${raw.link}`);
        continue;
      }
      const countryCode = tag.country_code;
      const item = await toNewsItem(raw, countryCode);
      item.is_report = source.countAsReport;
      results.push(item);
    } catch (err) {
      console.warn("[newsScraper] Report translate failed for:", raw.link, err);
    }
  }

  if (results.length > 0) {
    const saved = await saveNewsToSupabase(results);
    if (saved === 0) console.warn("[newsScraper] Rapor kayıt yapıldı ama insert sonucu 0 döndü.");
    const reportCount = results.filter((r) => r.is_report).length;
    console.log(`[newsScraper] Toplam ${saved} yeni kayıt (${reportCount} rapor, ${saved - reportCount} haber olarak işlendi).`);
  }
  return results;
}
