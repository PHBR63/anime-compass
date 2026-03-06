

# Revisão da Página de Catálogo Admin

## Problema Atual

O componente `FreeApiStatus.tsx` é um monólito de **1.268 linhas** que mistura 3 responsabilidades distintas:
1. Importação/Atualização do catálogo (full import + delta sync)
2. Sincronização de imagens (CDN local)
3. Estatísticas gerais do catálogo

Além disso, `CatalogStats.tsx` duplica dados de estatísticas que já existem em `FreeApiStatus`.

## Plano de Refatoração

### Estrutura Final (3 componentes focados + 1 de stats)

```text
src/components/admin/
├── CatalogImportManager.tsx    ← Importação completa + Delta sync
├── CatalogImageSync.tsx        ← CDN local de imagens
├── CatalogOverview.tsx         ← Estatísticas + cobertura (une FreeApiStatus stats + CatalogStats)
├── CatalogSyncLogs.tsx         ← Mantém (já está separado)
└── FreeApiStatus.tsx           ← REMOVIDO (substituído pelos 3 acima)
```

### Arquivo 1: `CatalogImportManager.tsx` (~300 linhas)
Extraído de `FreeApiStatus.tsx` linhas 294-873:
- `iniciarImportacaoCompleta()` (era `startFullImport`)
- `alternarPausaImportacao()` (era `togglePauseImport`)
- `resetarEstadoImportacao()` (era `resetImportState`)
- `executarSincronizacaoDelta()` (era `deltaSyncMutation`)
- UI: Card de importação, progresso paginado, logs, estatísticas delta

### Arquivo 2: `CatalogImageSync.tsx` (~350 linhas)
Extraído de `FreeApiStatus.tsx` linhas 876-1089:
- `sincronizarImagens()` (era `imageSyncMutation`)
- `resetarSincronizacaoImagens()` (era `resetSyncMutation`)
- `usarEstatisticasImagens()` (era query `image-sync-stats`)
- Auto-sync toggle + polling dinâmico
- UI: Card CDN, progresso real-time, cobertura, logs

### Arquivo 3: `CatalogOverview.tsx` (~400 linhas)
Merge de `FreeApiStatus.tsx` linhas 1091-1268 + `CatalogStats.tsx`:
- `usarEstatisticasCatalogo()` (era `useCatalogStats` + `fetchFreeApiStats`)
- `usarGenerosCatalogo()` (era `useCatalogGenres`)
- Cards resumo (total, imagens, sinopses PT-BR, última sync)
- Gráficos de pizza (tipo/status) do CatalogStats
- Gráfico de barras (top 15 gêneros)
- Barras de cobertura de dados

### Arquivo 4: `Admin.tsx` - Abas Renomeadas
Tabs do catálogo reorganizadas:

| Antes | Depois |
|-------|--------|
| Catálogo (tudo junto) | Importação (import + delta) |
| Estatísticas | Imagens (CDN sync) |
| — | Estatísticas (overview + gráficos) |
| — | Logs (mantém) |

### Renomeação de Funções (PT-BR)

```text
startFullImport       → iniciarImportacaoCompleta
togglePauseImport     → alternarPausaImportacao  
resetImportState      → resetarEstadoImportacao
fetchFreeApiStats     → buscarEstatisticasCatalogo
imageSyncMutation     → sincronizarImagensLote
resetSyncMutation     → resetarSincronizacaoImagens
useCatalogStats       → usarEstatisticasCatalogo
useCatalogGenres      → usarGenerosCatalogo
getElapsedTime        → calcularTempoDecorrido
getTypeIcon           → obterIconeTipo
```

### Arquivo removido
- `CatalogStats.tsx` — conteúdo absorvido por `CatalogOverview.tsx`
- `FreeApiStatus.tsx` — substituído pelos 3 novos componentes

### Impacto
- 1 arquivo de 1.268 linhas → 3 arquivos de ~300-400 linhas cada
- Elimina duplicação de stats entre CatalogStats e FreeApiStatus
- Funções renomeadas em PT-BR conforme padrão do projeto
- Sem alteração funcional — mesma UI, mesmos dados

