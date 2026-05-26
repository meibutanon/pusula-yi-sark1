/** HTTP dış istekler için zaman aşımı (ms). */
export const FETCH_TIMEOUT_MS = 20_000;

export const DEFAULT_FETCH_HEADERS = {
  "User-Agent":
    "AsyaPasifikHaber/1.0 (News aggregator; +https://github.com/asya-pasifik-haber)",
};

/**
 * fetch ile AbortController tabanlı zaman aşımı.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        ...DEFAULT_FETCH_HEADERS,
        ...(init.headers as Record<string, string>),
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
