import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserInvites, useInviteStats, useInviteLink, UserInvite } from '@/hooks/useInvites';
import { 
  UserPlus, 
  Copy, 
  Check, 
  Share2, 
  Gift, 
  Users,
  Clock,
  CheckCircle,
  Trophy
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/dateUtils';

/**
 * Componente para exibir estatísticas de convites
 */
function InviteStatsCard() {
  const { data: stats, isLoading } = useInviteStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-primary">{stats?.total || 0}</div>
        <div className="text-xs text-muted-foreground mt-1">Total Enviados</div>
      </div>
      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-yellow-500">{stats?.pending || 0}</div>
        <div className="text-xs text-muted-foreground mt-1">Pendentes</div>
      </div>
      <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl p-4 text-center">
        <div className="text-3xl font-bold text-green-500">{stats?.accepted || 0}</div>
        <div className="text-xs text-muted-foreground mt-1">Aceitos</div>
      </div>
    </div>
  );
}

/**
 * Componente para gerar e compartilhar link de convite
 */
function InviteLinkGenerator() {
  const { generateLink, isLoading } = useInviteLink();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Gerar novo link
  const handleGenerate = async () => {
    try {
      const link = await generateLink();
      setGeneratedLink(link);
      setCopied(false);
    } catch (error) {
      console.error('Erro ao gerar link:', error);
    }
  };

  // Copiar link para clipboard
  const handleCopy = async () => {
    if (!generatedLink) return;
    
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  // Compartilhar via Web Share API
  const handleShare = async () => {
    if (!generatedLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Convite AniCheck',
          text: 'Venha organizar seus animes comigo no AniCheck!',
          url: generatedLink,
        });
      } catch (error) {
        // Usuário cancelou o compartilhamento
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <span className="font-medium">Convide Amigos</span>
        </div>
        <Badge variant="outline" className="bg-primary/10">
          <Trophy className="h-3 w-3 mr-1" />
          Ganhe conquistas!
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Convide amigos para o AniCheck e desbloqueie conquistas especiais. 
        Cada amigo que aceitar seu convite conta para suas conquistas!
      </p>

      {!generatedLink ? (
        <Button 
          onClick={handleGenerate} 
          disabled={isLoading}
          className="w-full"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {isLoading ? 'Gerando...' : 'Gerar Link de Convite'}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input 
              value={generatedLink} 
              readOnly 
              className="text-sm font-mono"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
            <Button 
              variant="ghost" 
              className="flex-1"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente para exibir item de convite
 */
function InviteItem({ invite }: { invite: UserInvite }) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Pendente',
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    accepted: {
      icon: CheckCircle,
      label: 'Aceito',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    expired: {
      icon: Clock,
      label: 'Expirado',
      color: 'text-muted-foreground',
      bg: 'bg-muted/10',
    },
  };

  const config = statusConfig[invite.status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${config.bg}`}>
          <StatusIcon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div>
          <div className="font-mono text-sm">{invite.invite_code}</div>
          <div className="text-xs text-muted-foreground">
            {formatRelativeTime(invite.created_at)}
          </div>
        </div>
      </div>
      <Badge variant="outline" className={config.bg}>
        {config.label}
      </Badge>
    </div>
  );
}

/**
 * Componente para listar convites enviados
 */
function InvitesList() {
  const { data: invites, isLoading } = useUserInvites();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!invites?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum convite enviado ainda</p>
        <p className="text-sm">Gere um link acima para começar!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {invites.map((invite) => (
        <InviteItem key={invite.id} invite={invite} />
      ))}
    </div>
  );
}

/**
 * Seção completa de convites para o perfil/social
 */
export function InviteSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Sistema de Convites
        </CardTitle>
        <CardDescription>
          Convide amigos e ganhe conquistas exclusivas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <InviteStatsCard />
        <InviteLinkGenerator />
        
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Convites Enviados
          </h4>
          <InvitesList />
        </div>
      </CardContent>
    </Card>
  );
}
