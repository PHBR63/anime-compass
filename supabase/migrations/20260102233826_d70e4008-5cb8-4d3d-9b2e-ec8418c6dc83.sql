-- Tabela principal do catálogo de animes
CREATE TABLE public.anime_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mal_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_english TEXT,
  title_japanese TEXT,
  synopsis TEXT,
  synopsis_pt TEXT,
  score DECIMAL(4,2),
  scored_by INTEGER,
  rank INTEGER,
  popularity INTEGER,
  members INTEGER,
  episodes INTEGER,
  status TEXT,
  type TEXT,
  rating TEXT,
  year INTEGER,
  season TEXT,
  genres JSONB DEFAULT '[]',
  studios JSONB DEFAULT '[]',
  image_url TEXT,
  local_image_url TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_anime_catalog_mal_id ON public.anime_catalog(mal_id);
CREATE INDEX idx_anime_catalog_score ON public.anime_catalog(score DESC NULLS LAST);
CREATE INDEX idx_anime_catalog_popularity ON public.anime_catalog(popularity ASC NULLS LAST);
CREATE INDEX idx_anime_catalog_year ON public.anime_catalog(year DESC NULLS LAST);
CREATE INDEX idx_anime_catalog_status ON public.anime_catalog(status);
CREATE INDEX idx_anime_catalog_type ON public.anime_catalog(type);
CREATE INDEX idx_anime_catalog_season ON public.anime_catalog(season);
CREATE INDEX idx_anime_catalog_genres ON public.anime_catalog USING GIN (genres);
CREATE INDEX idx_anime_catalog_studios ON public.anime_catalog USING GIN (studios);
CREATE INDEX idx_anime_catalog_last_synced ON public.anime_catalog(last_synced_at);
CREATE INDEX idx_anime_catalog_title ON public.anime_catalog USING GIN (to_tsvector('portuguese', title));

-- RLS: Catálogo público para leitura
ALTER TABLE public.anime_catalog ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (sem autenticação necessária)
CREATE POLICY "anime_catalog_public_read" ON public.anime_catalog
  FOR SELECT USING (true);

-- Política de escrita apenas para admins
CREATE POLICY "anime_catalog_admin_insert" ON public.anime_catalog
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "anime_catalog_admin_update" ON public.anime_catalog
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "anime_catalog_admin_delete" ON public.anime_catalog
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Trigger para updated_at
CREATE TRIGGER update_anime_catalog_updated_at
  BEFORE UPDATE ON public.anime_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para atualizações
ALTER PUBLICATION supabase_realtime ADD TABLE public.anime_catalog;