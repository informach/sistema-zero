import { describe, expect, mock, test } from 'bun:test'
import type { PensaTaskView } from '../src/lib/types'

mock.module('server-only', () => ({}))
const { createStudioZappyRoutes } = await import('../src/routes/studio-zappy')
const { currentPensaTask, studioTutorTask } = await import('../src/server/pensa-journey/missions')
const { createStudioZappyAdapter } = await import('../src/lib/studio-zappy-adapter')

const PLAN = '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e01'
const STUDIO_PROJECT = `pensa-${PLAN.replaceAll('-', '')}`
const STAFF = {
  id: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010',
  firstName: 'Equipe',
  role: 'staff',
  status: 'active',
}

function task(
  id: string,
  position: number,
  destination: 'studio' | 'pinta',
  status: 'planned' | 'in_progress' | 'completed',
  dependencies: string[] = [],
): PensaTaskView {
  return {
    id,
    title: `Missão ${id}`,
    summary: `Resultado ${id}`,
    destination,
    category: 'gameplay',
    estimatedMinutes: 10,
    position,
    dependencies,
    guide: {
      contractVersion: 2,
      steps: [{ id: 's1', text: `Passo de ${id}`, required: false }],
      criteria: [{ id: 'result', text: 'Teste', required: true }],
    },
    context: {
      kind: 'studio',
      dimension: '2d',
      visualAssetIds: [],
      blockIds: [],
      blocks: [],
      mechanicDocumentIds: [],
      extensionIds: [],
    },
    progress: {
      status,
      completedStepIds: [],
      completedCriteriaIds: [],
      outputRef: null,
      startedAt: null,
      completedAt: null,
      updatedAt: null,
    },
    revision: 1,
    supersedesTaskId: null,
  }
}

/** Palco feito; a próxima do plano é o desenho do Pinta; depois integrar e testar. */
const PLAN_TASKS = [
  task('0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e11', 0, 'studio', 'completed'),
  task('0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e12', 1, 'pinta', 'in_progress', [
    '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e11',
  ]),
  task('0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e13', 2, 'studio', 'planned', [
    '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e12',
  ]),
  task('0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e14', 3, 'studio', 'planned', [
    '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e13',
  ]),
  task('0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e15', 4, 'studio', 'planned', [
    '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e14',
  ]),
]
const [PALCO, DESENHO, INTEGRA, TESTE, POLIR] = PLAN_TASKS.map((t) => t.id)

describe('a missão de agora (M7)', () => {
  test('próxima é do Pinta: o tutor fala da PRIMEIRA do Estúdio não concluída, nunca da última', () => {
    expect(studioTutorTask(PLAN_TASKS)?.id).toBe(INTEGRA)
    expect(studioTutorTask(PLAN_TASKS)?.id).not.toBe(POLIR)
  })

  test('a missão aberta vence, se for deste plano e do Estúdio', () => {
    expect(studioTutorTask(PLAN_TASKS, TESTE)?.id).toBe(TESTE)
    // A do Pinta e a de outro plano não valem: cai na primeira não concluída.
    expect(studioTutorTask(PLAN_TASKS, DESENHO)?.id).toBe(INTEGRA)
    expect(studioTutorTask(PLAN_TASKS, '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e99')?.id).toBe(INTEGRA)
  })

  test('com o Estúdio todo concluído não há missão de agora', () => {
    expect(
      studioTutorTask(
        PLAN_TASKS.map((t) => ({ ...t, progress: { ...t.progress, status: 'completed' } })),
      ),
    ).toBeNull()
  })

  test('a ajuda do Pensa pega a elegível em andamento (régua do core)', () => {
    expect(currentPensaTask(PLAN_TASKS)?.id).toBe(DESENHO)
    expect(PALCO).toBeDefined()
  })
})

