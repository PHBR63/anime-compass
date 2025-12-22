# 🎌 AniCheck - Gerenciador de Animes

<div align="center">
  <img src="src/assets/logo.png" alt="AniCheck Logo" width="120" />
  
  **Organize sua jornada pelo mundo dos animes**
  
  [![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Cloud-3FCF8E?logo=supabase)](https://supabase.com/)
</div>

---

## 📖 Sobre o Projeto

**AniCheck** é uma aplicação web moderna para gerenciamento de listas de animes, com estética oriental inspirada em elementos tradicionais japoneses como pétalas de sakura, ondas Seigaiha e portais Torii.

### ✨ Principais Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| 📋 **Minha Lista** | Organize animes por status (Assistindo, Completo, Pausado, Dropado, Planejado) |
| 🔍 **Descobrir** | Explore novos animes via integração com API Jikan (MyAnimeList) |
| 📊 **Dashboard** | Estatísticas detalhadas do seu progresso com gráficos interativos |
| 👥 **Social** | Conecte-se com amigos, compare listas e veja atividades |
| 💬 **Chat** | Mensagens em tempo real com amigos e grupos |
| 🏆 **Conquistas** | Sistema de gamificação com badges e níveis |
| ⭐ **Reviews** | Escreva e leia avaliações de animes |
| 📁 **Listas Personalizadas** | Crie coleções temáticas (Listas públicas/privadas) |
| 🎯 **Recomendações** | Receba sugestões personalizadas baseadas no seu histórico |
| 🌙 **Modo Escuro/Claro** | Tema adaptável às suas preferências |

---

## 🎨 Estética Oriental

O AniCheck possui uma identidade visual única inspirada na cultura japonesa:

- **🌸 Sakura Petals** - Pétalas de cerejeira animadas como background
- **🌊 Wave Pattern** - Padrão tradicional Seigaiha como textura
- **⛩️ Torii Gate** - Portais decorativos como separadores de seção
- **✒️ Ink Cursor** - Efeito de tinta sumi-e seguindo o mouse
- **💫 Neon Text** - Texto com glow estilo letreiros de Tokyo
- **🎌 Paleta Oriental** - Cores sakura, bamboo, indigo japonês, kintsugi

---

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** - Biblioteca UI com hooks e Suspense
- **TypeScript** - Tipagem estática para código mais seguro
- **Vite** - Build tool ultrarrápido
- **Tailwind CSS** - Estilização utility-first
- **shadcn/ui** - Componentes acessíveis e customizáveis
- **Framer Motion** - Animações fluidas
- **React Query** - Gerenciamento de estado assíncrono
- **React Router** - Navegação SPA

### Backend (Lovable Cloud)
- **Supabase** - Backend-as-a-Service
  - PostgreSQL - Banco de dados relacional
  - Auth - Autenticação (email/senha)
  - RLS - Row Level Security para proteção de dados
  - Realtime - Atualizações em tempo real
  - Edge Functions - Funções serverless
  - Storage - Armazenamento de arquivos

### APIs Externas
- **Jikan API** - Dados de animes do MyAnimeList

---

## 📁 Estrutura do Projeto

```
src/
├── assets/              # Imagens e recursos estáticos
├── components/
│   ├── admin/           # Componentes administrativos
│   ├── animations/      # Animações (NeonText, JapaneseReveal, etc)
│   ├── anime/           # Cards, grids, modais de animes
│   ├── auth/            # Autenticação
│   ├── backgrounds/     # Backgrounds (SakuraPetals, WavePattern)
│   ├── chat/            # Sistema de mensagens
│   ├── dashboard/       # Widgets do dashboard
│   ├── decorative/      # Elementos decorativos (ToriiGate)
│   ├── effects/         # Efeitos visuais (InkCursor)
│   ├── help/            # Sistema de ajuda e tour
│   ├── landing/         # Página inicial pública
│   ├── layout/          # MainLayout, Sidebar
│   ├── lists/           # Listas personalizadas
│   ├── moderation/      # Ferramentas de moderação
│   ├── notifications/   # Sistema de notificações
│   ├── profile/         # Perfil do usuário
│   ├── pwa/             # Progressive Web App
│   ├── social/          # Recursos sociais
│   └── ui/              # Componentes base (shadcn)
├── contexts/            # Contextos React (Auth, Anime, Help)
├── hooks/               # Custom hooks
├── integrations/        # Integrações (Supabase client)
├── lib/                 # Utilitários e helpers
├── pages/               # Páginas da aplicação
└── types/               # Definições TypeScript
```

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou bun

### Instalação

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>

# Entre no diretório
cd anicheck

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

---

## 📱 PWA (Progressive Web App)

O AniCheck pode ser instalado como aplicativo:

- **Desktop**: Clique no ícone de instalação na barra de endereços
- **Mobile**: "Adicionar à tela inicial" no menu do navegador

Funcionalidades PWA:
- ✅ Funcionamento offline básico
- ✅ Sincronização em background
- ✅ Push notifications
- ✅ Ícones adaptativos

---

## 🔐 Segurança

- Autenticação segura via Supabase Auth
- Row Level Security (RLS) em todas as tabelas
- Políticas de acesso granulares
- Dados criptografados em trânsito e em repouso

---

## 👥 Funcionalidades Sociais

- **Amigos**: Adicione, aceite/recuse solicitações
- **Feed de Atividades**: Veja o que seus amigos estão assistindo
- **Comparação de Listas**: Compare progresso com amigos
- **Recomendações**: Envie/receba sugestões de animes
- **Chat em Tempo Real**: Conversas individuais e em grupo
- **Rankings**: Veja quem assistiu mais animes

---

## 🏆 Sistema de Conquistas

Desbloqueie badges por:
- Número de animes completados
- Episódios assistidos
- Reviews escritas
- Amigos adicionados
- Listas criadas
- E muito mais!

---

## 🎯 Roadmap

- [ ] Integração com mais plataformas (AniList, Kitsu)
- [ ] App mobile nativo
- [ ] Calendário de lançamentos
- [ ] Notificações de novos episódios
- [ ] Modo offline completo
- [ ] Temas personalizáveis

---

## 📄 Licença

Este projeto é privado e desenvolvido com [Lovable](https://lovable.dev).

---

<div align="center">
  <sub>Feito com 💜 e muito ☕ por entusiastas de anime</sub>
  
  **[⬆ Voltar ao topo](#-anicheck---gerenciador-de-animes)**
</div>
