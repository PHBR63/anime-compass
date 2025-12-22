import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play, Sparkles, Tv, Clock, Trophy, Film } from 'lucide-react';
import { useGlobalStats, formatNumber } from '@/hooks/useGlobalStats';
import { Skeleton } from '@/components/ui/skeleton';
import { SplitText, AnimatedContent } from '@/components/animations';
import { ToriiGate } from '@/components/decorative/ToriiGate';

/**
 * Seção Hero da landing page
 * Apresenta o produto com headline, descrição, CTAs e estatísticas globais reais
 * Estética oriental japonesa com elementos minimalistas
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
      {/* Background com gradiente suave oriental */}
      <div className="absolute inset-0 -z-10">
        {/* Gradiente principal - tons quentes e suaves */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
        
        {/* Círculos decorativos sutis - estilo zen */}
        <div className="absolute top-1/4 left-1/4 w-48 md:w-72 h-48 md:h-72 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-40 md:w-64 h-40 md:h-64 bg-accent/10 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="container mx-auto text-center">
        {/* Badge com estilo oriental minimalista */}
        <AnimatedContent direction="down" delay={0} duration={0.5}>
          <div className="inline-flex items-center gap-2 px-4 md:px-5 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 md:mb-8">
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            <span className="text-xs md:text-sm text-primary font-medium font-zen">
              あなたのアニメ旅 • Sua jornada anime
            </span>
          </div>
        </AnimatedContent>

        {/* Headline com SplitText - animação letra por letra */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight">
          <span className="text-foreground">
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

        {/* Subtítulo com AnimatedContent e fonte zen */}
        <AnimatedContent direction="up" delay={0.7} duration={0.6}>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl md:max-w-2xl mx-auto mb-8 md:mb-10 px-2 font-zen">
            Organize, descubra e compartilhe sua lista de animes. 
            Com recomendações personalizadas, conquistas e estatísticas detalhadas.
          </p>
        </AnimatedContent>

        {/* CTAs com estilo oriental - sem efeitos neon */}
        <AnimatedContent direction="up" delay={0.9} duration={0.5}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Button size="lg" variant="torii" asChild className="w-full sm:w-auto">
              <Link to="/auth" className="gap-2">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                Começar Grátis
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto border-primary/30 hover:border-primary/50 hover:bg-primary/5">
              <Link to="/auth" className="gap-2">
                <Play className="w-4 h-4 md:w-5 md:h-5" />
                Fazer Login
              </Link>
            </Button>
          </div>
        </AnimatedContent>

        {/* Torii Gate decorativo */}
        <AnimatedContent direction="up" delay={1.0} duration={0.6}>
          <div className="mt-8 md:mt-12">
            <ToriiGate variant="sakura" size="sm" withDecoration={false} />
          </div>
        </AnimatedContent>

        {/* Card de estatísticas com estilo washi (papel japonês) */}
        <AnimatedContent direction="up" delay={1.1} duration={0.7} scale={0.95}>
          <div className="mt-6 md:mt-10 relative">
            <div className="relative mx-auto max-w-sm md:max-w-4xl">
              {/* Card de estatísticas estilo oriental - sem glow intenso */}
              <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-xl md:rounded-2xl shadow-xl">
                <div className="p-4 md:p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    {statsConfig.map((stat, i) => {
                      const Icon = stat.icon;
                      return (
                        <div 
                          key={i} 
                          className="bg-background/50 rounded-lg md:rounded-xl p-3 md:p-4 text-center group hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20"
                        >
                          <div className="flex items-center justify-center mb-1 md:mb-2">
                            <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary/70 group-hover:text-primary transition-colors" />
                          </div>
                          {isLoading ? (
                            <Skeleton className="h-7 md:h-9 w-16 md:w-20 mx-auto mb-1" />
                          ) : (
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                              {formatNumber(stat.value)}
                            </p>
                          )}
                          <p className="text-xs md:text-sm text-muted-foreground font-zen">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedContent>
      </div>
    </section>
  );
};
