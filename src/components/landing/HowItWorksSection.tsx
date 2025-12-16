import { UserPlus, Plus, TrendingUp } from 'lucide-react';

/**
 * Seção "Como Funciona" da landing page
 * Exibe os 3 passos para começar a usar o app
 */

const steps = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Crie sua conta',
    description: 'Cadastre-se gratuitamente em segundos e tenha acesso a todos os recursos.',
  },
  {
    icon: Plus,
    step: '02',
    title: 'Adicione animes',
    description: 'Busque seus animes favoritos e adicione à sua lista com status e notas.',
  },
  {
    icon: TrendingUp,
    step: '03',
    title: 'Acompanhe tudo',
    description: 'Veja estatísticas, desbloqueie conquistas e descubra novas recomendações.',
  },
];

export const HowItWorksSection = () => {
  return (
    <section className="py-16 md:py-24 relative">
      <div className="container mx-auto px-4">
        {/* Header da seção */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold mb-3 md:mb-4">
            Como funciona
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg max-w-xl md:max-w-2xl mx-auto">
            Comece a organizar sua lista de animes em 3 passos simples.
          </p>
        </div>

        {/* Steps - vertical em mobile, horizontal em desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              {/* Linha conectora vertical em mobile, horizontal em desktop */}
              {index < steps.length - 1 && (
                <>
                  <div className="hidden md:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-primary/50 to-transparent" />
                  <div className="block md:hidden absolute left-1/2 top-full h-6 w-px bg-gradient-to-b from-primary/50 to-transparent" />
                </>
              )}

              <div className="text-center">
                {/* Número do passo */}
                <div className="relative inline-block mb-4 md:mb-6">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                    <item.icon className="w-7 h-7 md:w-10 md:h-10 text-primary" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary text-primary-foreground font-bold text-xs md:text-sm flex items-center justify-center">
                    {item.step}
                  </span>
                </div>

                {/* Título */}
                <h3 className="font-display text-lg md:text-xl font-semibold mb-1.5 md:mb-2">
                  {item.title}
                </h3>

                {/* Descrição */}
                <p className="text-muted-foreground text-xs md:text-sm max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
