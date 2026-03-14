import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const ONE_MINUTE_MS = 60 * 1000;

/**
 * Tarihi kullanıcının yerel saatine göre '2 saat önce', '10 dakika önce' formatında döndürür.
 * Sadece 1 dakikadan yeniyse veya tarih gelecekteyse "Az önce" döner; diğer tümü formatDistanceToNow ile.
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const ts = date.getTime();
  if (Number.isNaN(ts)) return "—";
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "Az önce";
  if (diffMs < ONE_MINUTE_MS) return "Az önce";
  return formatDistanceToNow(date, { addSuffix: true, locale: tr });
}

/** Cihazın yerel saat dilimi (örn. Europe/Istanbul, America/New_York). */
export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}
