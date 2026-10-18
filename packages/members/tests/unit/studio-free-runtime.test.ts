import { expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { creatorJourneyLevel, type JourneyLevelSlug } from '@sistemazero/core/journey'
import { prepareStudioPythonProExecution } from '@sistemazero/core/studio/python-pro-execution'
import type { StudioFreeRuntimeRequest } from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { AuthorizeFreeRuntimeService } from '../../src/application/studio/authorize-free-runtime.service'
import { FreeStudioAccessService } from '../../src/application/studio/free-studio-access.service'
import { StudioPythonBuilderPolicy } from '../../src/application/studio-pro/python-builder-policy'
import { emptyQualifyingByTier } from '../../src/domain/gamification/levels'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'

async function setup(kind: 'classic' | 'pro' = 'classic') {
  const fixture = await authoringFixture('python', kind)
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
    level: 'coder' as JourneyLevelSlug,
    blocks: [SERVER_BLOCK_CATALOG[0]!.type],
    frozen: [] as string[],
    reads: [] as { port: string; id: string; audience?: string }[],
    now: 1_790_000_000_000,
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
    {
      async listQualifyingJourneySlots(id, audience) {
        state.reads.push({ port: 'level', id, audience })
        return Object.assign(
          emptyQualifyingByTier(),
          creatorJourneyLevel(state.level).requiredSlots,
        )
      },
      async listStudioUnlocksByCourse(id, audience) {
        state.reads.push({ port: 'palette', id, audience })
        return [{ courseId: 'current', blocks: state.blocks }]
      },
    },
    {
      async listGrants(id, audience) {
        state.reads.push({ port: 'frozen', id, audience })
        return [{ courseId: 'old', blocks: state.frozen }]
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

test('free Classic uses account ownership and profile achievement, without translating JS block IDs', async () => {
  const f = await setup()
  const before = structuredClone(f.project)
  const options = await f.service.options(f.actor)
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
  expect(decision.blockIds).toEqual(['py_print'])
  expect(decision.capabilities).toEqual(['edit', 'execute', 'export-source'])
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

test('each operation rechecks product, qualified level and known current or frozen palette', async () => {
  const f = await setup()
  await f.service.execute(f.actor, f.request)
  f.state.owned = false
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('acesso ao Estúdio')
  f.state.owned = true
  f.state.level = 'noob'
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('nível')
  f.state.level = 'coder'
  f.state.blocks = ['unknown-js', 'py_print']
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('curso')
  f.state.frozen = [SERVER_BLOCK_CATALOG[0]!.type]
  expect((await f.service.execute(f.actor, f.request)).operation).toBe('execute')
})

test('free Pro keeps its own level gate and does not inherit contextual Pro access', async () => {
  const f = await setup('pro')
  await expect(f.service.execute(f.actor, f.request)).rejects.toThrow('Pro')
  f.state.level = 'god'
  expect((await f.service.options(f.actor)).canCreatePro).toBe(true)
  expect((await f.service.execute(f.actor, f.request)).curation.allowedModes).toEqual(['code'])
})

test('builder Python shares fresh Complete Studio product/Pro level/catalog policy for analysis and execution', async () => {
  const f = await setup('pro')
  f.state.level = 'god'
  const payload = await capturePythonProRevisionPayload(f.project)
  const prepared = await prepareStudioPythonProExecution(payload.base, payload.binaries)
  if (prepared.base.version !== 2) throw new Error('Expected canonical Python revision')
  const policy = new StudioPythonBuilderPolicy(f.service, true),
    signal = new AbortController().signal
  await policy.execute(f.actor, prepared.base, prepared.metadata, 'analyze', signal)
  await policy.execute(f.actor, prepared.base, prepared.metadata, 'execute', signal)
  expect(f.state.reads.filter(({ port }) => port === 'product')).toHaveLength(2)
  expect(f.state.reads.filter(({ port }) => port === 'level')).toHaveLength(2)
  expect(f.state.reads.some(({ port }) => port === 'palette' || port === 'frozen')).toBe(false)
  f.state.owned = false
  await expect(
    policy.execute(f.actor, prepared.base, prepared.metadata, 'execute', signal),
  ).rejects.toThrow('acesso')
  f.state.owned = true
  f.state.level = 'coder'
  await expect(
    policy.execute(f.actor, prepared.base, prepared.metadata, 'analyze', signal),
  ).rejects.toThrow('Pro')
})

test('builder Python denies missing execution configuration, mismatched metadata and unapproved releases', async () => {
  const f = await setup('pro')
  f.state.level = 'god'
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

test('active staff bypasses achievement gates, while support cannot execute even as staff', async () => {
  const f = await setup('pro')
  f.state.owned = false
  const staff = { ...f.actor, privileged: true }
  expect((await f.service.execute(staff, f.request)).projectId).toBe(f.project.id)
  expect(f.state.reads).toEqual([])
  await expect(f.service.execute({ ...staff, readOnly: true }, f.request)).rejects.toThrow(
    'suporte',
  )
  await expect(f.service.options({ ...staff, readOnly: true })).rejects.toThrow('suporte')
})

test('resuming an eligible Pro retains its existing gate even without a known curriculum palette', async () => {
  const f = await setup('pro')
  f.state.level = 'god'
  f.state.blocks = ['removed-legacy-block']
  expect((await f.service.execute(f.actor, f.request)).projectId).toBe(f.project.id)
  expect(f.state.reads.some(({ port }) => port === 'palette' || port === 'frozen')).toBe(false)
  await expect(f.service.options(f.actor)).rejects.toThrow('curso')
  f.state.level = 'coder'
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
