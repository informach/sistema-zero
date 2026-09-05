-- Busca literal da fila usa ILIKE '%…%'; trigram mantém esse contrato indexável.
-- A extensão é global no Postgres e idempotente entre os schemas do monorepo.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
