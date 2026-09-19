-- Bloco de MATERIAIS COMPLEMENTARES + o fim dos "materiais de apoio".
--
-- O que era um LUGAR fora das secoes (`support_block_ids`, em posicao fixa no pe de toda secao e
-- alheio a ordem que a autora monta) virou um BLOCO de aula: ele mora numa secao, obedece a
-- `section.blockIds` e aparece no ponto em que ela o colocou.
--
-- ⚠️ ADD VALUE so ADICIONA o rotulo; nada nesta migracao o ESCREVE. O Postgres proibe escrever um
-- valor de enum adicionado na MESMA transacao, e o drizzle roda todas as pendentes numa transacao
-- so. Subir o CODIGO antes desta migracao da `invalid input value for enum` (incidente 03/08).
--
-- ⚠️⚠️ A COLUNA `support_block_ids` NAO e derrubada aqui, de proposito. O `getStructure` do codigo
-- ANTIGO a le em toda carga de aula, e durante a troca de pods os dois codigos convivem: derrubar
-- agora quebraria a leitura de aula na janela do deploy. Quem a derruba e a 0091, na subida
-- SEGUINTE. Entre as duas ela fica viva, com o default, e ninguem a le nem escreve.
ALTER TYPE "members"."lesson_block_kind" ADD VALUE IF NOT EXISTS 'materials';--> statement-breakpoint

-- Backfill: os blocos que estavam no apoio vao para o FIM da ULTIMA secao. Nada se perde; a autora
-- rearranja depois. Bloco orfao (em `lesson_blocks` e fora de toda secao) faria a gravacao recusar
-- a aula INTEIRA na proxima publicacao, entao esta passada e obrigatoria.
--
-- ⚠️ A `revision` da estrutura muda, e isso e correto: a estrutura mudou mesmo. O progresso do
-- aluno NAO se perde — a conclusao de secao e reavaliada a cada leitura a partir dos criterios
-- (`completion.blockIds`, que esta passada nao toca) e volta a ser gravada sozinha.
UPDATE "members"."lesson_structures" AS s
SET "sections" = sub.sections,
    "revision" = gen_random_uuid()
FROM (
  SELECT st."lesson_id",
         jsonb_agg(
           CASE
             WHEN t.ord = jsonb_array_length(st."sections")
               THEN jsonb_set(t.sec, '{blockIds}', (t.sec -> 'blockIds') || st."support_block_ids")
             ELSE t.sec
           END
           ORDER BY t.ord
         ) AS sections
    FROM "members"."lesson_structures" st
    CROSS JOIN LATERAL jsonb_array_elements(st."sections") WITH ORDINALITY AS t(sec, ord)
   WHERE jsonb_array_length(st."support_block_ids") > 0
     AND jsonb_array_length(st."sections") > 0
   GROUP BY st."lesson_id", st."sections", st."support_block_ids"
) AS sub
WHERE s."lesson_id" = sub."lesson_id";
