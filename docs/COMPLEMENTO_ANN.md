# Complemento ANN aprovado

## 1. Resumo
228 animes aprovados, com 91 listas de gêneros e estúdios de 162 títulos. Origem oficial ANN: `Genres` e `Animation Production`, com vínculo MAL↔ANN único. Nenhum tema/produtora entra no pacote; nenhum campo preenchido é substituído.

## 2. Arquivos
- `src/data/annSources.json`: pares MAL/ANN aprovados; importado pelo helper de fonte, sem dados pessoais.
- `src/lib/annMetadata.ts`: recebe ID MAL, devolve ID/URL oficial ANN ou null; também valida a origem do cache. Usado pelo crédito e hooks.
- `src/components/anime/AnimeMetadataCredit.tsx`: recebe malId, consulta helper e rende crédito/link específico da obra.
- `src/components/anime/AnimeDetailModal.tsx`: integra o crédito em todas as aberturas do modal, na lista e no Descobrir.
- `src/types/catalog.ts`: campo opcional metadata_sources para a proveniência devolvida pela API.
- `src/hooks/useAnimeWithFallback.ts`: revalida cache dos IDs aprovados que ainda não tenham origem ANN. Mantém fallback offline; registros não afetados continuam no cache normal.
- `src/hooks/useDiscover.ts`: versão nova da chave de facetas evita reaproveitar contagens anteriores ao complemento.
- `src/components/layout/MainLayout.tsx`: link global para explicação da fonte ANN.
- `public/metadata/ann/index.html`: atribuição, origem, escopo e regras de uso.
- `public/metadata/aod/ann-links.json`, `select-ann-links.py`: crosswalk derivado de IDs e método completo sob ODbL/DbCL. Não contêm gêneros/estúdios ANN; estes não são relicenciados como dados AOD.
- `supabase/migrations/20261014220000_ann_approved_metadata.sql`: cria auditoria privada (MAL/ANN/campos/before/after/data), RLS e função administrativa de atualização vazia com bloqueio da linha. Recebe até 228 itens, devolve contagens, registra proveniência por campo e link na ficha completa.
- `tests/annMetadata.test.ts`: vínculos oficiais, IDs inválidos, atualização direcionada do cache e preservação de títulos não afetados.

## 3. Fluxo
XML ANN já verificado → seleção canônica aprovada → lote por ID → apply_ann_metadata → anime_catalog + ann_metadata_audit → RPCs atuais → filtros e API completa → cache/hook → modal e crédito da obra.

## 4. Regras do patch
Somente genres/studios nulos ou arrays vazios; FOR UPDATE revalida no momento de gravar. Campos preenchidos não são mesclados. IDs de gênero/estúdio reutilizam apenas vínculos MAL já existentes; IDs ANN não são gravados como MAL. Repetição de título auditado é ignorada. Temas/chaves não permitidas geram erro. Mutação/auditoria não são acessíveis a anon/authenticated.

## 5. Observações
Atribuição ANN e link da obra em cada ficha afetada, seguindo https://www.animenewsnetwork.com/encyclopedia/api.php . Consulta realizada em 14/10/2026 com cache e respeito a 1 solicitação/segundo e lotes até 50. Não é promessa de atualização contínua. Crosswalk AOD conserva licença/atribuição/download/método próprios. Notas, imagens, sinopses, datas, formatos e listas de usuários permanecem fora do lote.

## 6. Como testar
Testes do helper, TypeScript/build; SQL isolado para vazio/preenchido, repetição, chaves rejeitadas e grants; após aplicação, hash dos campos protegidos e auditoria sem sobrescrita; comparar todas as facetas a SQL/RPC, verificar busca+filtro e ficha de obra com link ANN correto. Verificar atualização de cache online e fallback offline.
