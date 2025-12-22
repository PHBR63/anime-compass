import { FindFriendsModal } from '@/components/social/FindFriendsModal';
import { PendingRequests } from '@/components/social/PendingRequests';
import { FriendsList } from '@/components/social/FriendsList';
import { ReceivedRecommendations } from '@/components/social/ReceivedRecommendations';
import { SocialTabs } from '@/components/social/SocialTabs';
import { InviteSection } from '@/components/invites/InviteSection';
import { SakuraPetals, WavePattern } from '@/components/backgrounds';
import { AnimatedContent, NeonText } from '@/components/animations';

/**
 * Página social com sistema completo de amizades, ranking e estatísticas
 * Com estética oriental (SakuraPetals, WavePattern, NeonText)
 */
export default function Social() {
  return (
    <div className="relative space-y-6 pt-12 md:pt-0 min-h-screen">
      {/* Backgrounds orientais */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <SakuraPetals petalCount={15} opacity={0.5} />
      </div>
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <WavePattern opacity={0.08} />
      </div>

      {/* Header */}
      <AnimatedContent direction="down" duration={0.5}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-zen text-3xl md:text-4xl font-bold">
              <NeonText color="sakura" intensity="low">Social</NeonText>
            </h1>
            <p className="text-muted-foreground mt-1">
              Conecte-se com outros fãs de anime
            </p>
          </div>
          
          <FindFriendsModal />
        </div>
      </AnimatedContent>

      {/* Pedidos pendentes */}
      <AnimatedContent direction="up" delay={0.1}>
        <PendingRequests />
      </AnimatedContent>

      {/* Recomendações recebidas */}
      <AnimatedContent direction="up" delay={0.2}>
        <ReceivedRecommendations />
      </AnimatedContent>

      {/* Grid principal */}
      <AnimatedContent direction="up" delay={0.3}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lista de amigos */}
          <div className="lg:col-span-1 space-y-6">
            <FriendsList />
            {/* Seção de convites */}
            <InviteSection />
          </div>

          {/* Abas: Ranking, Em Alta, Em Comum */}
          <div className="lg:col-span-2">
            <SocialTabs />
          </div>
        </div>
      </AnimatedContent>
    </div>
  );
}
