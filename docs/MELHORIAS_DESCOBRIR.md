# Melhorias da página Descobrir

## Arquivos
- `src/pages/Discover.tsx` — página (busca + ordenação + filtros, modos, chips, grade, "Carregar mais").
- `src/lib/discoverParams.ts` — estado na URL, validação de intervalo, chips, payload do banco.
- `src/hooks/useDiscover.ts` — `discover_catalog` (lista) e `discover_facets` (facetas).
- `src/components/anime/DiscoverFilters.tsx` — gaveta com rascunho + chips removíveis.
- `src/components/anime/DiscoverAnimeCard.tsx` — card compacto (título abaixo da capa, formato · ano · eps, botão acessível, selo "Na lista").
- `supabase/functions/anime-api` — listagem/gêneros/estúdios usam as mesmas funções SQL.
- `supabase/functions/import-kitsu` — ação `metadata` (enriquecimento) + `kitsu.ts` (`estimarTemporada`, `extrairMetadadosKitsu`).
- Migrações `0008`–`0010`.
- Removidos da Descobrir: `useAdvancedAnimeFilters.ts`, `CatalogCoverageBadge` (e suas chamadas), abas Top/Temporada antigas e grade virtualizada que trocava aos 50 itens.

## Fluxo de dados
1. URL → `parseDiscoverParams` → `toRpcFilters` → `supabase.rpc('discover_catalog')` (uma única consulta ativa).
2. `discover_filtered(p)` aplica todos os filtros no PostgreSQL; `discover_catalog` conta (total exato) e pagina sobre o mesmo conjunto.
3. Ocultar minha lista: `hide_in_list=true` e o banco usa `auth.uid()` do JWT validado — nunca aceita `user_id` do pedido. Sem sessão, não exclui nada (`hide_in_list_applied=false`). A preferência é salva por conta (`discover-hide-in-list:<id>`).
4. A ficha completa só é buscada ao abrir o modal (cards usam projeção reduzida).

## Regras
- Elegível: `type IS NULL OR type NOT IN ('Music','CM','PV')` — tipo NULL **entra** (explícito).
- Status: `airing` = `Airing` (legado) + `Currently Airing`; `finished`; `upcoming` = `Not yet aired`. Kitsu grava `Currently Airing`.
- Ordenação: nota, popularidade (asc), ano, título; desempate sempre por `mal_id` (sem duplicatas entre páginas).
- Ano inicial > final: UI bloqueia "Aplicar"; banco recusa (`intervalo_ano_invalido`); URL inválida descarta o ano final.
- Facetas: escopo **global** do catálogo elegível (`scope = catalogo_elegivel`), rotuladas "títulos no catálogo inteiro". Gênero/estúdio filtrados por **nome** (itens do Kitsu não têm ID MAL; nenhum ID é inventado).
- Modos: Catálogo, Temporada (trimestre + ano explícitos), Em exibição, Próximos lançamentos. "Top" virou a ordenação "Melhor nota".
- Erro de rede mostra alerta com "Tentar de novo" (diferente de "nenhum resultado").

## Enriquecimento Kitsu
- Candidatos: animes criados pelo Kitsu (`kitsu_import_items.acao='criado'`, vínculo MAL verificado pelo ARM na criação) sem gênero, estúdio ou temporada, e ainda não checados.
- Fonte: `kitsu.app/api/edge/anime?filter[id]=…&include=genres,animeProductions.producer` (lotes de 10 na função; 30 por chamada; 1,2 s entre lotes; 429/5xx devolvem espera).
- Estúdios: só produções com papel `studio`. Nada é associado por título.
- Temporada/ano: estimados pela data de estreia (jan–mar inverno, abr–jun primavera, jul–set verão, out–dez outono); proveniência `estimativa_data_estreia_kitsu`. Temporada só é gravada se o ano existente for igual.
- `apply_kitsu_metadata` grava só campos vazios, atômico, com `metadata_sources`, `kitsu_metadata_checked_at` (checkpoint, sem retries infinitos) e `kitsu_metadata_result` (`preenchido`, `sem_dados_na_fonte`, `ausente_na_fonte`, `nada_a_preencher`).
- Traduções, sinopses e classificação etária não são tocadas.

