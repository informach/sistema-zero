-- O Livro 3D passa a apontar para um arquivo da aula. Reutiliza primeiro o anexo
-- da mesma aula e URL; cria um somente para livros antigos sem anexo correspondente.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM members.lesson_blocks WHERE kind = 'ebook'
             AND content ? 'url' AND coalesce(content ->> 'url', '') = '') THEN
    RAISE EXCEPTION 'Existe Livro 3D publicado sem URL; corrija antes da migração';
  END IF;
END $$;--> statement-breakpoint

WITH books AS (
  SELECT block.lesson_id,
         block.content ->> 'url' AS url,
         min(coalesce(nullif(block.content ->> 'title', ''), 'Livro 3D')) AS label,
         coalesce(bool_or(block.content ->> 'zappyStudentNotebook' = 'true'), false) AS notebook
  FROM members.lesson_blocks AS block
  WHERE block.kind = 'ebook' AND block.content ? 'url'
  GROUP BY block.lesson_id, block.content ->> 'url'
), missing AS (
  SELECT books.*
  FROM books
  WHERE books.url IS NOT NULL AND books.url <> ''
    AND NOT EXISTS (
      SELECT 1 FROM members.lesson_attachments AS attachment
      WHERE attachment.lesson_id = books.lesson_id AND attachment.url = books.url
    )
), numbered AS (
  SELECT missing.*,
         coalesce((SELECT max(a.sort_order) FROM members.lesson_attachments AS a
                   WHERE a.lesson_id = missing.lesson_id), -1)
         + row_number() OVER (PARTITION BY missing.lesson_id ORDER BY missing.url) AS new_order
  FROM missing
)
INSERT INTO members.lesson_attachments
  (id, lesson_id, label, url, file_type, size_bytes, zappy_student_notebook, sort_order)
SELECT gen_random_uuid(), lesson_id, label, url, 'application/pdf', NULL, notebook, new_order
FROM numbered;--> statement-breakpoint

UPDATE members.lesson_attachments AS attachment
SET zappy_student_notebook = true
WHERE NOT attachment.zappy_student_notebook
  AND EXISTS (
    SELECT 1 FROM members.lesson_blocks AS block
    WHERE block.lesson_id = attachment.lesson_id AND block.kind = 'ebook'
      AND block.content ->> 'url' = attachment.url
      AND block.content ->> 'zappyStudentNotebook' = 'true'
  );--> statement-breakpoint

UPDATE members.lesson_blocks AS block
SET content = (block.content - 'url' - 'zappyStudentNotebook') || jsonb_build_object(
  'attachmentId', (
    SELECT attachment.id::text FROM members.lesson_attachments AS attachment
    WHERE attachment.lesson_id = block.lesson_id AND attachment.url = block.content ->> 'url'
    ORDER BY attachment.sort_order, attachment.id LIMIT 1
  )
)
WHERE block.kind = 'ebook' AND block.content ? 'url';--> statement-breakpoint

-- Preservar o texto do caderno que o Zappy já extraiu: a identidade da fonte muda
-- do bloco para o PDF, mas os chunks continuam válidos porque a URL é a mesma.
WITH ranked AS (
  SELECT source.id,
         row_number() OVER (
           PARTITION BY source.lesson_id, attachment.id
           ORDER BY source.updated_at DESC, source.id
         ) AS position
  FROM members.zappy_knowledge_sources AS source
  JOIN members.lesson_blocks AS block ON block.id = source.block_id
  JOIN members.lesson_attachments AS attachment
    ON attachment.lesson_id = source.lesson_id
   AND attachment.id::text = block.content ->> 'attachmentId'
  WHERE source.source_type = 'student-notebook'
    AND attachment.zappy_student_notebook = true
)
DELETE FROM members.zappy_knowledge_sources AS source
USING ranked
WHERE source.id = ranked.id AND ranked.position > 1;--> statement-breakpoint

UPDATE members.zappy_knowledge_sources AS source
SET block_id = NULL,
    source_ref = 'attachment:' || attachment.id::text,
    block_revision = md5(attachment.url),
    updated_at = now()
