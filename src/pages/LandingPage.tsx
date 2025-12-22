import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { CTASection } from '@/components/landing/CTASection';
import { SakuraPetals, WavePattern } from '@/components/backgrounds';

/**
 * Landing Page principal do AniCheck
 * Página pública para usuários não logados
 * Estética oriental com pétalas de sakura e elementos japoneses
 */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background com pétalas de sakura caindo */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SakuraPetals
          petalCount={40}
          colors={['hsl(350, 100%, 85%)', 'hsl(350, 90%, 80%)', 'hsl(355, 100%, 90%)', 'hsl(350, 80%, 75%)']}
          speed={0.8}
          windStrength={0.4}
          minSize={10}
          maxSize={18}
          opacity={0.7}
        />
      </div>

      {/* Pattern de ondas japonesas sutil no fundo */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <WavePattern 
          color="hsl(var(--primary))"
          opacity={0.03}
          size={80}
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
        
        {/* Footer com estilo oriental */}
        <footer className="py-8 border-t border-border/50 relative">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground font-zen">
              © 2024 AniCheck. Feito com 💜 para otakus. ✧ アニチェック ✧
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
