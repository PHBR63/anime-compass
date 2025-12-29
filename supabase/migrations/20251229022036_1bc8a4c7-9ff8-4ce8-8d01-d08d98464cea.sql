-- Tabela de testes do sistema (registro de todos os testes disponíveis)
CREATE TABLE public.system_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL CHECK (category IN ('database', 'edge_function', 'rls', 'integration', 'performance')),
  module text NOT NULL,
  test_function text NOT NULL,
  enabled boolean DEFAULT true,
  criticality text DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  timeout_ms integer DEFAULT 30000,
  expected_behavior text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de execuções de testes (runs)
CREATE TABLE public.test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'on_deploy')),
  triggered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_tests integer DEFAULT 0,
  passed integer DEFAULT 0,
  failed integer DEFAULT 0,
  skipped integer DEFAULT 0,
  duration_ms integer,
  metadata jsonb DEFAULT '{}',
  environment text DEFAULT 'production'
);

-- Tabela de resultados individuais de cada teste
CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.system_tests(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'error')),
  duration_ms integer,
  error_message text,
  error_stack text,
  details jsonb DEFAULT '{}',
  assertions jsonb DEFAULT '[]',
  logs text[],
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_test_runs_status ON public.test_runs(status);
CREATE INDEX idx_test_runs_started_at ON public.test_runs(started_at DESC);
CREATE INDEX idx_test_runs_triggered_by ON public.test_runs(triggered_by);
CREATE INDEX idx_test_results_run_id ON public.test_results(run_id);
CREATE INDEX idx_test_results_status ON public.test_results(status);
CREATE INDEX idx_system_tests_category ON public.system_tests(category);
CREATE INDEX idx_system_tests_module ON public.system_tests(module);
CREATE INDEX idx_system_tests_enabled ON public.system_tests(enabled);

-- Habilitar RLS
ALTER TABLE public.system_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_tests
CREATE POLICY "Admins can view all system tests"
ON public.system_tests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert system tests"
ON public.system_tests FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system tests"
ON public.system_tests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete system tests"
ON public.system_tests FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para test_runs
CREATE POLICY "Admins can view all test runs"
ON public.test_runs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can view test runs"
ON public.test_runs FOR SELECT
USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can insert test runs"
ON public.test_runs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update test runs"
ON public.test_runs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas RLS para test_results
CREATE POLICY "Admins can view all test results"
ON public.test_results FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can view test results"
ON public.test_results FOR SELECT
USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "System can insert test results"
ON public.test_results FOR INSERT
WITH CHECK (true);

