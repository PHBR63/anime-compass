import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  test: (password: string) => boolean;
}

// Requisitos de senha - alinhados com as regras do backend
const requirements: Requirement[] = [
  { label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Letra maiúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Letra minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Número", test: (p) => /[0-9]/.test(p) },
  { label: "Caractere especial", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

// Calcula a força da senha baseado nos requisitos atendidos
const calculateStrength = (password: string): number => {
  if (!password) return 0;
  const passedRequirements = requirements.filter((req) => req.test(password)).length;
  return (passedRequirements / requirements.length) * 100;
};

// Retorna o label e cor baseado na força - threshold ajustado para 80%
const getStrengthInfo = (strength: number): { label: string; colorClass: string } => {
  if (strength === 0) return { label: "", colorClass: "bg-muted" };
  if (strength <= 20) return { label: "Muito fraca", colorClass: "bg-destructive" };
  if (strength <= 40) return { label: "Fraca", colorClass: "bg-destructive" };
  if (strength <= 60) return { label: "Média", colorClass: "bg-orange-500" };
  if (strength <= 80) return { label: "Forte", colorClass: "bg-lime-500" };
  return { label: "Muito forte", colorClass: "bg-green-500" };
};

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);
  const { label, colorClass } = useMemo(() => getStrengthInfo(strength), [strength]);

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Força da senha</span>
          <span className={cn(
            "font-medium",
            strength <= 60 ? "text-destructive" : strength <= 80 ? "text-yellow-600" : "text-green-600"
          )}>
            {label}
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300 rounded-full", colorClass)}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Lista de requisitos */}
      <ul className="grid grid-cols-1 gap-1 text-xs">
        {requirements.map((req, index) => {
          const passed = req.test(password);
          return (
            <li
              key={index}
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                passed ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {req.label}
            </li>
          );
        })}
      </ul>

      {/* Aviso sobre senhas comprometidas (HIBP) */}
      <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5 pt-1 border-t border-border/30">
        <span className="text-amber-500">⚠️</span>
        Senhas encontradas em vazamentos de dados serão rejeitadas
      </p>
    </div>
  );
}

// Função utilitária para validar se a senha atende aos requisitos mínimos (80% = 4 de 5 requisitos)
export const isPasswordStrong = (password: string): boolean => {
  return calculateStrength(password) >= 80;
};
