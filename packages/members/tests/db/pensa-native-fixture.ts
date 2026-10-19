import { randomUUID } from 'node:crypto'
import * as P from '@sistemazero/core/pensa'
import { Elysia } from 'elysia'
import { AccessCheckService } from '../../src/application/access-check/access-check.service'
import { AdultJourneyService } from '../../src/application/adult-journey/adult-journey.service'
import { GetAiCreditsService } from '../../src/application/ai-usage/get-ai-credits.service'
import { GetAvatarsByProfilesService } from '../../src/application/avatar/get-avatars-by-profiles.service'
import { GetCreationDownloadService } from '../../src/application/creations/creations.service'
import { AwardGamificationService } from '../../src/application/gamification/award-gamification.service'
import { GetGamificationService } from '../../src/application/gamification/get-gamification.service'
import { KidsJourneyProfilesService } from '../../src/application/kids-journey/kids-journey-profiles.service'
import { KidsJourneyQueryService } from '../../src/application/kids-journey/kids-journey-query.service'
import { PensaProjectService } from '../../src/application/pensa/project.service'
import { PensaTeamService } from '../../src/application/pensa/team.service'
import { GetStudioUnlocksService } from '../../src/application/studio-unlocks/get-studio-unlocks.service'
import { creationStorageKey } from '../../src/domain/creations/creation'
import { DrizzleAdultJourneyRepository } from '../../src/infrastructure/persistence/drizzle/adult-journey.repository'
import { DrizzleAiUsageRepository } from '../../src/infrastructure/persistence/drizzle/ai-usage.repository'
import { DrizzleAvatarRepository } from '../../src/infrastructure/persistence/drizzle/avatar.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import { DrizzleCreationsRepository } from '../../src/infrastructure/persistence/drizzle/creations.repository'
import { DrizzleEntitlementRepository } from '../../src/infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { DrizzleKidsJourneyRepository } from '../../src/infrastructure/persistence/drizzle/kids-journey.repository'
import { DrizzlePensaCheckpointsRepository } from '../../src/infrastructure/persistence/drizzle/pensa-checkpoints.repository'
import { DrizzlePensaNarrationsRepository } from '../../src/infrastructure/persistence/drizzle/pensa-narrations.repository'
import { DrizzlePensaOperationsRepository } from '../../src/infrastructure/persistence/drizzle/pensa-operations.repository'
import { DrizzlePensaProjectCommands } from '../../src/infrastructure/persistence/drizzle/pensa-project.commands'
import {
  DrizzlePensaProjectRepository,
  pensaGameId,
} from '../../src/infrastructure/persistence/drizzle/pensa-project.repository'
import { DrizzlePensaRewardsRepository } from '../../src/infrastructure/persistence/drizzle/pensa-rewards.repository'
import { DrizzlePensaTeamRepository } from '../../src/infrastructure/persistence/drizzle/pensa-team.repository'
import { creations } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudioUnlockRepository } from '../../src/infrastructure/persistence/drizzle/studio-unlock.repository'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { pensaRoutes } from '../../src/interfaces/http/routes/pensa.routes'
import { silentLogger } from '../fakes/in-memory'
import { openPensaTestDatabase } from './pensa-native-database'

