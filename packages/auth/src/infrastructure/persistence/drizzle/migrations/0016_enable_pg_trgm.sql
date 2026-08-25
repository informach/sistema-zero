-- Índices da busca livre usam a operator class gin_trgm_ops. A extensão é
-- global ao banco e idempotente porque vários packages compartilham o Postgres.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
