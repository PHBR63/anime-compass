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
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommunityReviews, useToggleReviewReaction, type Review } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { GradientText, AnimatedContent } from '@/components/animations';

/**
 * Formatar data relativa
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
  return date.toLocaleDateString('pt-BR');
}

/**
 * Card de review individual para o feed da comunidade
 */
function CommunityReviewCard({ review }: { review: Review }) {
  const { user } = useAuth();
  const toggleReaction = useToggleReviewReaction();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const authorName = review.author?.display_name || review.author?.username || 'Usuário';
  const contentPreview = review.content.length > 250 && !expanded 
    ? review.content.slice(0, 250) + '...' 
    : review.content;

  const handleReaction = (isLike: boolean) => {
    if (!user) return;
    toggleReaction.mutate({ reviewId: review.id, malId: review.mal_id, isLike });
  };

  return (
    <AnimatedContent direction="up" duration={0.3}>
      <div className="glass-card rounded-xl p-5 space-y-4 hover:border-primary/30 transition-colors">
        {/* Header com autor e anime */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={review.author?.username ? `/u/${review.author.username}` : '#'}>
              <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary transition-all">
                <AvatarImage src={review.author?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link 
                to={review.author?.username ? `/u/${review.author.username}` : '#'}
                className="font-medium text-sm hover:text-primary transition-colors"
              >
                {authorName}
              </Link>
              <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
            </div>
          </div>
          
          {/* Rating e badges */}
          <div className="flex items-center gap-2">
            {review.has_spoilers && (
              <Badge variant="outline" className="text-warning border-warning/30 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Spoiler
              </Badge>
            )}
            {review.rating && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {Number(review.rating).toFixed(1)}
              </Badge>
            )}
          </div>
        </div>

        {/* Info do anime */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>Review de</span>
          <span className="font-medium text-foreground">Anime #{review.mal_id}</span>
          <a 
            href={`https://myanimelist.net/anime/${review.mal_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 hover:text-primary transition-colors"
          >
            <span>Ver no MAL</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Título */}
        <h3 className="font-semibold text-lg">{review.title}</h3>

        {/* Conteúdo */}
        {review.has_spoilers && !showSpoiler ? (
          <div className="relative">
            <div className="blur-sm select-none text-sm text-muted-foreground">
              {contentPreview}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              onClick={() => setShowSpoiler(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Revelar Spoiler
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {contentPreview}
            </p>
            {review.content.length > 250 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver mais
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Tags */}
        {review.tags && review.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {review.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer - reações */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1",
              review.userReaction?.is_like === true && "text-green-500"
            )}
            onClick={() => handleReaction(true)}
            disabled={!user || toggleReaction.isPending}
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="text-xs">{Math.max(0, review.likes_count || 0)}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8",
              review.userReaction?.is_like === false && "text-red-500"
            )}
            onClick={() => handleReaction(false)}
            disabled={!user || toggleReaction.isPending}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>

          {review.author?.username && (
            <Link 
              to={`/u/${review.author.username}`}
              className="ml-auto"
            >
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Ver perfil
              </Button>
            </Link>
          )}
        </div>
      </div>
    </AnimatedContent>
  );
}

/**
 * Skeleton de loading para reviews
 */
function ReviewSkeleton() {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Página de Reviews da Comunidade
 */
export default function Reviews() {
  const [orderBy, setOrderBy] = useState<'recent' | 'popular'>('recent');
  const { data: reviews, isLoading } = useCommunityReviews({ orderBy, limit: 50 });

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header */}
      <AnimatedContent direction="down" duration={0.5}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              <GradientText animate>Reviews da Comunidade</GradientText>
            </h1>
            <p className="text-muted-foreground mt-1">
              Descubra opiniões sobre animes de toda a comunidade
            </p>
          </div>

          <Tabs value={orderBy} onValueChange={(v) => setOrderBy(v as 'recent' | 'popular')}>
            <TabsList>
              <TabsTrigger value="recent" className="gap-2">
                <Clock className="h-4 w-4" />
                Recentes
              </TabsTrigger>
              <TabsTrigger value="popular" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Populares
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </AnimatedContent>

      {/* Lista de reviews */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <ReviewSkeleton key={i} />
          ))}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review, index) => (
            <div key={review.id} style={{ animationDelay: `${index * 0.05}s` }}>
              <CommunityReviewCard review={review} />
            </div>
          ))}
        </div>
      ) : (
        <AnimatedContent direction="up" duration={0.5}>
          <div className="glass-card rounded-xl p-12 text-center">
            <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma review ainda</h3>
            <p className="text-muted-foreground text-sm">
              Seja o primeiro a compartilhar sua opinião sobre um anime!
            </p>
          </div>
        </AnimatedContent>
      )}
    </div>
  );
}
