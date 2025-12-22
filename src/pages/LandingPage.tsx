import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { CTASection } from '@/components/landing/CTASection';
import { SakuraPetals, WavePattern } from '@/components/backgrounds';
import { ToriiDivider } from '@/components/decorative/ToriiGate';

/**
 * Landing Page principal do AniCheck
 * Página pública para usuários não logados
 * Estética oriental japonesa com pétalas de sakura e elementos tradicionais
 */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background com pétalas de sakura caindo - densidade reduzida */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <SakuraPetals
          petalCount={25}
          colors={['hsl(350, 100%, 85%)', 'hsl(350, 90%, 80%)', 'hsl(355, 100%, 90%)', 'hsl(350, 80%, 75%)']}
          speed={0.7}
          windStrength={0.3}
          minSize={10}
          maxSize={16}
          opacity={0.6}
        />
      </div>

      {/* Pattern de ondas japonesas sutil no fundo - mais visível */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <WavePattern 
          color="hsl(var(--primary))"
          opacity={0.05}
          size={80}
        />
      </div>
      
      <div className="relative z-10">
        <Navbar />
        <main>
          <HeroSection />
          
          {/* Divisor decorativo entre seções */}
          <ToriiDivider />
          
          <FeaturesSection />
          
          {/* Divisor decorativo entre seções */}
          <ToriiDivider />
          
          <HowItWorksSection />
          
          <CTASection />
        </main>
        
        {/* Footer com estilo oriental */}
        <footer className="py-8 border-t border-border/40 relative">
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
