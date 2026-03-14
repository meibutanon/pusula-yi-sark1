import { getCountryFlagAndNameTr } from "./countryFlag";

/**
 * Ülke kodlarını Türkçe tam isimlere çevirir (JP -> Japonya).
 * Bayraklı tam etiket için getCountryFlagAndNameTr (countryFlag) kullanın.
 */
const COUNTRY_NAMES_TR: Record<string, string> = {
  JP: "Japonya",
  KR: "Güney Kore",
  AU: "Avustralya",
  CN: "Çin",
  IN: "Hindistan",
  SG: "Singapur",
  ID: "Endonezya",
  TH: "Tayland",
  VN: "Vietnam",
  NZ: "Yeni Zelanda",
  MY: "Malezya",
  PH: "Filipinler",
  TW: "Tayvan",
};

export function getCountryNameTr(countryCode: string): string {
  const code = countryCode.toUpperCase().slice(0, 2);
  return COUNTRY_NAMES_TR[code] ?? countryCode;
}

/** Bayrak emojisi + Türkçe isim (örn. "🇯🇵 Japonya"). countryFlag'deki haritayı kullanır. */
export function getCountryDisplayLabel(countryCode: string): string {
  return getCountryFlagAndNameTr(countryCode);
}
