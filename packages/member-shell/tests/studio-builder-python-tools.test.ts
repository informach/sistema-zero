import { expect, mock, test } from 'bun:test'
import {
  applyStudioProChange,
  createStudioProRevision,
  type StudioProBuilderJob,
  studioProDigest,
} from '@sistemazero/core/studio'
import { createPythonBuilderPolicyResult } from '@sistemazero/core/studio/python-builder-authorization'
import type { StudioPythonProvidedModule } from '@sistemazero/core/studio/python-provided-modules'
import {
  buildPythonProvidedModuleMetadata,
  renderPythonProvidedModuleReference,
} from '@sistemazero/core/studio/python-provided-modules-render'
import {
  createStudioRuntimeRelease,
  type StudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { providedPythonRelease } from '../../core/tests/fixtures/python-provided-release'

mock.module('server-only', () => ({}))
const {
  inspectStudioBuilder,
  prepareStudioBuilderContext,
  proposeStudioBuilder,
  studioBuilderSystem,
} = await import('../src/server/studio-builder-tools')
type Answer = import('../src/server/studio-builder-tools').StudioBuilderAnswer

async function fixture(
  extra: Record<string, string> = {},
  release?: StudioRuntimeRelease,
): Promise<StudioProBuilderJob> {
  const runtime = release
    ? {
        profileId: release.profileId,
        releaseId: release.releaseId,
        manifestSha256: release.manifestSha256,
      }
    : { profileId: 'python-test', releaseId: 'test-1', manifestSha256: 'a'.repeat(64) }
  const base = await createStudioProRevision({
    version: 2,
    projectId: 'python-builder',
    templateId: 'python-blank',
    files: { 'src/main.py': 'goal = 10\nprint(goal)\n', 'requirements.txt': '', ...extra },
    directories: [
      ...new Set([
        'src',
        ...Object.keys(extra).flatMap((path) => {
          const parts = path.split('/')
          return parts.slice(1).map((_part, index) => parts.slice(0, index + 1).join('/'))
        }),
      ]),
    ],
    assets: '{}',
    assetFiles: {},
    configuration: {
      programmingLanguage: 'python',
      runtime,
      extensions: [],
      python: {
        entrypoint: 'src/main.py',
        dependencyLock: {
          lockVersion: 1,
          target: 'browser',
          pythonVersion: '3.14.2',
          runtimeManifestSha256: runtime.manifestSha256,
          requirementsSha256: await studioProDigest(''),
          packages: [],
        },
      },
    },
  })
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    projectId: base.projectId,
    base,
    objective: 'Mudar a meta',
    model: 'provider/model',
    phase: 'generating',
    version: 1,
    modelCalls: 1,
    validationCalls: 0,
    createdAt: new Date(now).toISOString(),
    deadlineAt: new Date(now + 300_000).toISOString(),
    expiresAt: new Date(now + 600_000).toISOString(),
    leaseUntil: null,
    result: null,
    error: null,
    cost: null,
    notes: [],
  }
}

const proposal = (edits: Answer['edits']): Answer => ({
  action: 'propose',
  summary: 'Ajustar meta',
  plan: ['Ajustar a meta preservando o programa.'],
  inspections: [],
  edits,
})

test('provided-module context contains only the approved reference and spends the existing excerpt budget', async () => {
  const release = await providedPythonRelease(),
    job = await fixture({}, release)
  if (job.base.version !== 2) throw new Error('Python required')
  const policy = await createPythonBuilderPolicyResult(
    { runtimeRelease: release },
    job.base.configuration.runtime,
  )
  const context = await prepareStudioBuilderContext(job, policy)
  const reference = renderPythonProvidedModuleReference(
    release.manifest.python!.providedModules![0]!.descriptor,
  )
  expect(context.environment?.providedModules).toEqual([
    { importName: 'sz_audio', version: '1.0.0', reference },
  ])
  expect(JSON.stringify(context)).not.toContain('descriptorArtifact')
  expect(JSON.stringify(context)).not.toContain('browserArtifacts')
  expect(JSON.stringify(context)).not.toContain('https://')
  const note = await inspectStudioBuilder(
    job,
    {
      ...proposal([]),
      action: 'inspect',
      inspections: [{ tool: 'dependencies', path: null, query: null, startLine: null }],
    },
    policy,
  )
  expect(note).toContain(JSON.stringify(reference).slice(1, -1))
  expect(
    context.sources.reduce((total, source) => total + source.content.length, 0) +
      JSON.stringify(context.environment!.providedModules).length,
  ).toBeLessThanOrEqual(14000)
})

