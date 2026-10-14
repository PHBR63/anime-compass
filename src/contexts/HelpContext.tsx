import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Interface para configuração de ajuda por página
interface PageHelp {
  title: string;
  description: string;
  tips: string[];
  tourSteps: TourStep[];
}

// Interface para passos do tour guiado
interface TourStep {
  target: string; // seletor CSS ou ID do elemento
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

// Configuração de ajuda para cada página
const helpConfig: Record<string, PageHelp> = {
  '/': {
    title: 'Página Inicial',
    description: 'Bem-vindo ao AniTracker! Aqui você pode começar sua jornada.',
    tips: [
      'Crie uma conta para salvar seu progresso',
      'Explore os animes mais populares',
      'Personalize seu perfil'
    ],
    tourSteps: []
  },
  '/dashboard': {
    title: 'Dashboard',
    description: 'Acompanhe suas estatísticas e progresso de animes.',
    tips: [
      'Veja quantos animes você assistiu',
      'Acompanhe seu tempo total de watch time',
      'Confira sua atividade recente',
      'Analise a distribuição dos seus animes por status'
    ],
    tourSteps: [
      { target: '[data-tour="stats"]', title: 'Estatísticas', content: 'Aqui você vê um resumo do seu progresso', position: 'bottom' },
      { target: '[data-tour="chart"]', title: 'Gráficos', content: 'Visualize a distribuição dos seus animes', position: 'top' },
      { target: '[data-tour="activity"]', title: 'Atividade', content: 'Veja suas atualizações recentes', position: 'left' }
    ]
  },
  '/list': {
    title: 'Minha Lista',
    description: 'Gerencie todos os seus animes em um só lugar.',
    tips: [
      'Use os filtros para encontrar animes específicos',
      'Clique em um anime para ver detalhes e atualizar progresso',
      'Marque animes como favoritos com o ❤️',
      'Use a seleção múltipla para ações em lote',
      'Crie listas personalizadas para organizar melhor'
    ],
    tourSteps: [
      { target: '[data-tour="search"]', title: 'Busca', content: 'Pesquise animes pelo nome', position: 'bottom' },
      { target: '[data-tour="filters"]', title: 'Filtros', content: 'Filtre por status, gênero e mais', position: 'bottom' },
      { target: '[data-tour="anime-grid"]', title: 'Seus Animes', content: 'Clique em um card para ver detalhes', position: 'top' }
    ]
  },
  '/discover': {
    title: 'Descobrir',
    description: 'Encontre novos animes para assistir.',
    tips: [
      'Explore animes por temporada',
      'Veja os mais populares e bem avaliados',
      'Use filtros avançados para refinar a busca',
      'Clique em um anime para adicionar à sua lista'
    ],
    tourSteps: [
      { target: '[data-tour="seasons"]', title: 'Temporadas', content: 'Navegue por animes de cada temporada', position: 'bottom' },
      { target: '[data-tour="popular"]', title: 'Populares', content: 'Veja os animes mais assistidos', position: 'bottom' }
    ]
  },
  '/profile': {
    title: 'Perfil',
    description: 'Personalize seu perfil e veja suas conquistas.',
    tips: [
      'Clique no avatar para alterá-lo',
      'Personalize seu banner de perfil',
      'Adicione uma bio para se apresentar',
      'Veja seus gêneros e estúdios favoritos',
      'Torne seu perfil público para compartilhar'
    ],
    tourSteps: [
      { target: '[data-tour="avatar"]', title: 'Avatar', content: 'Clique para alterar sua foto', position: 'right' },
      { target: '[data-tour="banner"]', title: 'Banner', content: 'Personalize seu banner de perfil', position: 'bottom' },
      { target: '[data-tour="edit-profile"]', title: 'Editar', content: 'Atualize seu nome e bio', position: 'left' }
    ]
  },
  '/social': {
    title: 'Social',
    description: 'Conecte-se com outros fãs de anime.',
    tips: [
      'Adicione amigos para ver suas atividades',
      'Compare suas listas com seus amigos',
      'Recomende animes para outros usuários',
      'Veja o ranking dos seus amigos'
    ],
    tourSteps: [
      { target: '[data-tour="friends"]', title: 'Amigos', content: 'Veja e gerencie suas amizades', position: 'bottom' },
      { target: '[data-tour="activity-feed"]', title: 'Feed', content: 'Acompanhe o que seus amigos estão assistindo', position: 'top' }
    ]
  },
  '/chat': {
    title: 'Chat',
    description: 'Converse com seus amigos sobre animes.',
    tips: [
      'Inicie conversas privadas com amigos',
      'Crie grupos para discussões',
      'Compartilhe animes diretamente no chat',
      'Use reações nas mensagens'
    ],
    tourSteps: []
  },
  '/achievements': {
    title: 'Conquistas',
    description: 'Desbloqueie conquistas conforme usa o app.',
    tips: [
      'Complete desafios para ganhar conquistas',
      'Conquistas raras dão mais prestígio',
      'Algumas conquistas são secretas',
      'Veja seu progresso em cada categoria'
    ],
    tourSteps: []
  },
  '/franchises': {
    title: 'Franquias',
    description: 'Explore franquias e séries relacionadas.',
    tips: [
      'Veja todos os animes de uma franquia',
      'Acompanhe seu progresso na franquia completa',
      'Descubra prequels, sequels e spin-offs'
    ],
    tourSteps: []
  },
  '/studios': {
    title: 'Estúdios',
    description: 'Explore animes por estúdio de animação.',
    tips: [
      'Descubra seus estúdios favoritos',
      'Veja todos os animes de um estúdio',
      'Compare a qualidade entre estúdios'
    ],
    tourSteps: []
  }
};

interface HelpContextType {
  // Estado
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;
  showHelpPanel: boolean;
  setShowHelpPanel: (show: boolean) => void;
  isTourActive: boolean;
  currentTourStep: number;
  
