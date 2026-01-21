# 📚 Documentação: Dados de Anime e APIs

Este documento detalha todas as informações necessárias para preencher os cards de anime, as APIs consumidas, tratamentos aplicados e opções de importação.

---

## 📑 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Estrutura de Dados do Anime](#estrutura-de-dados-do-anime)
3. [Campos para Exibição nos Cards](#campos-para-exibição-nos-cards)
4. [API do Catálogo](#api-do-catálogo)
5. [Sistema de Cache](#sistema-de-cache)
6. [Proxy de Imagens](#proxy-de-imagens)
7. [Tradução de Sinopse](#tradução-de-sinopse)
8. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)

---

## 🌐 Visão Geral da Arquitetura

### Catálogo Local (Fonte Única)

O AniCheck utiliza um **catálogo local próprio** com 13.000+ animes, eliminando dependências de APIs externas.

```
┌─────────────────────────────────────────────────────────────┐
│                    Arquitetura do Sistema                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   API Externa ─────► import-catalog ─────► anime_catalog   │
│   (fonte única)      (Edge Function)       (PostgreSQL)     │
│                                                             │
│                           │                                 │
│                           ▼                                 │
│   Frontend ◄────────── anime-api                            │
│   (React)              (Edge Function)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Benefícios

| Característica | Valor |
|----------------|-------|
| Latência | 50-100ms |
| Rate Limit | Sem limite |
| Sinopses PT-BR | 100% disponíveis |
| Disponibilidade | 99.9% |
| Dependência Externa | Nenhuma |

### Edge Functions

| Função | Descrição | Autenticação |
|--------|-----------|--------------|
| `anime-api` | API principal do catálogo | Não |
| `import-catalog` | Importação de dados externos | JWT (Admin) |
| `proxy-image` | Proxy de imagens para CORS | Não |
| `sync-images` | Sincronização de imagens para CDN local | JWT (Admin) |
| `get-recommendations` | Recomendações personalizadas | JWT |
| `get-global-stats` | Estatísticas globais do sistema | Não |

---

## 📊 Estrutura de Dados do Anime

### Interface CatalogAnime (Catálogo Local)

```typescript
interface CatalogAnime {
  // Identificação
  id: string;                  // UUID interno
  mal_id: number;              // ID do MyAnimeList
  title: string;               // Título principal (romaji)
  title_english: string | null; // Título em inglês
  title_japanese: string | null; // Título em japonês
  
  // Imagens
  image_url: string | null;    // URL da imagem (MAL CDN)
  local_image_url: string | null; // URL da imagem (CDN próprio)
  
  // Conteúdo
  synopsis: string | null;     // Sinopse em inglês
  synopsis_pt: string | null;  // Sinopse em português brasileiro
  
  // Métricas
  score: number | null;        // Nota média (0-10)
  scored_by: number | null;    // Quantidade de votos
  popularity: number | null;   // Ranking de popularidade
  members: number | null;      // Membros que têm na lista
  rank: number | null;         // Ranking global
  
  // Informações
  episodes: number | null;     // Total de episódios
  status: string | null;       // "Finished Airing" | "Currently Airing" | "Not yet aired"
  year: number | null;         // Ano de lançamento
  season: string | null;       // "winter" | "spring" | "summer" | "fall"
  type: string | null;         // "TV" | "Movie" | "OVA" | "ONA" | "Special"
  rating: string | null;       // Classificação etária
  
  // Relacionamentos (JSONB)
  genres: { mal_id: number; name: string }[] | null;
  studios: { mal_id: number; name: string }[] | null;
  
  // Timestamps
  last_synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

### Interface AnimeEntry (Lista do Usuário)

```typescript
// Tabela: anime_entries
interface AnimeEntry {
  id: string;                  // UUID
  user_id: string;             // UUID do usuário
  mal_id: number;              // Referência ao catálogo
  title: string;               // Título salvo
  image_url: string | null;    // URL da imagem
  
  // Progresso
  status: AnimeStatus;         // Status do usuário
  episodes_watched: number;    // Episódios assistidos
  total_episodes: number | null; // Total de episódios
  
  // Avaliação
  rating: number | null;       // Nota do usuário (1-10)
  
  // Flags
  is_favorite: boolean;        // Marcado como favorito
  is_archived: boolean;        // Arquivado
  
  // Notas
  notes: string | null;        // Notas pessoais
  notes_has_spoilers: boolean; // Se notas contêm spoilers
  
  // Datas
  started_at: Date | null;     // Data de início
  completed_at: Date | null;   // Data de conclusão
  created_at: Date;            // Data de criação
  updated_at: Date;            // Última atualização
}

type AnimeStatus = 
  | 'not_started'  // Planejado
  | 'watching'     // Assistindo
  | 'completed'    // Completo
  | 'paused'       // Pausado
  | 'dropped';     // Abandonado
```

---

## 🎴 Campos para Exibição nos Cards

### CatalogAnimeCard (Descobrir)

| Campo | Fonte | Fallback | Tratamento |
|-------|-------|----------|------------|
| Imagem | `local_image_url` | `image_url` | Proxy + Cache |
| Título | `title` | - | Line-clamp 2 linhas |
| Nota | `score` | Oculto | `.toFixed(1)` |
| Episódios | `episodes` | "? eps" | Formatação |
| Ano | `year` | "N/A" | - |
| Ranking | `rank` | Oculto | Badge #N |

### AnimeCard (Lista do Usuário)

| Campo | Fonte | Fallback | Tratamento |
|-------|-------|----------|------------|
| Imagem | `entry.image_url` | `/placeholder.svg` | Proxy + Cache |
| Título | `entry.title` | - | Line-clamp 2 linhas |
| Status | `entry.status` | - | Badge colorida |
| Progresso | `episodes_watched / total_episodes` | Oculto | Barra + % |
| Nota do usuário | `entry.rating` | Oculto | Estrelas |
| Favorito | `entry.is_favorite` | false | Ícone coração |

### AnimeDetailModal (Detalhes Completos)

| Campo | Fonte | Uso |
|-------|-------|-----|
| Imagem de fundo | `image_url` | Blur + Overlay |
| Imagem principal | `image_url` | Capa |
| Título | `anime.title` ou `entry.title` | Header |
| Título japonês | `title_japanese` | Subheader |
| Ano | `year` | Info badge |
| Episódios | `episodes` | Info badge |
| Nota MAL | `score` | Info badge |
| Gêneros | `genres[]` | Badges |
| Estúdios | `studios[]` | Texto |
| Sinopse | `synopsis_pt` ou `synopsis` | Prioriza PT-BR |
| Status | `status` | Seletor |
| Progresso | Slider + botões | Interativo |
| Avaliação | StarRating | 1-10 estrelas |
| Notas | Textarea | Editável |

---

## 🔌 API do Catálogo

### Endpoint Principal

```
GET https://tawcauhcogjnthocdhce.supabase.co/functions/v1/anime-api
```

### Parâmetros de Query

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `search` | string | Busca por título |
| `status` | string | Filtro por status |
| `type` | string | Filtro por tipo |
| `genre` | string/number | Filtro por gênero |
| `studio` | string/number | Filtro por estúdio |
| `year_min` | number | Ano mínimo |
| `year_max` | number | Ano máximo |
| `score_min` | number | Nota mínima |
| `page` | number | Página |
| `limit` | number | Itens por página |
| `sort` | string | Campo de ordenação |
| `order` | string | Direção (asc/desc) |

### Actions Especiais

```http
GET /anime-api?action=stats    # Estatísticas do catálogo
GET /anime-api?action=genres   # Lista de gêneros
GET /anime-api?action=studios  # Lista de estúdios
GET /anime-api?mal_id=5114     # Busca por MAL ID
```

---

## 💾 Sistema de Cache

### Cache Multinível

```
┌─────────────────────────────────────────────────────────────┐
│                    Camadas de Cache                          │
├─────────────────────────────────────────────────────────────┤
│ 1. React Query (memória)                                    │
│    └── staleTime: 15-60 min                                 │
│    └── gcTime: 30-120 min                                   │
├─────────────────────────────────────────────────────────────┤
│ 2. Service Worker (Cache API)                               │
│    └── supabase-cache: 5 minutos (NetworkFirst)             │
├─────────────────────────────────────────────────────────────┤
│ 3. Image Cache (Cache API)                                  │
│    └── mal-images-cache: 500 imagens, 30 dias               │
│    └── anime-images-cache: 300 imagens, 30 dias             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🖼️ Proxy de Imagens

### Problema: CORS

As imagens do CDN do MyAnimeList (`cdn.myanimelist.net`) bloqueiam requisições cross-origin.

### Solução: Edge Function Proxy

```typescript
// supabase/functions/proxy-image/index.ts
// GET /functions/v1/proxy-image?url={encodedUrl}

// Domínios permitidos:
const ALLOWED_DOMAINS = [
  'cdn.myanimelist.net',
  'img1.ak.crunchyroll.com',
  'image.tmdb.org',
];
```

### Uso no Frontend

```typescript
// src/lib/imageCache.ts
export function getProxiedImageUrl(originalUrl: string): string {
  return `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(originalUrl)}`;
}
```

### Headers de Cache

```typescript
headers: {
  'Cache-Control': 'public, max-age=604800, immutable', // 7 dias
  'CDN-Cache-Control': 'public, max-age=2592000',       // 30 dias
}
```

---

## 🌍 Sinopses em Português (PT-BR)

O catálogo já inclui sinopses pré-traduzidas no campo `synopsis_pt`. As traduções são importadas diretamente da API externa durante o processo de sincronização, sem necessidade de tradução em tempo real.

### Cobertura Atual

- As sinopses em PT-BR são fornecidas pela API externa consolidada
- Atualizadas automaticamente durante a importação completa ou delta sync
- Cobertura atual: ~70% do catálogo

### Priorização no Frontend

```typescript
// src/types/catalog.ts
// Helper que prioriza sinopse em português
export function getAnimeSynopsis(anime: CatalogAnime): string | null {
  return anime.synopsis_pt || anime.synopsis;
}
```

### Filtro por Disponibilidade

```typescript
// Buscar apenas animes com sinopse em PT-BR
const { data } = await fetch(`${API_URL}?has_synopsis_pt=true`);
```

---

## 🗄️ Estrutura do Banco de Dados

### Tabela: anime_catalog

```sql
CREATE TABLE anime_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mal_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_english TEXT,
  title_japanese TEXT,
  synopsis TEXT,
  synopsis_pt TEXT,
  score DECIMAL,
  scored_by INTEGER,
  rank INTEGER,
  popularity INTEGER,
  members INTEGER,
  episodes INTEGER,
  status TEXT,
  type TEXT,
  rating TEXT,
  year INTEGER,
  season TEXT,
  genres JSONB,
  studios JSONB,
  image_url TEXT,
  local_image_url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_anime_catalog_mal ON anime_catalog(mal_id);
CREATE INDEX idx_anime_catalog_score ON anime_catalog(score DESC);
CREATE INDEX idx_anime_catalog_title ON anime_catalog(title);
```

### Tabela: anime_entries

```sql
CREATE TABLE anime_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  mal_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  
  status anime_status DEFAULT 'not_started',
  episodes_watched INTEGER DEFAULT 0,
  total_episodes INTEGER,
  rating NUMERIC,
  
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  
  notes TEXT,
  notes_has_spoilers BOOLEAN DEFAULT false,
  
  started_at DATE,
  completed_at DATE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_anime_entries_user ON anime_entries(user_id);
CREATE INDEX idx_anime_entries_mal ON anime_entries(mal_id);
CREATE UNIQUE INDEX idx_anime_entries_user_mal ON anime_entries(user_id, mal_id);
```

### Enum: anime_status

```sql
CREATE TYPE anime_status AS ENUM (
  'not_started',
  'watching', 
  'completed',
  'paused',
  'dropped'
);
```

---

## 📈 Métricas de Performance

| Operação | Tempo Esperado | Limite Aceitável |
|----------|---------------|------------------|
| Listar animes | 50-100ms | < 200ms |
| Buscar por ID | 20-50ms | < 100ms |
| Busca por texto | 100-200ms | < 500ms |
| Importação completa | 30-60s | < 120s |

---

## 🔧 Importação do Catálogo

### Via Painel Admin

1. Acesse `/admin`
2. Vá para a aba "FreeAPI"
3. Clique em "Importação Completa" para importar todos os animes
4. Ou clique em "Sincronizar Atualizações" para delta sync

### Via API

```http
POST /functions/v1/import-catalog
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "mode": "full"  // ou "delta"
}
```
