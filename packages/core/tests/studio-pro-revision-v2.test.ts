import { describe, expect, test } from 'bun:test'
import { studioProChangeScopeIssue } from '../src/studio/pro-change-scope'
import {
  applyStudioProChange,
  createStudioProRevision,
  parseStudioProRevision,
  type StudioProRevisionV2,
  studioProDigest,
} from '../src/studio/pro-revision'

async function pythonRevision() {
  return createStudioProRevision({
    version: 2,
    projectId: 'my-game',
    templateId: 'python-empty',
    files: { 'main.py': 'print("Olá")\n', 'helper.py': 'print(2)\n' },
    directories: [],
    assets: '{}',
    assetFiles: {},
    configuration: {
      programmingLanguage: 'python',
      runtime: {
        profileId: 'python-browser',
        releaseId: 'python-1',
        manifestSha256: 'a'.repeat(64),
      },
      extensions: [],
      python: {
        entrypoint: 'main.py',
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
}
function pythonConfiguration(base: StudioProRevisionV2) {
  if (base.configuration.programmingLanguage !== 'python') throw new Error('Expected Python')
  return base.configuration
}

describe('versioned Pro revision and atomic configuration changes', () => {
  test('v1 remains readable and uses the historical digest and source-only inverse', async () => {
    const source = {
      version: 1 as const,
      projectId: 'game',
      templateId: 'vite',
      devScript: 'dev',
      files: { 'main.js': 'let n=1' },
      directories: [],
      assets: '{}',
      assetFiles: {},
    }
    const expected = await studioProDigest(JSON.stringify(source))
    const base = await createStudioProRevision(source)
    expect(base.hash).toBe(expected)
    expect(await parseStudioProRevision({ ...source, hash: expected })).toEqual(base)
    const result = await applyStudioProChange(base, {
      baseHash: base.hash,
      summary: 'Mudar número',
      patches: [{ path: 'main.js', before: await studioProDigest('let n=1'), content: 'let n=2' }],
    })
    expect((await applyStudioProChange(result.revision, result.inverse)).revision).toEqual(base)
    const config = (await pythonRevision()).configuration
    await expect(
      applyStudioProChange(base, {
        baseHash: base.hash,
        summary: 'Configurar',
        patches: [],
        configuration: { before: config, after: config },
      }),
    ).rejects.toThrow('antiga')
  })

  test('v2 preserves Python source and configuration across HTTP JSON without synthetic web fields', async () => {
    const base = await pythonRevision()
    expect(await parseStudioProRevision(JSON.parse(JSON.stringify(base)))).toEqual(base)
    expect(Object.hasOwn(base, 'devScript')).toBe(false)
    expect(Object.hasOwn(base.files, 'index.html')).toBe(false)
    await expect(parseStudioProRevision({ ...base, devScript: 'dev' })).rejects.toThrow('inválida')
    await expect(parseStudioProRevision({ ...base, hash: 'b'.repeat(64) })).rejects.toThrow(
      'alterada',
    )
  })

  test('entrypoint and source update atomically, and undo restores their exact base', async () => {
    const base = await pythonRevision(),
      before = pythonConfiguration(base)
    const after = { ...before, python: { ...before.python, entrypoint: 'helper.py' } }
    const result = await applyStudioProChange(base, {
      baseHash: base.hash,
      summary: 'Começar pelo helper',
      patches: [
        {
          path: 'helper.py',
          before: await studioProDigest(base.files['helper.py']!),
          content: 'print(42)\n',
        },
      ],
      configuration: { before, after },
    })
    expect(pythonConfiguration(result.revision).python.entrypoint).toBe('helper.py')
    expect(result.revision.files['helper.py']).toBe('print(42)\n')
    expect(result.revision.hash).not.toBe(base.hash)
    expect((await applyStudioProChange(result.revision, result.inverse)).revision).toEqual(base)
    expect(base.files['helper.py']).toBe('print(2)\n')
  })

  test('an environment-only edit invalidates old proposals even when files are unchanged', async () => {
    const base = await pythonRevision(),
      before = pythonConfiguration(base)
    const change = {
      baseHash: base.hash,
      summary: 'Adicionar Turtle',
      patches: [],
      configuration: {
        before,
        after: { ...before, extensions: [{ id: 'python-turtle', version: '1.0.0' }] },
      },
    }
    const current = (await applyStudioProChange(base, change)).revision
    expect(current.files).toEqual(base.files)
    expect(current.hash).not.toBe(base.hash)
    await expect(applyStudioProChange(current, change)).rejects.toThrow('revisão-base mudou')
    await expect(
      applyStudioProChange(current, { ...change, baseHash: current.hash }),
    ).rejects.toThrow('configuração-base mudou')
    await expect(
      applyStudioProChange(base, { ...change, configuration: { before, after: before } }),
    ).rejects.toThrow('não altera')
  })

  test('requirements and their lock update in the same change and inverse', async () => {
    const base = await pythonRevision(),
      before = pythonConfiguration(base)
    const source = '# Dependências homologadas\n'
    const patches = [{ path: 'requirements.txt', before: null, content: source }]
    await expect(
      applyStudioProChange(base, { baseHash: base.hash, summary: 'Dependências', patches }),
    ).rejects.toThrow('lock')
    const after = {
      ...before,
      python: {
        ...before.python,
        dependencyLock: {
          ...before.python.dependencyLock,
          requirementsSha256: await studioProDigest(source),
        },
      },
    }
    const result = await applyStudioProChange(base, {
      baseHash: base.hash,
      summary: 'Dependências',
      patches,
      configuration: { before, after },
    })
    expect((await applyStudioProChange(result.revision, result.inverse)).revision).toEqual(base)
  })

  test('invalid entrypoints, cross-language conversion and mismatched locks are refused without mutation', async () => {
    const base = await pythonRevision(),
      before = pythonConfiguration(base),
      snapshot = structuredClone(base)
    for (const after of [
      { ...before, python: { ...before.python, entrypoint: 'missing.py' } },
      { ...before, runtime: { ...before.runtime, manifestSha256: 'b'.repeat(64) } },
      {
        programmingLanguage: 'javascript' as const,
        runtime: before.runtime,
        extensions: [],
        devScript: 'dev',
      },
    ])
      await expect(
        applyStudioProChange(base, {
          baseHash: base.hash,
          summary: 'Ambiente',
          patches: [],
          configuration: { before, after },
        }),
      ).rejects.toThrow()
    expect(base).toEqual(snapshot)
  })

  test('Python assets remain portable and cannot collide with source or implicit directories', async () => {
    const base = await pythonRevision()
    const sha = 'b'.repeat(64)
    expect(
      (await createStudioProRevision({ ...base, assetFiles: { 'assets/hero.png': sha } }))
        .assetFiles,
    ).toEqual({ 'assets/hero.png': sha })
    expect(
      (
        await createStudioProRevision({
          ...base,
          assetFiles: { 'hero.gif': sha, 'sound.wav': sha },
        })
      ).assetFiles,
    ).toEqual({ 'hero.gif': sha, 'sound.wav': sha })
    const invalidAssets: Record<string, string>[] = [
      { 'main.py': sha },
      { 'assets/plugin.whl': sha },
      { 'assets/CON.png': sha },
      { 'assets/A/x.png': sha, 'assets/a/y.png': sha },
    ]
    for (const assetFiles of invalidAssets)
      await expect(createStudioProRevision({ ...base, assetFiles })).rejects.toThrow()
    await expect(
      createStudioProRevision({
        ...base,
        files: { ...base.files, 'assets/hero.png': 'source' },
        directories: ['assets'],
        assetFiles: { 'assets/hero.png': sha },
      }),
    ).rejects.toThrow('colide')
    for (const directories of [['Assets'], ['assets', 'assets/A']])
      await expect(
        createStudioProRevision({ ...base, directories, assetFiles: { 'assets/a/hero.png': sha } }),
      ).rejects.toThrow('conflitantes')
  })

  test('capture, editing and undo use the same Python path policy', async () => {
    const initial = await pythonRevision(),
      configuration = pythonConfiguration(initial)
    for (const path of [
      'dist/main.py',
      `${Array.from({ length: 12 }, (_, i) => `p${i}`).join('/')}/main.py`,
    ]) {
      const parts = path.split('/')
      const directories = parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'))
      const base = await createStudioProRevision({
        ...initial,
        files: { [path]: 'print(1)' },
        directories,
        configuration: { ...configuration, python: { ...configuration.python, entrypoint: path } },
      })
      const result = await applyStudioProChange(base, {
        baseHash: base.hash,
        summary: 'Editar Python',
        patches: [{ path, before: await studioProDigest('print(1)'), content: 'print(2)' }],
      })
      expect(result.revision.files[path]).toBe('print(2)')
      expect((await applyStudioProChange(result.revision, result.inverse)).revision).toEqual(base)
    }
  })

  test('in-flight inputs are snapshots; caller mutation cannot change the proposal mid-hash', async () => {
    const base = await pythonRevision(),
      snapshot = structuredClone(base)
    const before = pythonConfiguration(base)
    const change = {
      baseHash: base.hash,
      summary: 'Turtle',
      patches: [],
      configuration: {
        before,
        after: { ...before, extensions: [{ id: 'python-turtle', version: '1.0.0' }] },
      },
    }
    const applying = applyStudioProChange(base, change)
    base.files['main.py'] = 'raise RuntimeError()'
    change.configuration.after.extensions[0]!.version = '9.9.9'
    const result = await applying
    expect(result.revision.files).toEqual(snapshot.files)
    expect(result.revision.configuration.extensions).toEqual([
      { id: 'python-turtle', version: '1.0.0' },
    ])
  })

  test('a line-scoped assistance request cannot change execution configuration', async () => {
    const base = await pythonRevision()
    expect(
      studioProChangeScopeIssue(
        { scope: 'selection' } as Parameters<typeof studioProChangeScopeIssue>[0],
        base.files,
        {
          baseHash: base.hash,
          summary: 'Configuração',
          patches: [],
          configuration: { before: base.configuration, after: base.configuration },
        },
      ),
    ).toContain('fora das linhas')
  })
})
