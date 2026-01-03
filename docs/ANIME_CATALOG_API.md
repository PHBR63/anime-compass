# API do Catálogo de Animes

Documentação da API própria de animes do AniCheck.

## Visão Geral

O AniCheck possui um catálogo local com **13.000+ animes** importados de uma fonte externa consolidada. Isso proporciona:

- ✅ **Menor latência** (~50-100ms)
- ✅ **Sem rate limiting** para o frontend
- ✅ **Dados consistentes** e cache local
- ✅ **Sinopses pré-traduzidas** (PT-BR) - 100% dos animes
- ✅ **Imagens otimizadas** via CDN próprio

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Fluxo de Dados                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   API Externa ─────► import-catalog ─────► anime_catalog   │
│   (13.400+ animes)   (Edge Function)       (Supabase)       │
│                                                             │
│                           │                                 │
│                           ▼                                 │
│                      anime-api ◄─────────── Frontend        │
│                   (Edge Function)            (React)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Sem Dependência Externa

O sistema **não depende mais da Jikan API**. Todo o catálogo é mantido localmente, eliminando:
- Rate limiting externo
- Instabilidades de terceiros
- Latência de API pública

---

## Endpoints

### Base URL
```
https://tawcauhcogjnthocdhce.supabase.co/functions/v1/anime-api
```

### 1. Listar Animes

```http
GET /anime-api
```

**Parâmetros de Query:**

| Parâmetro | Tipo | Descrição | Exemplo |
|-----------|------|-----------|---------|
| `search` | string | Busca por título | `search=naruto` |
| `status` | string | Filtro por status (vírgula para múltiplos) | `status=Finished Airing,Currently Airing` |
| `type` | string | Filtro por tipo | `type=TV,Movie` |
| `season` | string | Filtro por temporada | `season=winter,spring` |
| `genre` | string/number | Filtro por gênero (nome ou MAL ID) | `genre=Action` ou `genre=1` |
| `studio` | string/number | Filtro por estúdio (nome ou MAL ID) | `studio=MAPPA` ou `studio=569` |
| `year_min` | number | Ano mínimo | `year_min=2020` |
| `year_max` | number | Ano máximo | `year_max=2024` |
| `score_min` | number | Nota mínima | `score_min=7` |
| `score_max` | number | Nota máxima | `score_max=10` |
| `has_image` | boolean | Filtrar por imagem disponível | `has_image=true` |
| `page` | number | Página (default: 1) | `page=2` |
| `limit` | number | Itens por página (max: 100, default: 24) | `limit=50` |
| `sort` | string | Campo de ordenação | `sort=score` |
| `order` | string | Direção (asc/desc) | `order=desc` |

**Campos de Ordenação Válidos:**
- `score` - Nota (default)
- `popularity` - Popularidade
- `year` - Ano
- `title` - Título alfabético
- `rank` - Ranking
- `members` - Membros
- `created_at` - Data de criação
- `updated_at` - Última atualização

**Exemplo de Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "mal_id": 5114,
      "title": "Fullmetal Alchemist: Brotherhood",
      "title_english": "Fullmetal Alchemist: Brotherhood",
      "title_japanese": "鋼の錬金術師 FULLMETAL ALCHEMIST",
      "synopsis": "...",
      "synopsis_pt": "Sinopse em português brasileiro...",
      "score": 9.09,
      "scored_by": 2123456,
      "episodes": 64,
      "status": "Finished Airing",
      "type": "TV",
      "rating": "R - 17+",
      "year": 2009,
      "season": "spring",
      "genres": [{"mal_id": 1, "name": "Action"}, ...],
      "studios": [{"mal_id": 4, "name": "Bones"}],
      "image_url": "https://cdn.myanimelist.net/...",
      "local_image_url": "https://cdn.anicheck.app/..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "total": 13400,
    "total_pages": 559,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 2. Buscar por ID

```http
GET /anime-api?id={uuid}
GET /anime-api?mal_id={number}
```

**Exemplo:**
```
GET /anime-api?mal_id=5114
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "mal_id": 5114,
    "title": "Fullmetal Alchemist: Brotherhood",
    ...
  }
}
```

---

### 3. Estatísticas do Catálogo

```http
GET /anime-api?action=stats
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total_anime": 13400,
    "with_images": 13200,
    "with_synopsis_pt": 13400,
    "by_type": {
      "TV": 5000,
      "Movie": 3000,
      "OVA": 2500,
      "ONA": 1500,
      "Special": 1400
    },
    "by_status": {
      "Finished Airing": 12000,
      "Currently Airing": 800,
      "Not yet aired": 600
    },
    "year_range": { "min": 1960, "max": 2025 },
    "score_range": { "min": 1.5, "max": 9.2 },
    "last_import": "2025-01-03T10:00:00Z"
  }
}
```

