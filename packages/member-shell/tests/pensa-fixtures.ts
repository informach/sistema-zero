import type {
  JourneyLevelSlug,
  KidsCreatorCapability,
  KidsJourneyView,
} from '@sistemazero/core/journey'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import {
  type PensaActor,
  PensaCapabilitiesSchema,
  type PensaGameDefinition,
  type PensaOperationWork,
  PensaProjectViewSchema,
} from '@sistemazero/core/pensa'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { SERVER_MECHANIC_DOCUMENTS } from '@sistemazero/studio/server-knowledge'
import type { SessionUser } from '../src/lib/types'
import type { PrivateNarrationMembers } from '../src/routes/private-narration'
import type { PensaContext, PensaContextMembers } from '../src/server/pensa/context'

export function pensaId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
}
export const PENSA_DATE = '2026-10-16T12:00:00.000Z'
export const PENSA_ACTOR: PensaActor = {
  profileId: pensaId(2),
  accountId: pensaId(3),
  privileged: false,
}
export const PENSA_USER: SessionUser = {
  id: PENSA_ACTOR.profileId,
  email: '',
  firstName: 'Criança',
  lastName: '',
  role: 'student',
  status: 'active',
  activeProfile: { accountId: PENSA_ACTOR.accountId },
  kids: { kind: 'student', sessionId: pensaId(90), deviceId: pensaId(91), grantId: pensaId(92) },
}
export function pensaDefinition(): PensaGameDefinition {
  return {
    title: 'Memória dos bichos',
    summary: 'Encontre seis pares de cartas e jogue novamente.',
    originalIntent:
      'Quero um jogo da memória com doze cartas, seis pares, vitória e jogar novamente.',
    playerExperience: 'Escolher duas cartas, encontrar os pares e completar a partida.',
    dimension: '2d',
    requirements: [
      {
        id: pensaId(10),
        text: 'Doze cartas com seis pares embaralhados.',
        origin: 'child',
        category: 'gameplay',
      },
      {
        id: pensaId(11),
        text: 'Escolher somente duas cartas diferentes de cada vez.',
        origin: 'child',
        category: 'gameplay',
      },
      {
        id: pensaId(12),
        text: 'Pares ficam abertos; cartas diferentes fecham depois de uma pausa.',
        origin: 'child',
        category: 'gameplay',
      },
      {
        id: pensaId(13),
        text: 'Ganhar depois dos seis pares e poder reiniciar a partida.',
        origin: 'child',
        category: 'gameplay',
      },
    ],
    assetSlots: [],
    openChoices: [],
    futureIdeas: [],
    adaptations: [],
  }
}

export function pensaContext(): PensaContext {
  const capabilities = PensaCapabilitiesSchema.parse({
    fingerprint: 'f'.repeat(64),
    catalogVersion: 'c'.repeat(64),
    programmerProfileId: PENSA_ACTOR.profileId,
    participants: [
      {
        profileId: PENSA_ACTOR.profileId,
        rank: 'god',
        studio: true,
        studioAuthoring: 'blocks',
        pinta: true,
        molda: false,
        dimensions: ['2d'],
        blockIds: SERVER_BLOCK_CATALOG.filter(
          (item) => !item.extension || item.extension === 'game-2d-advanced',
        ).map((item) => item.type),
        extensionIds: ['game-2d-advanced'],
        moldaTools: [],
        tutor: true,
      },
    ],
    observedGame: null,
  })
  const definition = pensaDefinition()
  const view = PensaProjectViewSchema.parse({
    project: {
      id: pensaId(1),
      name: definition.title,
      status: 'active',
      paused: false,
      ownerProfileId: PENSA_ACTOR.profileId,
      metadataRevision: 0,
      teamRevision: 0,
      executionRevision: 0,
      createdAt: PENSA_DATE,
      updatedAt: PENSA_DATE,
    },
    revision: null,
    progress: [],
    availability: [],
    nextAction: { type: 'define' },
    draft: {
      id: pensaId(4),
      projectId: pensaId(1),
      revision: 0,
      baseRevisionId: null,
      status: 'collecting',
      definition,
      plan: null,
      technical: null,
      pendingChoices: [],
      impact: null,
      affectedProgressVersions: {},
      capabilitiesFingerprint: null,
      acceptedRevisionId: null,
      updatedAt: PENSA_DATE,
    },
    operation: {
      id: pensaId(5),
      projectId: pensaId(1),
      draftId: pensaId(4),
      kind: 'planning',
      step: 'understanding',
      status: 'queued',
      calls: 0,
      error: null,
      createdAt: PENSA_DATE,
      updatedAt: PENSA_DATE,
    },
    team: {
      viewerProfileId: PENSA_ACTOR.profileId,
      ownerProfileId: PENSA_ACTOR.profileId,
      programmerProfileId: PENSA_ACTOR.profileId,
      artistProfileIds: [PENSA_ACTOR.profileId],
      memberCount: 0,
      people: [
        {
          profileId: PENSA_ACTOR.profileId,
          firstName: 'Criança',
          photoUrl: null,
          owner: true,
          joinedAt: null,
        },
      ],
      shareCode: null,
      codeLocked: false,
    },
    studioAuthoring: 'blocks',
    gameCreation: null,
    restoredSaveRevision: null,
    messages: [
      {
        id: pensaId(6),
        projectId: pensaId(1),
        role: 'user',
        kind: 'planning',
        text: definition.originalIntent,
        revision: 1,
        profileId: PENSA_ACTOR.profileId,
        missionId: null,
        createdAt: PENSA_DATE,
      },
    ],
  })
  return {
    capabilities,
    view,
    blocks: SERVER_BLOCK_CATALOG.filter((item) =>
      capabilities.participants[0]?.blockIds.includes(item.type),
    ),
    documents: SERVER_MECHANIC_DOCUMENTS.filter((item) => item.extension === 'game-2d-advanced'),
    references: [{ kind: 'manual', id: 'game-2d-advanced', title: 'Jogo 2D Avançado', href: null }],
    sources: [],
    inventory: [],
    gameTicket: null,
  }
}

