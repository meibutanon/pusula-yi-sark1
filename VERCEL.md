# Vercel deploy – haberler görünmüyorsa

Web build’da **sadece** `EXPO_PUBLIC_` ile başlayan değişkenler tarayıcıya gömülür. Bu yüzden Vercel’de mutlaka şunları tanımlayın:

## 1. Ortam değişkenleri (Vercel Dashboard → Project → Settings → Environment Variables)

| Değişken | Açıklama |
|----------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase proje URL’iniz (örn. `https://xxx.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon (public)** anahtarınız (Service Role değil!) |

- **Anon key:** Supabase Dashboard → Settings → API → `anon` `public` key.
- Bu iki değişkeni **Production** (ve isterseniz Preview) ortamına ekleyin.
- Değişkenleri ekledikten veya değiştirdikten sonra **Redeploy** yapın.

## 2. Supabase RLS (izinler)

`news` tablosunda anon kullanıcıların okuyabilmesi için RLS politikası gerekir. Supabase SQL Editor’da:

```sql
-- Zaten yaptıysanız tekrar çalıştırmayın
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_select_all"
  ON public.news FOR SELECT
  USING (true);
```

Bunu daha önce `002_news_rls_policies.sql` ile uyguladıysanız ek bir işlem gerekmez.

## 3. Kontrol

- Vercel’de yeniden deploy edin.
- Sitede “Supabase ayarları eksik” veya “Supabase izin hatası” görürseniz sırasıyla 1 ve 2’yi kontrol edin.
