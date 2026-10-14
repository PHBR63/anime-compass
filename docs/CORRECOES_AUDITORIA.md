# Correções da auditoria — pacote para revisão

## 1. Resumo e situação

Branch: codex/corrigir-auditoria-anicheck. Base: 5822c904adef241dae03b799edb495bf483a8749, já contendo o ajuste de timeout das recomendações feito no Lovable.

Este pacote prepara segurança, estatísticas completas, correção do status de episódios, cache entre contas, alertas e recuperação segura de capas. Não foi aplicado ao Lovable, ao Supabase ativo ou à publicação Vercel.

Não instala bibliotecas novas no produto. O lockfile foi completado para dependências já declaradas (drizzle-kit, drizzle-orm, postgres), sem alterar versões dos pacotes existentes, pois npm ci falhava antes dessa correção.

## 2. Arquivos e responsabilidades

| Arquivo | Papel, dependências e dados |
|---|---|
| supabase/functions/_shared/authorization.ts | Regra de autorização testável; recebe Request, funções de consulta e nome opcional de cron; devolve status/usuário ou erro; não acessa banco sozinho. |
| supabase/functions/_shared/cors.ts | Cabeçalhos CORS locais usados por import-jikan e translate-deepl; preserva compatibilidade com o SDK fixado, sem atualizar bibliotecas. |
| supabase/functions/translate-deepl/index.ts | Usa CORS compartilhado local; preserva autenticação, geração e revisão de sugestões. |
| supabase/functions/_shared/adminAuth.ts | Adaptador Supabase/Deno da regra; consulta sessão, has_role e cron_token_hashes usando secrets de servidor; utilizado pelas funções abaixo. |
| supabase/functions/import-catalog/index.ts | Guarda admin antes do acesso privilegiado; mantém payload/importação da fonte antiga e gravações existentes. |
| supabase/functions/sync-images/index.ts | Guarda admin antes de sincronizar/resetar capas; mantém armazenamento e progresso existentes. |
| supabase/functions/run-system-tests/index.ts | Guarda admin e atribui triggered_by ao usuário validado; mantém testes e tabelas de resultados. |
| supabase/functions/get-sync-logs/index.ts | Restringe consulta de logs ao admin antes de usar service role. |
| supabase/functions/cleanup-old-logs/index.ts | Aceita admin ou token exclusivo cleanup_logs; mantém a retenção de 30 dias. |
| supabase/functions/sync-airing-episodes/index.ts | Aceita admin/token sync_airing; reconhece Airing e Currently Airing; consultas Jikan têm timeout e execução tem orçamento; reporta parcial/erros sem falso sucesso. Preserva a seleção atual de títulos sem total de episódios. |
| supabase/functions/import-jikan/index.ts | Resolve erros somente da página/modo que concluiu; corrige tipagem do cliente de logs sem mudar a ingestão. |
| supabase/functions/anime-api/index.ts | action=stats usa get_catalog_stats; resposta pública mantém o mesmo formato e inclui catálogo inteiro. |
| supabase/functions/get-global-stats/index.ts | Usa get_site_stats para contar todas as entradas; devolve os mesmos indicadores agregados. |
| supabase/functions/send-push/index.ts | Guarda admin e responde 501 enquanto não existe transporte real; não consulta inscrições nem afirma ter enviado. Não ativa push externo. |
| supabase/functions/proxy-image/index.ts | Valida HTTPS e fronteira do domínio permitido, bloqueia redirects e limita tempo de consulta. |
| src/hooks/useAuth.tsx | Usa QueryClient para remover caches de memória quando muda identidade ou sai da conta; propaga erro do logout. |
| src/hooks/useRecommendations.ts | Usa useAuth e inclui user.id na chave de cache; consulta só com usuário presente; preserva endpoint/resposta. |
| src/hooks/useGroupManagement.ts | Tipagem de updates vem de Database; preserva payload de nome/capa e comportamento do hook. |
| src/types/catalog.ts | Exibe Airing como Em Exibição, mantendo o alias anterior. |
| src/components/admin/JikanRecurringAlerts.tsx | Conta somente eventos terminais de erro; uma execução não vira três falhas. |
| vite.config.ts | Cache Supabase somente para arquivos públicos de storage; APIs privadas/autenticação ficam fora da regra. |
| public/custom-sw.js | Remove o cache antigo supabase-cache ao ativar nova versão; mantém fila IndexedDB independente. |
| src/components/help/WelcomeModal.tsx | Corrige marca AniTracker para AniCheck; mantém tour e props existentes. |
| src/components/landing/FeaturesSection.tsx | Remove a promessa de recomendações por IA; preserva recursos/cards existentes. |
| README.md | Remove contagem histórica fixa do catálogo. |
| docs/JIKAN_IMPORTACAO.md | Distingue retry no navegador do cron limitado e documenta revisão DeepL. |
| docs/CORRECOES_AUDITORIA.md | Este mapa, validação, implantação e pendências; não é utilizado pelo aplicativo. |
| package-lock.json | Completa dependências já presentes em package.json para permitir npm ci. |
| supabase/migrations/20261014030000_secure_conversation_participants.sql | Substitui autoentrada aberta por bootstrap do criador ou adição pelo admin; protege identidade e papel por trigger; mantém todos os registros. |
| supabase/migrations/20261014030100_secure_maintenance_schedules.sql | Tokens separados no Vault, somente hashes no banco; modifica comandos dos dois crons preservando nome/horário; nenhuma senha exposta ao cliente. |
| supabase/migrations/20261014030200_complete_catalog_statistics.sql | Funções SQL de agregação com execução somente service_role; não altera registros do catálogo/listas. |
| scripts/sql/reconcile-anime-images.sql | Operação manual e separada: reconcilia mal_id com uma única capa existente, cria backup das URLs e não toca casos ausentes/ambíguos. |
| tests/authorization.node.test.ts | Testa anônimo, token inválido, usuário comum/admin, indisponibilidade e token de cron por função com dependências simuladas. |
| tests/sql/conversation-security.sql | Fixture local PostgreSQL: bootstrap, adição, preferências, autopromoção bloqueada, identidade protegida e promoção autorizada. |
| tests/sql/maintenance-schedules.sql | Fixture Vault/cron: hash, isolamento, horários, repetição e ausência de leitura pelo usuário comum. |
| tests/sql/image-reconciliation.sql | Fixture: recuperação por ID, backup, arquivo ausente, ambiguidade, origem atual e repetição. |
| tests/sql/complete-statistics.sql | Fixture com mais de 20 mil animes e 2 mil entradas para comprovar agregação sem truncamento. |

