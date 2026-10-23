import { afterAll, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { act, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { authoringFixture } from '../../../members/tests/fakes/studio-authoring-policy'
import { refinePythonProjectDocument } from '../../../studio/src/state/pythonProjectValidation'
import type { LessonStructureEditor as Editor } from '../../src/components/editor/lesson-structure-editor'
import type { StudioEmbed as Embed } from '../../src/components/studio/studio-embed'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const originalEmbed = { ...(await import('../../src/components/studio/studio-embed')) }
let observed: ComponentProps<typeof Embed> | undefined
mock.module('../../src/components/studio/studio-embed', () => ({
  ...originalEmbed,
  StudioEmbed: (props: ComponentProps<typeof Embed>) => {
    observed = props
    return <output>{props.initialProject?.kind}</output>
  },
}))
const { LessonStructureEditor } = await import(
  '../../src/components/editor/lesson-structure-editor'
)
afterAll(() => mock.module('../../src/components/studio/studio-embed', () => originalEmbed))

const authorId = '11111111-1111-4111-8111-111111111111'
const lessonId = '22222222-2222-4222-8222-222222222222'
const blockId = '33333333-3333-4333-8333-333333333333'
const oldRevision = '44444444-4444-4444-8444-444444444444'
const newRevision = '55555555-5555-4555-8555-555555555555'
function values(
  project: NonNullable<ComponentProps<typeof Embed>['initialProject']>,
  revision: string,
): ComponentProps<typeof Editor> {
  const block = {
    id: blockId,
    kind: 'studio' as const,
    lessonId,
    sortOrder: 0,
    blockRevision: 'a'.repeat(32),
    content: { kind: 'studio' as const, initialProject: project },
  }
  return {
    draftRevision: revision,
    lesson: {
      id: lessonId,
      moduleId: 'm',
      courseId: 'c',
      slug: 'preview',
      title: 'Preview',
      sortOrder: 0,
      estimatedMinutes: null,
      isPublished: false,
      blocks: [block],
      attachments: [],
    },
    document: {
      title: 'Preview',
      slug: 'preview',
      estimatedMinutes: null,
      blocks: [{ id: blockId, content: block.content }],
      sections: [defaultLessonSection(lessonId, 'Seção', [blockId])],
      attachments: [],
      plannedVideos: [],
    },
    preview: true,
    onPreviewChange: () => {},
    canWrite: true,
    authorId,
    issues: [],
    area: 'sections',
    onChange: () => {},
    onAddBlock: () => {},
    onEditBlock: () => {},
    onRemoveBlock: () => {},
    onCreateStructure: () => {},
  }
}
for (const afterKind of ['classic', 'pro'] as const)
  test(`draft replacement preserves the old preview until explicit reload into ${afterKind}`, async () => {
    const before = await refinePythonProjectDocument(
      (await authoringFixture('python', 'classic')).project,
    )
    const after = await refinePythonProjectDocument(
      (await authoringFixture('python', afterKind)).project,
    )
    after.id = before.id
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      await act(async () => root.render(<LessonStructureEditor {...values(before, oldRevision)} />))
      expect(observed?.initialProject).toBe(before)
      await act(async () => root.render(<LessonStructureEditor {...values(after, newRevision)} />))
      expect(observed?.initialProject).toBe(before)
      expect(observed?.runtimeScope).toBeUndefined()
      expect(observed?.editingAccess).toBe('observer')
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'rascunho da aula mudou',
      )
      const reload = [...container.querySelectorAll('button')].find(
        (button) => button.textContent === 'Abrir rascunho atual',
      )!
      await act(async () => reload.click())
      expect(observed?.initialProject).toBe(after)
      expect(observed?.runtimeScope?.context.draftRevision).toBe(newRevision)
      expect(observed?.editingAccess).toBe('author')
      expect(container.querySelector('[role="alert"]')).toBeNull()
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
