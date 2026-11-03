<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="src/assets/logo-full-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="src/assets/logo-full-light.svg">
    <img src="src/assets/logo-full-dark.svg" alt="AniCheck" width="280">
  </picture>

  <p><strong>Organize sua jornada anime, descubra novos títulos e compartilhe experiências.</strong></p>

  <p>
    <img alt="React 18" src="https://img.shields.io/badge/React-18-149ECA?logo=react&logoColor=white">
    <img alt="TypeScript 5" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
    <img alt="Vite 5" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white">
    <img alt="Tailwind CSS 3" src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white">
    <img alt="PWA" src="https://img.shields.io/badge/PWA-instalável-5A0FC8?logo=pwa&logoColor=white">
    <img alt="Idioma PT-BR" src="https://img.shields.io/badge/idioma-PT--BR-009C3B">
  </p>
</div>

---

## Sobre o AniCheck

O **AniCheck** é uma aplicação web completa para acompanhar animes. Em um único lugar, o usuário pode montar sua lista, registrar progresso e avaliações, explorar um catálogo próprio, descobrir franquias e estúdios, interagir com amigos e participar da comunidade.

O projeto combina uma interface responsiva inspirada na estética japonesa com recursos sociais em tempo real, experiência instalável, funcionamento offline e ferramentas próprias de administração e moderação.

![Visão geral do AniCheck](public/og-image.png)

## Índice

