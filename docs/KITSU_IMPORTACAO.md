# Importação do Kitsu (sucessor do Hummingbird)

O Hummingbird foi absorvido pelo **Kitsu**, e a documentação antiga (hummingbird-me.github.io/api-docs) hoje aponta para a API JSON:API do Kitsu (`https://kitsu.app/api/edge`). A API antiga do Hummingbird está desativada (erro 404).

## O que o Kitsu fornece

- Capas e imagens em vários tamanhos (CDN `media.kitsu.app`)
- Nota (0–100), popularidade, nº de episódios, datas, formato (TV/filme/OVA/ONA/especial) e status
- Sinopse **somente em inglês** (a API aberta não tem PT-BR)

## Como a importação funciona

Função: `supabase/functions/import-kitsu/` (index.ts + kitsu.ts), totalmente separada da importação do Jikan.

### Modo "Completar dados faltantes" (enrich)
Percorre o catálogo em ordem de MAL ID, 20 animes por chamada:
1. Busca, para cada anime com dado faltante, o id do Kitsu pelo serviço de mapeamento **Anime Relations Map** (`relations.yuna.moe/api/ids`).
2. Consulta o Kitsu em lote (`filter[id]=a,b,c`).
3. **Preenche somente campos vazios** — nunca sobrescreve textos, notas ou capas já cadastrados; o Jikan continua sendo a fonte principal.
4. Capa reserva: baixa do CDN do Kitsu para o balde `anime-images` apenas quando o anime não tem nenhuma imagem (máximo 8 capas por página).
5. Sinopse em inglês preenchida entra na fila de tradução do DeepL (`translation_suggestions`) para revisão antes de salvar em PT-BR.

### Modo "Descobrir animes novos" (discover)
Percorre os animes mais populares do Kitsu (`sort=-userCount`, sem "music"):
1. Mapeia cada id do Kitsu para o MAL; **sem vínculo, o anime não entra no catálogo** (o catálogo usa MAL ID).
2. Animes já catalogados são ignorados; novos são inseridos completos com capa.
3. Sinopses em inglês seguem para a fila do DeepL.

## Segurança e operação

- Autenticação: sessão de administrador (`has_role`) ou token de agendamento `x-cron-token` comparado por hash em `cron_token_hashes` (nome `kitsu_daily`, sem token criado ainda).
- Bloqueio por compare-and-swap em `sync_state` (`id = kitsu_import`) evita execuções simultâneas.
- Histórico por página em `kitsu_import_history` (migração `0004`), com erros "resolvidos" quando a página volta a concluir.
- Logs de diagnóstico gravados em `jikan_import_logs` com `base = 'kitsu'` — visíveis no painel Logs com o filtro "Kitsu".
- Retomada no navegador reutiliza a espera progressiva compartilhada (`src/lib/jikanRetry.ts`), com intenção salva por administrador em `kitsu-retomada:<admin>`.

## Painel

Admin → Catálogo → **Kitsu**: gerenciador (dois modos, página única ou contínua, pausar/retomar/reiniciar) + histórico das últimas 50 execuções.

## Observações

- O serviço de mapeamento externo (Anime Relations Map) é comunitário; animes sem vínculo aparecem como "sem vínculo com o MAL" nos logs.
- Preservação de conteúdo PT-BR vale para o Kitsu igual ao Jikan: campos traduzidos e textos preenchidos jamais são substituídos.
