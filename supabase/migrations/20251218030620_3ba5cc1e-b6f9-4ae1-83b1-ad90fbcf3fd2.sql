-- Tabela para preferências de notificação do usuário
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_added_anime BOOLEAN NOT NULL DEFAULT true,
  friend_started_watching BOOLEAN NOT NULL DEFAULT true,
  friend_requests BOOLEAN NOT NULL DEFAULT true,
  friend_accepted BOOLEAN NOT NULL DEFAULT true,
  review_likes BOOLEAN NOT NULL DEFAULT true,
  achievements BOOLEAN NOT NULL DEFAULT true,
  recommendations BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar função de notificação para respeitar preferências
CREATE OR REPLACE FUNCTION public.notify_friends_on_anime_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  friend_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  notification_type notification_type;
  user_display_name TEXT;
  pref_column TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT COALESCE(display_name, username, 'Um usuário') INTO user_display_name
  FROM public.profiles WHERE id = NEW.user_id;

  -- Determinar tipo de notificação baseado na ação
  IF TG_OP = 'INSERT' THEN
    notification_title := 'Novo anime adicionado';
    notification_message := user_display_name || ' adicionou "' || NEW.title || '" à lista';
    notification_type := 'system';
    pref_column := 'friend_added_anime';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'watching' AND (OLD.status IS NULL OR OLD.status != 'watching') THEN
    notification_title := 'Começou a assistir';
    notification_message := user_display_name || ' começou a assistir "' || NEW.title || '"';
    notification_type := 'system';
    pref_column := 'friend_started_watching';
  ELSE
    RETURN NEW;
  END IF;

  -- Inserir notificação para cada amigo aceito que tenha a preferência habilitada
  FOR friend_record IN
    SELECT 
      CASE 
        WHEN f.requester_id = NEW.user_id THEN f.addressee_id
        ELSE f.requester_id
      END as friend_id
    FROM public.friendships f
    WHERE (f.requester_id = NEW.user_id OR f.addressee_id = NEW.user_id)
      AND f.status = 'accepted'
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np 
          WHERE np.user_id = CASE 
            WHEN f.requester_id = NEW.user_id THEN f.addressee_id
            ELSE f.requester_id
          END
        )
        OR EXISTS (
          SELECT 1 FROM public.notification_preferences np 
          WHERE np.user_id = CASE 
            WHEN f.requester_id = NEW.user_id THEN f.addressee_id
            ELSE f.requester_id
          END
          AND (
            (pref_column = 'friend_added_anime' AND np.friend_added_anime = true)
            OR (pref_column = 'friend_started_watching' AND np.friend_started_watching = true)
          )
        )
      )
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
$function$;