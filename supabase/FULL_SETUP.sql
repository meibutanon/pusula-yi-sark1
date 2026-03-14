-- =============================================================================
-- BÜLTEN DERLEYİCİ – YENİ SUPABASE VERİTABANI KURULUMU
-- Bu dosyayı Supabase Dashboard → SQL Editor'da tek seferde çalıştırın.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NEWS TABLOSU
-- Asya-Pasifik haberleri: Türkçe başlık/özet, source_url unique (tekrar işlenmez)
-- -----------------------------------------------------------------------------
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary_tr text not null,
  source_url text not null unique,
  country_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_news_country_code on public.news (country_code);
create index if not exists idx_news_created_at on public.news (created_at desc);
create index if not exists idx_news_source_url on public.news (source_url);

comment on table public.news is 'Asya-Pasifik bölgesi haberleri (Türkçe başlık/özet)';

-- -----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- Uygulama (anon) okusun, scraper/CI (service_role veya anon) yazabilsin
-- -----------------------------------------------------------------------------
alter table public.news enable row level security;

-- Herkes (anon dahil) haberleri okuyabilsin
create policy "news_select_all"
  on public.news for select
  using (true);

-- Anon ve authenticated insert edebilsin (scraper / backend)
create policy "news_insert_all"
  on public.news for insert
  with check (true);

-- =============================================================================
-- KURULUM TAMAMLANDI. Sonraki adım: .env / Vercel / GitHub Secrets ayarları
-- (Bkz. supabase/README.md)
-- =============================================================================
