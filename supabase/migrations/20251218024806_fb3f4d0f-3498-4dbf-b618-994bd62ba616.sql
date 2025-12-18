-- Adicionar campo para marcar notas como spoiler
ALTER TABLE public.anime_entries
ADD COLUMN notes_has_spoilers boolean DEFAULT false;