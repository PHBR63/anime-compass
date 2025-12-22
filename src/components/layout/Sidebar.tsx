import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  List, 
  Search, 
  Users, 
  Trophy, 
  User, 
  Bell,
  Menu,
  X,
  LogOut,
  MessageCircle,
  Building2,
  MessageSquare,
  Moon,
  Shield
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useIsAdmin } from '@/hooks/useAdmin';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useUnreadMessagesCount } from '@/hooks/useConversations';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { isInDoNotDisturbPeriod } from '@/hooks/usePushNotifications';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  hasBadge?: boolean;
  adminOnly?: boolean;
  subItems?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { 
    icon: List, 
    label: 'Minha Lista', 
    path: '/list',
    subItems: [
      { label: 'Franquias', path: '/list/franchises' },
      { label: 'Estúdios', path: '/list/studios' },
    ]
  },
  { icon: Search, label: 'Descobrir', path: '/discover' },
  { icon: MessageSquare, label: 'Reviews', path: '/reviews' },
  { icon: Users, label: 'Social', path: '/social' },
  { icon: MessageCircle, label: 'Chat', path: '/chat', hasBadge: true },
  { icon: Trophy, label: 'Conquistas', path: '/achievements' },
  { icon: User, label: 'Perfil', path: '/profile' },
  { icon: Shield, label: 'Admin', path: '/admin', adminOnly: true },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const unreadCount = useUnreadNotificationsCount();
  const { data: unreadMessages } = useUnreadMessagesCount();
  const { data: notifPrefs } = useNotificationPreferences();
  
  // Verifica se modo "não perturbe" está ativo agora
  const isDoNotDisturbActive = isInDoNotDisturbPeriod(
    notifPrefs?.do_not_disturb_enabled ?? false,
    notifPrefs?.do_not_disturb_start,
    notifPrefs?.do_not_disturb_end
  );

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile toggle - botão fixo no topo */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm border border-border/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay para fechar sidebar em mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 glass-card border-r border-border/50 transition-transform duration-300",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-border/50">
            <Logo size="md" showGlow={true} />
            <span className="font-display text-2xl font-bold text-gradient">
              AniCheck
            </span>
            
            {/* Indicador de Não Perturbe */}
            {isDoNotDisturbActive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-auto flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 animate-pulse">
                      <Moon className="h-4 w-4 text-primary" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Modo não perturbe ativo</p>
                    <p className="text-xs text-muted-foreground">
                      {notifPrefs?.do_not_disturb_start?.slice(0, 5)} - {notifPrefs?.do_not_disturb_end?.slice(0, 5)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* User info */}
          {user && (
            <div className="px-4 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {profile?.display_name || profile?.username || 'Usuário'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1">
            {navItems.filter(item => !item.adminOnly || isAdmin).map((item) => {
              const isActive = location.pathname === item.path;
              const isSubActive = item.subItems?.some(sub => location.pathname === sub.path);
              const showBadge = item.hasBadge && unreadMessages && unreadMessages > 0;
              
              return (
                <div key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
                      isActive || isSubActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                      (isActive || isSubActive) && "text-primary"
                    )} />
                    <span className="font-medium">{item.label}</span>
                    
                    {/* Badge de não lidas para Chat */}
                    {showBadge && (
                      <Badge 
                        className="ml-auto h-5 min-w-5 flex items-center justify-center p-0 text-xs animate-pulse bg-destructive text-destructive-foreground"
                        variant="default"
                      >
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </Badge>
                    )}
                    
                    {isActive && !showBadge && !item.subItems && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </NavLink>
                  
                  {/* Subitens */}
                  {item.subItems && (isActive || isSubActive) && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubItemActive = location.pathname === subItem.path;
                        return (
                          <NavLink
                            key={subItem.path}
                            to={subItem.path}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors",
                              isSubItemActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isSubItemActive ? "bg-primary" : "bg-muted-foreground/50"
                            )} />
                            {subItem.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="px-3 pb-6 space-y-2">
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
              <span className="text-sm text-muted-foreground">Notificações</span>
              {unreadCount > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
