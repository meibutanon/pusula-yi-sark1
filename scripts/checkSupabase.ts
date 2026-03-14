/**
 * Supabase bağlantısını ve news tablosunu test eder.
 * Çalıştırma: npx ts-node -r tsconfig-paths/register scripts/checkSupabase.ts
 */

import "dotenv/config";
import { getSupabase } from "../src/lib/supabase";

const NEWS_TABLE = "news";

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const hasKey = !!(
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_KEY ??
    process.env.SUPABASE_ANON_KEY
  );

  console.log("1. Ortam değişkenleri");
  console.log("   SUPABASE_URL:", url ? `${url.slice(0, 30)}...` : "YOK");
  console.log("   Anahtar (SUPABASE_*):", hasKey ? "var" : "YOK");
  if (!url || !hasKey) {
    console.error("\n.env dosyasında SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY (veya SUPABASE_KEY) tanımlayın.");
    process.exit(1);
  }

  console.log("\n2. Bağlantı ve news tablosu");
  try {
    const supabase = getSupabase();
    const { count, error } = await supabase.from(NEWS_TABLE).select("*", { count: "exact", head: true });
    if (error) {
      console.error("   Hata:", error.message);
      console.error("   Kod:", error.code);
      process.exit(1);
    }
    console.log("   news satır sayısı:", count ?? "?");
    const { data: sample } = await supabase
      .from(NEWS_TABLE)
      .select("id, title, country_code, created_at")
      .order("created_at", { ascending: false })
      .limit(2);
    if (sample?.length) {
      const last = sample[0];
      const lastDate = last?.created_at
        ? new Date(last.created_at).toLocaleString("tr-TR", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "?";
      console.log("   Son eklenen haber tarihi:", lastDate);
      console.log("   Son kayıt örneği:", last?.title?.slice(0, 50) + "...");
    }
  } catch (e) {
    console.error("   Exception:", e);
    process.exit(1);
  }

  console.log("\nSupabase bağlantısı ve news tablosu OK.");
}

main();
