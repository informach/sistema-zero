import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  initialKidsJourneyPolicy,
  KIDS_CREATOR_CAPABILITIES,
  type KidsCreatorCapability,
  projectKidsJourney,
} from '@sistemazero/core/journey'
import { StudioAuthoringCatalogSchema } from '@sistemazero/core/studio/authoring-catalog'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import type { StudioFreeRuntimeRequest } from '@sistemazero/core/studio/runtime-authorization'
import {
  createStudioRuntimeRelease,
  type StudioProjectCapability,
  type StudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { pythonCourseBlockClosure } from '@sistemazero/studio/python-course-unlocks'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { providedPythonRelease } from '../../../core/tests/fixtures/python-provided-release'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { AuthorizeFreeRuntimeService } from '../../src/application/studio/authorize-free-runtime.service'
import { FreeStudioAccessService } from '../../src/application/studio/free-studio-access.service'
import { StudioPythonBuilderPolicy } from '../../src/application/studio-pro/python-builder-policy'
import { GetStudioUnlocksService } from '../../src/application/studio-unlocks/get-studio-unlocks.service'
import { KidsJourneyUnavailableError } from '../../src/domain/kids-journey/kids-journey.errors'
import { createStudioAuthoringPolicy } from '../../src/domain/studio/authoring-policy'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import {
  InMemoryGamificationRepository,
  InMemoryStudioUnlockRepository,
  silentLogger,
} from '../fakes/in-memory'
import { authoringFixture } from '../fakes/studio-authoring-policy'

const APPROVED_BLOCK_IDS = ['sz_py_pass', ...pythonCourseBlockClosure(['sz_py_print'])]

async function setup(
  kind: 'classic' | 'pro' = 'classic',
  provided?: StudioRuntimeRelease,
  capabilities?: readonly StudioProjectCapability[],
  blockIds: string[] = [...APPROVED_BLOCK_IDS],
) {
  const fixture = await authoringFixture('python', kind, capabilities)
  fixture.configuration.releases[0]!.blockIds = blockIds
  fixture.policy = await createStudioAuthoringPolicy(fixture.configuration)
  if (provided) {
    const runtime = {
      profileId: provided.profileId,
      releaseId: provided.releaseId,
      manifestSha256: provided.manifestSha256,
    }
    fixture.project.runtime = runtime
    if (fixture.project.programmingLanguage !== 'python') throw new Error('Expected Python')
    fixture.project.python.dependencyLock.runtimeManifestSha256 = provided.manifestSha256
    fixture.configuration = StudioAuthoringCatalogSchema.parse({
      ...fixture.configuration,
      catalog: {
        profiles: [
          {
            ...fixture.configuration.catalog.profiles[0],
            id: provided.profileId,
            releases: [{ id: provided.releaseId, manifestSha256: provided.manifestSha256 }],
          },
        ],
        releases: [provided],
      },
      releases: [{ ...fixture.configuration.releases[0], runtime }],
    })
    fixture.policy = await createStudioAuthoringPolicy(fixture.configuration)
  }
  if (kind === 'classic') fixture.project.mode = 'blocks'
  const actor = {
    audience: 'kids' as const,
    userId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    privileged: false,
    readOnly: false,
  }
  const state = {
    owned: true,
    capabilities: ['studio'] as KidsCreatorCapability[],
    policyAvailable: true,
    blocks: ['sz_py_pass'],
    frozen: [] as string[],
    reads: [] as { port: string; id: string; audience?: string }[],
    now: 1_790_000_000_000,
  }
  const gamification = new InMemoryGamificationRepository()
  gamification.listStudioUnlocksByCourse = async (id, audience) => {
    state.reads.push({ port: 'palette', id, audience })
    return [{ courseId: 'current', blocks: [...state.blocks] }]
  }
  const unlocks = new InMemoryStudioUnlockRepository()
  unlocks.listGrants = async (id, audience) => {
    state.reads.push({ port: 'frozen', id, audience })
    return [{ courseId: 'current', blocks: [...state.frozen] }]
  }
  unlocks.freezeGrants = async (owner, audience, grants) => {
    expect(owner).toEqual({ userId: actor.userId, accountId: actor.accountId })
    expect(audience).toBe(actor.audience)
    state.frozen = grants.flatMap(({ blocks }) => blocks)
  }
  const access = new FreeStudioAccessService(
    {
      async execute(id, refs) {
        state.reads.push({ port: 'product', id })
        expect(refs).toEqual(['estudio-completo'])
        return {
          grants: [],
          communities: state.owned ? ['estudio-completo'] : [],
          hasMaster: true,
          hasMasterKids: true,
        }
      },
    },
    new GetStudioUnlocksService(gamification, unlocks, silentLogger),
    {
      async get(owner) {
        state.reads.push({ port: 'journey', id: owner.userId, audience: 'kids' })
        if (!state.policyAvailable) throw new KidsJourneyUnavailableError()
        return projectKidsJourney({
          policy: initialKidsJourneyPolicy(),
          policyVersion: 1,
          catalog: [],
          milestones: [],
          earned: {
            level: 'noob',
            capabilities: [...state.capabilities],
            courseAccess: { entry: [], expanded: [], reward: [] },
          },
        })
      },
      async staffPreview() {
        state.reads.push({ port: 'staff-preview', id: actor.accountId, audience: 'kids' })
        if (!state.policyAvailable) throw new KidsJourneyUnavailableError()
        return {
          audience: 'kids' as const,
          kind: 'staff-preview' as const,
          policyVersion: 1,
          mode: 'active' as const,
          tierAccess: initialKidsJourneyPolicy().tierAccess,
          capabilities: [...KIDS_CREATOR_CAPABILITIES],
          readiness: { status: 'ready' as const, horizon: 'god' as const, issues: [] },
        }
      },
    },
  )
  const runtime = await createStudioRuntimePolicy(
    fixture.configuration,
    createStudioRuntimeHosts(fixture.configuration.catalog, [
      { runtime: fixture.project.runtime, origin: 'https://runtime.example.test' },
    ]),
  )
  const service = new AuthorizeFreeRuntimeService(access, runtime, fixture.policy, () => state.now)
  const request: StudioFreeRuntimeRequest = {
    context: { kind: 'free', audience: 'kids', projectId: fixture.project.id },
    subject: studioRuntimeSubject(fixture.project),
    revision: 'a'.repeat(64),
    operation: 'execute',
  }
  return { ...fixture, actor, state, access, service, runtime, request }
}

test.each([
  'classic',
  'pro',
] as const)('JavaScript-only achievements never authorize Python %s', async (kind) => {
  const f = await setup(kind)
  f.state.capabilities = ['studio', 'bridge', 'pro']
  f.state.blocks = [SERVER_BLOCK_CATALOG[0]!.type]
  const discovery = await f.service.options(f.actor)
  expect(discovery.canCreatePython).toBe(false)
  expect(discovery.catalog?.releases[0]?.blockIds).toEqual([])
  expect(discovery.pythonGrantedExtensionIds).toEqual([])
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('Python')
})

test('discovery and execution preserve frozen Python achievements without exposing unearned or unknown IDs', async () => {
  const f = await setup()
  f.state.blocks.push(SERVER_BLOCK_CATALOG[0]!.type, 'sz_py_unknown')
  expect((await f.service.options(f.actor)).catalog?.releases[0]?.blockIds).toEqual(['sz_py_pass'])
  f.state.blocks = []
  const decision = await f.service.execute(f.actor, f.request)
  expect(decision.blockIds).toEqual(['sz_py_pass'])
  expect(f.policy.describe().releases[0]?.blockIds).toEqual(APPROVED_BLOCK_IDS)
})

test('removing release approval after discovery never recreates a grant from level three', async () => {
  const f = await setup()
  expect((await f.service.options(f.actor)).catalog?.releases[0]?.blockIds).toEqual(['sz_py_pass'])
  f.configuration.releases[0]!.blockIds = ['sz_py_print']
  const changed = new AuthorizeFreeRuntimeService(
    f.access,
    await createStudioRuntimePolicy(
      f.configuration,
      createStudioRuntimeHosts(f.configuration.catalog, [
        { runtime: f.project.runtime, origin: 'https://runtime.example.test' },
      ]),
    ),
    await createStudioAuthoringPolicy(f.configuration),
  )
  expect((await changed.options(f.actor)).catalog?.releases[0]?.blockIds).toEqual([])
  await expect(changed.execute(f.actor, f.request)).rejects.toThrow('Python')
})

test('Turtle installation cannot grant itself; earned block owners gate discovery and runtime extensions', async () => {
  const original = await authoringFixture('python', 'classic')
  const release = await createStudioRuntimeRelease({
    ...original.configuration.catalog.releases[0]!.manifest,
    extensions: [{ id: 'python-turtle', versions: ['1.0.0'] }],
  })
  const turtle = pythonCourseBlockClosure(['sz_py_turtle_turtle_forward'])
  const f = await setup('classic', release, undefined, ['sz_py_pass', ...turtle])
  f.request.subject.installedExtensions = [{ id: 'python-turtle', version: '1.0.0' }]
  expect((await f.service.options(f.actor)).pythonGrantedExtensionIds).toEqual([])
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('extensão')
  f.state.blocks = turtle
  const options = await f.service.options(f.actor)
  const decision = await f.service.execute(f.actor, f.request)
  expect(options.pythonGrantedExtensionIds).toEqual(['python-turtle'])
  expect(decision.grantedExtensionIds).toEqual(options.pythonGrantedExtensionIds)
  const approval = options.catalog?.releases[0]
  if (!approval) throw new Error('Expected the approved Python release')
  expect(decision.blockIds).toEqual(approval.blockIds)
  expect(decision.blockIds).toEqual(['sz_py_pass', ...turtle])
  f.state.blocks = []
  f.state.frozen = []
  const staff = { ...f.actor, privileged: true }
  expect((await f.service.options(staff)).pythonGrantedExtensionIds).toEqual(['python-turtle'])
  expect((await f.service.execute(staff, f.request)).blockIds).toEqual(['sz_py_pass', ...turtle])
})

test('free Classic uses account ownership and profile achievement, without translating JS block IDs', async () => {
  const f = await setup()
  const before = structuredClone(f.project)
  const options = await f.service.options(f.actor)
  expect(options.canCreatePython).toBe(true)
  expect(options.canCreatePro).toBe(false)
  expect(options.pythonCuration).toEqual({
    pythonLevel: 3,
    allowedModes: ['blocks'],
    allowLevelReveal: false,
  })
  expect(options.catalog).not.toBeNull()
  const decision = await f.service.execute(f.actor, f.request)
  expect(decision.actor).toEqual({ userId: f.actor.userId, accountId: f.actor.accountId })
  expect(decision.context).toEqual(f.request.context)
  expect(decision.subjectSha256).toBe(await sha256Hex(canonicalJson(f.request.subject)))
  expect(decision.revision).toBe(f.request.revision)
  expect(decision.blockIds).toEqual(['sz_py_pass'])
  expect(options.catalog?.releases[0]?.blockIds).toEqual(decision.blockIds)
  expect(options.pythonGrantedExtensionIds).toEqual([])
  expect(decision.capabilities).toEqual(['edit', 'execute', 'publish', 'export-source', 'assist'])
  expect(decision.expiresAt - decision.issuedAt).toBe(30_000)
  expect(
    f.state.reads
      .filter(({ port }) => port === 'product')
      .every(({ id }) => id === f.actor.accountId),
  ).toBe(true)
  expect(
    f.state.reads
      .filter(({ port }) => port !== 'product')
      .every(({ id, audience }) => id === f.actor.userId && audience === 'kids'),
  ).toBe(true)
  expect(f.project).toEqual(before)
})

test('free publication and Zappy appear only when the exact Python release declares them', async () => {
  const declared = await setup('classic')
  const analysis = await declared.service.execute(declared.actor, {
    ...declared.request,
    operation: 'analyze',
  })
  expect(analysis.capabilities).toEqual(['edit', 'export-source', 'assist'])

  const pilot = await setup('classic', undefined, [
    'edit',
    'export-source',
    'execute',
    'python-repl',
  ])
  const execution = await pilot.service.execute(pilot.actor, pilot.request)
  expect(execution.capabilities).toEqual(['edit', 'execute', 'export-source'])
  const pilotAnalysis = await pilot.service.execute(pilot.actor, {
    ...pilot.request,
    operation: 'analyze',
  })
  expect(pilotAnalysis.capabilities).toEqual(['edit', 'export-source'])
})

test('each operation rechecks product, persisted capabilities and known current or frozen palette', async () => {
  const f = await setup()
  await f.service.execute(f.actor, f.request)
  f.state.owned = false
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('acesso ao Estúdio')
  f.state.owned = true
  f.state.capabilities = []
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('nível')
  f.state.capabilities = ['studio']
  f.state.blocks = ['unknown-js', 'py_print']
  f.state.frozen = []
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('curso')
  f.state.frozen = ['sz_py_pass']
  expect((await f.service.execute(f.actor, f.request)).operation).toBe('execute')
})

test('free Pro keeps its own capability gate and does not inherit contextual Pro access', async () => {
  const f = await setup('pro')
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('Pro')
  f.state.capabilities = ['studio', 'bridge', 'pro']
  expect((await f.service.options(f.actor)).canCreatePro).toBe(true)
  expect((await f.service.execute(f.actor, f.request)).curation.allowedModes).toEqual(['code'])
})

test('Python Pro requires one known Python achievement as well as the product and Pro capability', async () => {
  const f = await setup('pro')
  f.state.capabilities = ['studio', 'pro']
  f.state.blocks = ['sz_py_pass']
  const options = await f.service.options(f.actor)
  expect(options.canCreatePython).toBe(true)
  expect(options.canCreatePro).toBe(true)
  expect((await f.service.execute(f.actor, f.request)).curation.allowedModes).toEqual(['code'])
  f.state.owned = false
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('acesso')
  f.state.owned = true
  f.state.capabilities = ['studio']
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('Pro')
  f.state.capabilities = ['studio', 'pro']
  for (const blocks of [[], [SERVER_BLOCK_CATALOG[0]!.type], ['sz_py_unknown']]) {
    f.state.blocks = blocks
    f.state.frozen = []
    await expect(f.service.execute(f.actor, f.request)).rejects.toThrow()
  }
})

test('Python course eligibility also admits a Pro code-only release without granting Classic tools', async () => {
  const f = await setup('pro', undefined, undefined, [])
  f.state.capabilities = ['studio', 'pro']
  const options = await f.service.options(f.actor)
  expect(options.canCreatePython).toBe(true)
  expect(options.catalog?.releases[0]?.blockIds).toEqual([])
  expect((await f.service.execute(f.actor, f.request)).blockIds).toEqual([])
  const classic = await setup('classic', undefined, undefined, [])
  expect((await classic.service.options(classic.actor)).canCreatePython).toBe(true)
  await expect(classic.service.execute(classic.actor, classic.request)).rejects.toThrow('Python')
})

test('Classic refuses an approved intersection missing dependencies without expanding its grants', async () => {
  const f = await setup('classic', undefined, undefined, ['sz_py_print'])
  f.state.blocks = pythonCourseBlockClosure(['sz_py_print'])
  const options = await f.service.options(f.actor)
  expect(options.catalog?.releases[0]?.blockIds).toEqual(['sz_py_print'])
  // An incomplete host approval is an environment problem, including for staff;
  // it must not tell an admin to earn course achievements or expand the approval.
  for (const actor of [f.actor, { ...f.actor, privileged: true }]) {
    await expect(f.service.execute(actor, f.request)).rejects.toThrow('precisa ser atualizado')
  }
})

test('a Pro code-only profile retains earned extension owners without a Classic palette', async () => {
  const original = await authoringFixture('python', 'pro')
  const release = await createStudioRuntimeRelease({
    ...original.configuration.catalog.releases[0]!.manifest,
    extensions: [{ id: 'python-turtle', versions: ['1.0.0'] }],
  })
  const f = await setup('pro', release, undefined, [])
  f.state.capabilities = ['studio', 'pro']
  f.state.blocks = pythonCourseBlockClosure(['sz_py_turtle_turtle_forward'])
  f.request.subject.installedExtensions = [{ id: 'python-turtle', version: '1.0.0' }]
  const options = await f.service.options(f.actor)
  expect(options.pythonGrantedExtensionIds).toEqual(['python-turtle'])
  expect(options.catalog?.releases[0]?.blockIds).toEqual([])
  const decision = await f.service.execute(f.actor, f.request)
  expect(decision.grantedExtensionIds).toEqual(['python-turtle'])
  expect(decision.blockIds).toEqual([])
})

test('builder Python shares fresh Complete Studio product/Pro capability/catalog policy for analysis and execution', async () => {
  const f = await setup('pro')
  f.state.capabilities = ['studio', 'bridge', 'pro']
  const payload = await capturePythonProRevisionPayload(f.project)
  const prepared = await prepareStudioPythonProExecution(payload.base, payload.binaries)
  if (prepared.base.version !== 2) throw new Error('Expected canonical Python revision')
  const policy = new StudioPythonBuilderPolicy(f.service, true),
    signal = new AbortController().signal
  expect(
    await policy.execute(f.actor, prepared.base, prepared.metadata, 'analyze', signal),
  ).toEqual({ runtimeRelease: f.configuration.catalog.releases[0]! })
  await policy.execute(f.actor, prepared.base, prepared.metadata, 'execute', signal)
  expect(f.state.reads.filter(({ port }) => port === 'product')).toHaveLength(2)
  expect(f.state.reads.filter(({ port }) => port === 'journey')).toHaveLength(2)
  expect(f.state.reads.filter(({ port }) => port === 'palette')).toHaveLength(2)
  f.state.owned = false
  await expect(
    policy.execute(f.actor, prepared.base, prepared.metadata, 'execute', signal),
  ).rejects.toThrow('acesso')
  f.state.owned = true
  f.state.capabilities = ['studio']
  await expect(
    policy.execute(f.actor, prepared.base, prepared.metadata, 'analyze', signal),
  ).rejects.toThrow('Pro')
})

test.each([
  'module',
  'declared-empty',
] as const)('Builder policy returns only the exact approved %s release', async (mode) => {
  const provided = await providedPythonRelease()
  const release =
    mode === 'module'
      ? provided
      : await createStudioRuntimeRelease({
          ...provided.manifest,
          python: { ...provided.manifest.python!, providedModules: [] },
        })
  const f = await setup('pro', release)
  f.state.capabilities = ['studio', 'bridge', 'pro']
  const payload = await capturePythonProRevisionPayload(f.project)
  const prepared = await prepareStudioPythonProExecution(payload.base, payload.binaries)
  const policy = new StudioPythonBuilderPolicy(f.service, true)
  expect(
    await policy.execute(
      f.actor,
      prepared.base,
      prepared.metadata,
      'analyze',
      new AbortController().signal,
    ),
  ).toEqual({ runtimeRelease: release })
})

test('builder Python denies missing execution configuration, mismatched metadata and unapproved releases', async () => {
  const f = await setup('pro')
  f.state.capabilities = ['studio', 'bridge', 'pro']
  const payload = await capturePythonProRevisionPayload(f.project)
  const prepared = await prepareStudioPythonProExecution(payload.base, payload.binaries)
  if (prepared.base.version !== 2) throw new Error('Expected canonical Python revision')
  const signal = new AbortController().signal
  await expect(
    new StudioPythonBuilderPolicy(f.service, false).execute(
      f.actor,
      prepared.base,
      prepared.metadata,
      'execute',
      signal,
    ),
  ).rejects.toThrow('configurado')
  expect(f.state.reads).toEqual([])
  const policy = new StudioPythonBuilderPolicy(f.service, true)
  await expect(
    policy.execute(
      f.actor,
      prepared.base,
      { ...prepared.metadata, projectId: 'another' },
      'execute',
      signal,
    ),
  ).rejects.toThrow('revisão')
  f.project.runtime.releaseId = 'unapproved'
  const changed = await capturePythonProRevisionPayload(f.project)
  const unknown = await prepareStudioPythonProExecution(changed.base, changed.binaries)
  if (unknown.base.version !== 2) throw new Error('Expected canonical Python revision')
  await expect(
    policy.execute(f.actor, unknown.base, unknown.metadata, 'execute', signal),
  ).rejects.toThrow()
})

test.each([
  'classic',
  'pro',
] as const)('active staff bypasses %s achievement gates, while support cannot execute even as staff', async (kind) => {
  const f = await setup(kind)
  f.state.owned = false
  const staff = { ...f.actor, userId: f.actor.accountId, privileged: true }
  expect((await f.service.options(staff)).canCreatePython).toBe(true)
  f.state.reads.length = 0
  expect((await f.service.execute(staff, f.request)).projectId).toBe(f.project.id)
  expect(f.state.reads.map(({ port }) => port)).toEqual(['staff-preview'])
  await expect(f.service.execute({ ...staff, readOnly: true }, f.request)).rejects.toThrow(
    'suporte',
  )
  await expect(f.service.options({ ...staff, readOnly: true })).rejects.toThrow('suporte')
  // Staff inside a profile of its own account (Kids requires a profile) gets the same preview.
  f.state.reads.length = 0
  const ownProfile = { ...f.actor, privileged: true }
  expect(ownProfile.userId).not.toBe(ownProfile.accountId)
  expect((await f.service.execute(ownProfile, f.request)).projectId).toBe(f.project.id)
  expect(f.state.reads.map(({ port }) => port)).toEqual(['staff-preview'])
  await expect(f.service.execute({ ...ownProfile, readOnly: true }, f.request)).rejects.toThrow(
    'suporte',
  )
})

test('each Classic and Pro language requires its own known achievement while discovery remains mixed', async () => {
  const js = SERVER_BLOCK_CATALOG[0]!.type
  for (const purpose of ['creation', 'existing-pro'] as const) {
    for (const language of ['javascript', 'python'] as const) {
      const f = await setup('pro')
      f.state.capabilities = ['studio', 'bridge', 'pro']
      f.state.blocks = language === 'javascript' ? ['sz_py_pass'] : [js]
      await expect(f.access.execute(f.actor, purpose, language)).rejects.toThrow('curso')
      const options = await f.service.options(f.actor)
      expect(options.canCreateJavaScript).toBe(language === 'python')
      expect(options.canCreatePython).toBe(language === 'javascript')
      f.state.blocks = [language === 'javascript' ? js : 'sz_py_pass']
      expect((await f.access.execute(f.actor, purpose, language)).pro).toBe(true)
    }
  }
})

test('unknown identifiers and Pro capability alone never substitute for course achievements', async () => {
  const f = await setup('pro')
  f.state.capabilities = ['studio', 'bridge', 'pro']
  f.state.blocks = ['removed-legacy-block', 'sz_py_unknown', 'sz_js_unknown']
  await expect(f.access.execute(f.actor, 'existing-pro', 'javascript')).rejects.toThrow('curso')
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('curso')
  await expect(f.service.options(f.actor)).rejects.toThrow('curso')
  f.state.capabilities = ['studio']
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('Pro')
})

test('missing runtime exposes only legacy JS discovery and cannot grant execution', async () => {
  const f = await setup()
  const absent = new AuthorizeFreeRuntimeService(f.access, undefined, undefined)
  expect((await absent.options(f.actor)).catalog).toBeNull()
  expect((await absent.options(f.actor)).legacyJavaScript).toBe(true)
  await expect(absent.execute(f.actor, f.request)).rejects.toThrow('disponível')
})

test('free runtime rejects a substituted identity, JS subject, unknown extensions and dependency drift', async () => {
  const f = await setup()
  await expect(
    f.service.execute(f.actor, {
      ...f.request,
      context: { ...f.request.context, projectId: crypto.randomUUID() },
    }),
  ).rejects.toThrow()
  const js = await authoringFixture('javascript', 'classic')
  await expect(
    f.service.execute(f.actor, { ...f.request, subject: studioRuntimeSubject(js.project) }),
  ).rejects.toThrow()
  await expect(
    f.service.execute(f.actor, {
      ...f.request,
      subject: {
        ...f.request.subject,
        installedExtensions: [{ id: 'turtle-unapproved', version: '1.0.0' }],
      },
    }),
  ).rejects.toThrow()
  if (f.project.programmingLanguage !== 'python' || f.project.kind !== 'classic')
    throw new Error('Expected Python Classic')
  f.project.files['requirements.txt'] = 'unapproved-package==1.0'
  await expect(
    f.service.execute(f.actor, { ...f.request, subject: studioRuntimeSubject(f.project) }),
  ).rejects.toThrow()
  expect(
    (
      await f.service.execute(f.actor, {
        ...f.request,
        operation: 'analyze',
        subject: studioRuntimeSubject(f.project),
      })
    ).operation,
  ).toBe('analyze')
})

test('retired releases retain existing project execution while revoked releases deny it', async () => {
  for (const status of ['retired', 'revoked'] as const) {
    const f = await setup()
    f.configuration.releases[0]!.status = status
    const policy = await createStudioRuntimePolicy(
      f.configuration,
      createStudioRuntimeHosts(f.configuration.catalog, [
        { runtime: f.project.runtime, origin: 'https://runtime.example.test' },
      ]),
    )
    const service = new AuthorizeFreeRuntimeService(f.access, policy, f.policy)
    if (status === 'revoked') await expect(service.execute(f.actor, f.request)).rejects.toThrow()
    else expect((await service.execute(f.actor, f.request)).releaseStatus).toBe('retired')
  }
})

test('configured capabilities authorize independently of displayed rank and keep Bridge distinct from Pro', async () => {
  const f = await setup()
  f.state.capabilities = ['studio', 'bridge']
  const options = await f.service.options(f.actor)
  expect(options.canCreatePro).toBe(false)
  expect(options.pythonCuration.allowedModes).toEqual(['blocks', 'bridge'])
  f.state.capabilities = ['studio', 'pro']
  const proOptions = await f.service.options(f.actor)
  expect(proOptions.canCreatePro).toBe(true)
  expect(proOptions.pythonCuration.allowedModes).toEqual(['blocks'])
})

test('unavailable policy denies new child and staff runtime operations without fabricating a rank', async () => {
  const f = await setup()
  f.state.policyAvailable = false
  await expect(f.service.options(f.actor)).rejects.toBeInstanceOf(KidsJourneyUnavailableError)
  await expect(
    f.service.options({ ...f.actor, userId: f.actor.accountId, privileged: true }),
  ).rejects.toBeInstanceOf(KidsJourneyUnavailableError)
  // Staff in a profile of its own account (admitted at the HTTP boundary) reads the same preview.
  await expect(f.service.options({ ...f.actor, privileged: true })).rejects.toBeInstanceOf(
    KidsJourneyUnavailableError,
  )
  expect(f.state.reads.some(({ port }) => port === 'palette' || port === 'frozen')).toBe(false)
})