test('Python tools reject absent policy rather than treating a missing authorization as legacy', async () => {
  const job = await fixture()
  await expect(prepareStudioBuilderContext(job)).rejects.toThrow('autorização')
})

test.each([
  ['src/sz_audio.py', true],
  ['src/sz_audio.pyi', true],
  ['src/sz_audio/__init__.py', true],
  ['src/sz_audio/__init__.pyi', true],
  ['src/sz_audio/helper.py', false],
  ['other/sz_audio.py', false],
] as const)('provided reference respects the full authored tree at %s', async (path, shadowed) => {
  const release = await providedPythonRelease()
  const job = await fixture(
    {
      ...Object.fromEntries(
        Array.from({ length: 7 }, (_, i) => [`src/goal${i}.py`, '# meta goal\n']),
      ),
      [path]: 'value = 2\n',
    },
    release,
  )
  if (job.base.version !== 2) throw new Error('Python required')
  const policy = await createPythonBuilderPolicyResult(
    { runtimeRelease: release },
    job.base.configuration.runtime,
  )
  const context = await prepareStudioBuilderContext(job, policy)
  expect(context.sources.some((source) => source.path === path)).toBe(false)
  expect(context.environment?.providedModules.map((module) => module.importName)).toEqual(
    shadowed ? [] : ['sz_audio'],
  )
  expect(context.environment?.shadowedProvidedModules).toEqual(shadowed ? ['sz_audio'] : [])
})

test('protected authored shadow and repair creation/deletion never inherit the provided API', async () => {
  const release = await providedPythonRelease(),
    path = 'src/sz_audio.py'
  const job = await fixture({ [path]: 'api_key = "private-marker"\n' }, release)
  if (job.base.version !== 2) throw new Error('Python required')
  const policy = await createPythonBuilderPolicyResult(
    { runtimeRelease: release },
    job.base.configuration.runtime,
  )
  const protectedContext = await prepareStudioBuilderContext(job, policy)
  expect(protectedContext.environment?.providedModules).toEqual([])
  expect(JSON.stringify(protectedContext)).not.toContain('private-marker')
  const change = {
    baseHash: job.base.hash,
    summary: 'Excluir módulo',
    patches: [{ path, before: await studioProDigest(job.base.files[path]!), content: null }],
  }
  const { revision } = await applyStudioProChange(job.base, change)
  job.result = { change, revisionHash: revision.hash, evidence: [], plan: ['Excluir módulo'] }
  expect(
    (await prepareStudioBuilderContext(job, policy)).environment?.providedModules,
  ).toHaveLength(1)
  const fresh = await fixture({}, release)
  const added = {
    baseHash: fresh.base.hash,
    summary: 'Criar módulo',
    patches: [{ path, before: null, content: 'value = 3\n' }],
  }
  const candidate = (await applyStudioProChange(fresh.base, added)).revision
  fresh.result = {
    change: added,
    revisionHash: candidate.hash,
    evidence: [],
    plan: ['Criar módulo'],
  }
  expect((await prepareStudioBuilderContext(fresh, policy)).environment?.providedModules).toEqual(
    [],
  )
})

