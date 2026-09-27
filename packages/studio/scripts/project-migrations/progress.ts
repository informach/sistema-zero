import { createHash } from 'node:crypto'
import { stableJson } from '../../../members/src/domain/shared/stable-json'
import { isDocumentRecord } from '../../src/core/projectDocument'
import { promotedRows } from './drafts'
import type { Row, RowChange, Table } from './railway'

/** Hash vigente do contrato de verificação, igual ao SectionProgressionService. */
export function sectionRevision(
  rows: Record<Table, Row[]>,
  lessonId: unknown,
  sectionId: unknown,
): string | null {
  const structure = rows['members.lesson_structures'].find((row) => row.lesson_id === lessonId)
  if (!Array.isArray(structure?.sections)) return null
  const section = structure.sections.find(
    (section) => isDocumentRecord(section) && section.id === sectionId,
  )
  if (!isDocumentRecord(section) || !Array.isArray(section.blockIds)) return null
  const ids = section.blockIds
  const blocks = rows['members.lesson_blocks']
    .filter((row) => row.lesson_id === lessonId && !row.archived_at)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    .filter((row) => ids.includes(row.id) || row.id === section.workspaceBlockId)
    .map((row) => [row.id, row.content_revision])
  return createHash('md5')
    .update(stableJson({ completion: section.completion, blocks }))
    .digest('hex')
}

/** Conversão equivalente conserva verificações parciais, datas e aprovações, sem regrade. */
export function migrateSectionProgress(sources: Record<Table, Row[]>, changes: RowChange[]): void {
  const after = promotedRows(sources, changes)
  for (const before of sources['members.lesson_section_progress']) {
    const oldRevision = sectionRevision(sources, before.lesson_id, before.section_id)
    const nextRevision = sectionRevision(after, before.lesson_id, before.section_id)
    if (
      !oldRevision ||
      !nextRevision ||
      oldRevision === nextRevision ||
      before.revision !== oldRevision
    )
      continue
    changes.push({
      table: 'members.lesson_section_progress',
      before,
      after: { ...before, revision: nextRevision },
    })
  }
}
