import { stableJson } from '../../../members/src/domain/shared/stable-json'
import { canonical } from './content'
import { hash, type Row, type RowChange, TABLES, type Table } from './railway'

export function promotedRows(
  sources: Record<Table, Row[]>,
  changes: RowChange[],
): Record<Table, Row[]> {
  const rows = structuredClone(sources)
  for (const change of changes) {
    const key = TABLES[change.table].key
    const index = rows[change.table].findIndex((row) => row[key] === change.before[key])
    if (index < 0) throw new Error('Linha ausente do inventário')
    rows[change.table][index] = structuredClone(change.after)
  }
  return rows
}

/** Retrato do hash de publicação do backend. Não redefine a revisão de um conflito pré-existente. */
export function publishedRevisions(
  rows: Record<Table, Row[]>,
  id: unknown,
): { current: string; previous: string | null } {
  const lesson = rows['members.lessons'].find((row) => row.id === id)
  if (!lesson) throw new Error('Metadados da aula ausentes do inventário')
  const structure = rows['members.lesson_structures'].find((row) => row.lesson_id === id)
  const migration = rows['members.lesson_criteria_migration_snapshots'].find(
    (row) => row.lesson_id === id,
  )
  const ordered = (table: 'members.lesson_blocks' | 'members.lesson_attachments') =>
    rows[table]
      .filter((row) => row.lesson_id === id && !row.archived_at)
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
  const blocks = ordered('members.lesson_blocks').map((r) => ({
    id: r.id,
    lessonId: r.lesson_id,
    kind: r.kind,
    sortOrder: r.sort_order,
    content: r.content,
    contentRevision: r.content_revision,
  }))
  const attachments = ordered('members.lesson_attachments').map((r) => ({
    id: r.id,
    lessonId: r.lesson_id,
    label: r.label,
    url: r.url,
    fileType: r.file_type,
    sizeBytes: r.size_bytes,
    sortOrder: r.sort_order,
  }))
  const snapshot = {
    title: lesson.title,
    slug: lesson.slug,
    estimatedMinutes: lesson.estimated_minutes,
    blocks,
    attachments,
    sections: structure?.sections,
    supportBlockIds: structure?.support_block_ids,
  }
  return {
    current: hash(stableJson(snapshot)),
    previous:
      migration && canonical(structure?.sections) === canonical(migration.migrated_sections)
        ? hash(stableJson({ ...snapshot, sections: migration.previous_sections }))
        : null,
  }
}

export function migrateDraftBases(sources: Record<Table, Row[]>, changes: RowChange[]): void {
  const after = promotedRows(sources, changes)
  for (const draft of sources['members.lesson_drafts']) {
    const beforeRevision = publishedRevisions(sources, draft.lesson_id)
    const afterRevision = publishedRevisions(after, draft.lesson_id)
    if (beforeRevision.current === afterRevision.current) continue
    if (
      draft.published_revision !== beforeRevision.current &&
      draft.published_revision !== beforeRevision.previous
    )
      continue
    let change = changes.find(
      (c) => c.table === 'members.lesson_drafts' && c.before.lesson_id === draft.lesson_id,
    )
    if (!change) {
      change = { table: 'members.lesson_drafts', before: draft, after: structuredClone(draft) }
      changes.push(change)
    }
    change.after.published_revision = afterRevision.current
    const t = hash(canonical(change.after))
    change.after.revision = `${t.slice(0, 8)}-${t.slice(8, 12)}-4${t.slice(13, 16)}-8${t.slice(17, 20)}-${t.slice(20, 32)}`
  }
}