test('entrypoint changes select the authored import root, not every folder in the project', async () => {
  const release = await providedPythonRelease(),
    job = await fixture(
      { 'other/main.py': 'print(1)\n', 'other/sz_audio.py': 'value = 3\n' },
      release,
    )
  if (job.base.version !== 2 || job.base.configuration.programmingLanguage !== 'python')
    throw new Error('Python required')
  const policy = await createPythonBuilderPolicyResult(
    { runtimeRelease: release },
    job.base.configuration.runtime,
  )
  expect(
    (await prepareStudioBuilderContext(job, policy)).environment?.providedModules,
  ).toHaveLength(1)
  job.base = await createStudioProRevision({
    ...job.base,
    configuration: {
      ...job.base.configuration,
      python: { ...job.base.configuration.python, entrypoint: 'other/main.py' },
    },
  })
  expect((await prepareStudioBuilderContext(job, policy)).environment?.providedModules).toEqual([])
})

test('an approved reference exceeding the existing context budget fails without truncating its limits', async () => {
  const original = await providedPythonRelease(),
    modules: StudioPythonProvidedModule[] = [],
    artifacts = [...original.manifest.artifacts]
  for (let index = 0; index < 8; index++) {
    const metadata = await buildPythonProvidedModuleMetadata({
      ...original.manifest.python!.providedModules![0]!.descriptor,
      importName: `sz_audio_${index}`,
    })
    const descriptorArtifact = {
        path: metadata.descriptorFile.path,
        sha256: metadata.descriptorFile.sha256,
      },
      typingArtifact = { path: metadata.typingFile.path, sha256: metadata.typingFile.sha256 }
    artifacts.push(descriptorArtifact, typingArtifact)
    modules.push({
      descriptor: metadata.descriptor,
      descriptorArtifact,
      typingArtifact,
      browserArtifacts: original.manifest.python!.providedModules![0]!.browserArtifacts,
    })
  }
  const release = await createStudioRuntimeRelease({
    ...original.manifest,
    artifacts,
    python: { ...original.manifest.python!, providedModules: modules },
  })
  const job = await fixture({}, release)
  if (job.base.version !== 2) throw new Error('Python required')
  const policy = await createPythonBuilderPolicyResult(
    { runtimeRelease: release },
    job.base.configuration.runtime,
  )
  expect(
    JSON.stringify(
      modules.map(({ descriptor }) => ({
        importName: descriptor.importName,
        version: descriptor.version,
        reference: renderPythonProvidedModuleReference(descriptor),
      })),
    ).length,
  ).toBeGreaterThan(14000)
  await expect(prepareStudioBuilderContext(job, policy)).rejects.toThrow('orçamento')
  expect(() => studioBuilderSystem(job.base, policy)).toThrow('orçamento')
})

test('Python builder context and dependencies use the pinned revision without JavaScript recipes or grants', async () => {
  const job = await fixture()
  const prompt = studioBuilderSystem(job.base, {})
  expect(prompt).toContain('modo Pro Python')
  expect(prompt).toContain('CPython do perfil')
  expect(prompt).toContain('não estão disponíveis neste ambiente Python')
  expect(prompt).not.toContain('edite somente package.json')
  const context = await prepareStudioBuilderContext(job, {})
  expect(context.programmingLanguage).toBe('python')
  expect(context.environment).toMatchObject({
    entrypoint: 'src/main.py',
    pythonVersion: '3.14.2',
    installationAvailable: false,
  })
  expect(context.supportedDependencies).toEqual([])
  expect(context.sources[0]?.path).toBe('src/main.py')
  const note = await inspectStudioBuilder(
    job,
    {
      ...proposal([]),
      action: 'inspect',
      inspections: [{ tool: 'dependencies', path: null, query: null, startLine: null }],
    },
    {},
  )
  expect(note).toContain('requirements')
  expect(note).not.toContain('package.json')
})

