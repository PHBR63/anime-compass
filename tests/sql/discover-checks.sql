-- Checagens da Descobrir (rodar com papel que possa executar as funções; somente leitura).
-- 1) Total exato > 1000 e igual à contagem direta do conjunto elegível (NULL de tipo incluído).
select (public.discover_catalog('{}'::jsonb)->>'total')::int
     = (select count(*) from public.anime_catalog where type is null or type not in ('Music','CM','PV')) as total_ok;
-- 2) Aliases de status: airing = Airing + Currently Airing.
select (public.discover_catalog('{"status":"airing"}')->>'total')::int
     = (select count(*) from public.anime_catalog where status in ('Airing','Currently Airing') and (type is null or type not in ('Music','CM','PV'))) as alias_ok;
-- 3) Sem JWT, ocultar minha lista não é aplicado.
select (public.discover_catalog('{"hide_in_list":true}')->>'hide_in_list_applied')::boolean = false as sem_jwt_ok;
-- 4) Páginas 1..3 sem duplicatas com ordenação por título.
select count(*) = count(distinct m) as paginas_ok from (
  select jsonb_array_elements(public.discover_catalog('{}','title','asc',g,60)->'items')->>'mal_id' m from generate_series(1,3) g) s;
-- 5) Intervalo inválido deve gerar erro intervalo_ano_invalido:
-- select public.discover_catalog('{"year_min":2020,"year_max":2010}');
