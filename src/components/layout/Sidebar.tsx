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
  Sparkles,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: List, label: 'Minha Lista', path: '/list' },
  { icon: Search, label: 'Descobrir', path: '/discover' },
  { icon: Users, label: 'Social', path: '/social' },
  { icon: Trophy, label: 'Conquistas', path: '/achievements' },
  { icon: User, label: 'Perfil', path: '/profile' },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const unreadCount = useUnreadNotificationsCount();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 glass-card border-r border-border/50 transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-border/50">
            <div className="relative">
              <Sparkles className="h-8 w-8 text-primary animate-pulse-glow" />
              <div className="absolute inset-0 blur-lg bg-primary/30" />
            </div>
            <span className="font-display text-2xl font-bold text-gradient">
              AniCheck
            </span>
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
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                    isActive && "text-primary"
                  )} />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </NavLink>
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
