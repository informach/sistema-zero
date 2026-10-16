import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import {
  createPensaJourney,
  type PensaJourneyView,
  type PensaOperationStep,
  type PensaProposal,
} from '@sistemazero/core/pensa'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import type { PensaTaskView, SessionUser } from '../src/lib/types'
import type { MembersClient } from '../src/server/clients'
import type { JourneyContext } from '../src/server/pensa-journey/context'
import type { completePensaJson } from '../src/server/pensa-llm'

mock.module('server-only', () => ({}))
const { resolveGuides, workJourney } = await import('../src/server/pensa-journey/planner')
const { JourneyChildError } = await import('../src/server/pensa-journey/errors')
const { PensaLlmError } = await import('../src/server/pensa-llm')

const actor = { profileId: 'child', accountId: 'parent', privileged: false }
const user = { id: 'child', role: 'student' } as SessionUser
const STAGE = SERVER_BLOCK_CATALOG.find((b) => b.type === 'sz_g2d_setup_stage')!
const KEY = SERVER_BLOCK_CATALOG.find((b) => b.type === 'sz_g2d_on_key')!
const KIT = SERVER_BLOCK_CATALOG.find((b) => b.extension === 'game-2d-advanced')!

const restorers: Array<() => void> = []
afterEach(() => {
  for (const restore of restorers.splice(0)) restore()
})
function quietConsole() {
  const error = spyOn(console, 'error').mockImplementation(() => undefined)
  const info = spyOn(console, 'info').mockImplementation(() => undefined)
  restorers.push(() => {
    error.mockRestore()
    info.mockRestore()
  })
  return { error }
}

function studioMission(key: string, dependencies: string[] = [], blockIds = [STAGE.type]) {
  return {
    key,
    destination: 'studio' as const,
    title: `Missão ${key}`,
    result: 'O gato anda',
    dependencies,
    blockIds,
    extensionIds: [
      ...new Set(
        blockIds.map(
          (id) => SERVER_BLOCK_CATALOG.find((b) => b.type === id)?.extension ?? 'game-2d',
        ),
      ),
    ],
    mechanicIds: ['game-2d'],
    toolIds: [],
    asset: null,
  }
}
const draft = {
  title: 'Gato',
  summary: 'Seu gato anda na lua.',
  firstResult: 'Explorar um lugar',
  essentials: ['Gato na lua'],
  suggestions: [],
  later: [],
  dimension: '2d' as const,
  missions: [studioMission('walk')],
  test: { action: 'Aperte uma seta', expected: 'O gato anda' },
  referenceIds: [],
}

function fixture(step: PensaOperationStep = 'propose') {
  const view: PensaJourneyView = {
    project: { id: 'project', name: 'Gato', status: 'active' },
    journey: {
      ...createPensaJourney('project', 'cycle', '2026-10-14T12:00:00Z'),
      intent: 'Gato na lua',
      operationId: 'op',
    },
    cycles: [],
    operation: {
      id: 'op',
      projectId: 'project',
      cycleId: 'cycle',
      kind: step === 'answer' ? 'help' : 'planning',
      step,
      status: 'queued',
      inputRevision: 0,
      attempts: 0,
      error: null,
      createdAt: '',
      updatedAt: '',
    },
  }
  const failed = mock(async (..._args: unknown[]) => {
    view.operation!.status = 'failed'
    return { status: 200, body: { ok: true } }
  })
  const published = mock(
    async (
      _actor: unknown,
      _project: unknown,
      _op: unknown,
      _lease: unknown,
      result: { type: string },
    ) => {
      view.operation!.status = result.type === 'proposal' ? 'waiting' : 'succeeded'
      return { status: 200, body: { ok: true } }
    },
  )
  const work = {
    input: { message: 'Gato na lua' } as Record<string, unknown>,
    output: {} as Record<string, unknown>,
  }
  const claims: unknown[] = []
  let claimResponses: Array<{ status: number; body: { work: unknown } | null }> = []
  const claim = mock(async () => {
    claims.push(1)
    return claimResponses.shift() ?? { status: 200, body: { work: { ...view.operation, ...work } } }
  })
  let tasks: PensaTaskView[] = []
  const members = {
    pensaJourneyGet: async () => ({ status: 200, body: view }),
    pensaJourneyClaim: claim,
    pensaJourneyFail: failed,
    pensaJourneyPublish: published,
    pensaGetStage: async () => ({ status: 200, body: { tasks, nextTaskId: null } }),
  } as unknown as MembersClient
  const context = {
    capabilities: {
      profileId: 'child',
      rank: 'hacker',
      studio: true,
      pinta: true,
      molda: false,
      dimensions: ['2d'],
      blockIds: [STAGE.type, KEY.type, KIT.type],
      extensionIds: ['game-2d', 'game-2d-advanced'],
      moldaTools: [],
      tutor: false,
      fingerprint: 'a',
    },
    blocks: [STAGE, KEY, KIT],
    documents: [
      { extension: 'game-2d', title: 'Jogo 2D', content: 'Mover' },
      { extension: 'game-2d-advanced', title: 'Jogo 2D Avançado', content: 'Kits' },
    ],
    references: [],
    existingCreationIds: [],
    existingCreations: [],
    sources: [],
    knowledgeAvailable: true,
    learningProgress: [],
    moldaToolFamilies: [],
  } as unknown as JourneyContext
  return {
    view,
    failed,
    published,
    work,
    claim,
    claims,
    members,
    context,
    setClaims: (next: typeof claimResponses) => {
      claimResponses = next
    },
    setTasks: (next: PensaTaskView[]) => {
      tasks = next
    },
  }
}

