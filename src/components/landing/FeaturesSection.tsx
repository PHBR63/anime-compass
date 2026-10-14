import { ListChecks, Compass, Trophy, Users } from 'lucide-react';
import { AnimatedContent, SplitText } from '@/components/animations';
import { WavePattern } from '@/components/backgrounds';

/**
 * Seção de features da landing page
 * Exibe os principais recursos do app em cards com estilo washi oriental
 */

const features = [
  {
    icon: ListChecks,
    title: 'Tracking Completo',
    description: 'Organize seus animes em assistindo, completo, pausado e planejado. Acompanhe episódios e avalie cada série.',
  },
  {
    icon: Compass,
    title: 'Descubra Novos Animes',
    description: 'Receba recomendações personalizadas baseadas no seu histórico e preferências.',
  },
  {
    icon: Trophy,
    title: 'Conquistas e Progresso',
    description: 'Desbloqueie badges conforme avança. Veja estatísticas detalhadas da sua jornada anime.',
  },
  {
    icon: Users,
    title: 'Social',
    description: 'Conecte com amigos, compartilhe listas públicas e veja o que sua galera está assistindo.',
  },
];

export const FeaturesSection = () => {
  return (
    <section className="py-16 md:py-24 relative">
      {/* Background com wave pattern oriental */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/3 to-background" />
        <WavePattern 
          color="hsl(var(--primary))"
          opacity={0.04}
          size={60}
        />
      </div>

      <div className="container mx-auto px-4">
        {/* Header da seção com animação */}
        <div className="text-center mb-10 md:mb-16">
          <AnimatedContent direction="up" duration={0.6}>
            <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold mb-3 md:mb-4">
              <SplitText 
                text="Tudo que você precisa" 
                splitType="words"
                staggerDelay={0.08}
                duration={0.5}
              />
            </h2>
          </AnimatedContent>
          <AnimatedContent direction="up" delay={0.2} duration={0.5}>
            <p className="text-muted-foreground text-sm md:text-lg max-w-xl md:max-w-2xl mx-auto px-2 font-zen">
              Recursos poderosos para você nunca mais perder o controle da sua lista de animes.
            </p>
          </AnimatedContent>
        </div>

        {/* Grid de features com estilo washi */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {features.map((feature, index) => (
            <AnimatedContent 
              key={index}
              direction="up"
              delay={0.1 * index}
              duration={0.5}
              distance={40}
            >
              <div
                className="group relative bg-card/40 backdrop-blur-sm border border-border/40 rounded-xl md:rounded-2xl p-4 md:p-6 hover:border-primary/40 transition-all duration-300 h-full hover:bg-card/60"
              >
                <div className="relative">
                  {/* Ícone com estilo oriental - círculo suave */}
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary/15 transition-colors border border-primary/20">
                    <feature.icon className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                  </div>

                  {/* Título */}
                  <h3 className="font-display text-sm md:text-xl font-semibold mb-1 md:mb-2 leading-tight text-foreground">
                    {feature.title}
                  </h3>

                  {/* Descrição */}
                  <p className="text-muted-foreground text-xs md:text-sm leading-relaxed hidden sm:block font-zen">
                    {feature.description}
                  </p>
                </div>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </div>
    </section>
  );
};
