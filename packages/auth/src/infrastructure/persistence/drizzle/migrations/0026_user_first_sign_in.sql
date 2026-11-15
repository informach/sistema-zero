ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "first_sign_in_at" timestamp with time zone;
--> statement-breakpoint
-- Senha opcional (15/11/2026): "ativou a conta" passa a ser criar senha OU já ter entrado.
-- Preenche quem já entrou com o que ainda está guardado: a sessão mais antiga do próprio
-- dono (sem suporte e sem a sessão da criança) ou o código de login mais antigo usado. A
-- purga periódica já apagou parte do histórico; quem entrou só antes dela fica nulo e é
-- carimbado na próxima entrada.
UPDATE "auth"."users" u
SET "first_sign_in_at" = s.primeira
FROM (
  SELECT user_id, min(quando) AS primeira
  FROM (
    SELECT f.user_id, f.created_at AS quando
    FROM "auth"."refresh_token_families" f
    WHERE f.impersonator_user_id IS NULL
      AND (f.kids_context IS NULL OR f.kids_context->>'kind' = 'parent')
    UNION ALL
    SELECT o.user_id, o.consumed_at AS quando
    FROM "auth"."otp_codes" o
    WHERE o.purpose = 'sign_in' AND o.consumed_at IS NOT NULL
  ) entradas
  GROUP BY user_id
) s
WHERE u.id = s.user_id AND u."first_sign_in_at" IS NULL;
