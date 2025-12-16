import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, type ThemeConfig } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

/**
 * Preview visual do tema no dropdown
 */
function ThemePreview({ theme, isActive }: { theme: ThemeConfig; isActive: boolean }) {
  return (
    <div className="flex items-center gap-3 w-full">
      {/* Círculos de cores do tema */}
      <div className="flex -space-x-1">
        <div 
          className="w-4 h-4 rounded-full border-2 border-background"
          style={{ backgroundColor: theme.preview.primary }}
        />
        <div 
          className="w-4 h-4 rounded-full border-2 border-background"
          style={{ backgroundColor: theme.preview.accent }}
        />
        <div 
          className="w-4 h-4 rounded-full border-2 border-background"
          style={{ backgroundColor: theme.preview.background }}
        />
      </div>
      
      {/* Nome e descrição */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{theme.name}</p>
        <p className="text-xs text-muted-foreground truncate">{theme.description}</p>
      </div>
      
      {/* Indicador de ativo */}
      {isActive && (
        <Check className="h-4 w-4 text-primary shrink-0" />
      )}
    </div>
  );
}

/**
 * Componente seletor de temas
 * Permite ao usuário alternar entre diferentes temas visuais
 */
export function ThemeSelector() {
  const { theme, setTheme, themes, currentTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative group">
          <Palette className="h-5 w-5 transition-transform group-hover:scale-110" />
          {/* Indicador de cor do tema atual */}
          <span 
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background"
            style={{ backgroundColor: currentTheme.preview.primary }}
          />
          <span className="sr-only">Mudar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Escolher Tema
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "cursor-pointer py-3",
              theme === t.id && "bg-primary/10"
            )}
          >
            <ThemePreview theme={t} isActive={theme === t.id} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Versão expandida do seletor para páginas de configuração
 */
export function ThemeSelectorExpanded() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={cn(
            "relative p-4 rounded-xl border-2 transition-all duration-300 text-left",
            theme === t.id
              ? "border-primary bg-primary/10 shadow-lg"
              : "border-border hover:border-primary/50 bg-card"
          )}
        >
          {/* Preview de cores */}
          <div 
            className="h-20 rounded-lg mb-3 relative overflow-hidden"
            style={{ backgroundColor: t.preview.background }}
          >
            {/* Elementos decorativos */}
            <div 
              className="absolute top-2 left-2 w-12 h-3 rounded"
              style={{ backgroundColor: t.preview.primary }}
            />
            <div 
              className="absolute top-7 left-2 w-8 h-2 rounded opacity-60"
              style={{ backgroundColor: t.preview.accent }}
            />
            <div 
              className="absolute bottom-2 right-2 w-6 h-6 rounded-full"
              style={{ backgroundColor: t.preview.primary, opacity: 0.3 }}
            />
          </div>
          
          {/* Informações do tema */}
          <h3 className="font-display font-semibold">{t.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
          
          {/* Badge de selecionado */}
          {theme === t.id && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
              <Check className="h-3 w-3" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
