ALTER TABLE "auth"."users" ADD COLUMN "password_set_at" timestamp with time zone;
--> statement-breakpoint
-- Backfill SEGURO: toda conta existente é tratada como "senha definida" (recebe
-- `created_at`) para NUNCA travar um usuário legítimo no login por código (OTP). A
-- partir daqui só contas NOVAS de convite/compra nascem com `password_set_at` NULL
-- (senha aleatória/dummy) e ficam barradas no OTP até o 1º acesso. Contas já
-- convidadas-e-nunca-usadas seguem resolvidas pelo painel (reenviar/definir senha).
UPDATE "auth"."users" SET "password_set_at" = "created_at" WHERE "password_set_at" IS NULL;