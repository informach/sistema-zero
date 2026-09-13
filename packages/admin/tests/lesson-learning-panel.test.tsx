import { expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LessonLearningReport } from '@sistemazero/core/learning'
import {
  initialExperiment,
  packExperiment,
  SCENE_MODELS,
  sceneStart,
  stepExperiment,
} from '@sistemazero/core/learning/scene'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonLearningPanel } = await import('../src/components/professor/lesson-learning-panel')

const atividade = { type: 'experimentation', scene: 'world' } as const

function relatorio(sceneCheckpoint: string[] | undefined): LessonLearningReport {
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
          activity: atividade,
        },
      },
    ],
    blocks: [
      {
        blockId: 'activity',
        revision: 'revision',
        positionSeconds: null,
        answers: sceneCheckpoint ? { sceneCheckpoint } : {},
        hintsUsed: 0,
        attemptsCount: 0,
        result: null,
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

test('o professor vê o que a criança descobriu e como a cena ficou montada', async () => {
  const start = sceneStart(atividade)
  let s = initialExperiment(start)
  s = stepExperiment(start, s, { type: 'create' }).session
  s = stepExperiment(start, s, { type: 'connect', port: 'draw', enabled: true }).session
  const { texto, fechar } = await abrir(relatorio(packExperiment('world', s)))
  try {
    expect(texto).toContain(SCENE_MODELS.world.title)
    // As metas alcançadas e as pendentes aparecem pelo NOME, não por um contador.
    for (const g of SCENE_MODELS.world.goals) expect(texto).toContain(g.label)
    expect(texto).toContain('Descobriu:')
    expect(texto).toContain('Montagem atual: Dino criado; desenho ligado')
  } finally {
    await fechar()
  }
})

test('⚠️ quem nunca abriu a cena não aparece como registro inválido', async () => {
  // São coisas diferentes: "ainda não fez" é uma informação sobre a criança; "registro
  // inválido" é um alarme sobre o sistema. Confundir os dois manda o professor caçar um
  // defeito que não existe.
  const { texto, fechar } = await abrir(relatorio(undefined))
  try {
    expect(texto).toContain('ainda não abriu')
    expect(texto).not.toContain('não confere')
  } finally {
    await fechar()
  }
})

test('⚠️ registro de outra cena não é reinterpretado como descoberta desta', async () => {
  const outra = sceneStart({ type: 'experimentation', scene: 'spawn' })
  let s = initialExperiment(outra)
  s = stepExperiment(outra, s, { type: 'connect', port: 'timer', enabled: true }).session
  const { texto, fechar } = await abrir(relatorio(packExperiment('spawn', s)))
  try {
    expect(texto).toContain('não confere')
    expect(texto).not.toContain('Descobriu:')
  } finally {
    await fechar()
  }
})

test('⚠️ registro de outra REVISÃO do bloco não some como "sem registro"', async () => {
  // O pareamento por revisão existe para o professor não ler uma resposta velha com o
  // conteúdo novo. Mas descartar em silêncio faz a tela dizer que a criança não fez nada —
  // e quem editou o bloco foi o professor. A tela precisa dizer o que aconteceu.
  const start = sceneStart(atividade)
  let s = initialExperiment(start)
  s = stepExperiment(start, s, { type: 'create' }).session
  const report = relatorio(packExperiment('world', s))
  const bloco = (report.blocks as Array<{ revision: string }>)[0]
  if (!bloco) throw new Error('sem bloco')
  bloco.revision = 'revisao-anterior'
  const { texto, fechar } = await abrir(report)
  try {
    expect(texto).toContain('outra versão')
    expect(texto).not.toContain('Sem registro')
    // E o registro velho continua NÃO sendo lido com o conteúdo de agora.
    expect(texto).not.toContain('Descobriu:')
  } finally {
    await fechar()
  }
})
