/**
 * Başlık ve özet metinlerini Türkçe'ye çevirmek için GCP Translate veya OpenAI kullanır.
 * Ortam değişkenleri:
 * - TRANSLATE_PROVIDER: "openai" | "gcp" (varsayılan: openai varsa openai, yoksa gcp)
 * - OPENAI_API_KEY: OpenAI API anahtarı
 * - GOOGLE_TRANSLATE_API_KEY: Google Cloud Translation API v2 anahtarı
 */

const TARGET_LANG = "tr";

async function translateWithOpenAI(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen Asya-Pasifik alanında uzmanlaşmış, uluslararası bir haber ajansında (Reuters, AA vb.) çalışan kıdemli bir Dış Haberler Editörüsün. Sana verilen İngilizce haber metnini profesyonel, tarafsız ve diplomatik bir gazetecilik diliyle Türkçeye çevireceksin. Birebir robotik çevirisi yapmaktan kaçın; diplomatik ve askeri terimleri doğru kullan (örneğin 'Foreign Minister' için 'Dışişleri Bakanı', 'Mainland' için 'Anakara' gibi). Sadece kusursuz çeviriyi yaz, hiçbir açıklama, tırnak işareti veya ek yorum ekleme.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI translate failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned empty translation");
  return content;
}

async function translateWithGCP(text: string): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set");

  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: [text], target: TARGET_LANG, format: "text" }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GCP translate failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    data?: { translations?: { translatedText?: string }[] };
  };
  const translated = data.data?.translations?.[0]?.translatedText;
  if (translated == null) throw new Error("GCP returned empty translation");
  return translated;
}

function getProvider(): "openai" | "gcp" {
  const env = process.env.TRANSLATE_PROVIDER?.toLowerCase();
  if (env === "gcp" || env === "openai") return env;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return "gcp";
  throw new Error(
    "Set TRANSLATE_PROVIDER (openai|gcp) and OPENAI_API_KEY or GOOGLE_TRANSLATE_API_KEY"
  );
}

/**
 * Verilen metni Türkçe'ye çevirir. GCP Translate veya OpenAI kullanır.
 */
export async function translateToTurkish(text: string): Promise<string> {
  if (!text?.trim()) return "";
  const provider = getProvider();
  return provider === "openai" ? translateWithOpenAI(text) : translateWithGCP(text);
}

/**
 * Birden fazla metni sırayla Türkçe'ye çevirir (rate limit dostu).
 */
export async function translateBatchToTurkish(texts: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const text of texts) {
    results.push(await translateToTurkish(text));
  }
  return results;
}
