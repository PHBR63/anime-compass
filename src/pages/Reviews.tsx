import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  ThumbsUp, 
  ThumbsDown,
  User,
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useCommunityReviews, useToggleReviewReaction, type Review } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { GradientText, AnimatedContent, SpotlightCard } from '@/components/animations';
import { ParticlesBackground } from '@/components/backgrounds';

/**
 * Formatar data relativa em português
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
  return date.toLocaleDateString('pt-BR');
}

/**
 * Estatísticas do header
 */
function ReviewStats({ reviews }: { reviews: Review[] | undefined }) {
  const totalReviews = reviews?.length || 0;
  const avgRating = reviews?.length 
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.filter(r => r.rating).length).toFixed(1)
    : '0.0';
  const totalLikes = reviews?.reduce((acc, r) => acc + (r.likes_count || 0), 0) || 0;

  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      <SpotlightCard className="glass-card rounded-xl p-4 text-center">
        <div className="text-2xl md:text-3xl font-bold text-primary">{totalReviews}</div>
        <div className="text-xs text-muted-foreground">Reviews</div>
      </SpotlightCard>
      <SpotlightCard className="glass-card rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-1 text-2xl md:text-3xl font-bold text-warning">
          <Star className="h-5 w-5 fill-warning" />
          {avgRating}
        </div>
        <div className="text-xs text-muted-foreground">Média</div>
      </SpotlightCard>
      <SpotlightCard className="glass-card rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-1 text-2xl md:text-3xl font-bold text-green-500">
          <ThumbsUp className="h-5 w-5" />
          {totalLikes}
        </div>
        <div className="text-xs text-muted-foreground">Curtidas</div>
      </SpotlightCard>
    </div>
  );
}

/**
 * Card de review individual para o feed da comunidade
 */
