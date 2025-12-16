import { ListChecks, Compass, Trophy, Users } from 'lucide-react';

/**
 * Seção de features da landing page
 * Exibe os principais recursos do app em cards
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
    description: 'Receba recomendações personalizadas com IA baseadas no seu histórico e preferências.',
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
      {/* Background sutil */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-primary/5 to-background" />

      <div className="container mx-auto px-4">
        {/* Header da seção */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold mb-3 md:mb-4">
            Tudo que você precisa
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg max-w-xl md:max-w-2xl mx-auto px-2">
            Recursos poderosos para você nunca mais perder o controle da sua lista de animes.
          </p>
        </div>

        {/* Grid de features - 2 colunas em mobile pequeno */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl md:rounded-2xl p-4 md:p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
            >
              {/* Glow no hover */}
              <div className="absolute -inset-px bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 rounded-xl md:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              
              <div className="relative">
                {/* Ícone */}
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 md:w-7 md:h-7 text-primary" />
                </div>

                {/* Título */}
                <h3 className="font-display text-sm md:text-xl font-semibold mb-1 md:mb-2 leading-tight">
                  {feature.title}
                </h3>

                {/* Descrição - escondida em mobile muito pequeno */}
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed hidden sm:block">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
