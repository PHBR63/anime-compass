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
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { SessionExpiredCard, isSessionExpiredError } from '@/components/ui/SessionExpiredCard';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useDetailedStats } from '@/hooks/useDetailedStats';
import { useAnimeEntries } from '@/hooks/useAnimeEntries';
import { useUserAchievementStats } from '@/hooks/useAchievements';
import { toast } from 'sonner';

/**
 * Página de perfil do usuário
 * Exibe informações pessoais, estatísticas de animes e favoritos
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
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Cabeçalho do perfil */}
      <div className="glass-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar com upload */}
          {user && (
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={profile?.avatar_url || null}
              displayName={profile?.display_name || null}
              onAvatarUpdated={handleAvatarUpdated}
            />
          )}
          
          {/* Informações do perfil */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                {profile?.display_name || 'Usuário'}
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
            
            {/* Estatísticas rápidas */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">
                  {statsLoading ? '-' : stats?.totalAnimes || 0}
                </p>
                <p className="text-xs text-muted-foreground">Animes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">
                  {statsLoading ? '-' : (stats?.time.totalHours || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Horas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient">
                  {achievementStats?.unlocked || 0}
                </p>
                <p className="text-xs text-muted-foreground">Conquistas</p>
              </div>
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleShare} title="Compartilhar perfil">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsEditModalOpen(true)}
              title="Editar perfil"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <Film className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {statsLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : stats?.totalAnimes || 0}
          </p>
          <p className="text-xs text-muted-foreground">Total de Animes</p>
        </div>
        <div className="glass-card p-4 text-center">
          <PlayCircle className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {statsLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : stats?.averageEpisodesPerAnime || 0}
          </p>
          <p className="text-xs text-muted-foreground">Média por Anime</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {statsLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : stats?.time.formattedShort || '0m'}
          </p>
          <p className="text-xs text-muted-foreground">Tempo Total</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Star className="h-6 w-6 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {statsLoading ? <Skeleton className="h-8 w-12 mx-auto" /> : stats?.completedAnimes || 0}
          </p>
          <p className="text-xs text-muted-foreground">Completados</p>
        </div>
      </div>

      {/* Taxa de conclusão */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Taxa de Conclusão
          </h2>
          <span className="text-2xl font-bold text-gradient">
            {statsLoading ? '-' : `${completionRate}%`}
          </span>
        </div>
        <Progress value={completionRate} className="h-3" />
        <p className="text-sm text-muted-foreground mt-2">
          {stats?.completedAnimes || 0} de {stats?.totalAnimes || 0} animes completados
        </p>
      </div>

      {/* Favoritos */}
      {!entriesLoading && favoriteEntries.length > 0 && (
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
      )}

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
