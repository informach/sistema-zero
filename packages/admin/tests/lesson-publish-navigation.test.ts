import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = (path: string) => readFileSync(resolve(import.meta.dir, '../src', path), 'utf8')

describe('ações de edição e publicação da aula', () => {
  test('o diálogo de revisão só fecha depois de uma publicação confirmada', () => {
    const editor = source(
      'app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx',
    )

    expect(editor).not.toContain('void publish().then(() => setReviewOpen(false))')
    expect(editor).toContain('if (await publish()) setReviewOpen(false)')
    expect(editor).toContain("draft.isPublished ? 'Aula publicada' : 'Aula ainda não publicada'")
  })

  test('a listagem não oferece dois atalhos para a mesma página da aula', () => {
    const course = source('app/admin/membros/cursos/[courseId]/course-editor-client.tsx')
    const lessonRow = course.slice(course.indexOf('function SortableLessonItem('))

    expect(lessonRow).toContain('> Conteúdo')
    expect(lessonRow).not.toContain('onClick={onEdit}')
  })
})