const run = (f: ReturnType<typeof fixture>, complete: unknown) =>
  workJourney({
    members: f.members,
    user,
    actor,
    projectId: 'project',
    complete: complete as typeof completePensaJson,
    loadContext: async () => f.context,
  })

test('falha na consulta de recursos libera o job sem chamar o provedor', async () => {
  quietConsole()
  const f = fixture(),
    complete = mock(async () => {
      throw new Error('Não chamar')
    })
  await workJourney({
    members: f.members,
    user,
    actor,
    projectId: 'project',
    complete: complete as typeof completePensaJson,
    loadContext: async () => {
      throw new Error('gateway unavailable')
    },
  })
  expect(complete).not.toHaveBeenCalled()
  expect(f.failed).toHaveBeenCalledTimes(1)
})

test('dados pessoais em ideias guardadas e relatos não chegam ao modelo', async () => {
  quietConsole()
  const f = fixture('answer')
  f.view.journey.backlog = [
    { id: 'idea-123456789012', text: 'Depois escreva para crianca@example.com', origin: 'child' },
  ]
  f.view.journey.tests = [
    {
      id: 'test-123456789012',
      result: 'inconclusive',
      source: 'child',
      note: 'Meu telefone é (11) 99999-8888.',
      creationId: 'game-123456789012',
      saveRevision: '1',
      at: '',
    },
  ]
  let sent = ''
  const complete = mock(async (input: { user: string }) => {
    sent = input.user
    return { text: 'Confira se o gato aparece.' }
  })
  await run(f, complete)
  expect(complete).toHaveBeenCalledTimes(1)
  expect(sent).not.toContain('crianca@example.com')
  expect(sent).not.toContain('99999-8888')
  expect(JSON.parse(sent).backlog[0].id).toBe('idea-123456789012')
  expect(JSON.parse(sent).currentTest.creationId).toBe('game-123456789012')
})

test('catálogo vazio não vira proposta e fala a língua da aventura', async () => {
  quietConsole()
  const f = fixture(),
    complete = mock(async () => {
      throw new Error('Não chamar')
    })
  f.context.blocks = []
  await run(f, complete)
  expect(complete).not.toHaveBeenCalled()
  expect(f.failed).toHaveBeenCalledTimes(1)
  const message = String(f.failed.mock.calls[0]?.[4])
  expect(message).toContain('fases das aventuras')
  expect(message).not.toMatch(/\baulas?\b/)
})

test('a Pro mission can ask for help without a block catalog', async () => {
  quietConsole()
  const f = fixture('answer')
  f.context.capabilities.studioAuthoring = 'code'
  f.context.blocks = []
  f.context.capabilities.blockIds = []
  const complete = mock(async () => ({ text: 'Confira o script indicado em index.html.' }))
  await run(f, complete)
  expect(complete).toHaveBeenCalledTimes(1)
  expect(f.failed).not.toHaveBeenCalled()
})

test('retoma a revisão persistida sem refazer a extração da ideia', async () => {
  quietConsole()
  const f = fixture('review')
  f.work.output.draft = draft
  const complete = mock(async (input: { schemaName: string }) => {
    expect(input.schemaName).toBe('pensa_review')
    return draft
  })
  await run(f, complete)
  expect(complete).toHaveBeenCalledTimes(1)
  expect(f.published).toHaveBeenCalledTimes(1)
  expect(f.failed).not.toHaveBeenCalled()
})

