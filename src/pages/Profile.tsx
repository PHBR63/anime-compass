import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Settings, 
  Share2, 
  Film, 
  PlayCircle, 
  Clock, 
  Star,
  Trophy,
  Heart,
  Globe,
  Lock,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { BannerUpload } from '@/components/profile/BannerUpload';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { FavoriteGenresStudios } from '@/components/profile/FavoriteGenresStudios';
import { ExportAnimeList } from '@/components/profile/ExportAnimeList';
import { PushNotificationSettings } from '@/components/notifications/PushNotificationSettings';
import { NotificationPreferencesCard } from '@/components/notifications/NotificationPreferencesCard';
import { SessionExpiredCard, isSessionExpiredError } from '@/components/ui/SessionExpiredCard';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useDetailedStats } from '@/hooks/useDetailedStats';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useUserAchievementStats } from '@/hooks/useAchievements';
import { toast } from 'sonner';
import { GradientText, CountUp, AnimatedContent } from '@/components/animations';
import { ParticlesBackground } from '@/components/backgrounds';

/**
 * Página de perfil do usuário
 * Exibe informações pessoais, estatísticas de animes e favoritos
 * Com animações avançadas para visual premium
 */
export default function Profile() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useProfile();
  const { data: stats, isLoading: statsLoading, error: statsError } = useDetailedStats();
  const { data: entries, isLoading: entriesLoading, error: entriesError } = useAnimeEntries();
  const { data: achievementStats } = useUserAchievementStats();
  const updateProfile = useUpdateProfile();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filtra apenas os favoritos
  const favoriteEntries = entries?.filter(e => e.is_favorite) || [];

  // Formata a data de criação do perfil
  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), "MMM yyyy", { locale: ptBR })
    : '';

  // Calcula a taxa de conclusão
  const completionRate = stats?.totalAnimes 
    ? Math.round((stats.completedAnimes / stats.totalAnimes) * 100) 
    : 0;

  // Manipula a atualização do avatar
  const handleAvatarUpdated = () => {
    refetchProfile();
  };

  // Manipula a atualização do banner
  const handleBannerUpdated = () => {
    refetchProfile();
  };

  // Manipula o salvamento do perfil
  const handleSaveProfile = async (data: {
    display_name?: string;
    username?: string;
    bio?: string;
    is_public: boolean;
  }) => {
    await updateProfile.mutateAsync({
      display_name: data.display_name || null,
      username: data.username || null,
      bio: data.bio || null,
      is_public: data.is_public,
    });
  };

  // Compartilha o perfil (copia link)
  const handleShare = () => {
    if (profile?.username) {
      navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`);
      toast.success('Link do perfil copiado!');
    } else {
      toast.error('Defina um username para compartilhar seu perfil');
    }
  };

  // Verifica se há erro de sessão expirada
  if (isSessionExpiredError(profileError) || isSessionExpiredError(statsError) || isSessionExpiredError(entriesError)) {
    return (
      <div className="space-y-8 pt-12 md:pt-0">
        <SessionExpiredCard 
          title="Meu Perfil"
          icon={<User className="h-5 w-5 text-primary" />}
          message="Sua sessão expirou. Faça login novamente para acessar seu perfil."
        />
      </div>
    );
  }

  // Estado de carregamento
  if (profileLoading) {
    return (
      <div className="space-y-8 pt-12 md:pt-0">
        <div className="glass-card p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-16" />
                <Skeleton className="h-12 w-16" />
                <Skeleton className="h-12 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 relative min-h-screen">
      {/* Fundo de partículas animadas */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <ParticlesBackground 
          particleCount={35} 
          baseHue={280} 
          speed={0.25}
          connectionDistance={100}
        />
      </div>
      {/* Cabeçalho do perfil com Banner */}
      <AnimatedContent direction="down" duration={0.5}>
        <div className="glass-card overflow-hidden">
          {/* Banner */}
          {user && (
            <div data-tour="banner">
              <BannerUpload
                userId={user.id}
                currentBannerUrl={profile?.banner_url || null}
                onBannerUpdated={handleBannerUpdated}
              />
            </div>
          )}
          
          {/* Informações do perfil */}
          <div className="p-6 md:p-8 -mt-12 md:-mt-16 relative">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6">
              {/* Avatar com upload - posicionado sobre o banner */}
              {user && (
                <div className="ring-4 ring-background rounded-full" data-tour="avatar">
                  <AvatarUpload
                    userId={user.id}
                    currentAvatarUrl={profile?.avatar_url || null}
                    displayName={profile?.display_name || null}
                    onAvatarUpdated={handleAvatarUpdated}
                  />
                </div>
              )}
              
              {/* Informações textuais */}
              <div className="flex-1 text-center md:text-left mt-2 md:mt-0">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h1 className="font-display text-2xl md:text-3xl font-bold">
                    <GradientText animate speed={0.5}>
                      {profile?.display_name || 'Usuário'}
                    </GradientText>
                  </h1>
                  <span title={profile?.is_public ? "Perfil público" : "Perfil privado"}>
                    {profile?.is_public ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                </div>
                
                <p className="text-muted-foreground mt-1">
                  {profile?.username ? `@${profile.username}` : 'Sem username'} 
                  {memberSince && ` • Membro desde ${memberSince}`}
                </p>
                
                {profile?.bio && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    {profile.bio}
                  </p>
                )}
              </div>
              
              {/* Botões de ação */}
              <div className="flex gap-2 mt-2 md:mt-0 flex-wrap justify-center md:justify-end">
                {entries && entries.length > 0 && (
                  <ExportAnimeList entries={entries} username={profile?.username} />
                )}
                <Button variant="outline" size="icon" onClick={handleShare} title="Compartilhar perfil">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsEditModalOpen(true)}
                  title="Editar perfil"
                  data-tour="edit-profile"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Estatísticas rápidas com CountUp */}
            <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-6 pt-6 border-t border-border/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">
                  {statsLoading ? '-' : (
                    <CountUp end={stats?.totalAnimes || 0} duration={1.5} />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Animes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">
                  {statsLoading ? '-' : (
                    <CountUp end={stats?.time.totalHours || 0} duration={1.5} />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Horas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">
                  {statsLoading ? '-' : (
                    <CountUp end={stats?.completedAnimes || 0} duration={1.5} />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Completos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">
                  {statsLoading ? '-' : (
                    <CountUp end={achievementStats?.unlocked || 0} duration={1.5} />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Conquistas</p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedContent>

      {/* Grid de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Film, value: stats?.totalAnimes || 0, label: 'Total de Animes', delay: 0 },
          { icon: PlayCircle, value: stats?.averageEpisodesPerAnime || 0, label: 'Média por Anime', delay: 0.1 },
          { icon: Clock, value: stats?.time.formattedShort || '0m', label: 'Tempo Total', delay: 0.2, isString: true },
          { icon: Star, value: stats?.completedAnimes || 0, label: 'Completados', delay: 0.3 },
        ].map((stat, i) => (
          <AnimatedContent key={i} direction="up" delay={stat.delay} duration={0.4}>
            <div className="glass-card p-4 text-center">
              <stat.icon className={`h-6 w-6 ${i === 3 ? 'text-warning' : 'text-primary'} mx-auto mb-2`} />
              <p className="text-2xl font-bold">
                {statsLoading ? (
                  <Skeleton className="h-8 w-12 mx-auto" />
                ) : stat.isString ? (
                  stat.value
                ) : (
                  <CountUp end={stat.value as number} duration={1.5} />
                )}
              </p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </AnimatedContent>
        ))}
      </div>

      {/* Taxa de conclusão */}
      <AnimatedContent direction="up" delay={0.4} duration={0.5}>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" />
              Taxa de Conclusão
            </h2>
            <span className="text-2xl font-bold">
              <GradientText>
                {statsLoading ? '-' : (
                  <><CountUp end={completionRate} duration={1.5} />%</>
                )}
              </GradientText>
            </span>
          </div>
          <Progress value={completionRate} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {stats?.completedAnimes || 0} de {stats?.totalAnimes || 0} animes completados
          </p>
        </div>
      </AnimatedContent>

      {/* Gêneros e Estúdios Favoritos */}
      <FavoriteGenresStudios />

      {/* Favoritos */}
      {!entriesLoading && favoriteEntries.length > 0 && (
        <AnimatedContent direction="up" delay={0.7} duration={0.5}>
          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-destructive fill-destructive" />
              Favoritos
            </h2>
            
            <div className="flex gap-4 overflow-x-auto pb-2">
              {favoriteEntries.map((entry) => (
                <div key={entry.id} className="flex-shrink-0">
                  <img
                    src={entry.image_url || '/placeholder.svg'}
                    alt={entry.title}
                    className="w-20 h-28 object-cover rounded-lg"
                  />
                  <p className="text-xs text-center mt-1 max-w-20 truncate">
                    {entry.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedContent>
      )}

      {/* Configurações de Notificações */}
      <AnimatedContent direction="up" delay={0.8} duration={0.5}>
        <div className="space-y-4">
          <PushNotificationSettings />
          <NotificationPreferencesCard />
        </div>
      </AnimatedContent>

      {/* Modal de edição */}
      <EditProfileModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        profile={profile || null}
        onSave={handleSaveProfile}
        isLoading={updateProfile.isPending}
      />
    </div>
  );
}