- [Principais recursos](#principais-recursos)
- [Catálogo e fluxo de dados](#catálogo-e-fluxo-de-dados)
- [Experiência PWA e offline](#experiência-pwa-e-offline)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Rotas principais](#rotas-principais)
- [Executando localmente](#executando-localmente)
  - [Quais valores de configuração são públicos](#quais-valores-de-configuração-são-públicos)
- [Comandos disponíveis](#comandos-disponíveis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Documentação](#documentação)
- [Contribuição e licença](#contribuição-e-licença)

## Principais recursos

### Catálogo e descoberta

- Catálogo local com milhares de animes e sinopses em português brasileiro.
- Busca por título e filtros por gênero, estúdio, formato, status, ano e nota.
- Ordenação por nota, popularidade, ano, título, ranking e número de membros.
- Visões de temporada, títulos em destaque e carregamento contínuo de resultados.
- Opção para ocultar da descoberta os títulos que já estão na lista do usuário.
- Páginas dedicadas à exploração por franquias e estúdios.
- Detalhes do anime abertos dentro do aplicativo, sem interromper a navegação.

### Minha Lista

- Estados de acompanhamento: **Planejado**, **Assistindo**, **Completo**, **Pausado** e **Abandonado**.
- Registro de episódios assistidos, nota pessoal, favorito, datas e observações.
- Proteção visual para observações marcadas como spoiler.
- Visualização em grade ou lista.
- Busca, ordenação e filtros por status, favoritos, nota, observações, gênero, estúdio, formato e ano.
- Edição em massa para organizar vários títulos com mais rapidez.
- Listas personalizadas públicas ou privadas, com reordenação por arrastar e soltar.
- Detecção de franquias e sugestões de títulos relacionados que ainda não foram adicionados.
- Exportação dos dados do usuário em **Excel, JSON e CSV**.

### Perfil e estatísticas

- Painel pessoal com progresso, distribuição por status e atividades recentes.
- Perfil com avatar, capa, biografia, gêneros e estúdios favoritos.
- Perfis públicos com visibilidade controlada pelo usuário.
- Histórico de progresso e indicadores de atividade.
- Sistema de conquistas com categorias, raridades, metas e progresso de desbloqueio.

### Comunidade

- Solicitações de amizade, lista de amigos e descoberta de pessoas.
- Convites para novos usuários.
- Feed de atividades e reações.
- Ranking entre amigos, títulos em alta e animes em comum.
- Comparação de listas e envio de recomendações.
- Reviews públicas com notas, curtidas e descurtidas.
- Denúncia de usuários, reviews e mensagens para análise da moderação.

### Chat em tempo real

- Conversas individuais e em grupo.
- Mensagens de texto, respostas, reações e indicadores de leitura.
- Indicadores de digitação e contadores de mensagens não lidas.
- Compartilhamento de cards de animes e listas personalizadas dentro da conversa.
- Envio de recomendações diretamente para amigos.
- Layout específico para celular, tablet e desktop.

### Notificações e preferências

- Central de notificações dentro do aplicativo.
- Notificações push por categoria.
- Alertas para atividades sociais, mensagens e episódios de animes em exibição.
- Horário de **Não Perturbe** configurável.
- Preferências de tema, animações e redução de movimento.

### Administração e moderação

O acesso é protegido por função de usuário e separado entre as áreas de administração e moderação.

**Administração**

- Visão geral da saúde do sistema e métricas de uso.
- Gerenciamento de usuários.
- Auditoria e acompanhamento de erros.
- Testes operacionais do sistema.
- Importação completa ou atualização incremental do catálogo.
- Monitoramento de cobertura, sincronização e armazenamento local de imagens.

**Moderação**

- Fila de denúncias pendentes.
- Ações sobre conteúdo e usuários denunciados.
- Histórico de decisões de moderação.
- Indicadores para acompanhamento da comunidade.

## Catálogo e fluxo de dados

O frontend não depende de consultas diretas a uma API pública durante a navegação normal. Os dados são importados para um catálogo próprio e servidos por uma API interna otimizada.

```text
Fonte externa consolidada
          │
          ▼
  importação completa ─────┐
  atualização incremental ─┤
                           ▼
                    catálogo local
                    + sinopses PT-BR
                    + imagens locais
                           │
                           ▼
                       API interna
                           │
                           ▼
          Descoberta · Detalhes · Filtros
```

Esse desenho oferece:

- respostas rápidas e dados consistentes;
- menor exposição a limites e indisponibilidades de serviços externos;
- sinopses pré-traduzidas em PT-BR;
- CDN próprio para capas, com fallback para a imagem de origem;
- importação e imagens administradas em fluxos separados;
- atualização incremental sem refazer todo o catálogo.

Tipos promocionais ou musicais, como **Music**, **CM** e **PV**, são excluídos do catálogo apresentado aos usuários.

## Experiência PWA e offline

O AniCheck pode ser instalado como aplicativo em dispositivos compatíveis. A configuração PWA inclui:

- manifesto com ícones adaptativos e atalhos para Minha Lista, Descobrir, Dashboard e Social;
- atualização automática do aplicativo, com controles disponíveis nas configurações;
- cache de catálogo e imagens;
- pré-carregamento manual da lista do usuário para acesso offline;
- sincronização de alterações pendentes quando a conexão retorna;
- preferência para sincronizar e baixar imagens apenas por Wi-Fi;
- indicador de conexão e feedback de sincronização;
- notificações push em segundo plano;
- compartilhamento de links para a área de descoberta.

> Alguns recursos sociais e dados ainda não armazenados localmente exigem conexão com a internet.

## Segurança e privacidade

- Autenticação com sessão persistente e rotas privadas.
- Recuperação e redefinição de senha.
- Controle de acesso por linha no banco de dados.
- Papéis administrativos mantidos separadamente dos perfis dos usuários.
- Rotas exclusivas para administradores e moderadores.
- Perfis, listas e conteúdos públicos sujeitos às preferências de visibilidade.
- Validação e higienização das entradas de busca e formulários.
- Registro de auditoria, erros e ações de moderação.
- Operações administrativas sensíveis executadas fora do navegador.

## Arquitetura

O AniCheck é uma **Single Page Application** em React. As páginas são carregadas sob demanda, enquanto o estado remoto é gerenciado com cache e invalidação controlados.

```text
┌──────────────────────────────────────────────────────────┐
│                    Aplicação React                        │
│                                                          │
│  Páginas ── Componentes ── Hooks ── Contextos            │
│     │                          │                          │
│     ├── React Router          ├── TanStack Query         │
│     ├── Tailwind/Radix        ├── cache offline          │
│     └── Framer Motion         └── sincronização realtime │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                  Backend gerenciado                       │
│                                                          │
│  autenticação · PostgreSQL · arquivos · tempo real       │
│  funções de servidor · políticas de acesso               │
└──────────────────────────────────────────────────────────┘
```

### Decisões de desempenho

- Divisão do código por rota com `lazy` e `Suspense`.
- Pré-carregamento das rotas mais acessadas em tempo ocioso.
- Cache de consultas com TanStack Query.
- Virtualização de grades extensas com TanStack Virtual.
- Cache multinível para catálogo e imagens.
- Processamento paginado do catálogo e de imagens.
- Observadores de interseção para carregamento progressivo.
- Preferência por utilitários nativos de data para reduzir o pacote final.

## Tecnologias

| Área | Tecnologias |
|---|---|
| Interface | React 18, TypeScript 5, Vite 5 |
| Estilos e componentes | Tailwind CSS 3, shadcn/ui, Radix UI, Lucide |
| Animações | Framer Motion |
| Navegação | React Router 6 |
| Dados no cliente | TanStack Query 5, Context API |
| Formulários e validação | React Hook Form, Zod |
| Gráficos | Recharts |
| Arrastar e soltar | dnd-kit |
| Listas extensas | TanStack Virtual |
| Exportação | SheetJS (`xlsx`) |
| Aplicativo instalável | Vite PWA, Workbox, Service Worker próprio |
| Backend | Lovable Cloud: PostgreSQL, autenticação, arquivos, tempo real e funções de servidor |

## Rotas principais

| Rota | Área | Acesso |
|---|---|---|
| `/` | Página pública ou painel do usuário autenticado | Público |
| `/auth` | Entrada e criação de conta | Público |
| `/u/:username` | Perfil público | Público |
| `/shared/list/:listId` | Lista compartilhada | Público |
| `/list` | Minha Lista | Autenticado |
| `/list/:id` | Lista personalizada | Autenticado |
| `/list/franchises` | Franquias | Autenticado |
| `/list/studios` | Estúdios | Autenticado |
| `/discover` | Descoberta e catálogo | Autenticado |
| `/reviews` | Reviews da comunidade | Autenticado |
| `/social` | Amigos, ranking e recomendações | Autenticado |
| `/chat` | Conversas | Autenticado |
| `/achievements` | Conquistas | Autenticado |
| `/profile` | Perfil do usuário | Autenticado |
| `/settings` | Preferências, dados e PWA | Autenticado |
| `/moderation` | Moderação | Moderador ou administrador |
| `/admin` | Administração | Administrador |

## Executando localmente

### Pré-requisitos

- Node.js 18 ou superior;
- npm ou Bun;
- acesso a uma instância de backend compatível e já configurada para o projeto.

### Instalação

```bash
git clone <URL_DO_REPOSITORIO>
cd anicheck
npm install
```

Crie um arquivo `.env` na raiz do projeto com as variáveis públicas do ambiente:

```env
VITE_SUPABASE_URL=<url-do-backend>
VITE_SUPABASE_PUBLISHABLE_KEY=<chave-publica>
VITE_SUPABASE_PROJECT_ID=<identificador-do-projeto>
```

O `.gitignore` já ignora o `.env`, então ele nunca deve ser enviado ao repositório. Peça os valores ao responsável pelo projeto (ou copie do painel do backend) e rode `npm run dev`.

### Quais valores de configuração são públicos

Toda variável com prefixo `VITE_` é **pública por natureza**: o Vite embute o valor no bundle JavaScript que o navegador baixa, então qualquer visitante consegue lê-la. Isso é esperado e seguro para as três variáveis abaixo:

| Variável | Papel | Por que pode ficar pública |
|---|---|---|
| `VITE_SUPABASE_URL` | Endereço das funções e do banco | O aplicativo já o usa em cada requisição feita do navegador |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon) do backend | Identifica o projeto sem conceder privilégios; toda regra de acesso a dados fica nas políticas de segurança do banco |
| `VITE_SUPABASE_PROJECT_ID` | Identificador do projeto | Usado para montar a URL acima e para o PWA |

O que **nunca** deve aparecer no frontend, no `.env` versionado ou no repositório:

- Chaves `service_role` ou qualquer credencial de administrador do backend;
- Chaves de terceiros (DeepL, envio de push etc.) — todas são lidas no servidor por meio de segredos do ambiente de funções;
- Tokens de agendamento (cron) — são comparados apenas como hash no banco;
- Dados pessoais, como e-mails de administradores.

> Não inclua credenciais privadas no frontend nem envie o arquivo `.env` para o repositório. O ambiente de produção (Vercel) recebe essas variáveis pela configuração do projeto, não por arquivo versionado.

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:8080`.

## Comandos disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o ambiente local com atualização automática |
| `npm run build` | Gera a versão otimizada para produção |
| `npm run build:dev` | Gera uma versão usando o modo de desenvolvimento |
| `npm run lint` | Executa a análise estática do código |
| `npm run preview` | Abre localmente a versão já gerada |

Os mesmos scripts também podem ser executados com Bun, por exemplo: `bun run dev`.

## Estrutura do projeto

```text
.
├── docs/                         # Documentação do catálogo e dos dados
├── public/                       # Ícones, imagem social e Service Worker próprio
├── src/
│   ├── assets/                   # Marca e imagens locais
│   ├── components/
│   │   ├── admin/                # Administração e operação do catálogo
│   │   ├── anime/                # Cards, filtros, grades e detalhes
│   │   ├── animations/           # Transições e efeitos visuais
│   │   ├── backgrounds/          # Fundos temáticos
│   │   ├── chat/                 # Conversas individuais e em grupo
│   │   ├── layout/               # Estrutura principal e navegação
│   │   ├── lists/                # Listas personalizadas
│   │   ├── moderation/           # Denúncias e ações de moderação
│   │   ├── notifications/        # Preferências e central de notificações
│   │   ├── profile/              # Perfil, avatar, capa e exportação
│   │   ├── pwa/                  # Instalação, cache, atualização e offline
│   │   ├── social/               # Amigos, feed, ranking e comparação
│   │   └── ui/                   # Componentes compartilhados
│   ├── contexts/                 # Estados globais da aplicação
│   ├── hooks/                    # Dados, regras e integrações da interface
│   ├── integrations/             # Cliente e tipos gerados do backend
│   ├── lib/                      # Cache, sincronização, validação e utilitários
│   ├── pages/                    # Páginas e rotas
│   └── types/                    # Tipos do domínio
├── supabase/
│   ├── functions/                # Funções executadas no servidor
│   └── migrations/               # Histórico versionado do banco de dados
├── package.json                  # Dependências e comandos
├── tailwind.config.ts            # Tema e tokens visuais
└── vite.config.ts                # Build, PWA, cache e divisão de código
```

## Documentação

- [`docs/ANIME_CATALOG_API.md`](docs/ANIME_CATALOG_API.md) — filtros, paginação, respostas e operações da API do catálogo.
- [`docs/ANIME_DATA_DOCUMENTATION.md`](docs/ANIME_DATA_DOCUMENTATION.md) — modelo de dados, origem dos campos, cache e tratamento de imagens.

## Identidade visual

A interface combina elementos contemporâneos com referências visuais japonesas:

- **Sakura** como cor e animação de destaque;
- **Torii** em separadores e acentos;
- padrão **Seigaiha** aplicado de forma sutil;
- efeitos inspirados em tinta sumi-e;
- temas claro e escuro;
- respeito à preferência de redução de movimento.

Toda a experiência autenticada é apresentada em português brasileiro e adaptada para celular, tablet e desktop.

## Estado do projeto

O AniCheck está em desenvolvimento ativo. As áreas centrais de catálogo, listas, comunidade, chat, reviews, conquistas, PWA, administração e moderação já fazem parte da aplicação. Melhorias de desempenho, cobertura offline e qualidade do catálogo continuam evoluindo.

## Contribuição e licença

Este é um projeto privado. O acesso ao código não concede permissão para copiar, redistribuir, modificar ou utilizar o software fora dos termos definidos pelos responsáveis pelo projeto.

Para contribuir:

1. crie uma branch para a alteração;
2. mantenha textos e comentários em português brasileiro;
3. preserve os componentes e tokens visuais existentes;
4. valide a experiência em celular, tablet e desktop;
5. execute a análise estática e a geração de produção antes de abrir a revisão;
6. descreva claramente o objetivo e o impacto da mudança.

---

<div align="center">
  <strong>AniCheck</strong><br>
  Feito para quem transforma cada episódio em parte de uma jornada.
</div>
