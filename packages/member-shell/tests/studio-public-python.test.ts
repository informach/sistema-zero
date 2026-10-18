import { afterEach, expect, mock, spyOn, test } from 'bun:test'
import { isStudioPythonPublication } from '@sistemazero/core/studio'
import { prepareEditableStudioProject } from '@sistemazero/studio/editable-project-validation'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/python-snapshot'
import { AuthorizePublicRuntimeService } from '../../members/src/application/studio/authorize-public-runtime.service'
import { createStudioRuntimeHosts } from '../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../members/src/domain/studio/runtime-policy'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import {
  currentPublishedPublication,
  currentPublishedSource,
  publicationCommand,
  purgePublication,
} from '../../studio-runtime/src/publications'
import { memoryArtifactBucket } from '../../studio-runtime/tests/artifact-bucket'

mock.module('server-only', () => ({}))
process.env.JWT_HS256_SECRET ??= 'public-python-fixture-secret-with-32-characters'
const env = await import('../src/lib/env')
const { studioPublicProject } = await import('../src/server/studio-publication')
const { createStudioPublicRuntimeRoute } = await import('../src/routes/studio-public-runtime')
const originalFetch = globalThis.fetch
afterEach(() => {
  mock.restore()
  globalThis.fetch = originalFetch
})

async function setup(kind: 'classic' | 'pro' = 'classic') {
  const f = await authoringFixture('python', kind)
  const editable = await prepareEditableStudioProject(f.project)
  if (editable?.programmingLanguage !== 'python') throw new Error('Python fixture')
  const project = studioPublicProject(editable)
  const snapshot = await preparePythonExecutionSnapshot(project)
  const storage = memoryArtifactBucket()
  const input = {
    operation: 'promote-python',
    playId: crypto.randomUUID(),
    owner: 'e'.repeat(64),
    projectId: project.id,
    requestId: crypto.randomUUID(),
    expectedVersion: 0,
    parentOrigin: 'https://kids.test',
    source: JSON.stringify(project),
    approval: {
      kind: 'python-browser',
      runtime: project.runtime,
      snapshotSha256: snapshot.revision,
    },
  }
  const publication = await publicationCommand(storage.bucket, input)
  if (!isStudioPythonPublication(publication)) throw new Error('Missing publication')
  const runtime = new AuthorizePublicRuntimeService(
    await createStudioRuntimePolicy(
      f.configuration,
      createStudioRuntimeHosts(f.configuration.catalog, [
        { runtime: project.runtime, origin: 'https://runtime.test' },
      ]),
    ),
  )
  spyOn(env, 'getEnv').mockReturnValue({
    ...env.getEnv(),
    STUDIO_PRO_RUNTIME_URL: 'https://runtime.test',
    STUDIO_PRO_RUNTIME_TOKEN: 'runtime-test-token',
  })
  const commands: string[] = []
  const upstream = mock(async (url: RequestInfo | URL, init?: RequestInit) => {
    expect(String(url)).toBe('https://runtime.test/v1/publications')
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer runtime-test-token')
    const body = JSON.parse(String(init?.body))
    commands.push(body.operation)
    if (body.operation === 'resolve')
      return Response.json(await currentPublishedSource(storage.bucket, body.playId))
    if (body.operation === 'resolve-metadata')
      return Response.json(await currentPublishedPublication(storage.bucket, body.playId))
    throw new Error('No compiler may be invoked for public Python')
  })
  globalThis.fetch = Object.assign(upstream, { preconnect: originalFetch.preconnect })
  const state = {
    visible: true,
    hubStatus: 200,
    memberStatus: 200,
    authorizations: 0,
    counted: false,
    mutate: async () => {},
    wrongDecision: false,
  }
  const route = createStudioPublicRuntimeRoute({
    hub: {
      async resolveStudioPlay(_id, countHit) {
        state.counted ||= countHit === true
        return { status: state.hubStatus, body: { visible: state.visible } }
      },
    },
    members: {
      async authorizePublicRuntime(candidate) {
        state.authorizations++
        const decision = await runtime.execute(candidate)
        await state.mutate()
        return {
          status: state.memberStatus,
          body: state.wrongDecision ? { ...decision, revision: 'f'.repeat(64) } : decision,
        }
      },
    },
  })
  const body = { playId: publication.playId, publicationRevision: publication.activeRevision }
  const call = (value: unknown = body, headers: Record<string, string> = {}) =>
    route.POST(
      new Request('https://kids.test/api/studio/public-runtime', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(value),
      }),
    )
  return { ...storage, project, snapshot, input, publication, commands, state, call }
}

for (const kind of ['classic', 'pro'] as const)
  test(`anonymous ${kind} BFF resolves retained bytes, checks actual snapshot and invokes Members without a learner session`, async () => {
    const f = await setup(kind)
    const response = await f.call()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toMatchObject({
      actor: null,
      context: {
        kind: 'public',
        playId: f.publication.playId,
        publicationRevision: f.publication.activeRevision,
      },
      revision: f.snapshot.revision,
      capabilities: ['execute'],
      blockIds: [],
    })
    expect(f.commands).toEqual(['resolve', 'resolve-metadata'])
    expect(f.state.authorizations).toBe(1)
    expect(f.state.counted).toBe(false)
  })

