import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Play, Star, UserPlus, Clapperboard, Tv, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  formatNotificationTime,
  type Notification,
} from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { AnimeDetailModal } from '@/components/anime/AnimeDetailModal';

/**
 * Retorna o ícone apropriado baseado no tipo/subtipo da notificação
 */
function NotificationIcon({ notification }: { notification: Notification }) {
  const status = notification.data?.status;
  const subtype = notification.data?.notification_subtype;
  
  // Notificação de anime finalizado
  if (subtype === 'anime_finished') {
    return <Clapperboard className="h-4 w-4 text-emerald-500" />;
  }
  // Notificação de episódios atualizados
  if (subtype === 'episodes_updated') {
    return <Tv className="h-4 w-4 text-blue-500" />;
  }
  if (status === 'completed') {
    return <CheckCheck className="h-4 w-4 text-green-500" />;
  }
  if (status === 'watching') {
    return <Play className="h-4 w-4 text-blue-500" />;
  }
  if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
    return <UserPlus className="h-4 w-4 text-purple-500" />;
  }
  if (notification.type === 'achievement') {
    return <Star className="h-4 w-4 text-yellow-500" />;
  }
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

/**
 * Item de notificação individual com suporte a abrir modal de anime
 */
function NotificationItem({ 
  notification,
  onOpenAnime,
}: { 
  notification: Notification;
  onOpenAnime?: (malId: number) => void;
}) {
  const markAsRead = useMarkNotificationAsRead();
  const deleteNotification = useDeleteNotification();
  
  const hasAnimeLink = !!notification.data?.mal_id;
  const subtype = notification.data?.notification_subtype;
  const isAnimeNotification = subtype === 'anime_finished' || subtype === 'episodes_updated';

  const handleClick = () => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    // Se tem mal_id, abre o modal do anime
    if (hasAnimeLink && onOpenAnime) {
      onOpenAnime(notification.data.mal_id as number);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50 last:border-0',
        !notification.is_read && 'bg-primary/5',
        hasAnimeLink && 'hover:bg-primary/10'
      )}
    >
      {/* Imagem do anime ou ícone */}
      <div className="flex-shrink-0 relative">
        {notification.data?.anime_image ? (
          <img
            src={notification.data.anime_image as string}
            alt=""
            className="w-10 h-14 object-cover rounded"
          />
        ) : isAnimeNotification ? (
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            subtype === 'anime_finished' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
          )}>
            <NotificationIcon notification={notification} />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <NotificationIcon notification={notification} />
          </div>
        )}
        
        {/* Badge especial para anime finalizado */}
        {subtype === 'anime_finished' && (
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
            <Clapperboard className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium line-clamp-1",
            subtype === 'anime_finished' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
          )}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground/70">
            {formatNotificationTime(notification.created_at)}
          </p>
          {hasAnimeLink && (
            <span className="text-xs text-primary/70 flex items-center gap-0.5">
              <ExternalLink className="h-2.5 w-2.5" />
              Ver anime
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            deleteNotification.mutate(notification.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Componente principal do dropdown de notificações
export function NotificationsDropdown() {
  const { data: notifications, isLoading } = useNotifications();
  const unreadCount = useUnreadNotificationsCount();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  
  // Estado para o modal de detalhes do anime
  const [selectedMalId, setSelectedMalId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenAnime = (malId: number) => {
    setSelectedMalId(malId);
    setIsModalOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-semibold text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>

          {/* Lista de notificações */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="group">
                {notifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification}
                    onOpenAnime={handleOpenAnime}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma notificação
                </p>
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modal de detalhes do anime */}
      {selectedMalId && (
        <AnimeDetailModal
          malId={selectedMalId}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </>
  );
}
