import type { ArtSlotCourseBlock } from '@sistemazero/core/learning'
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { artSlotSectionIndex, toArtSlotCourseBlock } from '../../../domain/course/art-slot-course'
import type { Database } from './db'
import { lessonBlocks, lessonStructures, lessons, modules } from './schema'

/**
 * Os blocos de vaga de arte do curso (etapa 2). Só os NOMES das imagens do jogo cruzam o banco:
 * o `initialProject` pode ter 1,5 MB. ⚠️ O `imageNames` espelha `studioGameImageNames`
 * (domínio); mexeu num, mexa no outro. Aulas rascunho entram, como na cadeia do Pinta: a vaga é
 * da autoria.
 */
export async function listArtSlotBlocks(
  db: Database,
  courseId: string,
): Promise<ArtSlotCourseBlock[]> {
  const content = lessonBlocks.content
  const assets = sql`${content}->'initialProject'->'assets'`
  const rows = await db
    .select({
      blockId: lessonBlocks.id,
      kind: lessonBlocks.kind,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      published: lessons.isPublished,
      moduleOrder: modules.sortOrder,
      lessonOrder: lessons.sortOrder,
      blockOrder: lessonBlocks.sortOrder,
      artSlot: sql<unknown>`${content}->'artSlot'`,
      artSlots: sql<unknown>`${content}->'artSlots'`,
      imageNames: sql<string[]>`case when ${lessonBlocks.kind} = 'studio' then (
        select coalesce(jsonb_agg(asset->>'name'), '[]'::jsonb)
        from jsonb_array_elements(
          case when jsonb_typeof(${assets}) = 'array' then ${assets} else '[]'::jsonb end
        ) as asset
        where asset->>'kind' = 'image' and jsonb_typeof(asset->'name') = 'string'
      ) else '[]'::jsonb end`,
    })
    .from(lessonBlocks)
    .innerJoin(lessons, eq(lessons.id, lessonBlocks.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(
      and(
        isNull(lessonBlocks.archivedAt),
        eq(lessons.courseId, courseId),
        or(
          and(eq(lessonBlocks.kind, 'pinta'), sql`${content}->'artSlot' is not null`),
          and(eq(lessonBlocks.kind, 'studio'), sql`${content}->'artSlots' is not null`),
        ),
      ),
    )
  if (!rows.length) return []
  const lessonIds = [...new Set(rows.map((row) => row.lessonId))]
  const structures = await db
    .select({ lessonId: lessonStructures.lessonId, sections: lessonStructures.sections })
    .from(lessonStructures)
    .where(inArray(lessonStructures.lessonId, lessonIds))
  const sections = new Map(structures.map((row) => [row.lessonId, row.sections]))
  return rows.flatMap((row) => {
    const block = toArtSlotCourseBlock({
      blockId: row.blockId,
      lessonId: row.lessonId,
      kind: row.kind,
      lessonTitle: row.lessonTitle,
      order: [
        row.moduleOrder,
        row.lessonOrder,
        artSlotSectionIndex(sections.get(row.lessonId), row.blockId),
        row.blockOrder,
      ],
      published: row.published,
      artSlot: row.artSlot,
      artSlots: row.artSlots,
      imageNames: row.imageNames,
    })
    return block ? [block] : []
  })
}
