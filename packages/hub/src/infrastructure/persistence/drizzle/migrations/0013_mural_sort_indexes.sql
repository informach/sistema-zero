-- Filtros do Mural (09/2026): "Novidades" (created_at) e "Mais jogados" (plays_count), na
-- mesma chave total do cursor. Parciais: só as vitrines usam essas ordens.
-- Escrita à mão com IF NOT EXISTS (regra do hub: o db:generate já re-emitiu drift).
CREATE INDEX IF NOT EXISTS "threads_showcase_recent_idx" ON "hub"."threads" USING btree ("channel_id","created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "is_showcase" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "threads_showcase_plays_idx" ON "hub"."threads" USING btree ("channel_id","plays_count" DESC NULLS FIRST,"created_at" DESC NULLS FIRST,"id" DESC NULLS FIRST) WHERE "is_showcase" = true;
