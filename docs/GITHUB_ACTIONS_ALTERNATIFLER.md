# GitHub Actions dakikaları neden bitti? Alternatifler

## Neden bu kadar çabuk bitti?

- **Ücretsiz kota:** GitHub Free (private repo) ayda **2.000 dakika** veriyor.
- **Workflow ne yapıyor:** Her çalışmada `npm ci` (bağımlılıklar) + haber scraper (RSS + çeviri + Supabase). Tek bir run **~15–35 dakika** sürebiliyor.
- **Sıklık:** Şu an 6 saatte bir = günde **4 run**. Ayda ~120 run × ~25 dk ≈ **3.000 dakika** → kotanın üzerinde.
- **Push tetiklemesi:** `main`’e her push’ta da bir run daha çalışıyor; commit sık atıyorsanız dakika daha da artıyor.

Bu yüzden aylık 2.000 dakika hızla tükeniyor.

---

## Seçenek 1: Repo’yu public yap (en kolay, ücretsiz)

- **Public repo’da** GitHub Actions dakikaları **sınırsız** (Linux runner).
- Repo’yu public yapın: GitHub → Repo → Settings → Danger Zone → Change visibility → Public.
- Secret’lar (SUPABASE_URL, OPENAI_API_KEY vb.) yine sadece sizde kalır; public’te sadece kod görünür.
- **Özet:** Hiçbir kod değişikliği yok, sadece repo ayarı. Haber botu aynı şekilde çalışmaya devam eder.

---

## Seçenek 2: GitHub’da kalmak ama günde 1 run (private repo)

- Cron’u **günde 1 kez** (ör. her gün 06:00 UTC) çalışacak şekilde değiştirin.
- 30 × ~25 dk ≈ **750 dakika/ay** → 2.000’in altında kalır.
- **Değişiklik:** `.github/workflows/haber_cek.yml` içinde `schedule` değeri günde bir olacak şekilde güncellendi (aşağıda).

---

## Seçenek 3: Ücretsiz dış cron servisi (GitHub’a hiç dakika harcamadan)

Haber script’ini GitHub dışında, **ücretsiz cron** ile çalıştırabilirsiniz.

### 3a) Kendi bilgisayarınızda (Task Scheduler / cron)

- PC açıkken belirli saatte script’i çalıştırın.
- **Windows:** Görev Zamanlayıcı → “Temel görev oluştur” → Tetikleyici: Günlük, saat seçin → Eylem: Program başlat → Program: `node` veya `npm` → Bağımsız değişkenler: `run test:scraper` (veya tam path ile `tsx -r tsconfig-paths/register scripts/testScraper.ts`). Başlangıç yolu: proje klasörü.
- **Mac/Linux:** `crontab -e` ile örnek: `0 6 * * * cd /yol/proje && npm run test:scraper`
- `.env` dosyası aynı klasörde olmalı (SUPABASE_URL, OPENAI_API_KEY vb.).

### 3b) Render.com ücretsiz Cron Job

- [Render](https://render.com) → hesap aç → New → **Cron Job**.
- Repo’yu bağlayın, build komutu: `npm ci`, run komutu: `npm run test:scraper`.
- Schedule: günde bir veya istediğiniz sıklık (örn. 0 6 * * * = her gün 06:00 UTC).
- Environment variables: SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY vb. ekleyin.
- Ücretsiz planda Cron Job’lar belirli çalışma süresiyle sınırlı; günde 1 run genelde yeterli.

### 3c) cron-job.org (sadece URL tetikleme)

- Bu yöntem için projede **uzun süre çalışan bir HTTP endpoint** gerekir (scraper 15–30 dk sürebilir).
- Vercel/Netlify gibi serverless’ta fonksiyon süre limiti (10–60 sn) nedeniyle scraper’ı doğrudan tetiklemek uygun değil.
- Bu seçenek, kendi sunucunuz veya uzun timeout veren bir backend’iniz varsa anlamlıdır.

---

## Öneri

| Tercih | Ne yapın |
|--------|----------|
| Repo’yu gizli tutmak istemiyorsanız | **Seçenek 1:** Repo’yu public yapın, workflow’u olduğu gibi bırakın. |
| Private repo şart | **Seçenek 2:** Cron’u günde 1’e düşürün (bu dosyayla birlikte workflow güncellendi). |
| GitHub’a hiç dakika harcamak istemiyorsanız | **Seçenek 3a veya 3b:** Kendi PC’de zamanlayıcı veya Render Cron Job. |

Bu projede **Seçenek 2** için workflow zaten günde 1 run olacak şekilde ayarlandı. İsterseniz repo’yu public yapıp tekrar 6 saatte bir (veya daha sık) çalıştırmak için `haber_cek.yml` içindeki `schedule` satırını eski haline getirebilirsiniz.
