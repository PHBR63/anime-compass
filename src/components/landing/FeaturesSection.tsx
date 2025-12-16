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
    <section className="py-24 relative">
      {/* Background sutil */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-primary/5 to-background" />

      <div className="container mx-auto px-4">
        {/* Header da seção */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Tudo que você precisa
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Recursos poderosos para você nunca mais perder o controle da sua lista de animes.
          </p>
        </div>

        {/* Grid de features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
            >
              {/* Glow no hover */}
              <div className="absolute -inset-px bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              
              <div className="relative">
                {/* Ícone */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>

                {/* Título */}
                <h3 className="font-display text-xl font-semibold mb-2">
                  {feature.title}
                </h3>

                {/* Descrição */}
                <p className="text-muted-foreground text-sm leading-relaxed">
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
