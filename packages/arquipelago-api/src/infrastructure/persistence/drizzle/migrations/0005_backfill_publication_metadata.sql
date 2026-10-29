-- Antes desta migração só existiam metadados no cadastro. Preserva esse último estado
-- conhecido em cada publicação antiga; não inventa um histórico que nunca foi armazenado.
UPDATE arquipelago.desafio_publicacoes p
SET metadados = jsonb_build_object('slug', d.slug, 'publico', d.publico, 'ilha', d.ilha,
  'tipo', d.tipo, 'quadro', d.quadro, 'ordem', d.ordem)
FROM arquipelago.desafios d
WHERE p.desafio_id = d.id AND p.metadados IS NULL;
--> statement-breakpoint
UPDATE arquipelago.desafios d
SET metadados_publicados = p.metadados
FROM arquipelago.desafio_publicacoes p
WHERE p.desafio_id = d.id AND p.revisao = d.revisao_publicada
  AND d.metadados_publicados IS NULL;
