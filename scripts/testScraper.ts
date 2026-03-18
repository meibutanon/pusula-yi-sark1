/**
 * Backend haber servisini doğrulamak için test script'i.
 * scrapeAll ile haberleri çeker, Supabase'e yazar ve ilk 3'ü konsola basar.
 *
 * Çalıştırma: npm run test:scraper
 * Gerekli .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (veya SUPABASE_KEY), OPENAI_API_KEY veya GOOGLE_TRANSLATE_API_KEY
 */

import "dotenv/config";
import { scrapeAll, scrapeReports } from "../src/services/newsScraper";

function checkEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url) {
    console.error("Hata: SUPABASE_URL (veya EXPO_PUBLIC_SUPABASE_URL) .env içinde tanımlı değil.");
    process.exit(1);
  }
  if (!key) {
    console.error(
      "Hata: Supabase anahtarı yok. .env içinde SUPABASE_SERVICE_ROLE_KEY veya SUPABASE_KEY ekleyin (scraper için service_role önerilir)."
    );
    process.exit(1);
  }
  console.log("Supabase URL:", url.replace(/https?:\/\//, "").split(".")[0] + ".***");
  console.log("Supabase anahtar: tanımlı\n");
}

async function main() {
  checkEnv();
  console.log("Haberler çekiliyor (scrapeAll)...\n");
  const items = await scrapeAll();
  const first3 = items.slice(0, 3);

  console.log(`\nToplam ${items.length} yeni haber işlendi (veritabanına yazılan). İlk 3:\n`);
  first3.forEach((item, i) => {
    console.log(`--- ${i + 1} ---`);
    console.log("title:", item.title);
    console.log("source_url:", item.source_url);
    console.log();
  });
  if (items.length === 0) {
    console.log("Scraper çalıştı. Yeni link yok; zaten var olan linkleri kullandım, veritabanına ek kayıt yazılmadı.");
  }

  console.log("\nStratejik raporlar çekiliyor (scrapeReports)...\n");
  const reports = await scrapeReports();
  const first3Reports = reports.slice(0, 3);
  console.log(`\nToplam ${reports.length} yeni rapor işlendi. İlk 3:\n`);
  first3Reports.forEach((item, i) => {
    console.log(`--- RP ${i + 1} ---`);
    console.log("title:", item.title);
    console.log("source_url:", item.source_url);
    console.log();
  });
}

main().catch((err) => {
  console.error("Test hatası:", err);
  process.exit(1);
});
