
## Otimizacao de Scroll Mobile

### Problemas Identificados

1. **Transicao global em TODOS os elementos** (linhas 127-133 do `index.css`): Toda mudanca de `background-color`, `border-color`, `color`, `box-shadow` e `opacity` tem transicao de 300ms aplicada a `*`, `*::before`, `*::after`. Isso causa repaints constantes durante scroll e degrada a performance significativamente em dispositivos moveis.

2. **`backdrop-filter: blur(20px)` no glass-card**: Usado extensivamente (Sidebar, cards, badges), o `backdrop-filter` e extremamente pesado para a GPU em dispositivos moveis, causando jank durante scroll.

3. **SakuraPetals com Canvas animando continuamente**: O componente roda `requestAnimationFrame` infinitamente mesmo quando nao visivel, consumindo CPU/bateria.

4. **SpotlightCard rastreia mousemove em cada card**: Embora seja mais relevante para desktop (mouse), gera re-renders e atualizacoes de estado desnecessarias em cada card da lista.

5. **`scroll-behavior: smooth` no html**: Pode interferir com scroll programatico e causar sensacao de lag em listas longas no mobile.

6. **Transicao de 500ms na imagem** (`transition-all duration-500` no `lazy-image.tsx`): `transition-all` anima TODAS as propriedades incluindo `transform` do `group-hover:scale-110`, causando layout thrashing durante scroll.

7. **`animate-scale-in` com delay incremental nos cards**: Cada card tem `animationDelay: index * 50ms`, o que em listas de 50+ itens gera animacoes por 2.5 segundos, consumindo GPU.

8. **`box-shadow` complexo no hover dos anime-cards**: Multiplas sombras com alpha compositing sao caras de renderizar.

---

### Plano de Implementacao

#### 1. Otimizar transicoes globais no CSS
**Arquivo:** `src/index.css` (linhas 127-133)

- Remover a transicao global de `*` que afeta todos os elementos
- Aplicar transicoes apenas onde necessario (botoes, links, cards especificos)
- Adicionar `will-change: transform` apenas em elementos que realmente animam

#### 2. Reduzir backdrop-filter em mobile
**Arquivo:** `src/index.css`

- Usar media query `(hover: none)` para desabilitar `backdrop-filter` em dispositivos touch
- Substituir por `background` semi-transparente solido em mobile (mais leve)

#### 3. Pausar SakuraPetals quando fora do viewport
**Arquivo:** `src/components/backgrounds/SakuraPetals.tsx`

- Adicionar Intersection Observer para pausar animacao quando nao visivel
- Reduzir `petalCount` automaticamente em mobile (detectar via `window.innerWidth`)
- Usar `will-change: auto` no canvas

#### 4. Desativar SpotlightCard em touch devices
**Arquivo:** `src/components/animations/SpotlightCard.tsx`

- Detectar dispositivo touch via `matchMedia('(hover: none)')`
- Retornar apenas o children sem wrapper de spotlight em mobile
- Elimina re-renders de mousemove em dispositivos sem mouse

#### 5. Otimizar lazy-image para scroll
**Arquivo:** `src/components/ui/lazy-image.tsx`

- Trocar `transition-all duration-500` por `transition-opacity duration-300` (anima apenas opacidade)
- Aumentar `rootMargin` para `200px` em mobile (pre-carrega mais cedo)
- Adicionar `content-visibility: auto` no container para otimizar rendering

#### 6. CSS: Adicionar contain e content-visibility
**Arquivo:** `src/index.css`

- Adicionar `.anime-card { contain: layout style paint; }` para isolamento de rendering
- Usar `content-visibility: auto` em cards fora do viewport
- Limitar `animate-scale-in` a no maximo 12 itens (cap no delay)

#### 7. Otimizar MainLayout para scroll mobile
**Arquivo:** `src/components/layout/MainLayout.tsx`

- Adicionar `overscroll-behavior-y: contain` no container principal para evitar "pull-to-refresh" indesejado
- Mover backgrounds fixos para camada composited com `transform: translateZ(0)`

#### 8. Remover smooth scroll em mobile
**Arquivo:** `src/index.css`

- Aplicar `scroll-behavior: smooth` apenas em desktop via media query
- Mobile usa scroll nativo (mais performatico)

---

### Detalhes Tecnicos

```text
Antes (scroll de 60fps cai para ~30fps em mobile):
+------------------------------------------+
| * { transition: 300ms }                  | <-- Repaint global
| backdrop-filter: blur(20px)              | <-- GPU heavy
| SakuraPetals: 20 petals + rAF always     | <-- CPU drain
| SpotlightCard: mousemove + setState      | <-- Re-renders
| transition-all duration-500 em imagens   | <-- Layout thrashing
| animate-scale-in com delays ate 2.5s     | <-- GPU queue
+------------------------------------------+

Depois (scroll suave ~60fps):
+------------------------------------------+
| Transicoes apenas em :hover/:focus       | <-- Sem repaint em scroll
| bg solido semi-transparente em mobile    | <-- Sem blur GPU
| SakuraPetals pausado quando invisivel    | <-- CPU livre
| SpotlightCard desativado em touch        | <-- Sem re-renders
| transition-opacity duration-300          | <-- Compositor only
| contain: layout style paint nos cards    | <-- Isolamento
+------------------------------------------+
```

### Arquivos a Modificar

1. `src/index.css` - Transicoes, contain, content-visibility, scroll-behavior
2. `src/components/backgrounds/SakuraPetals.tsx` - Pause quando invisivel, menos petalas em mobile
3. `src/components/animations/SpotlightCard.tsx` - Bypass em touch devices
4. `src/components/ui/lazy-image.tsx` - Otimizar transicoes de imagem
5. `src/components/layout/MainLayout.tsx` - overscroll-behavior, GPU layers
6. `src/components/anime/CatalogAnimeCard.tsx` - Remover animate-scale-in ou limitar
7. `src/components/anime/AnimeGrid.tsx` - Cap no delay de animacao

### Impacto Esperado

| Otimizacao | Ganho FPS Mobile | Dificuldade |
|---|---|---|
| Remover transicao global | +10-15 FPS | Facil |
| Desabilitar backdrop-filter mobile | +5-10 FPS | Facil |
| Pausar SakuraPetals | +3-5 FPS + bateria | Facil |
| Desativar SpotlightCard touch | +5 FPS | Facil |
| Otimizar lazy-image | +5-8 FPS | Facil |
| CSS contain nos cards | +5-10 FPS | Facil |
| Scroll behavior nativo | Percepcao melhor | Facil |
