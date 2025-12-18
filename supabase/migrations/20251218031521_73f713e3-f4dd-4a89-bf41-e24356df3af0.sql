-- Adiciona campos para modo "não perturbe" na tabela de preferências
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS do_not_disturb_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS do_not_disturb_start time NOT NULL DEFAULT '22:00:00',
ADD COLUMN IF NOT EXISTS do_not_disturb_end time NOT NULL DEFAULT '08:00:00';