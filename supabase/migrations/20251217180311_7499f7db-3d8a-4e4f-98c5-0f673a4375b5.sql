-- Altera a precisão do campo rating para aceitar valores até 10
ALTER TABLE anime_entries ALTER COLUMN rating TYPE numeric(3, 1);
ALTER TABLE reviews ALTER COLUMN rating TYPE numeric(3, 1);