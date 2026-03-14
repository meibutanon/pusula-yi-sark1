-- RLS: news tablosu için okuma/yazma izinleri
-- Uygulama (anon) okuyabilsin, scraper (anon veya service_role) yazabilsin

alter table public.news enable row level security;

-- Herkes (anon dahil) haberleri okuyabilsin
create policy "news_select_all"
  on public.news for select
  using (true);

-- Anon ve authenticated insert edebilsin (scraper / backend)
create policy "news_insert_all"
  on public.news for insert
  with check (true);