FROM members.lesson_blocks AS block
JOIN members.lesson_attachments AS attachment
  ON attachment.lesson_id = block.lesson_id
 AND attachment.id::text = block.content ->> 'attachmentId'
WHERE source.block_id = block.id
  AND source.lesson_id = attachment.lesson_id
  AND source.source_type = 'student-notebook'
  AND attachment.zappy_student_notebook = true;--> statement-breakpoint

DELETE FROM members.zappy_knowledge_sources
WHERE source_type = 'student-notebook' AND block_id IS NOT NULL;--> statement-breakpoint

-- Rascunhos e snapshots de Desfazer podem ter arquivos distintos da versão publicada.
-- A função temporária transforma os dois documentos completos, sem mexer em ids dos blocos.
CREATE FUNCTION members.migrate_ebook_document(input_document jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  result_document jsonb := input_document;
  document_blocks jsonb;
  document_attachments jsonb;
  entry record;
  book_content jsonb;
  book_url text;
  attachment_id text;
  attachment_index integer;
  notebook boolean;
BEGIN
  IF input_document IS NULL THEN RETURN NULL; END IF;
  document_blocks := coalesce(input_document -> 'blocks', '[]'::jsonb);
  document_attachments := coalesce(input_document -> 'attachments', '[]'::jsonb);
  FOR entry IN SELECT value, ordinality FROM jsonb_array_elements(document_blocks) WITH ORDINALITY LOOP
    book_content := entry.value -> 'content';
    IF book_content ->> 'kind' <> 'ebook' OR NOT (book_content ? 'url') THEN CONTINUE; END IF;
    book_url := book_content ->> 'url';
    IF book_url IS NULL OR book_url = '' THEN
      RAISE EXCEPTION 'Livro 3D sem URL na migração da aula %', input_document ->> 'title';
    END IF;
    notebook := coalesce(book_content ->> 'zappyStudentNotebook' = 'true', false);
    SELECT a.value ->> 'id', (a.ordinality - 1)::integer
      INTO attachment_id, attachment_index
    FROM jsonb_array_elements(document_attachments) WITH ORDINALITY AS a(value, ordinality)
    WHERE a.value ->> 'url' = book_url
    ORDER BY a.ordinality LIMIT 1;
    IF attachment_id IS NULL THEN
      attachment_id := gen_random_uuid()::text;
      document_attachments := document_attachments || jsonb_build_array(jsonb_build_object(
        'id', attachment_id,
        'label', coalesce(nullif(book_content ->> 'title', ''), 'Livro 3D'),
        'url', book_url,
        'fileType', 'application/pdf',
        'sizeBytes', NULL,
        'zappyStudentNotebook', notebook
      ));
    ELSIF notebook THEN
      document_attachments := jsonb_set(
        document_attachments,
        ARRAY[attachment_index::text, 'zappyStudentNotebook'],
        'true'::jsonb,
        true
      );
    END IF;
    document_blocks := jsonb_set(
      document_blocks,
      ARRAY[(entry.ordinality - 1)::text, 'content'],
      (book_content - 'url' - 'zappyStudentNotebook') || jsonb_build_object('attachmentId', attachment_id),
      true
    );
  END LOOP;
  result_document := jsonb_set(result_document, '{blocks}', document_blocks, true);
  RETURN jsonb_set(result_document, '{attachments}', document_attachments, true);
END;
$$;--> statement-breakpoint

WITH migrated AS (
  SELECT draft.lesson_id,
         members.migrate_ebook_document(draft.document) AS next_document,
         members.migrate_ebook_document(draft.previous_document) AS next_previous_document
  FROM members.lesson_drafts AS draft
)
UPDATE members.lesson_drafts AS draft
SET document = migrated.next_document,
    previous_document = migrated.next_previous_document,
    revision = gen_random_uuid()
FROM migrated
WHERE draft.lesson_id = migrated.lesson_id
  AND (draft.document IS DISTINCT FROM migrated.next_document
       OR draft.previous_document IS DISTINCT FROM migrated.next_previous_document);--> statement-breakpoint

DROP FUNCTION members.migrate_ebook_document(jsonb);
