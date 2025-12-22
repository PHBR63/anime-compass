-- Garante REPLICA IDENTITY FULL para capturar dados completos nas atualizações
ALTER TABLE public.anime_entries REPLICA IDENTITY FULL;