  // Funções do tour
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  endTour: () => void;
  
  // Dados da página atual
  currentPageHelp: PageHelp | null;
  
  // Preferências
  helpEnabled: boolean;
  setHelpEnabled: (enabled: boolean) => void;
  hasSeenWelcome: boolean;
  markWelcomeSeen: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export function HelpProvider({ children }: { children: ReactNode }) {
  // Estados principais
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [currentPath, setCurrentPath] = useState('/');
  
  // Preferências persistidas
  const [helpEnabled, setHelpEnabled] = useState(() => {
    const saved = localStorage.getItem('helpEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // Marcação local imediata (evita "piscar" o modal antes do perfil carregar)
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    return localStorage.getItem('hasSeenWelcome') === 'true';
  });

  // Usuário logado, para sincronizar a marcação com o perfil no banco
  const { user } = useAuth();

  // Ao carregar o usuário, consulta o perfil: se já viu a boas-vindas em
  // qualquer aparelho, marca localmente e nunca mais mostra o modal
  useEffect(() => {
    if (!user) return;
    let ativo = true;
    supabase
      .from('profiles')
      .select('welcome_seen')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (ativo && data?.welcome_seen) {
          setHasSeenWelcome(true);
          localStorage.setItem('hasSeenWelcome', 'true');
        }
      });
    return () => { ativo = false; };
  }, [user?.id]);

  // Atualiza o caminho atual baseado no pathname da URL
  useEffect(() => {
    const updatePath = () => {
      // Normaliza o path removendo trailing slash
      let path = window.location.pathname;
      if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      setCurrentPath(path);
    };
    
    updatePath();
    
    // Escuta mudanças de navegação
    const handleNavigation = () => {
      setTimeout(updatePath, 100);
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    // Intervalo para detectar navegações do react-router
    const interval = setInterval(updatePath, 500);
    
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      clearInterval(interval);
    };
  }, []);

  // Rotas públicas onde o modal de boas-vindas NÃO deve aparecer
  const publicRoutes = ['/shared/list/', '/u/', '/auth', '/forgot-password', '/reset-password', '/maintenance'];
  
  // Verifica se está em rota pública
  const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));

  // Mostra modal de boas-vindas para novos usuários (apenas em rotas protegidas)
  useEffect(() => {
    if (!hasSeenWelcome && helpEnabled && !isPublicRoute) {
      const timer = setTimeout(() => {
        setShowWelcomeModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenWelcome, helpEnabled, isPublicRoute]);

  // Persiste preferências
  useEffect(() => {
    localStorage.setItem('helpEnabled', JSON.stringify(helpEnabled));
  }, [helpEnabled]);

  // Obtém configuração da página atual
  const currentPageHelp = helpConfig[currentPath] || helpConfig['/'];

  // Funções do tour guiado
  const startTour = () => {
    if (currentPageHelp?.tourSteps.length) {
      setIsTourActive(true);
      setCurrentTourStep(0);
    }
  };

  const nextStep = () => {
    if (currentPageHelp && currentTourStep < currentPageHelp.tourSteps.length - 1) {
      setCurrentTourStep(prev => prev + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(prev => prev - 1);
    }
  };

  const endTour = () => {
    setIsTourActive(false);
    setCurrentTourStep(0);
  };

  // Marca a boas-vindas como vista no navegador e no perfil (banco),
  // garantindo que o modal não reapareça em outros aparelhos
  const markWelcomeSeen = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('hasSeenWelcome', 'true');
    if (user) {
      supabase
        .from('profiles')
        .update({ welcome_seen: true })
        .eq('id', user.id)
        .then(() => {});
    }
  };

  return (
    <HelpContext.Provider value={{
      showWelcomeModal,
      setShowWelcomeModal,
      showHelpPanel,
      setShowHelpPanel,
      isTourActive,
      currentTourStep,
      startTour,
      nextStep,
      prevStep,
      endTour,
      currentPageHelp,
      helpEnabled,
      setHelpEnabled,
      hasSeenWelcome,
      markWelcomeSeen
    }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
