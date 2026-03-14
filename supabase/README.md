# Supabase – Yeni veritabanı kurulumu

Bu klasör, projenin **tek Supabase veritabanı** kurulumunu tek yerde toplar. Yeni bir Supabase projesi açtığınızda aşağıdaki adımları izleyin.

---

## 1. Yeni Supabase projesi

1. [Supabase Dashboard](https://supabase.com/dashboard) → **New project**
2. Proje adı, şifre, bölge seçin ve oluşturun.
3. Proje hazır olunca **Settings → API** sayfasına gidin; aşağıdaki değerleri not alın:
   - **Project URL** (örn. `https://xxxxx.supabase.co`)
   - **anon public** key (tarayıcı / Vercel için)
   - **service_role** key (sadece sunucu/CI/scraper için; asla tarayıcıya koymayın)

---

## 2. Şema ve RLS’i uygulama

1. Supabase Dashboard → **SQL Editor**
2. **FULL_SETUP.sql** dosyasının içeriğini kopyalayıp yapıştırın.
3. **Run** ile çalıştırın.

Bu tek script:

- `public.news` tablosunu oluşturur (id, title, summary_tr, source_url, country_code, created_at)
- Gerekli index’leri ekler
- RLS’i açar ve `news_select_all` / `news_insert_all` politikalarını tanımlar

---

## 3. Ortam değişkenleri (env)

Proje bu env’leri kullanıyor. **Asla** şifreleri veya `service_role` key’i Git’e commit etmeyin.

### Tablo özeti

| Ortam | Kullanım | Gerekli değişkenler |
|--------|----------|----------------------|
| **Web (Vercel / tarayıcı)** | Haber listesini göstermek | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| **Node (scraper, script, CI)** | Haber yazmak / okumak | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (veya `SUPABASE_KEY`) |

### Yerel geliştirme (`.env`)

Proje kökünde `.env` dosyası oluşturun (bu dosya `.gitignore`’da olmalı). Örnek isimler için kökteki **`.env.example`** dosyasına bakın:

```env
# Supabase – yeni proje URL ve anahtarlar
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Web (Expo/Vercel) aynı projeyi kullanıyorsa bunları da ekleyin
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

- Tarayıcıda çalışan kod **sadece** `EXPO_PUBLIC_*` değişkenlerini görür.
- Script’ler ve CI `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (veya `SUPABASE_KEY`) kullanır.

### Vercel

- **Settings → Environment Variables** içinde:
  - `EXPO_PUBLIC_SUPABASE_URL` = Supabase Project URL
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = anon public key  
- Deploy sonrası gerekirse **Redeploy** yapın.

### GitHub Actions (haber_cek workflow)

Repo **Settings → Secrets and variables → Actions** içinde:

- `SUPABASE_URL` = Project URL
- `SUPABASE_KEY` = service_role key (scraper’ın yazması için)
- `SUPABASE_SERVICE_ROLE_KEY` = aynı service_role key (workflow’da hangi isim kullanılıyorsa onu doldurun)

---

## 4. Tablo: `public.news`

| Sütun | Tip | Açıklama |
|--------|------|----------|
| `id` | uuid | PK, otomatik |
| `title` | text | Haber başlığı (Türkçe) |
| `summary_tr` | text | Özet (Türkçe) |
| `source_url` | text | Kaynak URL (unique) |
| `country_code` | text | Ülke kodu (örn. JP, AU) |
| `created_at` | timestamptz | Kayıt zamanı |

Kod tarafında tipler: `src/types/news.ts` → `NewsRow`, `NewsItem`.

---

## 5. Eski migration’lar

- `migrations/001_create_news_table.sql` ve `002_news_rls_policies.sql` geçmiş/parçalı sürümlerdir.
- **Yeni proje için sadece `FULL_SETUP.sql` yeterlidir.** İsterseniz migration’ları ileride sıralı kullanmak için saklayabilirsiniz; mevcut tek tablo + RLS kurulumu `FULL_SETUP.sql` ile aynıdır.

---

Özet: Yeni Supabase projesi aç → SQL Editor’da **FULL_SETUP.sql** çalıştır → URL ve anon/service_role key’leri `.env`, Vercel ve GitHub Secrets’a yaz → uygulama ve scraper aynı veritabanını kullanır.
