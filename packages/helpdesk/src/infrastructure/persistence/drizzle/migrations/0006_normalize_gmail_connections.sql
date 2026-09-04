-- Custom SQL migration file, put your code below! --
-- A integração atende exclusivamente a caixa compartilhada. Qualquer consentimento
-- legado de outra conta perde os tokens antes da proteção estrutural ser criada.
UPDATE "helpdesk"."gmail_connections"
SET
  "version" = "version" + 1,
  "access_token_enc" = NULL,
  "refresh_token_enc" = NULL,
  "token_expires_at" = NULL,
  "status" = 'disabled',
  "last_sync_error" = NULL,
  "updated_at" = CURRENT_TIMESTAMP
WHERE
  "status" IN ('connected', 'needs_reauth')
  AND lower(trim("email_address")) <> 'contato@sistemazero.com.br';--> statement-breakpoint

-- Mantém no máximo a conexão autorizada mais recentemente atualizada. Isso deixa
-- os dados prontos para o índice único parcial da próxima migration.
WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (ORDER BY "updated_at" DESC, "id" DESC) AS row_number
  FROM "helpdesk"."gmail_connections"
  WHERE "status" IN ('connected', 'needs_reauth')
)
UPDATE "helpdesk"."gmail_connections" AS connection
SET
  "version" = connection."version" + 1,
  "access_token_enc" = NULL,
  "refresh_token_enc" = NULL,
  "token_expires_at" = NULL,
  "status" = 'disabled',
  "last_sync_error" = NULL,
  "updated_at" = CURRENT_TIMESTAMP
FROM ranked
WHERE connection."id" = ranked."id" AND ranked.row_number > 1;
