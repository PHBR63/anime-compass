import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Seção CTA final da landing page
 * Call-to-action para incentivar cadastro
 */
export const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Headline */}
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
            Pronto para organizar sua{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              jornada anime
            </span>
            ?
          </h2>

          {/* Subtítulo */}
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Junte-se a milhares de otakus que já estão usando o AniCheck para acompanhar seus animes favoritos.
          </p>

          {/* CTA Button */}
          <Button size="xl" variant="glow" asChild>
            <Link to="/auth" className="gap-2">
              Criar conta gratuita
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>

          {/* Footer note */}
          <p className="text-sm text-muted-foreground mt-6">
            Sem cartão de crédito • Totalmente gratuito • Comece em segundos
          </p>
        </div>
      </div>
    </section>
  );
};