export function pensaWork(context = pensaContext()): PensaOperationWork {
  const operation = context.view.operation
  if (!operation) throw new Error('Fixture needs an operation')
  return {
    ...operation,
    actor: PENSA_ACTOR,
    baseRevisionId: null,
    baseTeamRevision: 0,
    input: { message: pensaDefinition().originalIntent },
    output: {},
    budget: { dialogueCalls: 0, roundCalls: 0, planningCalls: 0, helpCalls: 0, unitAttempts: {} },
    leaseId: pensaId(8),
    leaseUntil: '2026-10-16T12:03:00.000Z',
  }
}

export function pensaKidsJourney(
  level: JourneyLevelSlug = 'god',
  capabilities: KidsCreatorCapability[] = [
    'studio',
    'pinta',
    'bridge',
    'pro',
    'ai',
    'pensa',
    'molda',
    'molda-intermediate',
    'molda-professional',
  ],
): KidsJourneyView {
  return {
    audience: 'kids',
    policyVersion: 2,
    mode: 'active',
    tierAccess: initialKidsJourneyPolicy().tierAccess,
    earned: { level, capabilities, courseAccess: { entry: [], expanded: [], reward: [] } },
    nextLevel: null,
    missing: [],
    advances: [],
    readiness: { status: 'incomplete', horizon: 'noob', issues: [] },
  }
}

export function pensaContextMembers(context = pensaContext()): PensaContextMembers {
  return {
    pensaTeamCapabilities: async () => ({
      status: 200,
      body: {
        code: {
          profileId: PENSA_ACTOR.profileId,
          level: 'god',
          kidsJourney: pensaKidsJourney(),
          blocks: context.capabilities.participants[0]?.blockIds ?? [],
          access: { studio: true, pinta: true, molda: false },
          creations: { pinta: [], molda: [] },
        },
        art: [],
        gameTicket: null,
        base: context.view,
      },
    }),
    pensaProjectView: async () => ({ status: 200, body: context.view }),
    zappyKnowledgeSearch: async () => ({ status: 200, body: { hits: [] } }),
    getMyCourseReadonly: async () => {
      throw new Error('No course lookup expected')
    },
  }
}

export function pensaNarrationMembers(context = pensaContext()): PrivateNarrationMembers {
  return {
    ...pensaContextMembers(context),
    checkPensaAccessReadonly: async () => ({ status: 200, body: { access: { pensa: true } } }),
    checkCreativeToolsAccessReadonly: async () => ({
      status: 200,
      body: { access: { 'estudio-completo': true } },
    }),
    getGamification: () =>
      Promise.resolve({
        status: 200,
        body: { kidsJourney: pensaKidsJourney() },
      }) as unknown as ReturnType<PrivateNarrationMembers['getGamification']>,
    zappyHistory: async () => ({ status: 200, body: { messages: [], nextCursor: null } }),
    pensaMissionContext: async () => ({
      status: 200,
      body: { projectId: context.view.project.id },
    }),
    privateNarration: async () => ({
      status: 200,
      body: { status: 'generate', key: 'private/test.mp3' },
    }),
  }
}
