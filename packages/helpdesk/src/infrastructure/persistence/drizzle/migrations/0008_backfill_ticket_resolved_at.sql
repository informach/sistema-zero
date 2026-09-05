-- Custom SQL migration file, put your code below! --
-- O dado histórico não contém o instante de resolução. Para linhas terminais
-- já existentes, `updated_at` é a melhor aproximação única; após esta migração
-- toda transição nova grava `resolved_at` e patches/IA não alteram a métrica.
UPDATE "helpdesk"."tickets"
SET "resolved_at" = "updated_at"
WHERE
  "status" IN ('resolved', 'closed')
  AND "resolved_at" IS NULL;
