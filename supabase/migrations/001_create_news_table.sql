-- news tablosu: Asya-Pasifik haberleri
-- source_url unique ile aynı haber tekrar işlenmez

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
