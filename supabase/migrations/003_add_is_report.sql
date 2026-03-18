-- Mevcut veritabanına is_report sütunu ekler (Stratejik Raporlar için).
alter table public.news add column if not exists is_report boolean not null default false;
create index if not exists idx_news_is_report on public.news (is_report);
