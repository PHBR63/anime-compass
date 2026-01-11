import { useState } from 'react';
import { AlertTriangle, Send, X } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StarRating } from './StarRating';
import { useCreateReview, useUpdateReview, useUserReview } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// Schema de validação para review
const reviewSchema = z.object({
  title: z.string()
    .min(5, 'Título deve ter pelo menos 5 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .trim(),
  content: z.string()
    .min(20, 'Review deve ter pelo menos 20 caracteres')
    .max(2000, 'Review deve ter no máximo 2000 caracteres')
    .trim(),
  rating: z.number().min(0).max(10).optional().nullable(),
  hasSpoilers: z.boolean(),
});

interface ReviewFormProps {
  malId: number;
  animeTitle: string;
  onClose?: () => void;
}

// Formulário para criar ou editar review de um anime
export function ReviewForm({ malId, animeTitle, onClose }: ReviewFormProps) {
  const { user } = useAuth();
  const { data: existingReview } = useUserReview(malId);
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  const [title, setTitle] = useState(existingReview?.title || '');
  const [content, setContent] = useState(existingReview?.content || '');
  const [rating, setRating] = useState(existingReview?.rating ? Number(existingReview.rating) : 0);
  const [hasSpoilers, setHasSpoilers] = useState(existingReview?.has_spoilers || false);
  const [isExpanded, setIsExpanded] = useState(!!existingReview);

  // Atualizar estado quando review existente carregar
  useState(() => {
    if (existingReview) {
      setTitle(existingReview.title);
      setContent(existingReview.content);
      setRating(existingReview.rating ? Number(existingReview.rating) : 0);
      setHasSpoilers(existingReview.has_spoilers || false);
      setIsExpanded(true);
    }
  });

  if (!user) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Faça login para escrever uma review
      </div>
    );
  }

  // Estado para erros de validação
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  // Validar formulário com Zod
  const validateForm = (): boolean => {
    const result = reviewSchema.safeParse({
      title: title.trim(),
      content: content.trim(),
      rating: rating || null,
      hasSpoilers,
    });

    if (!result.success) {
      const fieldErrors: { title?: string; content?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'title') fieldErrors.title = err.message;
        if (err.path[0] === 'content') fieldErrors.content = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (existingReview) {
      updateReview.mutate({
        id: existingReview.id,
        mal_id: malId,
        title: title.trim(),
        content: content.trim(),
        rating: rating || null,
        has_spoilers: hasSpoilers,
      }, {
        onSuccess: () => {
          onClose?.();
        }
      });
    } else {
      createReview.mutate({
        mal_id: malId,
        title: title.trim(),
        content: content.trim(),
        rating: rating || undefined,
        has_spoilers: hasSpoilers,
      }, {
        onSuccess: () => {
          setTitle('');
          setContent('');
          setRating(0);
          setHasSpoilers(false);
          setIsExpanded(false);
          setErrors({});
          onClose?.();
        }
      });
    }
  };

  const isPending = createReview.isPending || updateReview.isPending;

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full p-4 text-left glass-card rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors"
      >
        <span className="text-muted-foreground">
          {existingReview ? 'Editar sua review...' : 'Escrever uma review...'}
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">
          {existingReview ? 'Editar Review' : 'Nova Review'}
        </h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setIsExpanded(false);
            onClose?.();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Título */}
      <div>
        <Label htmlFor="review-title" className="text-xs text-muted-foreground">
          Título da Review
        </Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
          }}
          placeholder={`Minha opinião sobre ${animeTitle}`}
          className={cn("mt-1 bg-secondary/50", errors.title && "border-destructive")}
          maxLength={100}
          required
        />
        {errors.title && (
          <p className="text-xs text-destructive mt-1">{errors.title}</p>
        )}
        <p className="text-xs text-muted-foreground text-right mt-1">
          {title.length}/100
        </p>
      </div>

      {/* Avaliação */}
      <div>
        <Label className="text-xs text-muted-foreground">Sua Nota (opcional)</Label>
        <div className="mt-1">
          <StarRating rating={rating} onRatingChange={setRating} size="md" />
        </div>
      </div>

      {/* Conteúdo */}
      <div>
        <Label htmlFor="review-content" className="text-xs text-muted-foreground">
          Sua Review (mínimo 20 caracteres)
        </Label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (errors.content) setErrors(prev => ({ ...prev, content: undefined }));
          }}
          placeholder="Compartilhe sua opinião sobre este anime... O que você gostou? O que poderia ser melhor?"
          className={cn("mt-1 bg-secondary/50 min-h-[120px]", errors.content && "border-destructive")}
          maxLength={2000}
          required
        />
        {errors.content && (
          <p className="text-xs text-destructive mt-1">{errors.content}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {content.length}/2000
        </p>
      </div>

      {/* Spoilers */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="has-spoilers"
          checked={hasSpoilers}
          onCheckedChange={(checked) => setHasSpoilers(checked === true)}
        />
        <Label
          htmlFor="has-spoilers"
          className={cn(
            "text-sm cursor-pointer flex items-center gap-1",
            hasSpoilers && "text-warning"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Contém spoilers
        </Label>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsExpanded(false);
            onClose?.();
          }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending || !title.trim() || !content.trim()}
        >
          <Send className="h-4 w-4 mr-2" />
          {existingReview ? 'Atualizar' : 'Publicar'}
        </Button>
      </div>
    </form>
  );
}