async function askedPrompt(body: Record<string, unknown>) {
  let userPrompt = ''
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    const sent = JSON.parse(String(init?.body ?? '{}')) as { messages?: { content: string }[] }
    userPrompt = sent.messages?.[1]?.content ?? ''
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              text: 'Vamos conferir juntos.',
              scope: 'concept',
              blockReferences: [],
              lessonReferences: [],
              suggestions: [],
            }),
          },
        },
      ],
    })
  }) as typeof fetch
  try {
    const routes = createStudioZappyRoutes({
      session: { getSession: async () => STAFF },
      members: {
        checkStudioAccess: async () => ({
          status: 200,
          body: { access: { 'estudio-completo': true } },
        }),
        getGamification: async () => ({ status: 200, body: { level: { slug: 'god' } } }),
        getStudioUnlocks: async () => ({ status: 200, body: { blocks: ['sz_g2d_setup_stage'] } }),
        zappyReserveQuestion: async () => ({
          status: 200,
          body: { created: true, questionId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e002' },
        }),
        studioAiUsage: async (_actor: unknown, action: { operation: string }) => ({
          status: 200,
          body:
            action.operation === 'reserve'
              ? {
                  reservation: {
                    allowed: true,
                    source: 'platform',
                    priceCaps: { prompt: 1, completion: 4, request: 0 },
                    expiresAt: new Date(Date.now() + 300_000).toISOString(),
                  },
                }
              : action.operation === 'dispatch'
                ? { dispatch: { source: 'platform', apiKey: null } }
                : { ok: true },
        }),
        getAiCredits: async () => ({ status: 503, body: null }),
        zappyKnowledgeSearch: async () => ({ status: 200, body: { hits: [] } }),
        zappyCompleteQuestion: async (_id: string, value: { response: unknown }) => ({
          status: 200,
          body: value.response,
        }),
        pensaJourneyGet: async () => ({
          status: 200,
          body: { journey: { cycleId: 'cycle', tests: [] } },
        }),
        pensaGetStage: async () => ({
          status: 200,
          body: { tasks: PLAN_TASKS, nextTaskId: DESENHO },
        }),
      },
    } as never)
    await routes.studioZappyMessage.POST(
      new Request('https://kids.test/api/studio/zappy/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: STUDIO_PROJECT,
          clientMessageId: '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e001',
          question: 'como faço o gato andar?',
          context: {
            projectId: STUDIO_PROJECT,
            mode: 'blocks',
            kind: 'classic',
            blocks: [],
            installedExtensions: ['game-2d'],
            selectedBlockId: null,
            lastError: null,
          },
          ...body,
        }),
      }),
    )
  } finally {
    globalThis.fetch = originalFetch
  }
  return userPrompt
}

describe('o tutor do Estúdio recebe a missão certa pela borda da rota', () => {
  test('sem pensaTaskId e com a próxima do Pinta: a integração, não o teste final', async () => {
    const prompt = await askedPrompt({})
    expect(prompt).toContain(`Missão ${INTEGRA}`)
    expect(prompt).not.toContain(`Missão ${POLIR}`)
  })

  test('o pensaTaskId de topo atravessa o schema e escolhe a missão aberta', async () => {
    const prompt = await askedPrompt({ pensaTaskId: TESTE })
    expect(prompt).toContain(`Missão ${TESTE}`)
    expect(prompt).not.toContain(`Missão ${POLIR}`)
    expect(prompt).not.toContain(`Missão ${INTEGRA}`)
  })
})

describe('o adapter manda a missão aberta', () => {
  test('pensaTaskId fixo ou por função vai no corpo; sem ele, o corpo não muda', async () => {
    const bodies: Record<string, unknown>[] = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)))
      return Response.json({ response: { id: 'r' }, credits: null })
    }) as typeof fetch
    try {
      const input = { projectId: 'p', clientMessageId: 'c', question: 'q' } as never
      let current: string | null = TESTE ?? null
      await createStudioZappyAdapter('/api', { pensaTaskId: INTEGRA }).ask(input)
      await createStudioZappyAdapter('/api', { pensaTaskId: () => current }).ask(input)
      current = null
      await createStudioZappyAdapter('/api', { pensaTaskId: () => current }).ask(input)
      await createStudioZappyAdapter('/api').ask(input)
    } finally {
      globalThis.fetch = originalFetch
    }
    expect(bodies.map((b) => b.pensaTaskId)).toEqual([INTEGRA, TESTE, undefined, undefined])
  })
})
