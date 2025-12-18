import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  AlertTriangle, 
  ThumbsUp, 
  Star,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserReviews, type Review } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';

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
 * Card compacto de review para perfil público
 */
function ProfileReviewCard({ review }: { review: Review }) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const contentPreview = review.content.length > 150 && !expanded 
    ? review.content.slice(0, 150) + '...' 
    : review.content;

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{review.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Anime #{review.mal_id}</span>
            <span>•</span>
            <span>{formatDate(review.created_at)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {review.has_spoilers && (
            <Badge variant="outline" className="text-warning border-warning/30 text-xs">
              <AlertTriangle className="h-3 w-3" />
            </Badge>
          )}
          {review.rating && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {Number(review.rating).toFixed(1)}
            </Badge>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {review.has_spoilers && !showSpoiler ? (
        <div className="relative">
          <div className="blur-sm select-none text-xs text-muted-foreground">
            {contentPreview}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs h-7"
            onClick={() => setShowSpoiler(true)}
          >
            Revelar
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {contentPreview}
          </p>
          {review.content.length > 150 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 text-xs px-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Mais
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ThumbsUp className="h-3 w-3" />
          <span>{review.likes_count || 0} curtidas</span>
        </div>
        <a 
          href={`https://myanimelist.net/anime/${review.mal_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <span>Ver anime</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

interface UserReviewsSectionProps {
  userId: string;
}

/**
 * Seção de reviews do usuário para o perfil público
 */
export function UserReviewsSection({ userId }: UserReviewsSectionProps) {
  const { data: reviews, isLoading } = useUserReviews(userId);
  const [showAll, setShowAll] = useState(false);

  // Mostrar apenas 3 reviews inicialmente
  const displayedReviews = showAll ? reviews : reviews?.slice(0, 3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-muted/30 rounded-lg p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!reviews || reviews.length === 0) {
    return null; // Não mostrar seção se não tiver reviews
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Reviews ({reviews.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedReviews?.map(review => (
          <ProfileReviewCard key={review.id} review={review} />
        ))}
        
        {reviews.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Ver todas ({reviews.length})
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
