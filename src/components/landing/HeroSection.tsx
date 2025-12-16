import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play, Sparkles } from 'lucide-react';

/**
 * Seção Hero da landing page
 * Apresenta o produto com headline, descrição e CTAs
 */
export const HeroSection = () => {
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
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 md:mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
          <span className="text-xs md:text-sm text-primary font-medium">Organize sua jornada anime</span>
        </div>

        {/* Headline - responsivo */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 animate-fade-in leading-tight" style={{ animationDelay: '0.1s' }}>
          <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            Acompanhe seus
          </span>
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            animes favoritos
          </span>
        </h1>

        {/* Subtítulo */}
        <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-xl md:max-w-2xl mx-auto mb-8 md:mb-10 animate-fade-in px-2" style={{ animationDelay: '0.2s' }}>
          Organize, descubra e compartilhe sua lista de animes. 
          Com recomendações personalizadas, conquistas e estatísticas detalhadas.
        </p>

        {/* CTAs - empilhados em mobile */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
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

        {/* Preview/Mockup do app - responsivo */}
        <div className="mt-10 md:mt-16 relative animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="relative mx-auto max-w-sm md:max-w-4xl">
            {/* Glow effect */}
            <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl md:rounded-2xl blur-xl md:blur-2xl" />
            
            {/* Card preview */}
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                {/* Stats mockup */}
                {[
                  { label: 'Animes', value: '127' },
                  { label: 'Episódios', value: '2.4k' },
                  { label: 'Horas', value: '840' },
                  { label: 'Conquistas', value: '24' },
                ].map((stat, i) => (
                  <div key={i} className="bg-background/50 rounded-lg md:rounded-xl p-2 md:p-4 text-center">
                    <p className="text-lg sm:text-xl md:text-3xl font-bold text-primary">{stat.value}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
