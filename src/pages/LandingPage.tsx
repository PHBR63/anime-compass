import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { CTASection } from '@/components/landing/CTASection';
import { FloatingLines } from '@/components/backgrounds/FloatingLines';

/**
 * Landing Page principal do AniCheck
 * Página pública para usuários não logados
 */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Background animado com linhas flutuantes */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <FloatingLines
          linesGradient={['#8b5cf6', '#a855f7', '#06b6d4', '#10b981']}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={8}
          lineDistance={4}
          animationSpeed={0.8}
          interactive={true}
          bendRadius={12}
          bendStrength={-3}
          parallax={true}
          parallaxStrength={0.15}
          mixBlendMode="screen"
        />
      </div>
      
      <div className="relative z-10">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <CTASection />
        </main>
        
        {/* Footer simples */}
        <footer className="py-8 border-t border-border/50">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              © 2024 AniCheck. Feito com 💜 para otakus.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
