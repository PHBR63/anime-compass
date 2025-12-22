-- Criar trigger function para notificar moderadores quando nova denúncia é criada
CREATE OR REPLACE FUNCTION public.notify_moderators_on_report()
RETURNS TRIGGER AS $$
DECLARE
  mod_user RECORD;
BEGIN
  -- Buscar todos os moderadores e admins
  FOR mod_user IN 
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('moderator', 'admin')
  LOOP
    -- Não notificar o próprio denunciante se ele for mod/admin
    IF mod_user.user_id != NEW.reporter_id THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        mod_user.user_id,
        'system',
        'Nova denúncia recebida',
        'Uma nova denúncia de ' || NEW.content_type || ' foi registrada e aguarda revisão.',
        jsonb_build_object(
          'report_id', NEW.id,
          'content_type', NEW.content_type,
          'reason', NEW.reason
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger que dispara quando uma nova denúncia é inserida
DROP TRIGGER IF EXISTS trigger_notify_moderators_on_report ON public.reports;
CREATE TRIGGER trigger_notify_moderators_on_report
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_moderators_on_report();

-- Adicionar tipo 'moderation' ao enum de notification_type se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderation' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'moderation';
  END IF;
END$$;