test('Python builder proposes an exact patch with no invented evidence and preserves configuration and inverse', async () => {
  const job = await fixture()
  const result = await proposeStudioBuilder(
    job,
    proposal([
      {
        operation: 'replace',
        path: 'src/main.py',
        before: await studioProDigest(job.base.files['src/main.py']!),
        find: 'goal = 10',
        content: 'goal = 12',
      },
    ]),
  )
  expect(result.evidence).toEqual([])
  expect(result.preview).toBeUndefined()
  const applied = await applyStudioProChange(job.base, result.change)
  expect(applied.revision.files['src/main.py']).toBe('goal = 12\nprint(goal)\n')
  expect(applied.revision.version).toBe(2)
  if (applied.revision.version !== 2 || job.base.version !== 2)
    throw new Error('Version 2 required')
  expect(applied.revision.configuration).toEqual(job.base.configuration)
  expect((await applyStudioProChange(applied.revision, applied.inverse)).revision).toEqual(job.base)
})

for (const path of ['requirements.txt', 'package.json', 'package-lock.json'])
  test(`Python builder cannot acquire dependencies by editing ${path}`, async () => {
    const job = await fixture()
    await expect(
      proposeStudioBuilder(
        job,
        proposal([
          {
            operation: 'create',
            path,
            before: null,
            find: null,
            content: 'requests==2.0.0',
          },
        ]),
      ),
    ).rejects.toThrow('não pode alterar dependências')
  })

test('Python private source is neither exposed nor edited by builder tools', async () => {
  const source = 'api_key: str = """private\nkey"""\n'
  const job = await fixture({ 'src/private.py': source })
  expect(JSON.stringify(await prepareStudioBuilderContext(job, {}))).not.toContain('private\\nkey')
  const note = await inspectStudioBuilder(
    job,
    {
      ...proposal([]),
      action: 'inspect',
      inspections: [{ tool: 'read', path: 'src/private.py', startLine: 1, query: null }],
    },
    {},
  )
  expect(note).toContain('protegido')
  await expect(
    proposeStudioBuilder(
      job,
      proposal([
        {
          operation: 'delete',
          path: 'src/private.py',
          before: await studioProDigest(source),
          find: null,
          content: null,
        },
      ]),
    ),
  ).rejects.toThrow('protegido')
})

for (const path of [
  'src/my-secrets.py',
  'src/credentials_extra.py',
  'secrets/private.py',
  '.env/private.py',
  '.ENV/private.py',
])
  test(`builder respects the shared sensitive-path policy for ${path}`, async () => {
    const source = 'values = ["family-private-builder-marker"]\n'
    const job = await fixture({ [path]: source })
    expect(JSON.stringify(await prepareStudioBuilderContext(job, {}))).not.toContain(
      'family-private-builder-marker',
    )
    const note = await inspectStudioBuilder(
      job,
      {
        ...proposal([]),
        action: 'inspect',
        inspections: [{ tool: 'read', path, startLine: 1, query: null }],
      },
      {},
    )
    expect(note).not.toContain('family-private-builder-marker')
    expect(note).toContain('protegido')
    await expect(
      proposeStudioBuilder(
        job,
        proposal([
          {
            operation: 'delete',
            path,
            before: await studioProDigest(source),
            find: null,
            content: null,
          },
        ]),
      ),
    ).rejects.toThrow('protegido')
  })

for (const path of [
  'dist/helper.py',
  `${Array.from({ length: 12 }, (_, i) => `p${i}`).join('/')}/helper.py`,
])
  test(`Python builder reads and searches every accepted portable path, including ${path}`, async () => {
    const job = await fixture({
      [path]: `${Array.from({ length: 90 }, (_, i) => `# linha ${i}`).join('\n')}\nmarker = 42\n`,
    })
    const note = await inspectStudioBuilder(
      job,
      {
        ...proposal([]),
        action: 'inspect',
        inspections: [
          { tool: 'read', path, query: null, startLine: 85 },
          { tool: 'search', path, query: 'marker', startLine: null },
        ],
      },
      {},
    )
    expect(note).toContain('marker = 42')
    expect(note).toContain(await studioProDigest(job.base.files[path]!))
    await expect(
      inspectStudioBuilder(
        job,
        {
          ...proposal([]),
          action: 'inspect',
          inspections: [{ tool: 'read', path: '../escape.py', query: null, startLine: 1 }],
        },
        {},
      ),
    ).rejects.toThrow('Caminho de consulta inválido')
  })
