import { expect, test } from 'bun:test'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'

test('runtime hosts validate exact releases and isolated deployment origins, never snapshot URLs', async () => {
  const { project, configuration } = await authoringFixture('python', 'pro')
  const subject = studioRuntimeSubject(project)
  const valid = { runtime: project.runtime, origin: 'https://runtime.example.test' }
  for (const origin of [
    'http://runtime.example.test',
    'https://user:pass@runtime.example.test',
    'https://runtime.example.test/a',
    'https://runtime.example.test/?x=1',
    'https://runtime.example.test/#x',
    'javascript:alert(1)',
  ])
    expect(() => createStudioRuntimeHosts(configuration.catalog, [{ ...valid, origin }])).toThrow()
  expect(() => createStudioRuntimeHosts(configuration.catalog, [valid, valid])).toThrow('repetido')
  expect(() =>
    createStudioRuntimeHosts(configuration.catalog, [
      { ...valid, runtime: { ...project.runtime, manifestSha256: 'b'.repeat(64) } },
    ]),
  ).toThrow('aprovada')
  const empty = createStudioRuntimeHosts(configuration.catalog, [])
  expect(empty.operations(project)).toEqual([])
  const unavailable = await createStudioRuntimePolicy(configuration, empty)
  expect(() =>
    unavailable.authorize({
      project: subject,
      operation: 'execute',
      curation: {},
      grantedCapabilities: ['execute'],
    }),
  ).toThrow('disponível')
  const hosts = createStudioRuntimeHosts(configuration.catalog, [valid])
  // Hosted Python offers BFF publication and Zappy; the release manifest still decides.
  expect(hosts.operations(project).map(({ capability }) => capability)).toEqual([
    'edit',
    'execute',
    'pause',
    'publish',
    'export-source',
    'python-repl',
    'assist',
  ])
  const frame = hosts.frame(project)!
  frame.url = 'https://changed.example.test'
  expect(hosts.frame(project)?.url).toContain('https://runtime.example.test/v1/runtimes/')
  const policy = await createStudioRuntimePolicy(configuration, hosts)
  expect(() =>
    policy.authorize({
      project: subject,
      operation: 'execute',
      curation: {},
      grantedCapabilities: [],
    }),
  ).toThrow('disponível')
  expect(() =>
    policy.authorize({
      project: subject,
      operation: 'execute',
      curation: { allowedModes: ['blocks'] },
      grantedCapabilities: ['execute'],
    }),
  ).toThrow()
  for (const origin of ['http://localhost:4400', 'http://127.0.0.1:4400', 'http://[::1]:4400'])
    expect(
      createStudioRuntimeHosts(configuration.catalog, [{ ...valid, origin }]).frame(project)?.url,
    ).toStartWith(origin)
})

test('publish and assist require the release declaration and the context grant', async () => {
  const authorize = async (
    capabilities: Parameters<typeof authoringFixture>[2],
    grantedCapabilities: Parameters<
      Awaited<ReturnType<typeof createStudioRuntimePolicy>>['authorize']
    >[0]['grantedCapabilities'],
    operation: 'execute' | 'analyze',
    allowReadOnlyAnalysis = false,
  ) => {
    const { project, configuration } = await authoringFixture('python', 'pro', capabilities)
    const policy = await createStudioRuntimePolicy(
      configuration,
      createStudioRuntimeHosts(configuration.catalog, [
        { runtime: project.runtime, origin: 'https://runtime.example.test' },
      ]),
    )
    return policy.authorize({
      project: studioRuntimeSubject(project),
      operation,
      curation: {},
      grantedCapabilities,
      allowReadOnlyAnalysis,
    }).capabilities
  }
  const all = ['edit', 'execute', 'publish', 'export-source', 'assist'] as const
  const pilot = ['edit', 'export-source', 'execute', 'python-repl'] as const
  expect(await authorize(undefined, all, 'execute')).toEqual(all)
  expect(await authorize(undefined, all, 'analyze')).toEqual(['edit', 'export-source', 'assist'])
  expect(await authorize(undefined, ['assist'], 'analyze', true)).toEqual(['assist'])
  // Declared by the release but not granted by the context.
  expect(await authorize(undefined, ['edit', 'execute', 'export-source'], 'execute')).toEqual([
    'edit',
    'execute',
    'export-source',
  ])
  // Granted by the context but absent from the immutable pilot release.
  expect(await authorize(pilot, all, 'execute')).toEqual(['edit', 'execute', 'export-source'])
  expect(await authorize(pilot, all, 'analyze')).toEqual(['edit', 'export-source'])
  expect(await authorize(pilot, ['assist'], 'analyze', true)).toEqual([])
})
