-- Itens individuais da importação do Kitsu: um registro por anime criado ou completado,
-- para o painel mostrar exatamente o que a importação tocou em cada página.
CREATE TABLE public.kitsu_import_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mode text not null,
  page integer not null,
  kitsu_id integer,
  mal_id integer not null,
  title text,
  acao text not null check (acao in ('criado','completado')),
  campos jsonb not null default '[]'::jsonb,
  capa boolean not null default false
);
GRANT SELECT ON public.kitsu_import_items TO authenticated;
GRANT ALL ON public.kitsu_import_items TO service_role;
ALTER TABLE public.kitsu_import_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY kitsu_items_admin_read
  ON public.kitsu_import_items
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX kitsu_import_items_created_idx ON public.kitsu_import_items (created_at DESC);