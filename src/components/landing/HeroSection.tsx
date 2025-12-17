import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play, Sparkles, Tv, Clock, Trophy, Film } from 'lucide-react';
import { useGlobalStats, formatNumber } from '@/hooks/useGlobalStats';
import { Skeleton } from '@/components/ui/skeleton';
import { SplitText, AnimatedContent } from '@/components/animations';

/**
 * Seção Hero da landing page
 * Apresenta o produto com headline, descrição, CTAs e estatísticas globais reais
 * Inclui animações avançadas com GSAP
 */
export const HeroSection = () => {
  const { data: stats, isLoading } = useGlobalStats();

  // Configuração dos cards de estatísticas
  const statsConfig = [
    { 
      label: 'Animes', 
      value: stats?.totalAnimes || 0, 
      icon: Tv 
    },
    { 
      label: 'Episódios', 
      value: stats?.totalEpisodes || 0, 
      icon: Film 
    },
    { 
      label: 'Horas', 
      value: stats?.totalHours || 0, 
      icon: Clock 
    },
    { 
      label: 'Conquistas', 
      value: stats?.totalAchievements || 0, 
      icon: Trophy 
    },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 px-4">
      {/* Background com efeitos - otimizado para mobile */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient blobs animados - menores em mobile */}
        <div className="absolute top-1/4 left-1/4 w-48 md:w-96 h-48 md:h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-40 md:w-80 h-40 md:h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/5 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px]" />
      </div>

      <div className="container mx-auto text-center">
        {/* Badge com AnimatedContent */}
        <AnimatedContent direction="down" delay={0} duration={0.5}>
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 md:mb-8">
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            <span className="text-xs md:text-sm text-primary font-medium">Organize sua jornada anime</span>
          </div>
        </AnimatedContent>

        {/* Headline com SplitText - animação letra por letra */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight">
          <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            <SplitText 
              text="Acompanhe seus" 
              splitType="words"
              delay={0.2}
              duration={0.5}
              staggerDelay={0.1}
            />
          </span>
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            <SplitText 
              text="animes favoritos" 
              splitType="words"
              delay={0.5}
              duration={0.5}
              staggerDelay={0.1}
            />
          </span>
        </h1>

        {/* Subtítulo com AnimatedContent */}
        <AnimatedContent direction="up" delay={0.7} duration={0.6}>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl md:max-w-2xl mx-auto mb-8 md:mb-10 px-2">
            Organize, descubra e compartilhe sua lista de animes. 
            Com recomendações personalizadas, conquistas e estatísticas detalhadas.
          </p>
        </AnimatedContent>

        {/* CTAs com AnimatedContent */}
        <AnimatedContent direction="up" delay={0.9} duration={0.5}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Button size="lg" variant="glow" asChild className="w-full sm:w-auto">
              <Link to="/auth" className="gap-2">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                Começar Grátis
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
              <Link to="/auth" className="gap-2">
                <Play className="w-4 h-4 md:w-5 md:h-5" />
                Fazer Login
              </Link>
            </Button>
          </div>
        </AnimatedContent>

        {/* Preview/Mockup do app com estatísticas reais */}
        <AnimatedContent direction="up" delay={1.1} duration={0.7} scale={0.95}>
          <div className="mt-10 md:mt-16 relative">
            <div className="relative mx-auto max-w-sm md:max-w-4xl">
              {/* Glow effect */}
              <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl md:rounded-2xl blur-xl md:blur-2xl" />
              
              {/* Card preview com estatísticas reais */}
              <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                  {statsConfig.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div 
                        key={i} 
                        className="bg-background/50 rounded-lg md:rounded-xl p-3 md:p-4 text-center group hover:bg-background/70 transition-colors"
                      >
                        <div className="flex items-center justify-center mb-1 md:mb-2">
                          <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary/60 group-hover:text-primary transition-colors" />
                        </div>
                        {isLoading ? (
                          <Skeleton className="h-7 md:h-9 w-16 md:w-20 mx-auto mb-1" />
                        ) : (
                          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                            {formatNumber(stat.value)}
                          </p>
                        )}
                        <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </AnimatedContent>
      </div>
    </section>
  );
};
