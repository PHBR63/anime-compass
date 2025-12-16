import { FindFriendsModal } from '@/components/social/FindFriendsModal';
import { PendingRequests } from '@/components/social/PendingRequests';
import { FriendsList } from '@/components/social/FriendsList';
import { ActivityFeed } from '@/components/social/ActivityFeed';

// Página social com sistema completo de amizades e feed de atividades
export default function Social() {
  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Social
          </h1>
          <p className="text-muted-foreground mt-1">
            Conecte-se com outros fãs de anime
          </p>
        </div>
        
        <FindFriendsModal />
      </div>

      {/* Pedidos pendentes */}
      <PendingRequests />

      {/* Grid principal */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de amigos */}
        <div className="lg:col-span-1">
          <FriendsList />
        </div>

        {/* Feed de atividades */}
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