test('public BFF rejects forged authority, malformed/encoded/oversized bodies before reading publication', async () => {
  const f = await setup()
  for (const extra of [
    { subject: {} },
    { revision: 'f'.repeat(64) },
    { frame: { url: 'https://attacker.test' } },
    { actor: {} },
    { capabilities: ['edit'] },
  ])
    expect(
      (
        await f.call({
          playId: f.publication.playId,
          publicationRevision: f.publication.activeRevision,
          ...extra,
        })
      ).status,
    ).toBe(400)
  expect((await f.call(undefined, { 'content-encoding': 'gzip' })).status).toBe(400)
  expect((await f.call({ text: 'x'.repeat(1025) })).status).toBe(413)
  expect(f.commands).toEqual([])
  expect(f.state.authorizations).toBe(0)
})

test('public BFF rejects invisible, missing, stale and mismatched decisions without a playable grant', async () => {
  const f = await setup()
  f.state.visible = false
  expect((await f.call()).status).toBe(404)
  expect(f.commands).toEqual([])
  f.state.visible = true
  expect(
    (await f.call({ playId: f.publication.playId, publicationRevision: 'f'.repeat(64) })).status,
  ).toBe(409)
  expect(f.state.authorizations).toBe(0)
  f.state.wrongDecision = true
  expect((await f.call()).status).toBe(502)
  f.state.wrongDecision = false
  f.state.memberStatus = 403
  expect((await f.call()).status).toBe(403)
  f.state.memberStatus = 503
  expect((await f.call()).status).toBe(503)
  f.state.memberStatus = 200
  await purgePublication(f.bucket, f.publication.playId)
  expect((await f.call()).status).toBe(404)
})

test('public BFF recomputes the actual execution digest instead of trusting a retained approval claim', async () => {
  const f = await setup()
  const published = await publicationCommand(f.bucket, {
    ...f.input,
    requestId: crypto.randomUUID(),
    expectedVersion: 1,
    approval: { ...f.input.approval, snapshotSha256: 'f'.repeat(64) },
  })
  if (!isStudioPythonPublication(published)) throw new Error('Missing Python revision')
  expect(
    (await f.call({ playId: published.playId, publicationRevision: published.activeRevision }))
      .status,
  ).toBe(409)
  expect(f.state.authorizations).toBe(0)
})

test('moderation, disable and rollback while Members is pending invalidate the public decision', async () => {
  for (const mutation of ['hide', 'purge', 'disable', 'update']) {
    const f = await setup('pro')
    f.state.mutate = async () => {
      if (mutation === 'hide') f.state.visible = false
      if (mutation === 'purge') await purgePublication(f.bucket, f.publication.playId)
      if (mutation === 'disable')
        await publicationCommand(f.bucket, {
          ...f.input,
          operation: 'activate',
          requestId: crypto.randomUUID(),
          expectedVersion: 1,
          revision: f.publication.activeRevision,
          disabled: true,
        })
      if (mutation === 'update')
        await publicationCommand(f.bucket, {
          ...f.input,
          requestId: crypto.randomUUID(),
          expectedVersion: 1,
        })
    }
    expect((await f.call()).status).toBe(mutation === 'hide' ? 404 : 409)
    mock.restore()
  }
})

test('public sanitization removes private Pro assistance/provenance but preserves source, material bytes and license', async () => {
  const f = await setup('pro')
  if (f.project.kind !== 'pro') throw new Error('Pro fixture')
  const project = {
    ...f.project,
    assets: [
      {
        id: 'hero',
        name: 'hero',
        kind: 'image' as const,
        dataUrl: 'data:image/png;base64,YQ==',
        source: 'library' as const,
        libId: 'personal:private-id',
        libOrigin: 'pinta' as const,
        libRevision: 10,
        license: { name: 'CC0' },
      },
    ],
    proMeta: {
      ...f.project.proMeta,
      assistance: { version: 1 as const, briefing: 'PRIVATE_BRIEFING' },
      origin: { projectId: 'PRIVATE_PARENT', revision: 10 },
      publication: { playId: crypto.randomUUID() },
    },
  }
  const result = studioPublicProject(project)
  expect(result.assets?.[0]).toEqual({
    id: 'hero',
    name: 'hero',
    kind: 'image',
    dataUrl: 'data:image/png;base64,YQ==',
    source: 'library',
    license: { name: 'CC0' },
  })
  expect(result.proMeta).toEqual({ templateId: project.proMeta.templateId })
  expect(JSON.stringify(result)).not.toContain('PRIVATE_')
  expect(result.kind === 'pro' ? result.tree : result.files).toEqual(project.tree)
  expect(project.assets[0]!.libId).toBe('personal:private-id')
})
