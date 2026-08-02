-- Carimbo de "já conferi esta entrega" pelo professor.
-- Até aqui, a única forma de tirar uma entrega da fila de pendentes era o professor
-- RESPONDER um recado — e a conversa só existe quando a criança escreveu algo no
-- envio. Sem recado, a entrega ficava pendente para sempre.
-- `reviewed_at` é comparado com `submitted_at` (>=), a mesma régua já usada para a
-- resposta do professor: um REENVIO reabre a pendência sozinho.
ALTER TABLE "members"."studio_submissions" ADD COLUMN "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "members"."studio_submissions" ADD COLUMN "reviewed_by" uuid;
