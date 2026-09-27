import { expect, test } from 'bun:test'
import { publishedLessonRevisions } from '../../../members/src/domain/learning/published-lesson-revisions'
import { stableJson } from '../../../members/src/domain/shared/stable-json'
import { migrateDraftBases, publishedRevisions } from '../../scripts/project-migrations/drafts'
import {
  hash,
  type Row,
  type RowChange,
  TABLES,
  type Table,
} from '../../scripts/project-migrations/railway'

function fixture() {
  const rows = Object.fromEntries(
    Object.keys(TABLES).map((table) => [table, [] as Row[]]),
  ) as Record<Table, Row[]>
  rows['members.lessons'] = [{ id: 'lesson', title: 'Livro', slug: 'livro', estimated_minutes: 10 }]
  rows['members.lesson_blocks'] = [
    {
      id: 'ebook',
      lesson_id: 'lesson',
      kind: 'ebook',
      sort_order: 0,
      archived_at: null,
      content_revision: 'original',
      content: { kind: 'ebook', attachmentId: 'pdf', title: 'Caderno' },
    },
  ]
  rows['members.lesson_attachments'] = [
    {
      id: 'pdf',
      lesson_id: 'lesson',
      label: 'Caderno',
      url: 'r2priv:livro.pdf',
      file_type: 'application/pdf',
      size_bytes: 100,
      sort_order: 0,
      zappy_student_notebook: true,
    },
  ]
  rows['members.lesson_structures'] = [
    { lesson_id: 'lesson', sections: [{ id: 'section', blockIds: ['ebook'] }] },
  ]
  rows['members.lesson_criteria_migration_snapshots'] = [
    {
      lesson_id: 'lesson',
      previous_sections: [],
      migrated_sections: rows['members.lesson_structures'][0]!.sections,
    },
  ]
  return rows
}

test('inventário SQL reproduz o contrato publicado, normaliza o Livro 3D e exclui marcação do caderno e supportBlockIds', () => {
  const rows = fixture()
  const expectedLesson = {
    title: 'Livro',
    slug: 'livro',
    estimatedMinutes: 10,
    blocks: [
      {
        id: 'ebook',
        lessonId: 'lesson',
        kind: 'ebook',
        sortOrder: 0,
        contentRevision: 'original',
        content: { kind: 'ebook', url: 'r2priv:livro.pdf', title: 'Caderno' },
      },
    ],
    attachments: [
      {
        id: 'pdf',
        lessonId: 'lesson',
        label: 'Caderno',
        url: 'r2priv:livro.pdf',
        fileType: 'application/pdf',
        sizeBytes: 100,
        sortOrder: 0,
      },
    ],
  }
  const sections = rows['members.lesson_structures'][0]!.sections
  const expected = hash(stableJson({ ...expectedLesson, sections }))
  expect(publishedRevisions(rows, 'lesson').current).toBe(expected)
  expect(publishedLessonRevisions(expectedLesson, sections).current).toBe(expected)
  rows['members.lesson_structures'][0]!.support_block_ids = []
  rows['members.lesson_attachments'][0]!.zappy_student_notebook = false
  expect(publishedRevisions(rows, 'lesson').current).toBe(expected)
  rows['members.lesson_attachments'][0]!.url = 'r2priv:novo.pdf'
  expect(publishedRevisions(rows, 'lesson').current).not.toBe(expected)
})

test('rebasa todas as revisões compatíveis de caderno/critérios e conserva conflitos reais', () => {
  const source = fixture()
  const revisions = publishedRevisions(source, 'lesson')
  expect(new Set([revisions.current, ...revisions.compatible]).size).toBe(4)
  for (const revision of [revisions.current, ...revisions.compatible, 'conflito-anterior']) {
    const rows = structuredClone(source)
    rows['members.lesson_drafts'] = [
      {
        lesson_id: 'lesson',
        published_revision: revision,
        revision: 'draft-original',
        document: { title: 'Autoria em curso' },
      },
    ]
    const before = rows['members.lessons'][0]!
    const changes: RowChange[] = [
      { table: 'members.lessons', before, after: { ...before, title: 'Livro novo' } },
    ]
    migrateDraftBases(rows, changes)
    const draftChange = changes.find((change) => change.table === 'members.lesson_drafts')
    if (revision === 'conflito-anterior') expect(draftChange).toBeUndefined()
    else {
      expect(draftChange?.after.published_revision).not.toBe(revision)
      expect(draftChange?.after.document).toEqual(rows['members.lesson_drafts'][0]!.document)
      expect(draftChange?.after.revision).not.toBe('draft-original')
    }
  }
})
