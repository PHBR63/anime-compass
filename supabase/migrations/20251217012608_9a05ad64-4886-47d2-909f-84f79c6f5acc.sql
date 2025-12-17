-- Ajuste de segurança e correção de RLS para permitir criação de conversas
-- Motivo: inserção em public.conversations falhando com "new row violates row-level security policy"

BEGIN;

-- Garantir que created_by tenha default correto (evita spoofing e simplifica inserts)
ALTER TABLE public.conversations
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Recriar política de INSERT com validação do criador
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

COMMIT;