---

### 4. Listar Gêneros

```http
GET /anime-api?action=genres
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    { "mal_id": 1, "name": "Action", "count": 2500 },
    { "mal_id": 2, "name": "Adventure", "count": 1800 },
    ...
  ],
  "meta": { "total": 45 }
}
```

---

### 5. Listar Estúdios

```http
GET /anime-api?action=studios
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    { "mal_id": 4, "name": "Bones", "count": 200 },
    { "mal_id": 569, "name": "MAPPA", "count": 150 },
    ...
  ],
  "meta": { "total": 800 }
}
```

---

## Importação do Catálogo

### Edge Function: import-catalog

O catálogo é importado de uma API externa consolidada via Edge Function.

```http
POST /import-catalog
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "mode": "full"
}
```

**Modos de Importação:**

| Modo | Descrição |
|------|-----------|
| `full` | Importação completa (~13.400 animes) |
| `delta` | Apenas alterações desde última sync |

### Fluxo de Importação

```
1. Admin clica em "Importar Catálogo" no painel
2. Edge function chama API externa com action=export
3. Recebe JSON com todos os animes
4. Processa em lotes de 500 via UPSERT
5. Mapeia campos (synopsis_en → synopsis, etc.)
6. Atualiza sync_state com estatísticas
```

### Mapeamento de Campos

| API Externa | Catálogo Local |
|-------------|----------------|
| `synopsis_en` | `synopsis` |
| `synopsis_pt` | `synopsis_pt` |
| `local_image_url` | `local_image_url` |
| (demais) | (idênticos) |

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| `METHOD_NOT_ALLOWED` | Apenas GET é permitido |
| `INVALID_ID` | UUID inválido |
| `INVALID_MAL_ID` | MAL ID não é número |
| `NOT_FOUND` | Anime não encontrado |
| `DATABASE_ERROR` | Erro no banco de dados |
| `INTERNAL_ERROR` | Erro interno |

**Exemplo de Erro:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Anime not found"
  }
}
```

---

## Hooks React

### useAnimeApi

```typescript
import { 
  useAnimeList,
  useInfiniteAnimeList,
  useAnimeByMalId,
  useSearchAnimes,
  useAnimesByGenre,
  useSeasonAnimes,
  useTopAnimes,
  useAnimeStats,
  useAnimeGenres,
  useAnimeStudios
} from '@/hooks/useAnimeApi';

// Lista com filtros
const { data, isLoading } = useAnimeList(
  { search: 'naruto', genre: 1 },
  { page: 1, limit: 24 },
  { field: 'score', order: 'desc' }
);

// Scroll infinito
const { 
  data, 
  fetchNextPage, 
  hasNextPage 
} = useInfiniteAnimeList({ genre: 1 });

// Por MAL ID
const { data: anime } = useAnimeByMalId(5114);

// Top animes
const { data } = useTopAnimes();

// Temporada atual
const { data } = useSeasonAnimes();
```

---

## Tabela do Banco de Dados

### anime_catalog

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID interno |
| `mal_id` | INTEGER | ID do MyAnimeList (único) |
| `title` | TEXT | Título principal |
| `title_english` | TEXT | Título em inglês |
| `title_japanese` | TEXT | Título em japonês |
| `synopsis` | TEXT | Sinopse original (inglês) |
| `synopsis_pt` | TEXT | Sinopse traduzida (PT-BR) |
| `score` | DECIMAL | Nota média |
| `scored_by` | INTEGER | Quantidade de votos |
| `rank` | INTEGER | Ranking |
| `popularity` | INTEGER | Popularidade |
| `members` | INTEGER | Membros |
| `episodes` | INTEGER | Total de episódios |
| `status` | TEXT | Status de exibição |
| `type` | TEXT | Tipo (TV, Movie, etc) |
| `rating` | TEXT | Classificação etária |
| `year` | INTEGER | Ano de lançamento |
| `season` | TEXT | Temporada |
| `genres` | JSONB | Array de gêneros |
| `studios` | JSONB | Array de estúdios |
| `image_url` | TEXT | URL da imagem (MAL CDN) |
| `local_image_url` | TEXT | URL da imagem (CDN próprio) |
| `last_synced_at` | TIMESTAMPTZ | Última sincronização |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

### RLS Policies

- **SELECT**: Público (sem autenticação)
- **INSERT/UPDATE/DELETE**: Apenas admins

---

## Performance

| Métrica | Valor |
|---------|-------|
| Latência média | 50-100ms |
| Rate limit | Ilimitado |
| Cache | Servidor + Cliente |
| Disponibilidade | 99.9% (Supabase) |
| Sinopses PT-BR | 100% |
| Total de animes | 13.400+ |
