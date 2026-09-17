import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LearningAnswers, LessonLearningReport } from '@sistemazero/core/learning'
import {
  initialExperiment,
  packExperiment,
  sceneStart,
  stepExperiment,
} from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonLearningPanel } = await import('../src/components/professor/lesson-learning-panel')

/**
 * O painel do professor relendo uma tentativa de ANTES dos lotes do Raio-X (full review final de dados e
 * deploy, BAIXO-5). O members não reavalia tentativa: o `passed` gravado fica, e o painel só precisa dizer
 * de onde vem a diferença com o catálogo de hoje.
 */
function relatorio(answers: LearningAnswers, passed: boolean): LessonLearningReport {
  return {
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
          activity: { type: 'experimentation', scene: 'world' },
          prediction: {
            prompt: 'O que aparece?',
            choices: [
              { id: 'aparece', label: 'O Dino aparece' },
              { id: 'vazia', label: 'A tela fica vazia' },
            ],
          },
        },
      },
    ],
    blocks: [
      {
        blockId: 'activity',
        revision: 'revision',
        positionSeconds: null,
        answers,
        hintsUsed: 0,
        attemptsCount: 1,
        result: {
          participated: true,
          passed,
          feedback: passed ? 'Feito.' : 'Ainda não.',
          verifiedBy: 'server',
        },
        updatedAt: '2026-09-08T12:00:00Z',
      },
    ],
    attempts: [],
  }
}

async function abrir(report: LessonLearningReport) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = Object.assign(async () => Response.json(report), { preconnect: () => {} })
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(<LessonLearningPanel lessonId="lesson" userId="child" accountId="account" />),
  )
  await act(async () => container.querySelector('button')!.click())
  return {
    texto: container.textContent ?? '',
    async fechar() {
      globalThis.fetch = originalFetch
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

/** Um retrato com UMA das metas do `world` feita: a outra fica "Pendente". */
function umaMeta() {
  const start = sceneStart({ type: 'experimentation', scene: 'world' })
  let s = initialExperiment(start)
  s = stepExperiment(start, s, { type: 'create' }).session
  return packExperiment('world', s)
}

test('⚠️ a tentativa APROVADA com meta pendente diz que foi numa versão anterior da cena', async () => {
  const { texto, fechar } = await abrir(relatorio({ sceneCheckpoint: umaMeta() }, true))
  try {
    expect(texto).toContain('Pendente:')
    expect(texto).toContain('Aprovada numa versão anterior da cena')
  } finally {
    await fechar()
  }
})

test('e a NÃO aprovada segue só com o "Pendente" de sempre', async () => {
  const { texto, fechar } = await abrir(relatorio({ sceneCheckpoint: umaMeta() }, false))
  try {
    expect(texto).toContain('Pendente:')
    expect(texto).not.toContain('versão anterior')
  } finally {
    await fechar()
  }
})

test('⚠️ o palpite com um id que a pergunta de hoje não tem mais é dito como opção antiga', async () => {
  const { texto, fechar } = await abrir(
    relatorio({ sceneCheckpoint: umaMeta(), prediction: 'fica' }, false),
  )
  try {
    expect(texto).toContain('Palpite antes de mexer: fica (opção que não existe mais)')
  } finally {
    await fechar()
  }
})
