import { expect, test } from 'bun:test'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'

test('JS Pro build validates the exact v3 policy without pretending to have a Python frame', async () => {
  const f = await authoringFixture('javascript', 'pro')
  const hosts = createStudioRuntimeHosts(f.configuration.catalog, [])
  const policy = await createStudioRuntimePolicy(f.configuration, hosts)
  const project = studioRuntimeSubject(f.project)
  const input = {
    project,
    operation: 'execute' as const,
    curation: {},
    grantedCapabilities: ['execute'] as const,
  }
  expect(hosts.frame(project)).toBeUndefined()
  expect(() => policy.authorizeProBuild(input)).not.toThrow()
  expect(() => policy.authorize(input)).toThrow() // Python-frame operation remains unchanged.
  for (const changed of [
    { ...project, runtime: { ...project.runtime, manifestSha256: '0'.repeat(64) } },
    { ...project, proMeta: { templateId: 'three-js' } },
    { ...project, installedExtensions: [{ id: 'unapproved', version: '1.0.0' }] },
  ])
    expect(() => policy.authorizeProBuild({ ...input, project: changed })).toThrow()
  expect(() => policy.authorizeProBuild({ ...input, grantedCapabilities: [] })).toThrow()
  expect(() =>
    policy.authorizeProBuild({ ...input, curation: { allowCategories: ['forged'] } }),
  ).toThrow()
  const configuration = structuredClone(f.configuration)
  const release = configuration.releases[0]
  if (!release) throw new Error('Missing policy')
  release.status = 'revoked'
  const revoked = await createStudioRuntimePolicy(configuration, hosts)
  expect(() => revoked.authorizeProBuild(input)).toThrow()
})

test('the Pro compiler policy does not authorize classic JS or Python', async () => {
  for (const [language, kind] of [
    ['javascript', 'classic'],
    ['python', 'pro'],
  ] as const) {
    const f = await authoringFixture(language, kind)
    const policy = await createStudioRuntimePolicy(
      f.configuration,
      createStudioRuntimeHosts(f.configuration.catalog, []),
    )
    expect(() =>
      policy.authorizeProBuild({
        project: studioRuntimeSubject(f.project),
        operation: 'execute',
        curation: {},
        grantedCapabilities: ['execute'],
      }),
    ).toThrow()
  }
})
