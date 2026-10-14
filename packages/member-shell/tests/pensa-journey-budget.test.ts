import { describe, expect, mock, test } from 'bun:test'
import {
  createPensaJourney,
  type PensaJourneyView,
  type PensaOperationStep,
  type PensaProposal,
} from '@sistemazero/core/pensa'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { SERVER_EXAMPLES_INDEX } from '@sistemazero/studio/server-examples'
import type { PensaTaskView, SessionUser } from '../src/lib/types'
import type { MembersClient } from '../src/server/clients'
import type { completePensaJson } from '../src/server/pensa-llm'

mock.module('server-only', () => ({}))
const { workJourney } = await import('../src/server/pensa-journey/planner')
const { loadJourneyContext } = await import('../src/server/pensa-journey/context')
const { JOURNEY_PROMPT_BUDGET_BYTES } = await import('../src/server/pensa-journey/prompt-context')
const { journeyRecipes } = await import('../src/server/pensa-journey/recipes')

const PROJECT = '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e01'
const CYCLE = '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e02'
const OP = '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e03'
const CHILD_ID = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010'
const bytes = (value: string) => new TextEncoder().encode(value).byteLength
const long = (seed: string, size: number) =>
  `${seed} `.repeat(Math.ceil(size / (seed.length + 1))).slice(0, size)

type Profile = 'child-2d' | 'staff'
const ALL_EXTENSIONS = ['game-2d', 'game-2d-advanced', 'game-3d', 'game-3d-advanced', 'world-3d']

