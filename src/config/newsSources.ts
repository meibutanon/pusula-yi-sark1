/**
 * Asya-Pasifik haber kaynakları (Güncellenmiş & Güçlendirilmiş Liste).
 * Sadece şu kategorilerdeki başlıklar taranır (gereksiz çeviri ve API yükü azaltılır):
 * Son Dakika, Siyaset, Ekonomi, Yaşam, Teknoloji ve Bilim, Eğitim, Spor, Tarih ve Arşiv, Sanat.
 */

export type NewsSourceKind = "rss" | "api";

/** Taranacak kategori başlıkları */
export const SCAN_CATEGORIES = [
  "Son Dakika",
  "Siyaset",
  "Ekonomi",
  "Yaşam",
  "Teknoloji ve Bilim",
  "Eğitim",
  "Spor",
  "Tarih ve Arşiv",
  "Sanat",
] as const;

export type ScanCategory = (typeof SCAN_CATEGORIES)[number];

export interface NewsSourceItem {
  kind: NewsSourceKind;
  url: string;
  apiKeyEnv?: string;
  name?: string;
  /** Kategori (sadece bu kategorideki feed'ler eklenir) */
  category?: ScanCategory;
}

export interface CountryNewsConfig {
  country_code: string;
  country_name_en: string;
  sources: NewsSourceItem[];
}

const C = {
  SonDakika: "Son Dakika" as const,
  Siyaset: "Siyaset" as const,
  Ekonomi: "Ekonomi" as const,
  Yasam: "Yaşam" as const,
  TeknolojiBilim: "Teknoloji ve Bilim" as const,
  Egitim: "Eğitim" as const,
  Spor: "Spor" as const,
  TarihArsiv: "Tarih ve Arşiv" as const,
  Sanat: "Sanat" as const,
};

export const ASIA_PACIFIC_NEWS_CONFIG: CountryNewsConfig[] = [
  {
    country_code: "JP",
    country_name_en: "Japan",
    sources: [
      { kind: "rss", url: "https://www.nhk.or.jp/rss/news/cat0.xml", name: "NHK Ana Haberler", category: C.SonDakika },
      { kind: "rss", url: "https://japantoday.com/feed", name: "Japan Today", category: C.SonDakika },
    ],
  },
  {
    country_code: "KR",
    country_name_en: "South Korea",
    sources: [
      { kind: "rss", url: "https://en.yna.co.kr/RSS/news.xml", name: "Yonhap (Devlet Ajansı)", category: C.SonDakika },
      { kind: "rss", url: "https://www.koreaherald.com/rss/020100000000.xml", name: "Korea Herald", category: C.Siyaset },
    ],
  },
  {
    country_code: "AU",
    country_name_en: "Australia",
    sources: [
      { kind: "rss", url: "https://www.abc.net.au/news/feed/51120/rss.xml", name: "ABC News", category: C.SonDakika },
      { kind: "rss", url: "https://www.smh.com.au/rss/feed.xml", name: "Sydney Morning Herald", category: C.Siyaset },
    ],
  },
  {
    country_code: "CN",
    country_name_en: "China",
    sources: [
      { kind: "rss", url: "https://www.chinadaily.com.cn/rss/china_rss.xml", name: "China Daily", category: C.SonDakika },
      { kind: "rss", url: "https://www.scmp.com/rss/2/feed", name: "SCMP China", category: C.Siyaset },
      { kind: "rss", url: "https://hongkongfp.com/feed/", name: "HKFP", category: C.Siyaset },
    ],
  },
  {
    country_code: "IN",
    country_name_en: "India",
    sources: [
      { kind: "rss", url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", name: "Times of India", category: C.SonDakika },
      { kind: "rss", url: "https://www.thehindu.com/news/international/feeder/default.rss", name: "The Hindu (Bağımsız)", category: C.Siyaset },
    ],
  },
  {
    country_code: "SG",
    country_name_en: "Singapore",
    sources: [
      { kind: "rss", url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", name: "CNA", category: C.SonDakika },
    ],
  },
  {
    country_code: "ID",
    country_name_en: "Indonesia",
    sources: [
      { kind: "rss", url: "https://en.antaranews.com/rss/news.xml", name: "Antara News (Devlet Ajansı)", category: C.SonDakika },
      { kind: "rss", url: "https://en.tempo.co/rss", name: "Tempo", category: C.Siyaset },
    ],
  },
  {
    country_code: "TH",
    country_name_en: "Thailand",
    sources: [
      { kind: "rss", url: "https://www.bangkokpost.com/rss/data/topstories.xml", name: "Bangkok Post", category: C.SonDakika },
      { kind: "rss", url: "https://www.khaosodenglish.com/feed/", name: "Khaosod English", category: C.Siyaset },
    ],
  },
  {
    country_code: "VN",
    country_name_en: "Vietnam",
    sources: [
      { kind: "rss", url: "https://e.vnexpress.net/rss/news.rss", name: "VnExpress International", category: C.SonDakika },
      { kind: "rss", url: "https://tuoitrenews.vn/rss/news.rss", name: "Tuoi Tre News", category: C.Siyaset },
    ],
  },
  {
    country_code: "NZ",
    country_name_en: "New Zealand",
    sources: [
      { kind: "rss", url: "https://www.rnz.co.nz/rss/world", name: "RNZ (Devlet Radyosu)", category: C.SonDakika },
      { kind: "rss", url: "https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/world/", name: "NZ Herald", category: C.Siyaset },
    ],
  },
  {
    country_code: "MY",
    country_name_en: "Malaysia",
    sources: [
      { kind: "rss", url: "https://www.malaymail.com/feed/rss/malaysia", name: "Malay Mail", category: C.SonDakika },
      { kind: "rss", url: "https://www.freemalaysiatoday.com/category/nation/feed/", name: "Free Malaysia Today", category: C.Siyaset },
    ],
  },
  {
    country_code: "PH",
    country_name_en: "Philippines",
    sources: [
      { kind: "rss", url: "https://www.inquirer.net/fullfeed/", name: "Philippine Daily Inquirer", category: C.SonDakika },
      { kind: "rss", url: "https://www.philstar.com/rss/world", name: "Philstar", category: C.Siyaset },
    ],
  },
  {
    country_code: "TW",
    country_name_en: "Taiwan",
    sources: [
      { kind: "rss", url: "https://focustaiwan.tw/rss/all.xml", name: "Focus Taiwan (Devlet Ajansı CNA)", category: C.SonDakika },
      { kind: "rss", url: "https://www.taipeitimes.com/xml/index.rss", name: "Taipei Times", category: C.Siyaset },
    ],
  },
];

export function getConfigByCountryCode(code: string): CountryNewsConfig | undefined {
  return ASIA_PACIFIC_NEWS_CONFIG.find(
    (c) => c.country_code.toUpperCase() === code.toUpperCase()
  );
}

export function getAllCountryCodes(): string[] {
  return ASIA_PACIFIC_NEWS_CONFIG.map((c) => c.country_code);
}