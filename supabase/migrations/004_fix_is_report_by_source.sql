-- Haber sitelerinden gelen kayıtları is_report: false yap. Sadece think tank (CSIS, RAND, ASPI, Lowy, NBR) rapor kalsın.
update public.news
set is_report = false
where is_report = true
  and (
    source_url ilike '%thediplomat.com%'
    or source_url ilike '%scmp.com%'
    or source_url ilike '%nikkei.com%'
    or source_url ilike '%japantoday.com%'
    or source_url ilike '%koreatimes.co.kr%'
    or source_url ilike '%yna.co.kr%'
    or source_url ilike '%abc.net.au%'
    or source_url ilike '%smh.com.au%'
    or source_url ilike '%theguardian.com%'
    or source_url ilike '%reuters.com%'
    or source_url ilike '%straitstimes.com%'
    or source_url ilike '%channelnewsasia.com%'
    or source_url ilike '%nhk.or.jp%'
    or source_url ilike '%mainichi.jp%'
    or source_url ilike '%asahi.com%'
    or source_url ilike '%xinhuanet.com%'
    or source_url ilike '%indiatimes.com%'
    or source_url ilike '%bangkokpost.com%'
    or source_url ilike '%vietnamnet.vn%'
    or source_url ilike '%rnz.co.nz%'
    or source_url ilike '%thestar.com.my%'
    or source_url ilike '%manilatimes.net%'
    or source_url ilike '%taiwannews.com.tw%'
  );