function CommunityReviewCard({ review, index }: { review: Review; index: number }) {
  const { user } = useAuth();
  const toggleReaction = useToggleReviewReaction();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const authorName = review.author?.display_name || review.author?.username || 'Usuário';
  const contentPreview = review.content.length > 300 && !expanded 
    ? review.content.slice(0, 300) + '...' 
    : review.content;

  // Handler para reações (like/dislike)
  const handleReaction = (isLike: boolean) => {
    if (!user) return;
    toggleReaction.mutate({ reviewId: review.id, malId: review.mal_id, isLike });
  };

  // Cor do rating baseado na nota
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-500 bg-green-500/10 border-green-500/30';
    if (rating >= 6) return 'text-warning bg-warning/10 border-warning/30';
    return 'text-red-500 bg-red-500/10 border-red-500/30';
  };

  return (
    <AnimatedContent 
      direction="up" 
      duration={0.4} 
      delay={index * 0.05}
    >
      <SpotlightCard className="glass-card rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-300">
        {/* Header com gradiente sutil */}
        <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 md:p-5 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to={review.author?.username ? `/u/${review.author.username}` : '#'}>
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                  <AvatarImage src={review.author?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link 
                  to={review.author?.username ? `/u/${review.author.username}` : '#'}
                  className="font-semibold hover:text-primary transition-colors"
                >
                  {authorName}
                </Link>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(review.created_at)}
                </p>
              </div>
            </div>
            
            {/* Rating badge */}
            {review.rating && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-lg font-bold px-3 py-1",
                  getRatingColor(Number(review.rating))
                )}
              >
                <Star className="h-4 w-4 mr-1 fill-current" />
                {Number(review.rating).toFixed(1)}
              </Badge>
            )}
          </div>
        </div>

        {/* Corpo do card */}
        <div className="p-4 md:p-5 space-y-4">
          {/* Info do anime */}
          <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Review para</span>
              <span className="font-medium">Anime #{review.mal_id}</span>
            </div>
            <a 
              href={`https://myanimelist.net/anime/${review.mal_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ver no MAL
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Badges de spoiler */}
          {review.has_spoilers && (
            <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Contém Spoilers
            </Badge>
          )}

          {/* Título */}
          <h3 className="font-display text-xl font-bold leading-tight">{review.title}</h3>

          {/* Conteúdo */}
          {review.has_spoilers && !showSpoiler ? (
            <div className="relative min-h-[100px] rounded-lg bg-muted/20 flex items-center justify-center">
              <div className="absolute inset-0 backdrop-blur-md rounded-lg" />
              <Button
                variant="secondary"
                size="sm"
                className="relative z-10 gap-2"
                onClick={() => setShowSpoiler(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                Revelar Conteúdo
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {contentPreview}
              </p>
              {review.content.length > 300 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-primary hover:text-primary"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Mostrar menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Continuar lendo
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {review.tags.map((tag, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="text-xs bg-primary/10 text-primary border-0"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Footer com ações */}
        <div className="flex items-center justify-between px-4 md:px-5 py-3 bg-muted/20 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 px-3 gap-2 transition-all",
                review.userReaction?.is_like === true && "text-green-500 bg-green-500/10"
              )}
              onClick={() => handleReaction(true)}
              disabled={!user || toggleReaction.isPending}
            >
              <ThumbsUp className={cn(
                "h-4 w-4",
                review.userReaction?.is_like === true && "fill-current"
              )} />
              <span className="font-medium">{Math.max(0, review.likes_count || 0)}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 px-3 transition-all",
                review.userReaction?.is_like === false && "text-red-500 bg-red-500/10"
              )}
              onClick={() => handleReaction(false)}
              disabled={!user || toggleReaction.isPending}
            >
              <ThumbsDown className={cn(
                "h-4 w-4",
                review.userReaction?.is_like === false && "fill-current"
              )} />
            </Button>
          </div>

          {review.author?.username && (
            <Link to={`/u/${review.author.username}`}>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <User className="h-4 w-4" />
                Ver Perfil
              </Button>
            </Link>
          )}
        </div>
      </SpotlightCard>
    </AnimatedContent>
  );
}

/**
 * Skeleton de loading para reviews
 */
function ReviewSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-16 ml-auto rounded-full" />
        </div>
      </div>
      <div className="p-5 space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="px-5 py-3 bg-muted/20 flex justify-between">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

/**
 * Página de Reviews da Comunidade
 */
export default function Reviews() {
  const [orderBy, setOrderBy] = useState<'recent' | 'popular'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: reviews, isLoading } = useCommunityReviews({ orderBy, limit: 50 });

  // Filtra reviews pelo termo de busca
  const filteredReviews = reviews?.filter(review => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      review.title.toLowerCase().includes(query) ||
      review.content.toLowerCase().includes(query) ||
      review.author?.display_name?.toLowerCase().includes(query) ||
      review.author?.username?.toLowerCase().includes(query) ||
      review.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="relative min-h-screen">
      {/* Background com partículas */}
      <ParticlesBackground />
      
      <div className="relative z-10 space-y-6 pt-12 md:pt-0 pb-8">
        {/* Header */}
        <AnimatedContent direction="down" duration={0.5}>
          <div className="space-y-6">
            {/* Título e descrição */}
            <div className="text-center md:text-left">
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                <GradientText animate>Reviews da Comunidade</GradientText>
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Descubra opiniões autênticas sobre seus animes favoritos, 
                compartilhadas por membros da nossa comunidade.
              </p>
            </div>

            {/* Estatísticas */}
            <ReviewStats reviews={reviews} />

            {/* Controles de filtro */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, autor ou tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                />
              </div>

              {/* Tabs de ordenação */}
              <Tabs value={orderBy} onValueChange={(v) => setOrderBy(v as 'recent' | 'popular')}>
                <TabsList className="h-10">
                  <TabsTrigger value="recent" className="gap-2 px-4">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Recentes</span>
                  </TabsTrigger>
                  <TabsTrigger value="popular" className="gap-2 px-4">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Populares</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </AnimatedContent>

        {/* Lista de reviews */}
        {isLoading ? (
          <div className="grid gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => (
              <ReviewSkeleton key={i} />
            ))}
          </div>
        ) : filteredReviews && filteredReviews.length > 0 ? (
          <div className="grid gap-4 md:gap-6">
            {filteredReviews.map((review, index) => (
              <CommunityReviewCard key={review.id} review={review} index={index} />
            ))}
          </div>
        ) : (
          <AnimatedContent direction="up" duration={0.5}>
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">
                {searchQuery ? 'Nenhuma review encontrada' : 'Nenhuma review ainda'}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchQuery 
                  ? 'Tente buscar por outros termos ou remova os filtros.'
                  : 'Seja o primeiro a compartilhar sua opinião sobre um anime!'
                }
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Limpar busca
                </Button>
              )}
            </div>
          </AnimatedContent>
        )}
      </div>
    </div>
  );
}