-- A marcação antiga vivia no bloco Livro 3D. Copiar somente para o PDF da mesma aula e URL.
-- A coluna nova já existe (0091); repetir esta atualização não muda linhas corrigidas.
UPDATE "members"."lesson_attachments" AS attachment
SET "zappy_student_notebook" = true
WHERE "zappy_student_notebook" = false
  AND EXISTS (
    SELECT 1
    FROM "members"."lesson_blocks" AS book
    WHERE book."lesson_id" = attachment."lesson_id"
      AND book."kind" = 'ebook'
      AND book."content" ->> 'zappyStudentNotebook' = 'true'
      AND book."content" ->> 'url' = attachment."url"
      AND (attachment."file_type" = 'application/pdf' OR attachment."url" ~* '\.pdf($|[?#])')
  );--> statement-breakpoint

-- Um rascunho pode ter PDFs diferentes dos publicados. Reescrever o próprio documento,
-- preservando a ordem dos anexos; uma revisão nova evita sobrescrever uma aba já aberta.
WITH rewritten AS (
  SELECT draft."lesson_id",
         jsonb_agg(
           CASE WHEN EXISTS (
             SELECT 1
             FROM jsonb_array_elements(coalesce(draft."document" -> 'blocks', '[]'::jsonb)) AS book(value)
             WHERE book.value -> 'content' ->> 'kind' = 'ebook'
               AND book.value -> 'content' ->> 'zappyStudentNotebook' = 'true'
               AND book.value -> 'content' ->> 'url' = attachment.value ->> 'url'
               AND (attachment.value ->> 'fileType' = 'application/pdf' OR (attachment.value ->> 'url') ~* '\.pdf($|[?#])')
           )
           THEN jsonb_set(attachment.value, '{zappyStudentNotebook}', 'true'::jsonb, true)
           ELSE attachment.value END
           ORDER BY attachment.ordinality
         ) AS attachments
  FROM "members"."lesson_drafts" AS draft
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(draft."document" -> 'attachments', '[]'::jsonb))
    WITH ORDINALITY AS attachment(value, ordinality)
  GROUP BY draft."lesson_id"
)
UPDATE "members"."lesson_drafts" AS draft
SET "document" = jsonb_set(draft."document", '{attachments}', rewritten.attachments, true),
    "revision" = gen_random_uuid()
FROM rewritten
WHERE draft."lesson_id" = rewritten."lesson_id"
  AND draft."document" -> 'attachments' IS DISTINCT FROM rewritten.attachments;--> statement-breakpoint

-- O snapshot de Desfazer também pode conter o caderno antigo; mantê-lo coerente.
WITH rewritten AS (
  SELECT draft."lesson_id",
         jsonb_agg(
           CASE WHEN EXISTS (
             SELECT 1
             FROM jsonb_array_elements(coalesce(draft."previous_document" -> 'blocks', '[]'::jsonb)) AS book(value)
             WHERE book.value -> 'content' ->> 'kind' = 'ebook'
               AND book.value -> 'content' ->> 'zappyStudentNotebook' = 'true'
               AND book.value -> 'content' ->> 'url' = attachment.value ->> 'url'
               AND (attachment.value ->> 'fileType' = 'application/pdf' OR (attachment.value ->> 'url') ~* '\.pdf($|[?#])')
           )
           THEN jsonb_set(attachment.value, '{zappyStudentNotebook}', 'true'::jsonb, true)
           ELSE attachment.value END
           ORDER BY attachment.ordinality
         ) AS attachments
  FROM "members"."lesson_drafts" AS draft
  CROSS JOIN LATERAL jsonb_array_elements(coalesce(draft."previous_document" -> 'attachments', '[]'::jsonb))
    WITH ORDINALITY AS attachment(value, ordinality)
  WHERE draft."previous_document" IS NOT NULL
  GROUP BY draft."lesson_id"
)
UPDATE "members"."lesson_drafts" AS draft
SET "previous_document" = jsonb_set(draft."previous_document", '{attachments}', rewritten.attachments, true)
FROM rewritten
WHERE draft."lesson_id" = rewritten."lesson_id"
  AND draft."previous_document" -> 'attachments' IS DISTINCT FROM rewritten.attachments;
