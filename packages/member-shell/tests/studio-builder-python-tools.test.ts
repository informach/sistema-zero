import { expect, mock, test } from 'bun:test'
import {
  applyStudioProChange,
  createStudioProRevision,
  type StudioProBuilderJob,
  studioProDigest,
} from '@sistemazero/core/studio'

mock.module('server-only', () => ({}))
const {
  inspectStudioBuilder,
  prepareStudioBuilderContext,
  proposeStudioBuilder,
  studioBuilderSystem,
} = await import('../src/server/studio-builder-tools')
type Answer = import('../src/server/studio-builder-tools').StudioBuilderAnswer

async function fixture(extra: Record<string, string> = {}): Promise<StudioProBuilderJob> {
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
      runtime: { profileId: 'python-test', releaseId: 'test-1', manifestSha256: 'a'.repeat(64) },
      extensions: [],
      python: {
        entrypoint: 'src/main.py',
        dependencyLock: {
          lockVersion: 1,
          target: 'browser',
          pythonVersion: '3.14.2',
          runtimeManifestSha256: 'a'.repeat(64),
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

test('Python builder context and dependencies use the pinned revision without JavaScript recipes or grants', async () => {
  const job = await fixture()
  const prompt = studioBuilderSystem(job.base)
  expect(prompt).toContain('modo Pro Python')
  expect(prompt).toContain('CPython do perfil')
  expect(prompt).toContain('não estão disponíveis neste ambiente Python')
  expect(prompt).not.toContain('edite somente package.json')
  const context = await prepareStudioBuilderContext(job)
  expect(context.programmingLanguage).toBe('python')
  expect(context.environment).toMatchObject({
    entrypoint: 'src/main.py',
    pythonVersion: '3.14.2',
    installationAvailable: false,
  })
  expect(context.supportedDependencies).toEqual([])
  expect(context.sources[0]?.path).toBe('src/main.py')
  const note = await inspectStudioBuilder(job, {
    ...proposal([]),
    action: 'inspect',
    inspections: [{ tool: 'dependencies', path: null, query: null, startLine: null }],
  })
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
  expect(JSON.stringify(await prepareStudioBuilderContext(job))).not.toContain('private\\nkey')
  const note = await inspectStudioBuilder(job, {
    ...proposal([]),
    action: 'inspect',
    inspections: [{ tool: 'read', path: 'src/private.py', startLine: 1, query: null }],
  })
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
    expect(JSON.stringify(await prepareStudioBuilderContext(job))).not.toContain(
      'family-private-builder-marker',
    )
    const note = await inspectStudioBuilder(job, {
      ...proposal([]),
      action: 'inspect',
      inspections: [{ tool: 'read', path, startLine: 1, query: null }],
    })
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
    const note = await inspectStudioBuilder(job, {
      ...proposal([]),
      action: 'inspect',
      inspections: [
        { tool: 'read', path, query: null, startLine: 85 },
        { tool: 'search', path, query: 'marker', startLine: null },
      ],
    })
    expect(note).toContain('marker = 42')
    expect(note).toContain(await studioProDigest(job.base.files[path]!))
    await expect(
      inspectStudioBuilder(job, {
        ...proposal([]),
        action: 'inspect',
        inspections: [{ tool: 'read', path: '../escape.py', query: null, startLine: 1 }],
      }),
    ).rejects.toThrow('Caminho de consulta inválido')
  })
