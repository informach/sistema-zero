import type { PensaMissionHandoff, PensaProjectView } from '@sistemazero/core/pensa'

export const PROJECT_ID = '10000000-0000-4000-8000-000000000001'
export const PROFILE_ID = '10000000-0000-4000-8000-000000000002'
export const REVISION_ID = '10000000-0000-4000-8000-000000000003'
export const MISSION_ID = '10000000-0000-4000-8000-000000000004'
const STAGE_ID = '10000000-0000-4000-8000-000000000005'
const REQUIREMENT_ID = '10000000-0000-4000-8000-000000000006'
const date = '2026-10-16T12:00:00.000Z'

export function projectFixture(): PensaProjectView {
  const view: PensaProjectView = {
    project: {
      id: PROJECT_ID,
      name: 'Memória dos animais',
      status: 'active',
      paused: false,
      ownerProfileId: PROFILE_ID,
      createdAt: date,
      updatedAt: date,
      metadataRevision: 0,
      teamRevision: 0,
      executionRevision: 0,
    },
    revision: {
      id: REVISION_ID,
      projectId: PROJECT_ID,
      number: 1,
      previousRevisionId: null,
      definition: {
        title: 'Memória dos animais',
        summary: 'Encontre os seis pares de animais.',
        originalIntent: 'Quero um jogo da memória com doze cartas.',
        playerExperience: 'Vire duas cartas e procure um par.',
        dimension: '2d',
        requirements: [
          {
            id: REQUIREMENT_ID,
            text: 'Doze cartas formam seis pares.',
            origin: 'child',
            category: 'gameplay',
          },
        ],
        assetSlots: [],
        openChoices: [],
        futureIdeas: [],
        adaptations: [],
      },
      plan: {
        stages: [
          { id: STAGE_ID, title: 'Preparar o jogo', position: 0 },
          { id: '10000000-0000-4000-8000-000000000009', title: 'Conferir o jogo', position: 1 },
        ],
        missions: [
          {
            id: MISSION_ID,
            contentRevision: 1,
            stageId: STAGE_ID,
            position: 0,
            title: 'Prepare o Estúdio para seu jogo',
            objective: 'Tenha as ferramentas para construir as cartas.',
            requirementIds: [],
            rules: [],
            dependencyIds: [],
            checks: [
              {
                id: 'installed',
                action: 'Confira as ferramentas deste projeto.',
                expected: 'Jogo 2D Avançado está instalada.',
              },
            ],
            kind: 'setup',
            destination: 'studio',
            setup: {
              type: 'extensions',
              authoring: 'blocks',
              runtimeExtensionId: 'game-2d-advanced',
              requiredAuxiliaryExtensionIds: [],
              recommendation: 'Recomendo Jogo 2D Avançado para as cartas deste jogo.',
            },
          },
          {
            id: '10000000-0000-4000-8000-000000000007',
            contentRevision: 1,
            stageId: STAGE_ID,
            position: 1,
            title: 'Prepare os seis pares de cartas',
            objective: 'Monte doze cartas com seis pares de animais.',
            requirementIds: [REQUIREMENT_ID],
            rules: [{ id: 'pairs', text: 'Cada animal aparece em duas cartas.' }],
            dependencyIds: [MISSION_ID],
            checks: [
              {
                id: 'cards',
                action: 'Confira as cartas do jogo.',
                expected: 'Há doze cartas e seis pares de animais.',
              },
            ],
            kind: 'feature',
            destination: 'studio',
          },
          {
            id: '10000000-0000-4000-8000-000000000008',
            contentRevision: 1,
            stageId: '10000000-0000-4000-8000-000000000009',
            position: 2,
            title: 'Experimente seu jogo',
            objective: 'Confira se o jogo tem todos os pares combinados.',
            requirementIds: [REQUIREMENT_ID],
            rules: [],
            dependencyIds: ['10000000-0000-4000-8000-000000000007'],
            checks: [
              {
                id: 'game',
                action: 'Abra o jogo e procure os pares.',
                expected: 'As doze cartas formam seis pares de animais.',
              },
            ],
            kind: 'playtest',
            destination: 'studio',
            scope: 'project',
          },
        ],
      },
      technical: {
        capabilitiesFingerprint: 'resources',
        catalogVersion: 'official',
        authoring: 'blocks',
        runtimeExtensionId: 'game-2d-advanced',
        extensions: [{ id: 'game-2d-advanced', name: 'Jogo 2D Avançado' }],
        missionResources: [
          MISSION_ID,
          '10000000-0000-4000-8000-000000000007',
          '10000000-0000-4000-8000-000000000008',
        ].map((missionId) => ({
          missionId,
          blockIds: [],
          extensionIds: ['game-2d-advanced'],
          moldaToolIds: [],
          manualIds: [],
        })),
        references: [],
      },
      acceptedByProfileId: PROFILE_ID,
      acceptedAt: date,
    },
    progress: [
      {
        missionId: MISSION_ID,
        progressRevision: 0,
        status: 'planned',
        validity: 'current',
        assigneeProfileId: null,
        completedByProfileId: null,
        deliveries: [],
        verification: null,
        resumeNote: null,
        startedAt: null,
        completedAt: null,
      },
    ],
    availability: [
      {
        missionId: MISSION_ID,
        available: true,
        mode: 'build',
        reason: null,
        message: null,
        eligibleProfileIds: [PROFILE_ID],
      },
    ],
    nextAction: { type: 'mission', missionId: MISSION_ID, destination: 'studio', mode: 'build' },
    draft: null,
    operation: null,
    studioAuthoring: 'blocks',
    messages: [],
    gameCreation: null,
    restoredSaveRevision: null,
    team: {
      viewerProfileId: PROFILE_ID,
      ownerProfileId: PROFILE_ID,
      programmerProfileId: PROFILE_ID,
      artistProfileIds: [PROFILE_ID],
      memberCount: 0,
      people: [
        { profileId: PROFILE_ID, firstName: 'Ana', photoUrl: null, owner: true, joinedAt: null },
      ],
      shareCode: null,
      codeLocked: false,
    },
  }
  if (!view.revision) throw new Error('Missing fixture revision')
  view.progress = view.revision.plan.missions.map((mission) => ({
    ...view.progress[0]!,
    missionId: mission.id,
  }))
  view.availability = view.revision.plan.missions.map((mission, index) => ({
    ...view.availability[0]!,
    missionId: mission.id,
    available: index === 0,
    reason: index === 0 ? null : 'dependency_pending',
    message: index === 0 ? null : 'Faça primeiro a missão anterior.',
  }))
  return view
}
export function handoffFixture(view = projectFixture()): PensaMissionHandoff {
  if (!view.revision?.plan.missions[0] || !view.progress[0] || !view.availability[0])
    throw new Error('Missing fixture mission')
  return {
    project: view.project,
    projectRevisionId: view.revision.id,
    mission: view.revision.plan.missions[0],
    progress: view.progress[0],
    availability: view.availability[0],
    nextAction: view.nextAction,
    studioProjectId: `pensa-${PROJECT_ID.replaceAll('-', '')}`,
    studioAuthoring: view.studioAuthoring,
    team: view.team,
    assetSlots: [],
    extensions: view.revision.technical.extensions,
    references: [],
    gameCreation: null,
    restoredSaveRevision: null,
  }
}
