import { useState } from "react";
import { Search, Shield, ShieldCheck, User, MoreVertical, Film, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminUsers, useSetUserRole, useRemoveUserRole, AdminUserProfile } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from '@/lib/dateUtils';

/**
 * Componente de gerenciamento de usuários para o painel admin
 */
export function UsersManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { user: currentUser } = useAuth();
  
  const { data: users, isLoading } = useAdminUsers(searchTerm, roleFilter);
  const setUserRole = useSetUserRole();
  const removeUserRole = useRemoveUserRole();

  /**
   * Retorna a cor do badge baseado no role
   */
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      case "moderator":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Moderador
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground">
            <User className="h-3 w-3 mr-1" />
            Usuário
          </Badge>
        );
    }
  };

  /**
   * Altera o role de um usuário
   */
  const handleSetRole = (userId: string, role: "admin" | "moderator" | "user") => {
    setUserRole.mutate({ userId, role });
  };

  /**
   * Remove o role de um usuário (volta para user padrão)
   */
  const handleRemoveRole = (userId: string, role: "admin" | "moderator" | "user") => {
    removeUserRole.mutate({ userId, role });
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Gerenciar Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Gerenciar Usuários
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="moderator">Moderadores</SelectItem>
              <SelectItem value="user">Usuários</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contador */}
        <p className="text-sm text-muted-foreground">
          {users?.length || 0} usuário(s) encontrado(s)
        </p>

        {/* Tabela de usuários */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Animes</TableHead>
                <TableHead className="text-center">Reviews</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((userProfile: AdminUserProfile) => (
                <TableRow key={userProfile.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile.avatar_url || undefined} />
                        <AvatarFallback>
                          {(userProfile.display_name || userProfile.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {userProfile.display_name || userProfile.username || "Sem nome"}
                        </p>
                        {userProfile.username && (
                          <p className="text-xs text-muted-foreground">
                            @{userProfile.username}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(userProfile.role || "user")}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Film className="h-3 w-3 text-muted-foreground" />
                      {userProfile.anime_count || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      {userProfile.review_count || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(userProfile.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={userProfile.id === currentUser?.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Alterar Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleSetRole(userProfile.id, "admin")}
                          disabled={userProfile.role === "admin"}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2 text-red-500" />
                          Promover a Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSetRole(userProfile.id, "moderator")}
                          disabled={userProfile.role === "moderator"}
                        >
                          <Shield className="h-4 w-4 mr-2 text-yellow-500" />
                          Definir como Moderador
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveRole(userProfile.id, userProfile.role as "admin" | "moderator" | "user")}
                          disabled={userProfile.role === "user"}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Rebaixar para Usuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
