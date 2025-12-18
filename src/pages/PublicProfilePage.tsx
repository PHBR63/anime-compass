import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicProfileByUsername } from '@/hooks/usePublicProfile';
import { UserReviewsSection } from '@/components/profile/UserReviewsSection';
import { 
  User, 
  Tv, 
  Star, 
  Trophy, 
  List, 
  Heart,
  Play,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Globe,
  Lock
} from 'lucide-react';

// Página de perfil público acessível via /u/:username
export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { data: profileData, isLoading, error } = usePublicProfileByUsername(username || '');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const rarityColors: Record<string, string> = {
    common: 'bg-muted text-muted-foreground',
    uncommon: 'bg-green-500/20 text-green-500',
    rare: 'bg-blue-500/20 text-blue-500',
    epic: 'bg-purple-500/20 text-purple-500',
    legendary: 'bg-amber-500/20 text-amber-500',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="flex flex-col items-center -mt-16 relative z-10">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-8 w-48 mt-4" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Lock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-bold mb-2">Perfil Não Disponível</h2>
            <p className="text-muted-foreground mb-4">
              Este perfil não existe ou é privado.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Início
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, stats, achievements, favorites, publicLists } = profileData;

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30">
        {profile.banner_url && (
          <img 
            src={profile.banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Botão Voltar */}
        <Link to="/" className="absolute top-4 left-4">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8">
        {/* Avatar e Info */}
        <div className="flex flex-col items-center -mt-16 relative z-10 mb-8">
          <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-3xl">
              {getInitials(profile.display_name || profile.username || 'U')}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center mt-4">
            <h1 className="text-2xl md:text-3xl font-bold">
              {profile.display_name || profile.username}
            </h1>
            {profile.username && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="mt-3 text-muted-foreground max-w-md mx-auto">
                {profile.bio}
              </p>
            )}
            <Badge variant="secondary" className="mt-3">
              <Globe className="h-3 w-3 mr-1" />
              Perfil Público
            </Badge>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 text-center">
              <Tv className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{stats.totalAnimes}</p>
              <p className="text-xs text-muted-foreground">Total de Animes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{stats.completedAnimes}</p>
              <p className="text-xs text-muted-foreground">Completados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Play className="h-6 w-6 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{stats.watchingAnimes}</p>
              <p className="text-xs text-muted-foreground">Assistindo</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Star className="h-6 w-6 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Média de Nota</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress e Episódios */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
              <span className="font-bold">
                {stats.totalAnimes > 0 
                  ? Math.round((stats.completedAnimes / stats.totalAnimes) * 100)
                  : 0}%
              </span>
            </div>
            <Progress 
              value={stats.totalAnimes > 0 
                ? (stats.completedAnimes / stats.totalAnimes) * 100 
                : 0} 
              className="h-2 mb-4"
            />
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {stats.totalEpisodes.toLocaleString()} episódios assistidos
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Conquistas */}
          {achievements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Conquistas ({achievements.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {achievements.map(achievement => (
                    <Badge 
                      key={achievement.id}
                      className={rarityColors[achievement.rarity || 'common']}
                    >
                      <span className="mr-1">{achievement.icon}</span>
                      {achievement.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Listas Públicas */}
          {publicLists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <List className="h-5 w-5 text-blue-500" />
                  Listas Públicas ({publicLists.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {publicLists.map(list => (
                  <Link 
                    key={list.id}
                    to={`/lists/${list.id}`}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{list.name}</p>
                      {list.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {list.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{list.item_count} animes</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Favoritos */}
        {favorites.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-red-500" />
                Animes Favoritos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {favorites.map(anime => (
                  <div 
                    key={anime.id}
                    className="group relative rounded-lg overflow-hidden aspect-[3/4]"
                  >
                    <img 
                      src={anime.image_url || '/placeholder.svg'}
                      alt={anime.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-xs font-medium text-white truncate">
                        {anime.title}
                      </p>
                      {anime.rating && (
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-xs">{anime.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews do Usuário */}
        <div className="mt-6">
          <UserReviewsSection userId={profile.id} />
        </div>
      </div>
    </div>
  );
}
