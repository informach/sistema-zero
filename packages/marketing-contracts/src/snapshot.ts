import { z } from 'zod'
import { idSchema, permissionSchema } from './common'
import { itemSchema } from './editorial'

export const snapshotCursorSchema = z
  .object({
    at: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    after: idSchema,
  })
  .strict()
export type SnapshotCursor = z.infer<typeof snapshotCursorSchema>
export const snapshotPageSchema = z
  .object({
    projectId: idSchema,
    at: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    items: z.array(itemSchema.safeExtend({ sequence: z.number().int().positive() })).max(100),
    nextAfter: idSchema.nullable(),
    permissions: z.array(permissionSchema),
  })
  .strict()
export type SnapshotPage = z.infer<typeof snapshotPageSchema>

/** Validate continuity before either client commits a page or advances its cursor. */
export function parseSnapshotPage(raw: unknown, projectId: string, cursor: SnapshotCursor | null) {
  const page = snapshotPageSchema.parse(raw)
  if (page.projectId !== projectId || (cursor && page.at !== cursor.at))
    throw new Error('O retrato pertence a outro projeto ou sequência')
  let after = cursor?.after ?? ''
  for (const item of page.items) {
    if (item.projectId !== projectId || item.sequence > page.at || item.id <= after)
      throw new Error('Página do acervo fora de ordem ou contexto')
    after = item.id
  }
  if (page.nextAfter && (!page.items.length || page.nextAfter !== after))
    throw new Error('A página não confirmou o avanço do acervo')
  return page
}

export function snapshotPagePath(projectId: string, cursor: SnapshotCursor | null) {
  return `/projects/${idSchema.parse(projectId)}/snapshot-page${cursor ? `?at=${cursor.at}&after=${cursor.after}` : ''}`
}
