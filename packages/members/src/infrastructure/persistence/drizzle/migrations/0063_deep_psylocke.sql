ALTER TYPE "members"."course_level" ADD VALUE IF NOT EXISTS 'primeiros-passos' BEFORE 'iniciante';--> statement-breakpoint
-- 🚨 NORMALIZA antes de apertar o CHECK.
--
-- `ADD CONSTRAINT ... CHECK` VALIDA as linhas que já existem. O Iniciante 2D caiu de 8 para 7
-- posições, então um único curso kids na posição 8 (em qualquer status, inclusive rascunho) faz
-- este ALTER abortar — e, como o drizzle roda TODAS as migrações pendentes numa transação só, o
-- lote inteiro volta atrás e o preDeploy do deploy falha. Medido contra Postgres.
--
-- As normalizações abaixo cobrem a NEGAÇÃO do CHECK novo, então depois delas o ALTER não tem como
-- falhar. `career_slot = null` significa "bônus", que é o estado neutro e seguro — e é o mesmo
-- remédio da migração 0048, que normalizou posições legadas do mesmo jeito. Quem tiver um curso
-- na posição 8 do Iniciante 2D vai encontrá-lo como bônus no admin e escolher a posição nova.
UPDATE "members"."courses"
   SET "track" = '2d'
 WHERE "level"::text = 'primeiros-passos'
   AND "track"::text <> '2d';--> statement-breakpoint
UPDATE "members"."courses"
   SET "career_slot" = NULL
 WHERE "career_slot" is not null
   AND ("audience" <> 'kids'
        OR "level"::text = 'lenda'
        OR "career_slot" < 1
        OR "career_slot" > (case
             when "level"::text = 'primeiros-passos' then 1
             when "level"::text = 'iniciante' and "track"::text = '2d' then 7
             else 8 end));--> statement-breakpoint
ALTER TABLE "members"."courses" DROP CONSTRAINT "courses_career_slot_check";--> statement-breakpoint
ALTER TABLE "members"."courses" ADD CONSTRAINT "courses_career_slot_check" CHECK (("members"."courses"."level"::text <> 'primeiros-passos' or "members"."courses"."track"::text = '2d') and ("members"."courses"."career_slot" is null or ("members"."courses"."audience" = 'kids' and "members"."courses"."level"::text <> 'lenda' and "members"."courses"."career_slot" between 1 and (case when "members"."courses"."level"::text = 'primeiros-passos' then 1 when "members"."courses"."level"::text = 'iniciante' and "members"."courses"."track"::text = '2d' then 7 else 8 end))));--> statement-breakpoint
-- Solta o RETRATO congelado dos marcos do curso de entrada.
--
-- Os marcos de carreira gravam um snapshot (level/track/careerSlot) para o rank nunca
-- regredir se o curso for re-nivelado. Aqui esse mesmo mecanismo trabalharia CONTRA nós: o
-- curso-base vira `primeiros-passos`, mas quem já o concluiu carrega `iniciante-2d` slot 1
-- congelado — a regua nova exige `primeiros-passos-2d` e a crianca CAIRIA de Construtor(a)
-- para Faisca.
--
-- Anulando os tres campos, o `coalesce` das contagens volta a ler `courses.level` ao vivo durante
-- a janela de manutencao. Depois do COMMIT, o comando `career:finalize-first-steps` re-etiqueta o
-- curso e RECONGELA esses campos na mesma transacao — eles nao ficam dependentes do curso vivo.
--
-- Compara `::text` para nao referenciar o valor de enum adicionado nesta transacao.
UPDATE "members"."xp_events" AS "event"
   SET "source_level" = NULL,
       "source_track" = NULL,
       "source_career_slot" = NULL
  FROM "members"."courses" AS "course"
 WHERE "course"."id" = "event"."source_id"
   AND "course"."audience" = 'kids'
   AND "course"."level"::text = 'iniciante'
   AND "course"."track"::text = '2d'
   AND "course"."career_slot" = 1
   AND "event"."source_type" IN ('course_complete', 'course_showcased')
   AND "event"."source_level"::text = 'iniciante'
   AND "event"."source_track"::text = '2d'
   AND "event"."source_career_slot" = 1;
