# 📚 Documentação: Dados de Anime e APIs

Este documento detalha todas as informações necessárias para preencher os cards de anime, as APIs consumidas, tratamentos aplicados e opções de importação.

---

## 📑 Índice

1. [Visão Geral das APIs](#visão-geral-das-apis)
2. [Estrutura de Dados do Anime](#estrutura-de-dados-do-anime)
3. [Campos para Exibição nos Cards](#campos-para-exibição-nos-cards)
4. [Endpoints da API Jikan](#endpoints-da-api-jikan)
5. [Sistema de Cache](#sistema-de-cache)
6. [Rate Limiting](#rate-limiting)
7. [Tratamentos e Filtros](#tratamentos-e-filtros)
8. [Proxy de Imagens](#proxy-de-imagens)
9. [Tradução de Sinopse](#tradução-de-sinopse)
10. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
11. [Plano de Resolução de Erros](#plano-de-resolução-de-erros)

---

## 🌐 Visão Geral das APIs

### API Principal: Jikan API v4
- **Base URL:** `https://api.jikan.moe/v4`
- **Documentação:** https://docs.api.jikan.moe/
- **Tipo:** REST API (não-oficial do MyAnimeList)
- **Rate Limit:** 3 requisições/segundo, 60/minuto
- **Autenticação:** Não requerida

### Edge Functions Internas
| Função | Descrição | Autenticação |
|--------|-----------|--------------|
| `proxy-image` | Proxy de imagens para resolver CORS | Não |
| `translate-synopsis` | Tradução de sinopses para PT-BR | Não |
| `get-recommendations` | Recomendações personalizadas com IA | JWT |
| `get-global-stats` | Estatísticas globais do sistema | Não |

---

## 📊 Estrutura de Dados do Anime

### Interface JikanAnime (API Jikan)

```typescript
interface JikanAnime {
  // Identificação
  mal_id: number;              // ID único no MyAnimeList
  title: string;               // Título principal (romaji)
  title_english: string | null; // Título em inglês
  title_japanese: string | null; // Título em japonês
  
  // Imagens
  images: {
    jpg: {
      image_url: string;       // Imagem padrão (~225x318px)
      large_image_url: string; // Imagem grande (~450x636px)
    };
  };
  
  // Conteúdo
  synopsis: string | null;     // Sinopse em inglês
  
  // Métricas
  score: number | null;        // Nota média (0-10)
  scored_by: number | null;    // Quantidade de votos
  popularity: number;          // Ranking de popularidade
  members: number;             // Membros que têm na lista
  rank: number;               // Ranking global
  
  // Informações
  episodes: number | null;     // Total de episódios (null = em andamento)
  status: string;              // "Airing" | "Finished Airing" | "Not yet aired"
  year: number | null;         // Ano de lançamento
  season: string | null;       // "winter" | "spring" | "summer" | "fall"
  type: string;                // "TV" | "Movie" | "OVA" | "ONA" | "Special" | "Music"
  rating: string | null;       // Classificação etária
  
  // Relacionamentos
  genres: { mal_id: number; name: string }[];   // Gêneros
  studios: { mal_id: number; name: string }[];  // Estúdios de animação
}
```

### Interface AnimeEntry (Banco de Dados Local)

```typescript
// Tabela: anime_entries
interface AnimeEntry {
  id: string;                  // UUID
  user_id: string;             // UUID do usuário
  mal_id: number;              // Referência ao MyAnimeList
  title: string;               // Título salvo
  image_url: string | null;    // URL da imagem cacheada
  
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

### JikanAnimeCard (Anime da API - Discover)
| Campo | Fonte | Fallback | Tratamento |
|-------|-------|----------|------------|
| Imagem | `images.jpg.large_image_url` | `images.jpg.image_url` | Proxy + Cache |
| Título | `title` | - | Line-clamp 2 linhas |
| Nota | `score` | Oculto | `.toFixed(1)` |
| Episódios | `episodes` | "? eps" | Formatação |
| Ano | `year` | "N/A" | - |
| Ranking | prop `rank` | Oculto | Badge #N |

### AnimeCard (Anime da Lista do Usuário)
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
| Imagem de fundo | `images.jpg.large_image_url` | Blur + Overlay |
| Imagem principal | `images.jpg.large_image_url` | Capa |
| Título | `anime.title` ou `entry.title` | Header |
| Título japonês | `title_japanese` | Subheader |
| Ano | `year` | Info badge |
| Episódios | `episodes` | Info badge |
| Nota MAL | `score` | Info badge |
| Gêneros | `genres[]` | Badges |
| Estúdios | `studios[]` | Texto |
| Sinopse | `synopsis` | Traduzida para PT-BR |
| Status | `status` | Seletor |
| Progresso | Slider + botões | Interativo |
| Avaliação | StarRating | 1-10 estrelas |
| Notas | Textarea | Editável |

---

## 🔌 Endpoints da API Jikan

### Listagens

```bash
# Top Animes (ranking global)
GET /top/anime?page={page}&limit={limit}

# Temporada Atual
GET /seasons/now?page={page}&limit={limit}

# Busca por texto
GET /anime?q={query}&page={page}&limit={limit}&sfw=true

# Por gênero
GET /anime?genres={genreId}&page={page}&limit={limit}&order_by=score&sort=desc
```

### Detalhes

```bash
# Detalhes completos do anime
GET /anime/{mal_id}

# Relações (sequels, prequels, spin-offs)
GET /anime/{mal_id}/relations
```

### Parâmetros Comuns

| Parâmetro | Tipo | Descrição | Padrão |
|-----------|------|-----------|--------|
| `page` | number | Página de resultados | 1 |
| `limit` | number | Itens por página | 25 (max) |
| `sfw` | boolean | Filtro conteúdo adulto | false |
| `order_by` | string | Campo de ordenação | - |
| `sort` | string | `asc` ou `desc` | - |
| `q` | string | Termo de busca | - |
| `genres` | number | ID do gênero | - |

### Mapeamento de Gêneros

```typescript
const GENRES = [
  { id: 1, name: 'Ação' },
  { id: 2, name: 'Aventura' },
  { id: 4, name: 'Comédia' },
  { id: 8, name: 'Drama' },
  { id: 10, name: 'Fantasia' },
  { id: 22, name: 'Romance' },
  { id: 41, name: 'Suspense' },
  { id: 24, name: 'Sci-Fi' },
  { id: 36, name: 'Slice of Life' },
  { id: 30, name: 'Esportes' },
];
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
│ 2. Jikan Cache (localStorage)                               │
│    └── Top Animes: 1 hora                                   │
│    └── Season: 30 min                                       │
│    └── Search: 15 min                                       │
│    └── Details: 24 horas                                    │
├─────────────────────────────────────────────────────────────┤
│ 3. Service Worker (Cache API)                               │
│    └── jikan-api-cache: 24 horas                            │
├─────────────────────────────────────────────────────────────┤
│ 4. Image Cache (Cache API)                                  │
│    └── anicheck-images-v1                                   │
│    └── Max: 500 imagens                                     │
│    └── TTL: 30 dias                                         │
└─────────────────────────────────────────────────────────────┘
```

### TTLs por Tipo de Dados

```typescript
const CACHE_TTL = {
  TOP_ANIMES: 1000 * 60 * 60,        // 1 hora
  SEASON_ANIMES: 1000 * 60 * 30,     // 30 minutos
  SEARCH_RESULTS: 1000 * 60 * 15,    // 15 minutos
  GENRE_RESULTS: 1000 * 60 * 60,     // 1 hora
  ANIME_DETAILS: 1000 * 60 * 60 * 24 // 24 horas
};
```

---

## ⏱️ Rate Limiting

### Configuração

```typescript
// Limite da API Jikan: 3 req/s, 60 req/min
const RATE_LIMIT_CONFIG = {
  minDelay: 350,      // Delay mínimo entre requisições (ms)
  maxDelay: 2000,     // Delay máximo após 429 (ms)
  retryAttempts: 2,   // Tentativas em caso de 429
};
```

### Implementação

```typescript
// src/lib/jikanRateLimiter.ts
export async function fetchWithRateLimit(url: string): Promise<Response> {
  await ensureRateLimit();  // Aguarda slot disponível
  return fetch(url);
}
```

---

## 🚫 Tratamentos e Filtros

### Conteúdo Excluído

```typescript
// Ratings bloqueados
const EXCLUDED_RATINGS = ['Rx - Hentai'];

// Tipos bloqueados
const EXCLUDED_TYPES = ['Music', 'CM', 'PV'];
```

### Função de Filtro

```typescript
const filterAnimes = (animes: JikanAnime[]): JikanAnime[] => {
  return animes.filter(anime => {
    if (anime.rating && EXCLUDED_RATINGS.includes(anime.rating)) {
      return false;
    }
    if (anime.type && EXCLUDED_TYPES.includes(anime.type)) {
      return false;
    }
    return true;
  });
};
```

### Filtro SFW em Buscas

```bash
# Parâmetro sfw=true em buscas
GET /anime?q=naruto&sfw=true
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
// Resposta da Edge Function
headers: {
  'Cache-Control': 'public, max-age=604800, immutable', // 7 dias
  'CDN-Cache-Control': 'public, max-age=2592000',       // 30 dias
}
```

---

## 🌍 Tradução de Sinopse

### Edge Function: translate-synopsis

```typescript
// supabase/functions/translate-synopsis/index.ts
// POST /functions/v1/translate-synopsis
// Body: { text: "synopsis in English" }
// Response: { translated: "sinopse em português" }
```

### Uso no Frontend

```typescript
// src/hooks/useTranslation.ts
export function useTranslation(text: string | null) {
  return useQuery({
    queryKey: ['translation', text],
    queryFn: async () => {
      const response = await supabase.functions.invoke('translate-synopsis', {
        body: { text }
      });
      return response.data?.translated;
    },
    enabled: !!text,
    staleTime: Infinity, // Traduções são imutáveis
  });
}
```

---

## 🗄️ Estrutura do Banco de Dados

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

## 🔧 Plano de Resolução de Erros

### ✅ Erro 1: translate-synopsis (CORRIGIDO)

**Causa:** O teste estava verificando o campo errado (`translatedText` ao invés de `translation`).

**Correção Aplicada:**
- Atualizado o teste para verificar ambos os campos: `data.translation` e `data.translatedText`
- Adicionado log da resposta para melhor diagnóstico

### ✅ Erro 2: friendships consistency (CORRIGIDO)

**Causa:** O filtro PostgREST não suporta comparação de coluna vs coluna diretamente.

**Correção Aplicada:**
- Busca amizades e filtra localmente para verificar auto-amizades
- Query SQL direta confirmou que não há dados inconsistentes na tabela

### Verificações Realizadas

1. **Secret LOVABLE_API_KEY:** ✅ Configurado corretamente
2. **Tabela friendships:** ✅ Sem registros órfãos ou inconsistentes
3. **Edge Function translate-synopsis:** ✅ Funcionando (bootando corretamente)

### Próximos Passos

1. **Imediato:**
   - Corrigir Edge Function `translate-synopsis`
   - Investigar dados inconsistentes em `friendships`

2. **Curto Prazo:**
   - Adicionar validações mais robustas nos testes
   - Implementar cleanup automático de dados órfãos

3. **Médio Prazo:**
   - Adicionar mais testes de integração
   - Implementar monitoramento proativo

---

## 📈 Métricas de Performance

### Tempos de Resposta Esperados

| Operação | Target | Limite |
|----------|--------|--------|
| Lista de animes | < 200ms | 500ms |
| Dashboard stats | < 500ms | 1000ms |
| Feed de atividades | < 200ms | 500ms |
| Detalhes do anime | < 1000ms | 2000ms |
| Tradução de sinopse | < 3000ms | 5000ms |
| Recomendações AI | < 5000ms | 10000ms |

---

## 📝 Changelog

| Data | Versão | Alterações |
|------|--------|------------|
| 2026-01-02 | 1.0.0 | Documentação inicial |

---

*Documento gerado automaticamente. Última atualização: 2026-01-02*