test('o contexto recebe o plano: a view lida no passo e, na conferência final, a releitura', async () => {
  quietConsole()
  const f = fixture('review')
  f.work.output.draft = draft
  const loadContext = mock(async (..._args: unknown[]) => f.context)
  await workJourney({
    members: f.members,
    user,
    actor,
    projectId: 'project',
    complete: (async () => draft) as unknown as typeof completePensaJson,
    loadContext,
  })
  expect(f.published).toHaveBeenCalledTimes(1)
  // Em equipe é o `projectId` que troca os recursos pelos da equipe; a conferência final relê
  // a equipe (as funções podem ter mudado enquanto o modelo trabalhava).
  expect(loadContext.mock.calls.map((call) => call[3])).toEqual([
    { projectId: 'project', view: f.view },
    { projectId: 'project' },
  ])
})

test('em equipe, a falha de "sem Estúdio" fala de quem programa', async () => {
  quietConsole()
  const f = fixture()
  const context = {
    ...f.context,
    capabilities: { ...f.context.capabilities, studio: false },
    team: true,
  } as JourneyContext
  const complete = mock(async () => ({}))
  await workJourney({
    members: f.members,
    user,
    actor,
    projectId: 'project',
    complete: complete as unknown as typeof completePensaJson,
    loadContext: async () => context,
  })
  expect(complete).not.toHaveBeenCalled()
  expect(String(f.failed.mock.calls[0]?.[4])).toContain(
    'quem programa precisa abrir o Estúdio e conquistar blocos',
  )
})

test('uma falha do provedor não abre tentativas em cascata', async () => {
  quietConsole()
  const f = fixture(),
    complete = mock(async () => {
      throw new Error('timeout')
    })
  await run(f, complete)
  expect(complete).toHaveBeenCalledTimes(1)
  expect(f.failed).toHaveBeenCalledTimes(1)
  expect(f.published).not.toHaveBeenCalled()
  await run(f, complete)
  expect(complete).toHaveBeenCalledTimes(1)
})

describe('reparo da saída inválida (M2)', () => {
  const invalid = { ...draft, missions: [studioMission('walk', [], ['sz_bloco_que_nao_existe'])] }

  test('UMA tentativa com o motivo (missão e id), por um novo claim que o members conta', async () => {
    quietConsole()
    const f = fixture('review')
    f.work.output.draft = draft
    const users: string[] = []
    const complete = mock(async (input: { user: string }) => {
      users.push(input.user)
      return users.length === 1 ? invalid : draft
    })
    await run(f, complete)
    expect(complete).toHaveBeenCalledTimes(2)
    expect(f.claims).toHaveLength(2)
    expect(f.failed).toHaveBeenCalledTimes(1)
    expect(f.published).toHaveBeenCalledTimes(1)
    const repair = JSON.parse(users[1]!).previousAnswerRejected as string
    expect(repair).toContain('Missão "walk"')
    expect(repair).toContain('sz_bloco_que_nao_existe')
    expect(JSON.parse(users[0]!).previousAnswerRejected).toBeNull()
  })

  test('com o teto da operação atingido o members recusa o claim e nada mais é chamado', async () => {
    quietConsole()
    const f = fixture('review')
    f.work.output.draft = draft
    f.setClaims([
      { status: 200, body: { work: { ...f.view.operation, ...f.work } } },
      { status: 200, body: { work: null } },
    ])
    const complete = mock(async () => invalid)
    await run(f, complete)
    expect(complete).toHaveBeenCalledTimes(1)
    expect(f.published).not.toHaveBeenCalled()
  })

  test('inválida duas vezes: para, e a criança lê a frase da recusa', async () => {
    quietConsole()
    const f = fixture('review')
    f.work.output.draft = draft
    const complete = mock(async () => invalid)
    await run(f, complete)
    expect(complete).toHaveBeenCalledTimes(2)
    expect(f.published).not.toHaveBeenCalled()
    expect(String(f.failed.mock.calls.at(-1)?.[4])).toContain(
      'O caminho ainda usa recursos que não estão disponíveis',
    )
  })

  test('JSON fora do contrato também é reparável; rede e prazo não', async () => {
    quietConsole()
    const f = fixture('review')
    f.work.output.draft = draft
    let calls = 0
    const complete = mock(async () => {
      calls += 1
      if (calls === 1) throw new PensaLlmError('IA devolveu JSON fora do contrato')
      return draft
    })
    await run(f, complete)
    expect(complete).toHaveBeenCalledTimes(2)
    expect(f.published).toHaveBeenCalledTimes(1)
  })
})

