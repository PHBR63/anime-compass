import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { WavePattern } from '@/components/backgrounds';
import { ToriiDivider } from '@/components/decorative/ToriiGate';

/**
 * Seção CTA final da landing page
 * Call-to-action com estética oriental japonesa
 */
export const CTASection = () => {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background com wave pattern oriental */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <WavePattern 
          color="hsl(var(--primary))"
          opacity={0.05}
          size={70}
        />
        {/* Círculo decorativo suave */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Torii Divider no topo */}
      <ToriiDivider />

      <div className="container mx-auto px-4">
        <div className="max-w-xl md:max-w-3xl mx-auto text-center">
          {/* Headline */}
          <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold mb-4 md:mb-6">
            Pronto para organizar sua{' '}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              jornada anime
            </span>
            ?
          </h2>

          {/* Subtítulo */}
          <p className="text-muted-foreground text-sm md:text-lg mb-8 md:mb-10 max-w-md md:max-w-xl mx-auto px-2 font-zen">
            Junte-se a milhares de otakus que já estão usando o AniCheck para acompanhar seus animes favoritos.
          </p>

          {/* CTA Button com estilo torii */}
          <Button size="lg" variant="torii" asChild className="w-full sm:w-auto">
            <Link to="/auth" className="gap-2">
              Criar conta gratuita
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </Link>
          </Button>

          {/* Footer note */}
          <p className="text-xs md:text-sm text-muted-foreground mt-4 md:mt-6 font-zen">
            ✧ Sem cartão de crédito • Totalmente gratuito • Comece em segundos ✧
          </p>
        </div>
      </div>
    </section>
  );
};
