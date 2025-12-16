-- Habilitar realtime para a tabela anime_entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.anime_entries;

-- Criar função para inserir notificação quando amigo adiciona/completa anime
CREATE OR REPLACE FUNCTION public.notify_friends_on_anime_change()
RETURNS TRIGGER AS $$
DECLARE
  friend_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  notification_type notification_type;
  user_display_name TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT COALESCE(display_name, username, 'Um usuário') INTO user_display_name
  FROM public.profiles WHERE id = NEW.user_id;

  -- Determinar tipo de notificação baseado na ação
  IF TG_OP = 'INSERT' THEN
    notification_title := 'Novo anime adicionado';
    notification_message := user_display_name || ' adicionou "' || NEW.title || '" à lista';
    notification_type := 'system';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    notification_title := 'Anime completado';
    notification_message := user_display_name || ' completou "' || NEW.title || '"';
    notification_type := 'system';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'watching' AND (OLD.status IS NULL OR OLD.status != 'watching') THEN
    notification_title := 'Começou a assistir';
    notification_message := user_display_name || ' começou a assistir "' || NEW.title || '"';
    notification_type := 'system';
  ELSE
    RETURN NEW;
  END IF;

  -- Inserir notificação para cada amigo aceito
  FOR friend_record IN
    SELECT 
      CASE 
        WHEN requester_id = NEW.user_id THEN addressee_id
        ELSE requester_id
      END as friend_id
    FROM public.friendships
    WHERE (requester_id = NEW.user_id OR addressee_id = NEW.user_id)
      AND status = 'accepted'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      friend_record.friend_id,
      notification_type,
      notification_title,
      notification_message,
      jsonb_build_object(
        'anime_id', NEW.mal_id,
        'anime_title', NEW.title,
        'anime_image', NEW.image_url,
        'friend_id', NEW.user_id,
        'friend_name', user_display_name,
        'status', NEW.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para notificar amigos
DROP TRIGGER IF EXISTS notify_friends_anime_trigger ON public.anime_entries;
CREATE TRIGGER notify_friends_anime_trigger
  AFTER INSERT OR UPDATE ON public.anime_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friends_on_anime_change();

-- Habilitar realtime para notificações também
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;