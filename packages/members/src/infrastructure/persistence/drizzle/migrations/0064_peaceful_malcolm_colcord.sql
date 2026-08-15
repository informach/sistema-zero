-- O Iniciante 2D volta a ter 8 posições obrigatórias, como todo degrau que não é a entrada.
--
-- A `0063` o havia baixado para 7 quando o curso-base saiu para o `primeiros-passos-2d`, para o
-- total da carreira continuar 48. A usuária rejeitou a compensação: o total passa a ser 49.
--
-- ✅ SEM NORMALIZAÇÃO, e isso é uma decisão, não um esquecimento. `ADD CONSTRAINT ... CHECK`
-- valida as linhas que já existem, mas aqui a regra nova é um SUPERCONJUNTO da antiga (o teto
-- do Iniciante 2D sobe de 7 para 8) — nenhuma linha que passava pode falhar agora. O caso
-- inverso é que é perigoso: a `0063` APERTAVA e precisou de dois UPDATEs antes do ALTER, senão
-- o lote inteiro abortava (o drizzle roda todas as migrações pendentes numa transação só).
ALTER TABLE "members"."courses" DROP CONSTRAINT "courses_career_slot_check";--> statement-breakpoint
ALTER TABLE "members"."courses" ADD CONSTRAINT "courses_career_slot_check" CHECK (("members"."courses"."level"::text <> 'primeiros-passos' or "members"."courses"."track"::text = '2d') and ("members"."courses"."career_slot" is null or ("members"."courses"."audience" = 'kids' and "members"."courses"."level"::text <> 'lenda' and "members"."courses"."career_slot" between 1 and (case when "members"."courses"."level"::text = 'primeiros-passos' then 1 else 8 end))));