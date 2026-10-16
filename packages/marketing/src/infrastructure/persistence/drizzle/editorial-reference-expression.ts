import { type SQLWrapper, sql } from 'drizzle-orm'

/** Item edges only. Keep aligned with domain/workspace/references; revisions and assets have separate validation. */
export function editorialItemReferences(document: SQLWrapper) {
  return sql`(
    coalesce(${document}->'referenceIds', '[]'::jsonb) ||
    coalesce(${document}->'evidenceIds', '[]'::jsonb) ||
    coalesce(${document}->'representationIds', '[]'::jsonb) ||
    coalesce(${document}->'componentIds', '[]'::jsonb) ||
    coalesce(${document}->'pieceId', '[]'::jsonb) ||
    coalesce(${document}->'representationId', '[]'::jsonb) ||
    coalesce(${document}->'proposedPieceId', '[]'::jsonb)
  )`
}
