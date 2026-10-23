import { describe, expect, test } from 'bun:test'
import {
  analyzePensaChange,
  createPensaMissionProgress,
  invalidatePensaProgress,
  nextPensaMissionFor,
  type PensaCapabilities,
  PensaDraftAcceptRequestSchema,
  type PensaMissionProgress,
  type PensaProjectRevision,
  PensaProjectRevisionSchema,
  type PensaTeamView,
  pensaDependentClosure,
  reconcilePensaMissionVersions,
  resolvePensaAvailability,
  validatePensaPlan,
} from '../src/pensa'

function at<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error('Fixture item missing')
  return item
}

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const person = uid(1)
const now = '2026-10-16T12:00:00.000Z'
function fixture() {
  const stageId = uid(2)
  const requirementId = uid(3)
  const base = {
    contentRevision: 1,
    stageId,
    title: 'Missão',
    objective: 'Deixe o jogo funcionar como você imaginou.',
    requirementIds: [requirementId],
    rules: [],
    checks: [
      { id: 'check', action: 'Jogue uma partida.', expected: 'As regras combinadas funcionam.' },
    ],
  }
  const revision: PensaProjectRevision = {
    id: uid(4),
    projectId: uid(5),
    number: 1,
    previousRevisionId: null,
    acceptedByProfileId: person,
    acceptedAt: now,
    definition: {
      title: 'Memória',
      summary: 'Encontre os seis pares.',
      originalIntent: 'Quero um jogo da memória com doze cartas.',
      playerExperience: 'Encontre os pares até virar todas as cartas.',
      dimension: '2d',
      requirements: [
        {
          id: requirementId,
          text: 'Combine os seis pares.',
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
      stages: [{ id: stageId, title: 'Jogo da memória', position: 0 }],
      missions: [
        {
          ...structuredClone(base),
          id: uid(6),
          position: 0,
          kind: 'setup',
          destination: 'studio',
          requirementIds: [],
          dependencyIds: [],
          setup: {
            type: 'extensions',
            authoring: 'blocks',
            runtimeExtensionId: 'game-2d',
            requiredAuxiliaryExtensionIds: [],
            recommendation: 'Recomendo Jogo 2D para criar as cartas.',
          },
        },
        {
          ...structuredClone(base),
          id: uid(7),
          position: 1,
          kind: 'feature',
          destination: 'studio',
          dependencyIds: [uid(6)],
        },
        {
          ...structuredClone(base),
          id: uid(8),
          position: 2,
          kind: 'playtest',
          destination: 'studio',
          dependencyIds: [uid(7)],
          scope: 'project',
        },
      ],
    },
    technical: {
      capabilitiesFingerprint: 'access-1',
      catalogVersion: 'catalog-1',
      authoring: 'blocks',
      runtimeExtensionId: 'game-2d',
      extensions: [{ id: 'game-2d', name: 'Jogo 2D' }],
      references: [],
      missionResources: [
        {
          missionId: uid(6),
          blockIds: [],
          extensionIds: ['game-2d'],
          moldaToolIds: [],
          manualIds: [],
        },
        {
          missionId: uid(7),
          blockIds: ['card'],
          extensionIds: ['game-2d'],
          moldaToolIds: [],
          manualIds: [],
        },
        { missionId: uid(8), blockIds: [], extensionIds: [], moldaToolIds: [], manualIds: [] },
      ],
    },
  }
  const capabilities: PensaCapabilities = {
    fingerprint: 'access-1',
    catalogVersion: 'catalog-1',
    programmerProfileId: person,
    observedGame: null,
    participants: [
      {
        profileId: person,
        rank: 'explorador',
        studio: true,
        studioAuthoring: 'blocks',
        pinta: true,
        molda: false,
        dimensions: ['2d'],
        blockIds: ['card'],
        extensionIds: ['game-2d'],
        moldaTools: [],
        tutor: true,
      },
    ],
  }
  const team: PensaTeamView = {
    viewerProfileId: person,
    ownerProfileId: person,
    programmerProfileId: person,
    artistProfileIds: [person],
    memberCount: 0,
    people: [{ profileId: person, firstName: 'Ana', photoUrl: null, owner: true, joinedAt: null }],
    shareCode: null,
    codeLocked: false,
  }
  const progress = revision.plan.missions.map((mission) => createPensaMissionProgress(mission.id))
  return { revision, capabilities, team, progress }
}
function done(progress: PensaMissionProgress): PensaMissionProgress {
  return {
    ...progress,
    status: 'completed',
    completedByProfileId: person,
    completedAt: now,
    verification: {
      missionContentRevision: 1,
      source: 'child',
      note: '',
      verifiedAt: now,
      verifiedByProfileId: person,
    },
  }
}

describe('Pensa: contrato funcional e cobertura', () => {
  test('aceita configuração sem blocos e uma sequência completa com teste final', () => {
    const { revision, capabilities } = fixture()
    expect(PensaProjectRevisionSchema.safeParse(revision).success).toBe(true)
    expect(validatePensaPlan({ ...revision, capabilities, accepted: true })).toEqual({
      ok: true,
      issues: [],
    })
  })
  test('não perde um requisito combinado', () => {
    const { revision } = fixture()
    revision.definition.requirements.push({
      id: uid(90),
      text: 'Recomeçar a partida.',
      origin: 'child',
      category: 'gameplay',
    })
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toContain(
      'uncovered_requirement',
    )
  })
  test('a programação espera a preparação, mesmo quando o teste final espera ambas', () => {
    const { revision } = fixture()
    at(revision.plan.missions, 1).dependencyIds = []
    at(revision.plan.missions, 2).dependencyIds = [uid(6), uid(7)]
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toContain(
      'setup_dependency',
    )
  })
  test('o runtime precisa corresponder à dimensão escolhida', () => {
    const { revision } = fixture()
    revision.definition.dimension = '3d'
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toContain(
      'runtime_dimension',
    )
  })
  test('a preparação inclui todas as extensões usadas na programação', () => {
    const { revision } = fixture()
    revision.technical.extensions.push({ id: 'camera-2d', name: 'Câmera 2D' })
    at(revision.technical.missionResources, 1).extensionIds.push('camera-2d')
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toContain(
      'setup_extensions',
    )
  })
  test('exige um único teste final que espere todas as entregas', () => {
    const { revision } = fixture()
    at(revision.plan.missions, 2).dependencyIds = []
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toContain(
      'final_test_coverage',
    )
    revision.plan.missions.pop()
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toContain('final_test')
  })
  test('recusa dependência circular ou com identidade duplicada', () => {
    const { revision } = fixture()
    at(revision.plan.missions, 0).dependencyIds = [uid(7)]
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toContain(
      'dependency_order',
    )
    at(revision.plan.missions, 1).id = uid(6)
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toContain('duplicate')
  })
  test('um elemento a criar precisa de produção e integração depois', () => {
    const { revision } = fixture()
    revision.definition.assetSlots.push({
      id: uid(91),
      name: 'Cartas',
      kind: 'sprite',
      description: 'As figuras dos seis pares.',
      source: 'create',
      existing: null,
    })
    expect(validatePensaPlan(revision).issues.map((item) => item.code)).toEqual(
      expect.arrayContaining(['missing_asset_mission', 'missing_integration']),
    )
  })
  test('sugestão sem aceite cabe no draft, mas não na revisão aceita', () => {
    const { revision } = fixture()
    at(revision.definition.requirements, 0).origin = 'suggestion'
    revision.definition.adaptations.push({
      id: uid(92),
      originalIntent: 'Jogo 3D',
      limitation: '3D não está liberado.',
      alternative: 'Memória 2D',
      preserved: 'Os mesmos personagens.',
      acceptedAt: null,
      acceptedByProfileId: null,
    })
    expect(validatePensaPlan(revision).ok).toBe(true)
    expect(
      validatePensaPlan({ ...revision, accepted: true }).issues.map((item) => item.code),
    ).toContain('unaccepted_suggestion')
  })
  test('o navegador não injeta capacidades no aceite', () => {
    expect(
      PensaDraftAcceptRequestSchema.safeParse({
        requestId: uid(100),
        draftId: uid(101),
        draftRevision: 1,
        baseRevisionId: null,
        affectedProgressVersions: {},
        capabilities: {},
      }).success,
    ).toBe(false)
  })
})

describe('Pensa: capacidades por pessoa e próxima missão', () => {
  test('não combina desbloqueios de duas pessoas para fingir um executor', () => {
    const { revision, capabilities } = fixture()
    at(capabilities.participants, 0).blockIds = []
    capabilities.participants.push({
      ...at(capabilities.participants, 0),
      profileId: uid(93),
      blockIds: ['card'],
    })
    expect(
      validatePensaPlan({ ...revision, capabilities }).issues.map((item) => item.code),
    ).toContain('unavailable_resources')
  })
  test('perfil somente 2D não recebe jogo 3D executável', () => {
    const { revision, capabilities } = fixture()
    revision.definition.dimension = '3d'
    expect(
      validatePensaPlan({ ...revision, capabilities }).issues.map((item) => item.code),
    ).toContain('dimension_access')
  })
  test('um plano em código não pode ser aceito quando só a programação em blocos está disponível', () => {
    const { revision, capabilities } = fixture()
    revision.plan.missions = revision.plan.missions.filter((mission) => mission.kind !== 'setup')
    at(revision.plan.missions, 0).dependencyIds = []
    revision.technical.authoring = 'code'
    revision.technical.runtimeExtensionId = null
    revision.technical.extensions = []
    revision.technical.missionResources = revision.plan.missions.map((mission) => ({
      missionId: mission.id,
      blockIds: [],
      extensionIds: [],
      moldaToolIds: [],
      manualIds: [],
    }))
    expect(
      validatePensaPlan({ ...revision, capabilities }).issues.map((item) => item.code),
    ).toContain('authoring_access')
  })
  test('a próxima missão respeita dependências e reconferência', () => {
    const f = fixture()
    f.progress[0] = done(at(f.progress, 0))
    f.progress[1] = { ...done(at(f.progress, 1)), validity: 'needs_review' }
    const availability = resolvePensaAvailability({ ...f, viewerProfileId: person })
    expect(at(availability, 2).reason).toBe('dependency_pending')
    expect(nextPensaMissionFor({ ...f, availability })).toEqual({
      type: 'mission',
      missionId: uid(7),
      mode: 'reconfirm',
      destination: 'studio',
    })
  })
  test('Pro pula configuração de blocos sem inventar conclusão', () => {
    const f = fixture()
    at(f.capabilities.participants, 0).studioAuthoring = 'code'
    at(f.capabilities.participants, 0).blockIds = []
    at(f.capabilities.participants, 0).extensionIds = []
    const availability = resolvePensaAvailability({ ...f, viewerProfileId: person })
    expect(at(availability, 0).reason).toBe('not_applicable')
    expect(nextPensaMissionFor({ ...f, availability })).toMatchObject({
      type: 'mission',
      missionId: uid(7),
    })
    expect(at(f.progress, 0).status).toBe('planned')
  })
  test('perda de acesso e pausa têm bloqueio explícito', () => {
    const f = fixture()
    at(f.capabilities.participants, 0).extensionIds = []
    expect(at(resolvePensaAvailability({ ...f, viewerProfileId: person }), 0).reason).toBe(
      'resources_unavailable',
    )
    expect(
      at(
        resolvePensaAvailability({
          ...f,
          viewerProfileId: person,
          project: { status: 'active', paused: true },
        }),
        0,
      ).reason,
    ).toBe('paused')
  })
  test('conclusão depende de todas as missões vigentes', () => {
    const f = fixture()
    f.progress = f.progress.map(done)
    const availability = resolvePensaAvailability({ ...f, viewerProfileId: person })
    expect(nextPensaMissionFor({ ...f, availability })).toEqual({ type: 'completed' })
  })
})

describe('Pensa: revisões preservam trabalho válido', () => {
  test('o servidor mantém as revisões de conteúdo e ignora contadores propostos', () => {
    const { revision } = fixture()
    const plan = structuredClone(revision.plan)
    at(plan.missions, 0).contentRevision = 900
    at(plan.missions, 1).contentRevision = 1
    at(plan.missions, 1).title = 'Combine as cartas'
    const normalized = reconcilePensaMissionVersions(revision, plan)
    expect(at(normalized.missions, 0).contentRevision).toBe(1)
    expect(at(normalized.missions, 1).contentRevision).toBe(2)
    expect(at(reconcilePensaMissionVersions(null, plan).missions, 0).contentRevision).toBe(1)
  })
  test('mudar somente título ou ordem não invalida o resultado', () => {
    const { revision } = fixture()
    const next = structuredClone(revision)
    at(next.plan.missions, 1).title = 'Combine as cartas'
    at(next.plan.missions, 1).position = 4
    expect(analyzePensaChange(revision, next)).toMatchObject({
      changedMissionIds: [],
      reviewMissionIds: [],
      editorialMissionIds: [uid(7)],
      reorderedMissionIds: [uid(7)],
    })
  })
  test('regra alterada alcança dependências e mantém entregas e histórico', () => {
    const { revision, progress } = fixture()
    const next = structuredClone(revision)
    at(next.plan.missions, 1).rules.push({
      id: 'pairs',
      text: 'Mostre no máximo duas cartas por vez.',
    })
    const impact = analyzePensaChange(revision, next)
    expect(impact.reviewMissionIds).toEqual([uid(7), uid(8)])
    const completed = progress.map(done)
    const invalidated = invalidatePensaProgress(completed, impact.reviewMissionIds)
    expect(at(invalidated, 0)).toEqual(at(completed, 0))
    expect(at(invalidated, 1)).toMatchObject({
      status: 'completed',
      validity: 'needs_review',
      completedAt: now,
      progressRevision: 1,
    })
  })
  test('requisitos e recursos também pedem revisão sem texto diferente na missão', () => {
    const { revision } = fixture()
    const next = structuredClone(revision)
    at(next.definition.requirements, 0).text = 'Combine oito pares.'
    expect(analyzePensaChange(revision, next).changedMissionIds).toContain(uid(7))
    const resourceChange = structuredClone(revision)
    at(resourceChange.technical.missionResources, 1).blockIds.push('new-card')
    expect(analyzePensaChange(revision, resourceChange).changedMissionIds).toContain(uid(7))
  })
  test('remover uma dependência exige conferir seus antigos consumidores', () => {
    const { revision } = fixture()
    const next = structuredClone(revision)
    next.plan.missions = next.plan.missions.filter((mission) => mission.id !== uid(7))
    at(next.plan.missions, 1).dependencyIds = [uid(6)]
    expect(analyzePensaChange(revision, next)).toMatchObject({
      removedMissionIds: [uid(7)],
      reviewMissionIds: [uid(8)],
    })
    expect([...pensaDependentClosure([uid(6)], revision.plan.missions)]).toEqual([
      uid(6),
      uid(7),
      uid(8),
    ])
  })
})
