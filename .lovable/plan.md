

# Auditoria de Otimizações Mobile/Recursos

## Status Atual

As otimizações do plano original em `.lovable/plan.md` estão **todas implementadas**. No entanto, existem **6 problemas residuais** que ainda impactam performance mobile e consumo de recursos.

---

## Problemas Identificados

### 1. CountUp causa centenas de re-renders por animação
O session replay mostra atualizações numéricas a cada ~7ms. O `CountUp` usa `setCount()` em cada frame via `onUpdate` do Framer Motion, causando ~120 re-renders por animação por stat card. No Dashboard, são 4 cards = ~480 re-renders em 1.5s.

**Correção:** Usar `useRef` + DOM direto (`ref.current.textContent`) em vez de `setState` para atualizar o número.

### 2. AuroraBackground + SakuraPetals + WavePattern no Dashboard = 3 camadas de animação contínua
O Dashboard renderiza 3 backgrounds animados simultâneos (`fixed inset-0`). Cada um consome GPU continuamente:
- Aurora: 3 layers com `filter: blur(80px)` + CSS animations infinitas
- SakuraPetals: Canvas com `requestAnimationFrame` contínuo
- WavePattern: SVG repetido (estático, menos impactante)

**Correção:** Em mobile, desabilitar Aurora e reduzir SakuraPetals ainda mais (ou desabilitar). A Aurora com `blur(80px)` em 3 camadas é extremamente pesada para GPUs móveis.

### 3. 282 usos de `transition-all` em componentes
Mesmo com a transição global removida do CSS, 38 componentes ainda usam `transition-all` inline via Tailwind. Isso anima TODAS as propriedades (width, height, padding, margin, transform, etc.) causando layout thrashing durante scroll.

**Correção:** Substituir `transition-all` por transições específicas nos componentes mais renderizados (AnimeCard, AnimeListItem, Sidebar, etc.).

### 4. `backdrop-blur-sm` usado em 31 arquivos de componentes
O CSS restringe `.glass-card` backdrop-filter ao desktop, mas componentes individuais usam `backdrop-blur-sm` diretamente via Tailwind, ignorando a media query. Exemplos: Sidebar, BulkActionsBar, badges, overlays.

**Correção:** Criar classe utilitária `.blur-desktop` que aplica backdrop-blur apenas em `(hover: hover)` e substituir nos componentes mais renderizados durante scroll.

### 5. AuroraBackground não respeita visibilidade
Diferente do SakuraPetals (que tem IntersectionObserver), a Aurora roda animações CSS infinitas mesmo quando o usuário está scrollado para baixo e ela não é visível.

**Correção:** Adicionar IntersectionObserver ao AuroraBackground para pausar animações (`animation-play-state: paused`) quando fora do viewport.

### 6. `font-size: 16px !important` aplicado a todos os dispositivos webkit
A regra na linha 899-911 do CSS usa `(-webkit-min-device-pixel-ratio: 0)` que atinge TODOS os navegadores webkit (Chrome, Safari, Edge), não apenas iOS. Isso força font-size 16px em inputs mesmo em desktop.

**Correção:** Usar media query mais específica para iOS: `@supports (-webkit-touch-callout: none)`.

---

## Plano de Implementação

### Arquivo 1: `src/components/animations/CountUp.tsx`
- Substituir `useState(count)` + `setCount()` por `useRef<HTMLSpanElement>` + `ref.current.textContent = formatNumber(value)`
- Elimina ~480 re-renders por página de Dashboard

### Arquivo 2: `src/pages/Dashboard.tsx`
- Envolver AuroraBackground e SakuraPetals com verificação `isMobile` (hook `useIsMobile`)
- Em mobile: não renderizar Aurora, reduzir petalCount para 8
- Manter WavePattern (é estático, baixo custo)

### Arquivo 3: `src/components/backgrounds/AuroraBackground.tsx`
- Adicionar IntersectionObserver para pausar animações quando fora do viewport
- Adicionar `will-change: transform` nas layers para composição GPU

### Arquivo 4: `src/index.css`
- Criar `.backdrop-blur-desktop` que aplica blur apenas em `@media (hover: hover)`
- Corrigir media query do font-size para iOS-only

### Arquivo 5: Componentes com `transition-all` de alto impacto
- `AnimeListItem.tsx`: `transition-all` → `transition-colors duration-200`
- `AnimeCard.tsx`: `transition-all` → `transition-[width] duration-300` (barra de progresso)
- `Sidebar.tsx`: `transition-all` → `transition-colors duration-200`
- Demais componentes com menor impacto podem ser tratados depois

```text
Impacto Estimado:
+------------------------------------------+
| CountUp sem setState    | -480 re-renders |
| Aurora off em mobile    | +10-15 FPS      |
| transition-all → spec  | +5-8 FPS scroll |
| backdrop-blur desktop   | +3-5 FPS mobile |
| Aurora IntersObserver   | CPU/bateria     |
+------------------------------------------+
```

### Arquivos Modificados
1. `src/components/animations/CountUp.tsx`
2. `src/pages/Dashboard.tsx`
3. `src/components/backgrounds/AuroraBackground.tsx`
4. `src/index.css`
5. `src/components/anime/AnimeListItem.tsx`
6. `src/components/anime/AnimeCard.tsx`
7. `src/components/layout/Sidebar.tsx`

