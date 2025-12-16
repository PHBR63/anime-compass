import { useState } from 'react';
import { MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown, Trash2, Edit, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StarRating } from './StarRating';
import { ReviewForm } from './ReviewForm';
import { useAnimeReviews, useDeleteReview, useToggleReviewReaction, type Review } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ReviewsListProps {
  malId: number;
  animeTitle: string;
}

// Formatar data relativa
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

// Componente de item de review individual
function ReviewItem({ review, malId, onEdit }: { review: Review; malId: number; onEdit: () => void }) {
  const { user } = useAuth();
  const deleteReview = useDeleteReview();
  const toggleReaction = useToggleReviewReaction();
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isOwner = user?.id === review.user_id;
  const authorName = review.author?.display_name || review.author?.username || 'Usuário';
  const contentPreview = review.content.length > 300 && !expanded 
    ? review.content.slice(0, 300) + '...' 
    : review.content;

  const handleReaction = (isLike: boolean) => {
    if (!user) return;
    toggleReaction.mutate({ reviewId: review.id, malId, isLike });
  };

  return (
    <>
      <div className="glass-card rounded-lg p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={review.author?.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{authorName}</p>
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
              <div className="flex items-center gap-1">
                <StarRating rating={Number(review.rating)} size="sm" readonly />
              </div>
            )}
          </div>
        </div>

        {/* Título */}
        <h4 className="font-semibold">{review.title}</h4>

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
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contentPreview}
            </p>
            {review.content.length > 300 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-7 text-xs"
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

        {/* Footer - ações */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {/* Like */}
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

            {/* Dislike */}
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
          </div>

          {/* Ações do dono */}
          {isOwner && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de confirmação de delete */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir review?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Sua review será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteReview.mutate({ id: review.id, mal_id: malId })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Lista de reviews de um anime
export function ReviewsList({ malId, animeTitle }: ReviewsListProps) {
  const { data: reviews, isLoading } = useAnimeReviews(malId);
  const { user } = useAuth();
  const [editingReview, setEditingReview] = useState(false);

  // Verificar se usuário já tem review
  const userHasReview = reviews?.some(r => r.user_id === user?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Reviews</h3>
        {reviews && reviews.length > 0 && (
          <Badge variant="secondary">{reviews.length}</Badge>
        )}
      </div>

      {/* Formulário de review */}
      {(!userHasReview || editingReview) && (
        <ReviewForm 
          malId={malId} 
          animeTitle={animeTitle}
          onClose={() => setEditingReview(false)}
        />
      )}

      {/* Lista de reviews */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="glass-card rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map(review => (
            <ReviewItem
              key={review.id}
              review={review}
              malId={malId}
              onEdit={() => setEditingReview(true)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma review ainda</p>
          <p className="text-xs">Seja o primeiro a avaliar este anime!</p>
        </div>
      )}
    </div>
  );
}