/** O pior caso que a criança consegue montar: tudo no teto que o members aceita. */
function scenario(profile: Profile, step: PensaOperationStep) {
  const staff = profile === 'staff'
  const extensions = staff ? ALL_EXTENSIONS : ['game-2d']
  const allowed = SERVER_BLOCK_CATALOG.filter(
    (b) =>
      (b.extension === null || extensions.includes(b.extension)) &&
      (staff || !b.category.includes('3D')),
  )
  // O teto do schema: 16 blocos por missão, oito missões, todos diferentes.
  const missionBlocks = (index: number) =>
    allowed.slice(index * 16, index * 16 + 16).map((b) => b.type)
  const missions = Array.from({ length: 8 }, (_, index) => {
    const blockIds = missionBlocks(index)
    const blockExtensions = [
      ...new Set(blockIds.flatMap((id) => allowed.find((b) => b.type === id)?.extension ?? [])),
    ]
    return {
      key: `missao-${index + 1}`,
      destination: 'studio' as const,
      title: long('Fazer o dragão voar pela ilha', 110),
      result: long('O dragão sobe quando aperto a seta', 380),
      dependencies: index ? [`missao-${index}`] : [],
      blockIds,
      extensionIds: blockExtensions.length ? blockExtensions : ['game-2d'],
      mechanicIds: blockExtensions.length ? blockExtensions : ['game-2d'],
      toolIds: [],
      asset: null,
    }
  })
  const proposal: PensaProposal = {
    id: '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e04',
    title: long('O ninho nas nuvens', 100),
    summary: long('Um dragão que salva ovos', 600),
    firstResult: long('Voar pela ilha', 400),
    essentials: [long('dragão', 180), long('ovos', 180), long('ilha', 180)],
    suggestions: [long('setas', 180), long('nuvens', 180), long('vento', 180)],
    later: Array.from({ length: 12 }, (_, i) => ({
      id: `later-${i}`,
      text: long('castelo', 500),
      origin: 'child' as const,
    })),
    dimension: staff ? '3d' : '2d',
    missions,
    test: { action: long('Aperte a seta', 400), expected: long('O dragão sobe', 400) },
    references: [],
    capabilities: {
      profileId: CHILD_ID,
      rank: 'god',
      studio: true,
      pinta: true,
      molda: true,
      dimensions: staff ? ['2d', '3d'] : ['2d'],
      blockIds: allowed.map((b) => b.type),
      extensionIds: extensions,
      moldaTools: [],
      tutor: true,
      fingerprint: 'f'.repeat(64),
    },
  }
  // O rascunho do passo de revisão, no formato do schema estrito (sem ids nem recursos).
  const { id: _id, capabilities: _caps, references: _refs, ...draftBase } = proposal
  const draft = {
    ...draftBase,
    later: proposal.later.map(({ text, origin }) => ({ text, origin })),
    referenceIds: [],
  }
  const journey = {
    ...createPensaJourney(PROJECT, CYCLE, '2026-10-14T12:00:00Z'),
    intent: long('Um dragão que voa pela ilha, solta fogo e salva os ovos do ninho', 4000),
    stage: step === 'guides' ? ('preparing' as const) : ('idea' as const),
    proposal: step === 'propose' || step === 'review' ? proposal : proposal,
    acceptedProposalId: proposal.id,
    operationId: OP,
    messages: Array.from({ length: 16 }, (_, i) => ({
      id: `m-${i}`,
      role: (i % 2 ? 'assistant' : 'user') as 'assistant' | 'user',
      text: long('Quero que o dragão cuspa fogo nas nuvens', 4000),
      at: '',
      revision: 1,
      final: true,
    })),
    backlog: Array.from({ length: 80 }, (_, i) => ({
      id: `idea-${i}`,
      text: long('Depois quero um castelo com torres', 2000),
      origin: 'child' as const,
    })),
    tests: [
      {
        id: 't',
        result: 'needs_adjustment' as const,
        source: 'child' as const,
        note: long('O dragão não sobe', 2000),
        creationId: 'game',
        saveRevision: '1',
        at: '',
      },
    ],
    builtResults: Array.from({ length: 30 }, () => long('voar', 500)),
    missionIds: step === 'answer' ? ['t1'] : [],
    checkpoint:
      step === 'answer'
        ? {
            id: 'c',
            creationId: 'game',
            saveRevision: '1',
            planRevision: 1,
            cycleId: CYCLE,
            createdAt: '',
          }
        : null,
  }
  const view: PensaJourneyView = {
    project: { id: PROJECT, name: 'Ninho', status: 'active' },
    journey,
    cycles: [],
    operation: {
      id: OP,
      projectId: PROJECT,
      cycleId: CYCLE,
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
  const task = {
    id: 't1',
    title: long('Fazer o dragão voar', 200),
    summary: long('O dragão sobe', 2000),
    destination: 'studio',
    category: 'gameplay',
    estimatedMinutes: 10,
    position: 0,
    dependencies: [],
    guide: {
      contractVersion: 2,
      steps: Array.from({ length: 20 }, (_, i) => ({
        id: `s${i}`,
        text: long('Arraste o bloco', 500),
        hint: long('Na paleta', 500),
        required: false,
      })),
      criteria: [
        { id: 'result', text: long('Teste', 500), hint: long('Sobe', 500), required: true },
      ],
    },
    context: {
      kind: 'studio',
      dimension: '2d',
      visualAssetIds: [],
      blockIds: missionBlocks(0),
      blocks: [],
      mechanicDocumentIds: [],
      extensionIds: ['game-2d'],
    },
    progress: {
      status: 'in_progress',
      completedStepIds: [],
      completedCriteriaIds: [],
      outputRef: null,
      startedAt: null,
      completedAt: null,
      updatedAt: null,
    },
    revision: 1,
    supersedesTaskId: null,
  } as unknown as PensaTaskView
  const members = {
    pensaJourneyGet: async () => ({ status: 200, body: view }),
    pensaJourneyClaim: async () => ({
      status: 200,
      body: {
        work: {
          ...view.operation,
          input: { message: long('Socorro, o dragão não voa', 4000) },
          output: { draft },
        },
      },
    }),
    pensaJourneyFail: async () => ({ status: 200, body: { ok: true } }),
    pensaJourneyPublish: async () => ({ status: 200, body: { ok: true } }),
    pensaGetStage: async () => ({ status: 200, body: { tasks: [task], nextTaskId: 't1' } }),
    getGamificationReadonly: async () => ({ status: 200, body: { level: { slug: 'god' } } }),
    getStudioUnlocksReadonly: async () => ({
      status: 200,
      body: { blocks: allowed.map((b) => b.type) },
    }),
    checkCreativeToolsAccessReadonly: async () => ({
      status: 200,
      body: { access: { 'estudio-completo': true, pinta: true, molda: true } },
    }),
    zappyKnowledgeSearch: async () => ({
      status: 200,
      body: {
        hits: Array.from({ length: 5 }, (_, i) => ({
          kind: 'help-tutorial',
          slug: `tutorial-${i}`,
          title: 'Como fazer o personagem pular',
          content: long('Arraste o bloco de pular para dentro do evento de tecla', 20_000),
        })),
      },
    }),
    listCreationsReadonly: async (tool: string) => ({
      status: 200,
      body: {
        items: Array.from({ length: 24 }, (_, i) => ({
          tool,
          itemId: `${tool}-${i}-123456789`,
          name: long('Meu desenho preferido do dragão', 120),
          kind: tool === 'pinta' ? 'pixel-sprite' : 'model',
          itemUpdatedAt: '',
          revision: 1,
          bytes: 1,
          thumb: null,
          syncedAt: '',
          deletedAt: null,
        })),
      },
    }),
  } as unknown as MembersClient
  const user = { id: CHILD_ID, role: staff ? 'staff' : 'student' } as SessionUser
  return { members, user }
}

/** Textos que são, eles mesmos, um JSON (o contexto ia como texto dentro do JSON). */
function nestedJson(value: unknown): string[] {
  if (typeof value === 'string')
    return /^\s*[[{]/.test(value) && /[\]}]\s*$/.test(value) ? [value.slice(0, 40)] : []
  if (Array.isArray(value)) return value.flatMap(nestedJson)
  if (value && typeof value === 'object') return Object.values(value).flatMap(nestedJson)
  return []
}

async function capture(profile: Profile, step: PensaOperationStep) {
  const { members, user } = scenario(profile, step)
  const sent: { system: string; user: string; schemaName: string; maxTokens?: number }[] = []
  const complete = mock(async (input: (typeof sent)[number]) => {
    sent.push(input)
    // Falha do provedor (não reparável): só o pedido interessa aqui.
    throw new Error('provider down')
  })
  await workJourney({
    members,
    user,
    actor: { profileId: user.id, accountId: 'parent', privileged: profile === 'staff' },
    projectId: PROJECT,
    complete: complete as unknown as typeof completePensaJson,
    loadContext: loadJourneyContext,
  })
  return sent
}

describe('teto do pedido ao modelo (A4): 48 KB, sistema + usuário, em todo passo', () => {
  for (const profile of ['child-2d', 'staff'] as const)
    for (const step of ['propose', 'review', 'guides', 'answer'] as const)
      test(`${profile} · ${step}`, async () => {
        const sent = await capture(profile, step)
        expect(sent).toHaveLength(1)
        const request = sent[0]!
        expect(bytes(request.system) + bytes(request.user)).toBeLessThanOrEqual(
          JOURNEY_PROMPT_BUDGET_BYTES,
        )
        // Serializado UMA vez: o contexto é objeto dentro do JSON, e nenhum texto é JSON de novo.
        const payload = JSON.parse(request.user) as Record<string, unknown>
        expect(typeof payload.context).toBe('object')
        expect(nestedJson(payload)).toEqual([])
        // M5: o provedor não recebe o perfil da criança.
        expect(request.user).not.toContain(CHILD_ID)
        expect(request.user).not.toContain('profileId')
      })

  test('os blocos que a missão usa vão sempre, mesmo no degrau mais apertado', async () => {
    const sent = await capture('staff', 'guides')
    const payload = JSON.parse(sent[0]!.user) as {
      context: { blocks: { id: string }[] }
      proposal: { missions: { blockIds: string[] }[] }
    }
    const shown = new Set(payload.context.blocks.map((b) => b.id))
    for (const mission of payload.proposal.missions)
      for (const id of mission.blockIds) expect(shown.has(id)).toBe(true)
  })

  test('o guia de oito missões tem folga de tokens para responder', async () => {
    const sent = await capture('child-2d', 'guides')
    expect(sent[0]!.maxTokens).toBeGreaterThanOrEqual(10_000)
  })
})

describe('mecânicas internas são anônimas (M3)', () => {
  test('nenhuma mecânica leva chave ou nome do exemplo, em todo o índice', () => {
    for (const entry of SERVER_EXAMPLES_INDEX) {
      const caps = {
        profileId: CHILD_ID,
        rank: 'god',
        studio: true,
        pinta: true,
        molda: true,
        dimensions: ['2d', '3d'] as ('2d' | '3d')[],
        blockIds: [...entry.blockTypes],
        extensionIds: [...entry.requires],
        moldaTools: [],
        tutor: true,
        fingerprint: 'x',
      }
      const text = JSON.stringify(journeyRecipes(entry.description, caps))
      const base = entry.name.replace(/\s*\([^)]*\)\s*$/, '').trim()
      expect(text).not.toContain(entry.key)
      expect(text.toLowerCase()).not.toContain(base.toLowerCase())
      expect(text).not.toContain('"id"')
      expect(text).not.toContain('"name"')
    }
  })

  test('o sistema proíbe as palavras que denunciam os exemplos e fala em fase e aventura', async () => {
    const { JOURNEY_SYSTEM } = await import('../src/server/pensa-journey/planner')
    for (const word of ['exemplo', 'jogo pronto', 'galeria', 'receita'])
      expect(JOURNEY_SYSTEM).toContain(word)
    expect(JOURNEY_SYSTEM).toContain('fase e de aventura')
  })
})
