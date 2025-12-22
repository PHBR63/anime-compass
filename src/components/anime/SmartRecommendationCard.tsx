import { Star, Plus, Check, Loader2, Sparkles, Building2, Tags, MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SmartRecommendation, getMatchScoreColor, getConfidenceBadgeClass } from '@/hooks/useRecommendations';

/**
 * Props do componente SmartRecommendationCard
 */
interface SmartRecommendationCardProps {
  recommendation: SmartRecommendation;
  isInList: boolean;
  isAdding: boolean;
  onAdd: (e: React.MouseEvent) => void;
  onClick: () => void;
}

/**
 * Card de recomendação inteligente com score de compatibilidade e explicação IA
 */
export function SmartRecommendationCard({ 
  recommendation, 
  isInList, 
  isAdding, 
  onAdd, 
  onClick 
}: SmartRecommendationCardProps) {
  const { anime, matchScore, reasons, confidence } = recommendation;
  const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

  return (
    <div 
      className="anime-card group cursor-pointer relative"
      onClick={onClick}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
        {/* Imagem do anime */}
        <img
          src={imageUrl}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Gradiente de fundo */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        {/* Badge de Match Score */}
        <div className="absolute top-2 left-2 z-10">
          <Badge 
            variant="outline" 
            className={`text-xs font-bold ${getConfidenceBadgeClass(confidence)} backdrop-blur-sm`}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {matchScore}%
          </Badge>
        </div>
        
        {/* Nota do MAL */}
        {anime.score && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 z-10">
            <Star className="h-3 w-3 text-warning fill-warning" />
            {anime.score.toFixed(1)}
          </div>
        )}

        {/* Badges de motivos (gêneros e estúdio) */}
        <div className="absolute top-10 left-2 right-2 flex flex-wrap gap-1 z-10">
          {/* Badge de estúdio favorito */}
          {reasons.studio && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30 backdrop-blur-sm"
                  >
                    <Building2 className="h-2.5 w-2.5 mr-0.5" />
                    {reasons.studio}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">Estúdio que você curte!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Badges de gêneros (máximo 2) */}
          {reasons.genres.slice(0, 2).map((genre, idx) => (
            <Badge 
              key={idx}
              variant="outline" 
              className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30 backdrop-blur-sm"
            >
              <Tags className="h-2.5 w-2.5 mr-0.5" />
              {genre}
            </Badge>
          ))}
        </div>

        {/* Hover overlay com botão e explicação IA */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/60 backdrop-blur-sm p-3">
          {/* Explicação IA */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mb-3 px-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <MessageSquareText className="h-3 w-3" />
                    <span>Por que assistir?</span>
                  </div>
                  <p className="text-xs text-foreground line-clamp-3">
                    {reasons.aiExplanation}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px]">
                <p className="text-sm">{reasons.aiExplanation}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Botão de adicionar */}
          <Button
            size="sm"
            variant={isInList ? "secondary" : "default"}
            className="gap-1"
            onClick={onAdd}
            disabled={isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isInList ? (
              <>
                <Check className="h-4 w-4" />
                Na Lista
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Adicionar
              </>
            )}
          </Button>
        </div>
        
        {/* Informações do anime */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-medium text-sm line-clamp-2 text-foreground">
            {anime.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              {anime.episodes ? `${anime.episodes} eps` : '? eps'} • {anime.year || 'N/A'}
            </p>
            {/* Indicador de confiança */}
            <span className={`text-xs font-medium ${getMatchScoreColor(matchScore)}`}>
              {confidence === 'high' ? '🔥' : confidence === 'medium' ? '✨' : '💫'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
