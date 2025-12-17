-- Remove a constraint antiga de rating (0-5)
ALTER TABLE anime_entries DROP CONSTRAINT IF EXISTS anime_entries_rating_check;

-- Adiciona nova constraint para rating (0-10)
ALTER TABLE anime_entries ADD CONSTRAINT anime_entries_rating_check CHECK (rating >= 0 AND rating <= 10);

-- Remove constraint antiga de reviews se existir
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;

-- Adiciona nova constraint para reviews (0-10)
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 0 AND rating <= 10);