export async function nativePensa(
  name: string,
  blocks = false,
  privileged = false,
  audience: 'kids' | 'adult' = 'kids',
) {
  const conn = await openPensaTestDatabase(name)
  let now = new Date('2026-10-16T12:00:00.000Z')
  const learnerId = randomUUID()
  const actor: P.PensaActor = {
    profileId: learnerId,
    accountId: audience === 'adult' ? learnerId : randomUUID(),
    privileged,
    ...(audience === 'adult' ? { audience: 'adult' as const } : {}),
  }
  const repo = new DrizzlePensaProjectRepository(conn.db, () => now)
  const limits = { dailyLimit: 20, monthlyLimit: 200 }
  const commands = new DrizzlePensaProjectCommands(repo, limits)
  const projects = new PensaProjectService(commands)
  const operations = new DrizzlePensaOperationsRepository(commands, limits)
  const checkpoints = new DrizzlePensaCheckpointsRepository(repo)
  const gamiRepo = new DrizzleGamificationRepository(conn.db)
  const adultJourney = new AdultJourneyService(
    new DrizzleAdultJourneyRepository(conn.db),
    new DrizzleCourseRepository(conn.db),
    () => now,
  )
  const kidsJourneyRepository = new DrizzleKidsJourneyRepository(conn.db)
  const kidsJourneyQuery = new KidsJourneyQueryService(kidsJourneyRepository)
  const kidsJourneyProfiles = new KidsJourneyProfilesService(
    kidsJourneyRepository,
    kidsJourneyQuery,
  )
  const getGamification = new GetGamificationService(
    gamiRepo,
    () => now,
    kidsJourneyQuery,
    kidsJourneyProfiles,
    adultJourney,
  )
  const accessCheck = new AccessCheckService(new DrizzleEntitlementRepository(conn.db), () => now)
  const creationRepo = new DrizzleCreationsRepository(conn.db)
  const team = new PensaTeamService(
    new DrizzlePensaTeamRepository({
      projects: commands,
      authGateway: null,
      avatars: new GetAvatarsByProfilesService(
        new DrizzleAvatarRepository(conn.db),
        gamiRepo,
        kidsJourneyProfiles,
      ),
      accessCheck,
      gamification: getGamification,
      studioUnlocks: new GetStudioUnlocksService(
        gamiRepo,
        new DrizzleStudioUnlockRepository(conn.db),
        silentLogger,
      ),
      creations: creationRepo,
      adultCreations: new DrizzleCreationsRepository(conn.db, 'adult'),
      adultCreationDownload: new GetCreationDownloadService(
        new DrizzleCreationsRepository(conn.db, 'adult'),
      ),
      creationDownload: new GetCreationDownloadService(creationRepo),
    }),
  )
  const rewards = new DrizzlePensaRewardsRepository(
    conn.db,
    new AwardGamificationService(gamiRepo, () => now, silentLogger),
  )
  const deps = {
    adultJourney,
    store: repo,
    projects,
    team,
    operations,
    checkpoints,
    rewards,
    narrations: new DrizzlePensaNarrationsRepository(repo),
    accessCheck,
    getGamification,
    credits: new GetAiCreditsService({
      aiUsage: new DrizzleAiUsageRepository(conn.db),
      ...limits,
      clock: () => now,
    }),
    internalToken: 'native-pensa-secret',
  }
  const app = new Elysia()
    .onError(({ code, error, set }) => {
      const result = buildErrorResponse({ code, error, logger: silentLogger })
      set.status = result.status
      return result.body
    })
    .use(pensaRoutes(deps))
    .use(pensaRoutes(deps, 'adult'))
  const capabilities: P.PensaCapabilities = {
    fingerprint: 'native-resources',
    catalogVersion: 'native-catalog',
    programmerProfileId: actor.profileId,
    participants: [
      {
        profileId: actor.profileId,
        rank: 'god',
        studio: true,
        studioAuthoring: blocks ? 'blocks' : 'code',
        pinta: true,
        molda: true,
        dimensions: ['2d', '3d'],
        blockIds: [],
        extensionIds: blocks ? ['game-2d-advanced'] : [],
        moldaTools: [],
        tutor: true,
      },
    ],
    observedGame: null,
  }
  const requirementId = randomUUID(),
    stageId = randomUUID(),
    featureId = randomUUID(),
    finalId = randomUUID(),
    setupId = randomUUID()
  const definition: P.PensaGameDefinition = {
    title: 'Jogo dos pares',
    summary: 'Encontre todos os pares.',
    originalIntent: 'Quero encontrar quatro pares e jogar outra vez.',
    playerExperience: 'Virar cartas e encontrar pares.',
    dimension: '2d',
    requirements: [
      {
        id: requirementId,
        text: 'Encontrar quatro pares e reiniciar a partida.',
        origin: 'child',
        category: 'gameplay',
      },
    ],
    assetSlots: [],
    openChoices: [],
    futureIdeas: [],
    adaptations: [],
  }
  const common = {
    contentRevision: 1,
    stageId,
    rules: [],
    checks: [
      {
        id: 'test',
        action: 'Jogue uma partida.',
        expected: 'A partida funciona como você combinou.',
      },
    ],
  }
  const missions: P.PensaMission[] = [
    ...(blocks
      ? [
          {
            ...common,
            id: setupId,
            position: 0,
            kind: 'setup' as const,
            destination: 'studio' as const,
            title: 'Prepare o jogo',
            objective: 'Instale a extensão recomendada.',
            requirementIds: [],
            dependencyIds: [],
            setup: {
              type: 'extensions' as const,
              authoring: 'blocks' as const,
              runtimeExtensionId: 'game-2d-advanced',
              requiredAuxiliaryExtensionIds: [],
              recommendation: 'Use Jogo 2D Avançado para criar suas cartas.',
            },
          },
        ]
      : []),
    {
      ...common,
      id: featureId,
      position: blocks ? 1 : 0,
      kind: 'feature',
      destination: 'studio',
      title: 'Crie a partida',
      objective: 'Mostre as cartas, encontre os pares e reinicie.',
      requirementIds: [requirementId],
      dependencyIds: blocks ? [setupId] : [],
    },
    {
      ...common,
      id: finalId,
      position: blocks ? 2 : 1,
      kind: 'playtest',
      destination: 'studio',
      scope: 'project',
      title: 'Teste seu jogo',
      objective: 'Confira uma partida inteira e tente de novo.',
      requirementIds: [requirementId],
      dependencyIds: [featureId],
    },
  ]
  const plan: P.PensaPlan = {
    stages: [{ id: stageId, title: 'Construir e conferir', position: 0 }],
    missions,
  }
  const technical: P.PensaTechnicalPlan = {
    authoring: blocks ? 'blocks' : 'code',
    runtimeExtensionId: blocks ? 'game-2d-advanced' : null,
    extensions: blocks ? [{ id: 'game-2d-advanced', name: 'Jogo 2D Avançado' }] : [],
    capabilitiesFingerprint: capabilities.fingerprint,
    catalogVersion: capabilities.catalogVersion,
    missionResources: missions.map((m) => ({
      missionId: m.id,
      blockIds: [],
      extensionIds: blocks ? ['game-2d-advanced'] : [],
      moldaToolIds: [],
      manualIds: [],
    })),
    references: [],
  }
  const start = await projects.create(actor, {
    requestId: randomUUID(),
    message: definition.originalIntent,
  })
  const projectId = start.project.id
  if (!start.operation) throw new Error('Planning operation was not created')
  const operationId = start.operation.id
  async function publish(result: P.PensaOperationStepResult) {
    const leaseId = randomUUID()
    const current = (await repo.get(actor, projectId)).operation
    if (!current) throw new Error('No current operation')
    const work = await operations.claim(actor, projectId, current.id, leaseId, capabilities)
    if (!work) throw new Error('Operation not claimable')
    await operations.publish(actor, projectId, current.id, leaseId, result, capabilities)
    return work
  }
  async function generate() {
    const check = P.validatePensaPlan({ definition, plan, technical, capabilities })
    if (!check.ok) throw new Error(JSON.stringify(check.issues))
    await publish({ type: 'step', step: 'outline', output: { definition } })
    const manifest: P.PensaWorkManifest = {
      id: randomUUID(),
      units: (['outline', 'produce', 'audit'] as const).map((kind) => ({
        id: kind,
        kind,
        missionIds: missions.map((m) => m.id),
        requirementIds: [requirementId],
        maxInputBytes: 20_000,
        maxOutputTokens: 4_000,
      })),
      maxCalls: 6,
    }
    await publish({ type: 'step', step: 'missions', output: { manifest, unitKey: 'produce' } })
    await publish({ type: 'step', step: 'review', output: { unitKey: 'audit' } })
    await publish({ type: 'draft', definition, plan, technical })
    return repo.get(actor, projectId)
  }
  async function accept() {
    const state = await generate()
    const draft = state.draft
    if (!draft) throw new Error('No draft')
    return projects.acceptDraft(
      actor,
      projectId,
      {
        requestId: randomUUID(),
        draftId: draft.id,
        draftRevision: draft.revision,
        baseRevisionId: draft.baseRevisionId,
        affectedProgressVersions: draft.affectedProgressVersions,
      },
      capabilities,
    )
  }
  async function savedGame(revision = 1) {
    await conn.db
      .insert(creations)
      .values({
        id: randomUUID(),
        userId: actor.profileId,
        accountId: actor.accountId,
        tool: 'studio',
        audience,
        itemId: pensaGameId(projectId),
        name: 'Jogo dos pares',
        kind: blocks ? 'game' : 'pro',
        itemUpdatedAt: now,
        revision,
        lastReservedRevision: revision,
        formatVersion: 1,
        bytes: 10,
        storageRef: creationStorageKey(
          actor.profileId,
          'studio',
          pensaGameId(projectId),
          revision,
          audience,
        ),
        syncedAt: now,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [creations.userId, creations.audience, creations.tool, creations.itemId],
        set: {
          revision,
          lastReservedRevision: revision,
          storageRef: creationStorageKey(
            actor.profileId,
            'studio',
            pensaGameId(projectId),
            revision,
            audience,
          ),
          itemUpdatedAt: now,
        },
      })
    return {
      tool: 'studio' as const,
      profileId: actor.profileId,
      creationId: pensaGameId(projectId),
      saveRevision: String(revision),
      contentFingerprint: null,
    }
  }
  async function complete(
    missionId: string,
    ref: P.PensaCreationRef,
    configurationVerified = false,
  ) {
    const state = await repo.get(actor, projectId)
    const mission = state.revision?.plan.missions.find((m) => m.id === missionId),
      progress = state.progress.find((p) => p.missionId === missionId)
    if (!mission || !progress || !state.revision) throw new Error('No mission')
    return projects.mission(
      actor,
      missionId,
      'complete',
      {
        requestId: randomUUID(),
        baseRevisionId: state.revision.id,
        contentRevision: mission.contentRevision,
        expectedProgressRevision: progress.progressRevision,
        confirmed: true,
        note: 'Joguei e conferi.',
        deliveries: [{ assetSlotId: null, creation: ref }],
      },
      capabilities,
      configurationVerified,
    )
  }
  return {
    conn,
    actor,
    repo,
    projects,
    operations,
    checkpoints,
    team,
    rewards,
    deps,
    app,
    capabilities,
    definition,
    plan,
    technical,
    projectId,
    operationId,
    featureId,
    finalId,
    setupId,
    publish,
    generate,
    accept,
    savedGame,
    complete,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms)
    },
  }
}