### Resultado da execução (14/10/2026)
2.544 candidatos: 2.373 com algo preenchido (gênero em 2.008, estúdio em 841, temporada em 2.354); 171 sem dados na fonte; 0 ausentes no Kitsu. Restam 358 sem gênero e 19 sem temporada porque o Kitsu não informa.

### Rodar de novo (manual seguro)
Como administrador: `supabase.functions.invoke('import-kitsu', { body: { action: 'metadata' } })` até `continue=false`. Só processa itens sem checkpoint.

## Como testar
- `bun test ./tests/discoverParams.test.ts` e `bun test supabase/functions/import-kitsu/kitsu.test.ts`.
- SQL: `tests/sql/discover-checks.sql` (total > 1000, aliases, ocultar sem JWT, intervalo, paginação sem duplicatas).
- Manual: `/discover?q=naruto&genero=Action&ordem=title` → recarregar e voltar mantêm os filtros; abrir "Ano inicial" lista de 2029 a 1907; celular mostra 2 colunas.

## Complemento: títulos antigos e "ocultar minha lista"

- **Ocultar minha lista** (`discover_filtered`, migração `0011`): esconde só entradas ativas (`is_archived = false`), igual ao contexto da Minha Lista. Identidade sempre via `auth.uid()`; `user_id` no corpo é ignorado.
- **Vínculos existentes** (migração `0012`): `kitsu_metadata_candidates` aceita qualquer vínculo verificado — itens `criado` e `completado` de `kitsu_import_items` e `anime_catalog.kitsu_id` com `kitsu_link_status = 'vinculado'`. Nada é ligado por nome.
- **Títulos antigos sem vínculo**: quando não há candidatos com vínculo, a ação `metadata` chama `kitsu_link_candidates` (gênero ou estúdio vazio, sem checkpoint) e consulta o ARM (`source=myanimelist`) em lotes de 40, 5 simultâneos. Resultado em `set_kitsu_link`: `vinculado` (grava `kitsu_id`), `sem_vinculo` (ARM sem correspondência) ou `indisponivel` (falha da fonte; volta à fila após 1 h). Os vinculados entram na próxima rodada de metadados.
- Só campos vazios são preenchidos (`apply_kitsu_metadata`); traduções, listas e valores já preenchidos não mudam.
- Teste seguro: `select count(*) from anime_catalog where kitsu_link_status is null and kitsu_metadata_checked_at is null and (genres='[]' or studios='[]')` deve tender a zero; ausências ficam em `kitsu_metadata_result` e `kitsu_link_status`.

## Compatibilidade da API e atualização das contagens

- `useDiscover.ts`: chave de cache por usuário, para separar os resultados de ocultar a lista entre contas; atualização das contagens a cada minuto.
- `anime-api/index.ts`: ficha completa na API anterior e filtros `score_max`, `has_image` e `has_synopsis_pt`; entradas numéricas inválidas retornam HTTP 400.
- `20261014200000_discover_api_compatibility.sql`: resolve IDs de gênero/estúdio pelos vínculos existentes, preserva aliases e múltiplos valores, acrescenta IDs conhecidos às facetas e mantém a projeção pequena da tela.
- Fluxo: Descobrir → hooks → RPC SQL → catálogo/lista da conta autenticada. Clientes anteriores → anime-api → mesma RPC, com ficha completa. Contagem e página são calculadas na mesma consulta; a identidade vem do JWT.
- Testes: 23 testes de parâmetros/metadados; TypeScript e build; SQL isolado com 2.400 títulos, IDs numéricos, duas páginas, arquivados, identidade, projeções e permissões.
- Complemento confirmado em produção em 14/10/2026: 22.243 títulos elegíveis; 5.989 ganharam metadados; ainda faltam gênero em 1.852, estúdio em 7.616 e temporada em 10.510. Ausência na fonte não é convertida em informação inventada.
