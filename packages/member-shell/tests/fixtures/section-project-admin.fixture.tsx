import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LessonPlayerContextValue } from '../../src/components/lesson-player-context'
import type { LessonDetailView } from '../../src/lib/types'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonPlayerProvider } = await import('../../src/components/lesson-player-context')
const { LessonSections } = await import('../../src/components/lesson-sections')
const { SectionProjectCheck } = await import('../../src/components/studio/section-project-check')

test('objetivos aparecem para a equipe sem inventar progresso do aluno', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = Object.assign(async () => Response.json({}), originalFetch)
  const lesson: LessonDetailView = {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'aula-1',
    title: 'O primeiro achado',
    moduleId: '22222222-2222-4222-8222-222222222222',
    courseSlug: 'cade-todo-mundo',
    estimatedMinutes: null,
    completed: false,
    positionSeconds: null,
    attachments: [],
    structureRevision: '33333333-3333-4333-8333-333333333333',
    blocks: [
      {
        id: 'studio',
        kind: 'studio',
        sortOrder: 0,
        content: { kind: 'studio', purpose: 'experiment' },
      },
    ],
    sections: [
      {
        id: 'section',
        title: 'Faça alguém aparecer',
        blockIds: ['studio'],
        workspaceBlockId: 'studio',
        externalTool: null,
        completion: {
          version: 1,
          blockIds: [],
          projectChecks: [{ id: 'revelar', label: 'Revele o personagem tocado.', kind: 'idea' }],
        },
      },
    ],
  }
  const player: LessonPlayerContextValue = {
    lessonId: lesson.id,
    courseSlug: lesson.courseSlug,
    viewerWatermark: null,
    viewerId: 'admin',
    initialPositionSeconds: null,
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <LessonPlayerProvider value={player}>
          <LessonSections
            lesson={lesson}
            renderBlocks={(blocks) =>
              blocks.map((block) => (
                <SectionProjectCheck
                  key={block.id}
                  blockId={block.id}
                  handleRef={{ current: null }}
                />
              ))
            }
          />
        </LessonPlayerProvider>,
      ),
    )
    const button = Array.from(host.querySelectorAll('button')).find(
      (button) => button.textContent === 'Verificar esta parte',
    )
    expect(button).toBeDefined()
    expect(host.textContent).toContain('Revele o personagem tocado.')
    expect(lesson.sectionProgress).toBeUndefined()
    delete lesson.structureRevision
    await act(async () =>
      root.render(
        <LessonPlayerProvider value={player}>
          <LessonSections
            lesson={lesson}
            renderBlocks={(blocks) =>
              blocks.map((block) => (
                <SectionProjectCheck
                  key={block.id}
                  blockId={block.id}
                  handleRef={{ current: null }}
                />
              ))
            }
          />
        </LessonPlayerProvider>,
      ),
    )
    expect(
      Array.from(host.querySelectorAll('button')).some(
        (button) => button.textContent === 'Verificar esta parte',
      ),
    ).toBe(false)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    globalThis.fetch = originalFetch
  }
})
