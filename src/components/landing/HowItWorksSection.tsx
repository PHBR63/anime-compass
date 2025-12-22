import { UserPlus, Plus, TrendingUp } from 'lucide-react';
import { AnimatedContent, SplitText } from '@/components/animations';

/**
 * Seção "Como Funciona" da landing page
 * Exibe os 3 passos para começar a usar o app com estilo hanko (selo japonês)
 */

const steps = [
  {
    icon: UserPlus,
    step: '一',
    title: 'Crie sua conta',
    description: 'Cadastre-se gratuitamente em segundos e tenha acesso a todos os recursos.',
  },
  {
    icon: Plus,
    step: '二',
    title: 'Adicione animes',
    description: 'Busque seus animes favoritos e adicione à sua lista com status e notas.',
  },
  {
    icon: TrendingUp,
    step: '三',
    title: 'Acompanhe tudo',
    description: 'Veja estatísticas, desbloqueie conquistas e descubra novas recomendações.',
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="container mx-auto px-4">
        {/* Header da seção com animação */}
        <div className="text-center mb-10 md:mb-16">
          <AnimatedContent direction="up" duration={0.6}>
            <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold mb-3 md:mb-4">
              <SplitText 
                text="Como funciona" 
                splitType="words"
                staggerDelay={0.1}
                duration={0.5}
              />
            </h2>
          </AnimatedContent>
          <AnimatedContent direction="up" delay={0.2} duration={0.5}>
            <p className="text-muted-foreground text-sm md:text-lg max-w-xl md:max-w-2xl mx-auto font-zen">
              Comece a organizar sua lista de animes em 3 passos simples.
            </p>
          </AnimatedContent>
        </div>

        {/* Steps com estilo hanko */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((item, index) => (
            <AnimatedContent 
              key={index}
              direction="up"
              delay={0.15 * index}
              duration={0.6}
              distance={50}
            >
              <div className="relative">
                {/* Linha conectora com estilo brush stroke */}
                {index < steps.length - 1 && (
                  <>
                    <div className="hidden md:block absolute top-12 left-[60%] w-full h-[2px] bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
                    <div className="block md:hidden absolute left-1/2 top-full h-6 w-[2px] bg-gradient-to-b from-primary/40 to-transparent" />
                  </>
                )}

                <div className="text-center">
                  {/* Hanko style - selo japonês circular */}
                  <div className="relative inline-block mb-4 md:mb-6">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-card/60 border-2 border-primary/30 flex items-center justify-center hover:border-primary/50 transition-colors">
                      <item.icon className="w-7 h-7 md:w-10 md:h-10 text-primary" />
                    </div>
                    {/* Número em kanji estilo hanko */}
                    <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-7 h-7 md:w-9 md:h-9 rounded-full bg-accent text-accent-foreground font-bold text-sm md:text-base flex items-center justify-center font-zen border-2 border-background">
                      {item.step}
                    </span>
                  </div>

                  {/* Título */}
                  <h3 className="font-display text-lg md:text-xl font-semibold mb-1.5 md:mb-2 text-foreground">
                    {item.title}
                  </h3>

                  {/* Descrição */}
                  <p className="text-muted-foreground text-xs md:text-sm max-w-xs mx-auto font-zen">
                    {item.description}
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
