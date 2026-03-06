

# Correção: Imagens das Recomendações + Enriquecimento com Catálogo Local

## Problema
A edge function `get-recommendations` retorna dados brutos da API Jikan, onde a URL da imagem está em `anime.images.jpg.large_image_url`. O frontend espera o formato `CatalogAnime` com `local_image_url` e `image_url` como strings diretas. Resultado: todas as imagens aparecem quebradas.

## Solução
Enriquecer as recomendações com dados do catálogo local (`anime_catalog`) na própria edge function, antes de retornar ao frontend. Isso resolve as imagens e aproveita dados já sincronizados (sinopse PT-BR, imagens locais).

## Alterações

### 1. Edge function `get-recommendations/index.ts`
Após obter os candidatos da Jikan e calcular scores, cruzar os `mal_id` com a tabela `anime_catalog`:

- Buscar todos os `mal_id` dos candidatos no `anime_catalog`
- Para cada recomendação, se existir no catálogo local, usar `local_image_url` e `image_url` do catálogo
- Caso não exista no catálogo, extrair `anime.images.jpg.large_image_url` do objeto Jikan
- Normalizar o objeto `anime` retornado para o formato `CatalogAnime` (campos flat: `title`, `image_url`, `local_image_url`, `score`, `episodes`, `year`, `genres`, `studios`)

### 2. Mapeamento Jikan → CatalogAnime (na edge function)
Criar função `normalizeJikanToCatalog` que converte:
```text
Jikan: anime.images.jpg.large_image_url  →  image_url
Jikan: anime.title                       →  title  
Jikan: anime.score                       →  score
Jikan: anime.episodes                    →  episodes
Jikan: anime.year                        →  year
Jikan: anime.genres[].name               →  genres[]
Jikan: anime.studios[].name              →  studios[]
```

Se o anime existir no catálogo local, sobrescrever com `local_image_url` e `synopsis_pt`.

### 3. Sem alterações no frontend
O `SmartRecommendationCard` e `useRecommendations` já estão corretos — o problema é exclusivamente na edge function que retorna dados no formato errado.

## Impacto
- Imagens passam a carregar corretamente (priorizando imagens locais do storage)
- Sinopses em PT-BR disponíveis quando existirem no catálogo
- Sem novas dependências ou tabelas

