import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LessonLearningReport } from '@sistemazero/core/learning'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonLearningPanel } = await import('../src/components/professor/lesson-learning-panel')

for (const [preset, key, label] of [
  ['motion', 'gravity', 'Gravidade'],
  ['population', 'interval', 'Intervalo entre objetos (segundos)'],
  ['collision', 'radius', 'Raio da colisão'],
] as const) {
  test(`professor vê os valores realmente testados no experimento ${preset}`, async () => {
    const report: LessonLearningReport = {
      lessonId: 'lesson',
      lessonTitle: 'Meu jogo',
      userId: 'child',
      sectionId: 'section',
      sections: [
        {
          id: 'section',
          title: 'Explorar',
          objective: '',
          intent: 'exploration',
          blockIds: ['activity'],
          workspaceBlockId: null,
          externalTool: null,
          pendingMedia: [],
        },
      ],
      activities: [
        {
          id: 'activity',
          revision: 'revision',
          content: {
            kind: 'interactive',
            title: 'Teste',
            instructions: '',
            required: false,
            hints: [],
            activity: { type: 'experiment', preset, parameters: {} },
          },
        },
      ],
      blocks: [
        {
          blockId: 'activity',
          revision: 'revision',
          positionSeconds: null,
          answers: {
            [key]: 0.9,
            tested: 0.6,
            testedValues: ['0.3', '0.6'],
            experiments: 2,
            observed: true,
          },
          hintsUsed: 0,
          attemptsCount: 0,
          result: null,
          updatedAt: '2026-09-08T12:00:00Z',
        },
      ],
      attempts: [],
    }
    const originalFetch = globalThis.fetch
    globalThis.fetch = Object.assign(async () => Response.json(report), { preconnect: () => {} })
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      await act(async () =>
        root.render(<LessonLearningPanel lessonId="lesson" userId="child" accountId="account" />),
      )
      await act(async () => container.querySelector('button')!.click())
      expect(container.textContent).toContain(`${label} · valores testados: 0.3; 0.6`)
      expect(container.textContent).toContain('Último valor testado: 0.6')
      expect(container.textContent).not.toContain('Último valor testado: 0.9')
    } finally {
      globalThis.fetch = originalFetch
      await act(async () => root.unmount())
      container.remove()
    }
  })
}