describe('erros nunca mudos, e a frase da criança chega a ela (M1)', () => {
  test('o log diz operação, passo e NOME, sem a fala da criança nem o corpo do provedor', async () => {
    const { error } = quietConsole()
    const f = fixture()
    f.view.journey.intent = 'meu segredo: o dragão Faísca'
    const complete = mock(async () => {
      throw new PensaLlmError('OpenRouter 500: {"error":"corpo do provedor com o dragão Faísca"}')
    })
    await run(f, complete)
    const logged = JSON.stringify(error.mock.calls)
    expect(logged).toContain('[pensa-v2] passo falhou')
    expect(logged).toContain('"operationId":"op"')
    expect(logged).toContain('"step":"propose"')
    expect(logged).toContain('"name":"PensaLlmError"')
    expect(logged).not.toContain('Faísca')
    expect(logged).not.toContain('corpo do provedor')
  })

  test('falhar ao registrar a falha também vai ao log', async () => {
    const { error } = quietConsole()
    const f = fixture()
    f.failed.mockImplementation(async () => {
      throw new TypeError('fetch failed')
    })
    await run(f, async () => {
      throw new Error('x')
    })
    expect(JSON.stringify(error.mock.calls)).toContain('não consegui registrar a falha')
  })

  test('"Seus recursos mudaram" é da criança e chega a ela', async () => {
    quietConsole()
    const f = fixture('guides')
    const proposal = {
      ...draft,
      id: 'proposal',
      later: [],
      references: [],
      capabilities: f.context.capabilities,
      missions: [studioMission('walk', [], ['sz_bloco_que_saiu'])],
    } as PensaProposal
    f.view.journey.proposal = proposal
    f.view.journey.acceptedProposalId = 'proposal'
    const complete = mock(async () => ({}))
    await run(f, complete)
    expect(complete).not.toHaveBeenCalled()
    expect(String(f.failed.mock.calls[0]?.[4])).toContain('Seus recursos mudaram')
  })

  test('a frase de um erro de contexto (JourneyChildError) também chega', async () => {
    quietConsole()
    const f = fixture()
    await workJourney({
      members: f.members,
      user,
      actor,
      projectId: 'project',
      complete: (async () => ({})) as unknown as typeof completePensaJson,
      loadContext: async () => {
        throw new JourneyChildError('Não consegui conferir seus recursos. Tente de novo.')
      },
    })
    expect(String(f.failed.mock.calls[0]?.[4])).toBe(
      'Não consegui conferir seus recursos. Tente de novo.',
    )
  })
})