## 3. Fluxo de comunicação

- Tela admin → função HTTP → requireAdmin → authorization → sessão/has_role ou hash cron → operação privilegiada.
- Scheduler → token Vault em x-cron-token → hash exclusivo → limpeza/sync. O frontend segue usando a sessão admin e não recebe tokens de cron.
- Criação de conversa atual → criador entra como admin na conversa vazia → admin adiciona membros. Promoção continua pelo hook atual, mas passa a ser autorizada pelo papel prévio no banco.
- Estatísticas → função HTTP → RPC SQL → PostgreSQL completo → JSON no formato já utilizado.
- Login/logout → AuthProvider → QueryClient.clear; recomendações têm chave por usuário.
- Recuperação manual → mal_id e storage.objects → candidatos sem ambiguidade → backup → atualização condicional de local_image_url.

## 4. Patch representativo

```ts
const access = await requireAdmin(req, "sync_airing");
if (access.status !== 200) {
  return new Response(JSON.stringify({ success: false, error: access.error }), {
    status: access.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

O patch completo é o diff da branch. Não há mudança de papéis existentes nem remoção de mensagens, listas ou arquivos de storage.

## 5. Implantação e riscos

Aplicar somente após aprovação do usuário, em ordem:

1. Conferir drift do editor/GitHub e confirmar commit da branch.
2. Aplicar as três migrations na sequência, validando os objetos do banco.
3. Publicar as funções modificadas juntamente com _shared. As estatísticas novas exigem as RPCs; crons novos exigem funções com guarda de token. Não deixar um intervalo longo entre esses passos.
4. Publicar frontend/PWA e realizar UAT admin/usuário comum.
5. Separadamente aprovar/executar a reconciliação de imagens, após repetir a prévia e validar acessibilidade de amostra no bucket atual.

Prévia do banco ativo: 19.359 referências antigas têm um único arquivo correspondente por mal_id. 249 das 19.608 referências antigas não têm candidato e permanecerão preservadas. A contagem deve ser repetida imediatamente antes da aplicação. Existência de metadata não substitui teste HTTP de acessibilidade.

A reconciliação salva mal_id/old_url/new_url em tabela protegida. Para desfazer, revisar o lote e restaurar old_url somente nas linhas que ainda tenham new_url, preservando alterações posteriores. Nenhum rollback ou update em produção foi executado.

Web Push continuará indisponível com erro explícito. A configuração de um transporte real e de chaves próprias é uma etapa posterior; não se deve usar a chave pública de exemplo existente como prova de configuração válida.

## 6. Validação

Executado localmente:
- npm ci após complementar o lockfile.
- Build Vite/PWA.
- TypeScript do frontend e configuração Node.
- Deno check das funções modificadas.
- 4 testes Node de autorização.
- 8 testes Bun existentes de mapeamento/retomada Jikan.
- 4 fixtures PostgreSQL, em cluster isolado de produção.

Comandos:

```powershell
npm ci --ignore-scripts
npm run build
npx tsc --noEmit -p tsconfig.app.json
npx tsc --noEmit -p tsconfig.node.json
node --test tests/authorization.node.test.ts
npx --yes bun test tests/jikanRetry.test.ts supabase/functions/import-jikan/catalog.test.ts
```

As fixtures SQL devem ser executadas exclusivamente em banco descartável local, na ordem: conversation-security, maintenance-schedules, image-reconciliation e complete-statistics. Criam schemas auth/vault/cron/storage e dados sintéticos; não apontá-las ao Supabase.

O lint global tinha 149 erros/36 avisos antes das alterações. Na comparação feita durante a implementação houve 148 erros/36 avisos, sem novos erros. Não há declaração de lint global aprovado; a limpeza desses problemas preexistentes é separada.

UAT ainda necessário no ambiente implantado:
- 401 anônimo, 403 usuário comum e acesso admin válido nas funções.
- Dois crons aceitam somente seus tokens, com o mesmo horário.
- Criar grupo, adicionar membro, fixar/marcar leitura e promover como admin; bloquear autoentrada/autopromoção.
- Trocar contas e testar offline/reconexão sem mostrar dados da conta anterior.
- Validar estatísticas contra SELECT agregados.
- Validar capa recuperada em descoberta/lista/modal e confirmar origem atual.
- Conferir Jikan com uma página real e no agendamento; nenhuma atualização da API externa foi simulada em produção.
- Validar telas em celular, tablet e desktop.

## Pendências que exigem decisão ou serviço externo

- Jikan indisponível: código não pode garantir o retorno da API. A escolha entre fonte pública, instância própria ou alternativas permanece pendente.
- Cron Jikan continua com orçamento atual de 40 páginas/dia: definir se o objetivo é varredura contínua ou atualização completa diária antes de alterar frequência/carga.
- Background Sync com app fechado e entrega real de push precisam de implementação e validação próprias.
- DeepL exige configuração/cota válida e teste de sugestão/aprovação; textos PT-BR continuam preservados.
- Os erros antigos de hooks/any no lint e a suíte operacional desatualizada não foram reescritos neste pacote.

## Ajuste identificado na validação de produção

CatalogImageSync e sync-images passam a contar apenas referências do storage atual, tratar as antigas como pendentes e mostrar conclusão somente quando todas as capas estiverem locais. A cobertura tem duas casas decimais. O reset usa a sessão autenticada pelo SDK. tests/image-reset.node.test.ts valida transporte, parâmetro de reset e token com o SDK real e fetch isolado. Nenhuma migration adicional é necessária.
