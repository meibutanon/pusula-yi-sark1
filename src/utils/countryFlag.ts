/**
 * Ülke kodu → sadece "Bayrak Emojisi + Ülke Adı" (JP, KR vb. harf kodu ASLA dönmez).
 * UI'da yalnızca bu fonksiyonun döndürdüğü metin gösterilir; kod hiçbir yerde kullanılmaz.
 */

const FLAG_AND_NAME: Record<string, string> = {
  JP: "🇯🇵 Japonya",
  KR: "🇰🇷 Güney Kore",
  AU: "🇦🇺 Avustralya",
  CN: "🇨🇳 Çin",
  IN: "🇮🇳 Hindistan",
  SG: "🇸🇬 Singapur",
  ID: "🇮🇩 Endonezya",
  TH: "🇹🇭 Tayland",
  VN: "🇻🇳 Vietnam",
  NZ: "🇳🇿 Yeni Zelanda",
  MY: "🇲🇾 Malezya",
  PH: "🇵🇭 Filipinler",
  TW: "🇹🇼 Tayvan",
  RP: "🌐 Stratejik Raporlar",
};

/**
 * Sadece "🇯🇵 Japonya" formatında döner. 'JP', 'KR' gibi kod asla dönmez.
 */
export function getCountryFlagAndNameTr(countryCode: string): string {
  const key = String(countryCode ?? "").toUpperCase().trim().slice(0, 2);
  return FLAG_AND_NAME[key] ?? "🌐 Bölgesel";
}

/** @deprecated UI için getCountryFlagAndNameTr kullanın */
export function getCountryFlag(countryCode: string): string {
  const s = getCountryFlagAndNameTr(countryCode);
  const space = s.indexOf(" ");
  return space > 0 ? s.slice(0, space) : s;
}
