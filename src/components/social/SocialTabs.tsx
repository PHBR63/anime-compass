import { Trophy, TrendingUp, Heart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FriendsRanking } from './FriendsRanking';
import { TrendingAmongFriends } from './TrendingAmongFriends';
import { CommonAnimes } from './CommonAnimes';

// Componente de abas para a seção social
export function SocialTabs() {
  return (
    <div className="glass-card p-6">
      <Tabs defaultValue="ranking" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Ranking</span>
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Em Alta</span>
          </TabsTrigger>
          <TabsTrigger value="common" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Em Comum</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="mt-0">
          <FriendsRanking />
        </TabsContent>

        <TabsContent value="trending" className="mt-0">
          <TrendingAmongFriends />
        </TabsContent>

        <TabsContent value="common" className="mt-0">
          <CommonAnimes />
        </TabsContent>
      </Tabs>
    </div>
  );
}
