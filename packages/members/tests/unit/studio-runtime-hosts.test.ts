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