function task(
  id: string,
  position: number,
  destination: 'studio' | 'pinta',
  status: 'planned' | 'in_progress' | 'completed',
  dependencies: string[] = [],
): PensaTaskView {
  return {
    id,
    title: `Tarefa ${id}`,
    summary: `Resultado ${id}`,
    destination,
    category: destination === 'studio' ? 'gameplay' : 'art',
    estimatedMinutes: 10,
    position,
    dependencies,
    guide: {
      contractVersion: 2,
      steps: [{ id: 's1', text: `Passo da ${id}`, hint: 'Na paleta', required: false }],
      criteria: [{ id: 'result', text: 'Teste', hint: 'Funciona', required: true }],
    },
    context:
      destination === 'studio'
        ? {
            kind: 'studio',
            dimension: '2d',
            visualAssetIds: [],
            blockIds: [KEY.type],
            blocks: [],
            mechanicDocumentIds: [],
            extensionIds: ['game-2d'],
          }
        : {
            kind: 'pinta',
            assetId: 'gato',
            artKind: 'sprite',
            style: 'pixel',
            palette: [],
            appearance: 'gato',
            animations: [],
            states: [],
            usage: 'herói',
            requiresStudioUse: true,
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

test('ajuda em equipe segue quem pediu, mesmo quando outra pessoa executa a retomada', async () => {
  quietConsole()
  const f = fixture('answer')
  f.view.team = {
    viewerProfileId: 'child',
    ownerProfileId: 'child',
    memberCount: 1,
    shareEnabled: true,
    roles: { code: 'child', art: ['artist'] },
  }
  f.work.input.requesterProfileId = 'artist'
  f.view.journey.missionIds = ['programar', 'desenhar']
  f.setTasks([
    task('programar', 0, 'studio', 'in_progress'),
    task('desenhar', 1, 'pinta', 'planned'),
  ])
  const complete = mock(async () => ({ text: 'Vamos desenhar.' }))
  await run(f, complete)
  const prompt = JSON.parse((complete.mock.calls[0] as unknown as [{ user: string }])[0].user)
  expect(prompt.currentMission?.destination).toBe('pinta')
  expect(prompt.team?.requester).toEqual({ programs: false, createsArt: true })
  expect(JSON.stringify(prompt.team)).not.toContain('artist')
})

test('o guia em equipe conhece a ponte de arte compartilhada', async () => {
  quietConsole()
  const f = fixture('guides')
  f.view.team = {
    viewerProfileId: 'child',
    ownerProfileId: 'child',
    memberCount: 1,
    shareEnabled: true,
    roles: { code: 'child', art: ['artist'] },
  }
  f.view.journey.proposal = {
    ...draft,
    id: 'proposal',
    capabilities: f.context.capabilities,
    references: [],
  }
  f.view.journey.acceptedProposalId = 'proposal'
  const complete = mock(async () => ({
    missions: [
      {
        key: 'walk',
        steps: [{ action: 'Ande', where: 'No Estúdio', effect: 'O gato anda' }],
        testAction: 'Aperte a seta',
        expected: 'O gato anda',
      },
    ],
  }))
  await run(f, complete)
  const input = (complete.mock.calls[0] as unknown as [{ user: string; system: string }])[0]
  expect(JSON.parse(input.user).team?.sharedArt).toBe(true)
  expect(input.system).toContain('Trazer da equipe')
})

test('a ajuda conhece a missão de AGORA e os passos dela (M7)', async () => {
  quietConsole()
  const f = fixture('answer')
  f.view.journey.missionIds = ['palco', 'desenho', 'integra']
  f.setTasks([
    task('palco', 0, 'studio', 'completed'),
    task('desenho', 1, 'pinta', 'in_progress', ['palco']),
    task('integra', 2, 'studio', 'planned', ['desenho']),
  ])
  let sent = ''
  await run(
    f,
    mock(async (input: { user: string }) => {
      sent = input.user
      return { text: 'Desenhe o gato.' }
    }),
  )
  const payload = JSON.parse(sent)
  expect(payload.currentMission.title).toBe('Tarefa desenho')
  expect(payload.currentMission.steps[0].action).toBe('Passo da desenho')
})

describe('o guia ensina a instalar a extensão e liga a ponte do Pinta (A3)', () => {
  const f = fixture('guides')
  const proposal = {
    ...draft,
    id: 'proposal',
    later: [],
    references: [],
    capabilities: f.context.capabilities,
    missions: [
      {
        ...studioMission('palco'),
      },
      {
        key: 'desenho',
        destination: 'pinta' as const,
        title: 'Desenhar o gato',
        result: 'O gato desenhado',
        dependencies: ['palco'],
        blockIds: [],
        extensionIds: [],
        mechanicIds: [],
        toolIds: [],
        asset: {
          id: 'gato',
          kind: 'sprite' as const,
          source: 'new' as const,
          creationId: null,
          description: 'Um gato',
        },
      },
      studioMission('integra', ['desenho'], [KEY.type]),
      studioMission('kit', ['integra'], [KIT.type]),
    ],
  } as PensaProposal
  const guide = (key: string) => ({
    key,
    steps: [{ action: 'Faça', where: 'Na paleta', effect: 'Aparece' }],
    testAction: 'Teste',
    expected: 'Funciona',
  })
  const tasks = resolveGuides(
    { missions: proposal.missions.map((m) => guide(m.key)) },
    proposal,
    f.context,
  )

  test('a primeira missão do Estúdio que usa uma extensão começa por instalá-la, uma vez só', () => {
    const steps = tasks.map((t) => t.guide.steps.map((s) => s.id))
    expect(steps[0]).toEqual(['install-game-2d', 'step-1'])
    expect(steps[2]).toEqual(['step-1'])
    expect(steps[3]).toEqual(['install-game-2d-advanced', 'step-1'])
    const install = tasks[0]!.guide.steps[0]!
    expect(install.text).toBe('Instale a extensão Jogo 2D')
    expect(install.hint).toContain('⋯ (Mais opções)')
    expect(install.hint).toContain('"Extensões"')
    expect(install.hint).toContain('"Instalar"')
    expect(install.required).toBe(false)
  })

  test('a arte do Pinta é para o jogo: a ponte "Usar no Estúdio" fica ligada', () => {
    expect(tasks[1]!.context).toMatchObject({ kind: 'pinta', requiresStudioUse: true })
  })

  test('as missões e o contexto do Estúdio não mudam (o members confere contra a proposta)', () => {
    expect(tasks[0]!.context).toMatchObject({ kind: 'studio', extensionIds: ['game-2d'] })
    expect(tasks.map((t) => t.position)).toEqual([0, 1, 2, 3])
  })
})