-- Função para registrar novos testes automaticamente
CREATE OR REPLACE FUNCTION public.register_system_test(
  p_name text,
  p_description text,
  p_category text,
  p_module text,
  p_test_function text,
  p_criticality text DEFAULT 'medium',
  p_expected_behavior text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_id uuid;
BEGIN
  INSERT INTO system_tests (name, description, category, module, test_function, criticality, expected_behavior)
  VALUES (p_name, p_description, p_category, p_module, p_test_function, p_criticality, p_expected_behavior)
  ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    module = EXCLUDED.module,
    test_function = EXCLUDED.test_function,
    criticality = EXCLUDED.criticality,
    expected_behavior = EXCLUDED.expected_behavior,
    updated_at = now()
  RETURNING id INTO v_test_id;
  
  RETURN v_test_id;
END;
$$;

-- Função para notificar admins sobre falhas críticas
CREATE OR REPLACE FUNCTION public.notify_test_failures()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
  test_info RECORD;
  failure_count integer;
BEGIN
  -- Só notifica se o run completou com falhas
  IF NEW.status IN ('completed', 'failed') AND NEW.failed > 0 THEN
    -- Busca testes críticos que falharam
    SELECT COUNT(*) INTO failure_count
    FROM test_results tr
    JOIN system_tests st ON st.id = tr.test_id
    WHERE tr.run_id = NEW.id 
      AND tr.status IN ('failed', 'error')
      AND st.criticality IN ('critical', 'high');
    
    -- Se há falhas críticas, notifica todos os admins
    IF failure_count > 0 THEN
      FOR admin_user IN 
        SELECT DISTINCT user_id FROM public.user_roles WHERE role = 'admin'
      LOOP
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          data
        ) VALUES (
          admin_user.user_id,
          'system',
          '⚠️ Falhas Críticas nos Testes',
          format('%s teste(s) crítico(s) falharam na última execução', failure_count),
          jsonb_build_object(
            'run_id', NEW.id,
            'total_failed', NEW.failed,
            'critical_failed', failure_count,
            'trigger_type', NEW.trigger_type
          )
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para notificações de falhas
CREATE TRIGGER on_test_run_complete
  AFTER UPDATE ON public.test_runs
  FOR EACH ROW
  WHEN (OLD.status = 'running' AND NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION public.notify_test_failures();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_tests_updated_at
  BEFORE UPDATE ON public.system_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir testes iniciais do sistema
INSERT INTO public.system_tests (name, description, category, module, test_function, criticality, expected_behavior) VALUES
-- Testes de Database
('DB_TABLES_EXIST', 'Verifica se todas as tabelas essenciais existem', 'database', 'core', 'test_tables_exist', 'critical', 'Todas as 25 tabelas devem existir'),
('DB_PROFILES_INTEGRITY', 'Verifica integridade da tabela profiles', 'database', 'auth', 'test_profiles_integrity', 'critical', 'Todos os perfis devem ter id e created_at'),
('DB_ANIME_ENTRIES_FK', 'Verifica foreign keys de anime_entries', 'database', 'anime', 'test_anime_entries_fk', 'high', 'Todas as entradas devem ter user_id válido'),
('DB_FRIENDSHIPS_CONSISTENCY', 'Verifica consistência das amizades', 'database', 'social', 'test_friendships_consistency', 'medium', 'Não deve haver amizades duplicadas ou auto-referência'),
('DB_NOTIFICATIONS_VALID', 'Verifica notificações órfãs', 'database', 'notifications', 'test_notifications_valid', 'medium', 'Todas as notificações devem ter user_id válido'),

-- Testes de Edge Functions
('EDGE_GLOBAL_STATS', 'Testa edge function get-global-stats', 'edge_function', 'stats', 'test_edge_global_stats', 'high', 'Deve retornar estatísticas válidas em <2s'),
('EDGE_PROXY_IMAGE', 'Testa edge function proxy-image', 'edge_function', 'media', 'test_edge_proxy_image', 'medium', 'Deve retornar imagem proxied corretamente'),
('EDGE_TRANSLATE_SYNOPSIS', 'Testa edge function translate-synopsis', 'edge_function', 'translation', 'test_edge_translate', 'low', 'Deve retornar tradução ou fallback'),
('EDGE_RECOMMENDATIONS', 'Testa edge function get-recommendations', 'edge_function', 'ai', 'test_edge_recommendations', 'medium', 'Deve retornar recomendações válidas'),

-- Testes de RLS
('RLS_PROFILES_OWN_DATA', 'Usuário vê apenas próprios dados sensíveis', 'rls', 'auth', 'test_rls_profiles', 'critical', 'Dados privados devem ser protegidos'),
('RLS_ADMIN_FULL_ACCESS', 'Admin tem acesso total', 'rls', 'admin', 'test_rls_admin_access', 'critical', 'Admin deve ver todos os dados'),
('RLS_MODERATOR_REPORTS', 'Moderador acessa denúncias', 'rls', 'moderation', 'test_rls_moderator', 'high', 'Moderador deve ver denúncias'),
('RLS_ANIME_ENTRIES_FRIENDS', 'Amigos veem entradas de anime', 'rls', 'social', 'test_rls_anime_friends', 'medium', 'Amigos aceitos devem ver entradas'),

-- Testes de Integração
('INTEG_ADD_ANIME', 'Fluxo completo de adicionar anime', 'integration', 'anime', 'test_integ_add_anime', 'high', 'Deve criar entrada e atualizar contadores'),
('INTEG_FRIENDSHIP_FLOW', 'Fluxo de solicitação de amizade', 'integration', 'social', 'test_integ_friendship', 'medium', 'Deve criar, aceitar e gerar notificação'),
('INTEG_REVIEW_FLOW', 'Fluxo de criar review', 'integration', 'content', 'test_integ_review', 'medium', 'Deve criar review e permitir reações'),
('INTEG_CHAT_MESSAGE', 'Fluxo de enviar mensagem', 'integration', 'chat', 'test_integ_chat', 'medium', 'Deve criar mensagem em conversa'),
('INTEG_ACHIEVEMENTS', 'Sistema de conquistas', 'integration', 'gamification', 'test_integ_achievements', 'low', 'Deve desbloquear conquistas corretamente'),

-- Testes de Performance
('PERF_ANIME_LIST_QUERY', 'Performance da lista de animes', 'performance', 'anime', 'test_perf_anime_list', 'high', 'Query deve retornar em <500ms'),
('PERF_DASHBOARD_STATS', 'Performance das estatísticas', 'performance', 'stats', 'test_perf_dashboard', 'medium', 'Estatísticas em <1s'),
('PERF_FEED_ACTIVITY', 'Performance do feed de atividades', 'performance', 'social', 'test_perf_activity_feed', 'medium', 'Feed deve carregar em <800ms');

-- Habilitar realtime para test_runs (para atualizações em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_runs;