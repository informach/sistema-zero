import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  assertBlockCoherent,
  assertCurrentStudioAuthoring,
} from '../../src/application/content-admin/content-admin.service'
import { createStudioAuthoringPolicy } from '../../src/domain/studio/authoring-policy'
import { authoringFixture } from '../fakes/studio-authoring-policy'

test('discovery copies cannot alter approval, block curation or release lifecycle', async () => {
  const { policy, project, configuration } = await authoringFixture('python', 'classic')
  const described = policy.describe()
  described.releases[0]!.blockIds.push('foreign-block')
  described.releases[0]!.status = 'revoked'
  described.catalog.releases.length = 0
  expect(policy.describe()).toEqual(configuration)
  expect(() => policy.assert(project, {})).not.toThrow()
  expect(() => policy.assert(project, { allowBlocks: ['foreign-block'] })).toThrow()
  for (const status of ['retired', 'revoked'] as const) {
    configuration.releases[0]!.status = status
    const restricted = await createStudioAuthoringPolicy(configuration)
    expect(restricted.describe().releases[0]!.status).toBe(status)
    expect(() => restricted.assert(project, {})).toThrow('ativo')
  }
})

for (const language of ['javascript', 'python'] as const)
  for (const kind of ['classic', 'pro'] as const)
    test(`publication accepts approved ${language}/${kind} without changing the document`, async () => {
      const { project, policy } = await authoringFixture(language, kind)
      const before = JSON.stringify(project)
      expect(() => assertCurrentStudioAuthoring(project)).not.toThrow()
      expect(() =>
        assertBlockCoherent({ kind: 'studio', initialProject: project }, policy),
      ).not.toThrow()
      expect(JSON.stringify(project)).toBe(before)
      expect(() => assertBlockCoherent({ kind: 'studio', initialProject: project })).toThrow(
        'catálogo',
      )
    })

test('authoring denies incompatible curation, templates, extensions, locks and unapproved runtime', async () => {
  const { project, policy } = await authoringFixture('python', 'pro')
  const block = { kind: 'studio' as const, initialProject: project }
  for (const curation of [
    { allowedModes: ['blocks'] as ['blocks'] },
    { allowBlocks: ['sz_js_log'] },
    { allowCategories: ['js'] },
    { level: 'inexistente' as 'iniciante' },
  ])
    expect(() => assertBlockCoherent({ ...block, ...curation }, policy)).toThrow()
  for (const patch of [
    { runtime: { ...project.runtime, manifestSha256: 'b'.repeat(64) } },
    { proMeta: { templateId: 'not-approved' } },
    { installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 1 }] },
    { programmingLanguage: 'javascript' },
  ])
    expect(() =>
      assertBlockCoherent({ ...block, initialProject: { ...project, ...patch } }, policy),
    ).toThrow()
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.tree['requirements.txt'] = { kind: 'file', content: 'requests==2.0.0' }
  expect(() => assertBlockCoherent(block, policy)).toThrow('requirements.txt')
  project.python.dependencyLock.requirementsSha256 = createHash('sha256')
    .update('requests==2.0.0')
    .digest('hex')
  expect(() => assertBlockCoherent(block, policy)).toThrow('pacotes externos')
  const comment = '# Turtle não precisa de pip\r\n \n'
  project.tree['requirements.txt'] = { kind: 'file', content: comment }
  project.python.dependencyLock.requirementsSha256 = createHash('sha256')
    .update(comment)
    .digest('hex')
  expect(() => assertBlockCoherent(block, policy)).not.toThrow()
  project.tree['requirements.txt'] = { kind: 'file', content: '' }
  project.python.dependencyLock.requirementsSha256 = createHash('sha256').update('').digest('hex')
  project.python.dependencyLock.pythonVersion = '3.13.0'
  expect(() => assertBlockCoherent(block, policy)).toThrow('dependências')
})

test('deployment policy verifies hashes, completeness and statuses before approving publication', async () => {
  const { project, configuration } = await authoringFixture('python', 'classic')
  for (const status of ['retired', 'revoked'] as const) {
    const input = structuredClone(configuration)
    input.releases[0]!.status = status
    const policy = await createStudioAuthoringPolicy(input)
    expect(() => assertCurrentStudioAuthoring(project)).not.toThrow()
    expect(() => assertBlockCoherent({ kind: 'studio', initialProject: project }, policy)).toThrow(
      'ativo',
    )
  }
  const release = configuration.catalog.releases[0]!
  const tampered = {
    ...configuration,
    catalog: {
      ...configuration.catalog,
      releases: [
        {
          ...release,
          manifest: {
            ...release.manifest,
            artifacts: [{ path: 'inert.txt', sha256: 'b'.repeat(64) }],
          },
        },
      ],
    },
  }
  await expect(createStudioAuthoringPolicy(tampered)).rejects.toThrow('hash')
  await expect(createStudioAuthoringPolicy({ ...configuration, releases: [] })).rejects.toThrow(
    'cada release',
  )
  await expect(
    createStudioAuthoringPolicy({
      ...configuration,
      releases: [...configuration.releases, ...configuration.releases],
    }),
  ).rejects.toThrow()
  // Caller mutation cannot change the copied, verified policy after startup.
  const policy = await createStudioAuthoringPolicy(configuration)
  configuration.releases[0]!.status = 'revoked'
  expect(() =>
    assertBlockCoherent({ kind: 'studio', initialProject: project }, policy),
  ).not.toThrow()
})

test('legacy JS remains authorable; historical or forged Python v2 cannot bypass the catalog', () => {
  const legacy = { formatVersion: 2, name: 'Jogo', files: { 'index.html': '' } }
  expect(() => assertBlockCoherent({ kind: 'studio', initialProject: legacy })).not.toThrow()
  for (const patch of [
    { formatVersion: 1 },
    { programmingLanguage: 'python' },
    { python: {} },
    { runtime: {} },
  ])
    expect(() => assertCurrentStudioAuthoring({ ...legacy, ...patch })).toThrow()
})
