import { beforeAll, describe, expect, test } from 'bun:test'
import {
  StudioProjectDocumentSchema,
  upgradeStudioProjectDocumentV2,
} from '../src/studio/project-document'
import { copyStudioProjectJson } from '../src/studio/project-json'
import {
  createStudioRuntimeRelease,
  type StudioRuntimeRelease,
} from '../src/studio/runtime-catalog'

const hash = 'a'.repeat(64)
const common = {
  formatVersion: 3,
  id: 'project-1',
  name: 'Meu jogo',
  createdAt: 1,
  updatedAt: 2,
  projectTools: [],
  installedExtensions: [],
  assets: [],
  ir: null,
  blocksState: null,
}
const javascriptRuntime = {
  profileId: 'javascript-web',
  releaseId: 'javascript-1',
  manifestSha256: hash,
}
const pythonRuntime = { profileId: 'python-browser', releaseId: 'python-1', manifestSha256: hash }
const python = {
  entrypoint: 'main.py',
  dependencyLock: {
    lockVersion: 1,
    target: 'browser',
    pythonVersion: '3.14.2',
    runtimeManifestSha256: hash,
    requirementsSha256: hash,
    packages: [],
  },
}
const javascript = {
  ...common,
  programmingLanguage: 'javascript',
  runtime: javascriptRuntime,
  kind: 'classic',
  mode: 'bridge',
  files: { 'index.html': '<canvas></canvas>', 'style.css': 'body{}', 'script.js': 'const a = 1' },
  extraFiles: [{ name: 'helpers.ts', language: 'typescript', content: 'export const n = 2' }],
}
const pythonClassic = {
  ...common,
  programmingLanguage: 'python',
  runtime: pythonRuntime,
  kind: 'classic',
  mode: 'bridge',
  python,
  files: { 'main.py': 'print("Olá")', 'helper.py': 'n=2' },
}
const pythonPro = {
  ...common,
  programmingLanguage: 'python',
  runtime: pythonRuntime,
  kind: 'pro',
  mode: 'code',
  python: { ...python, entrypoint: 'app/main.py' },
  tree: {
    app: { kind: 'dir' },
    'app/main.py': { kind: 'file', content: 'from helper import n\nprint(n)' },
    'app/helper.py': { kind: 'file', content: 'n=42' },
  },
  proMeta: { templateId: 'python-blank' },
}

describe('four explicit project document variants', () => {
  test('retains JavaScript fields, source authority and Pro metadata', () => {
    const stale = {
      ...javascript,
      bridgeCodeAhead: true,
      ir: { old: true },
      blocksState: { old: true },
    }
    expect<unknown>(StudioProjectDocumentSchema.parse(stale)).toEqual(stale)
    const pro = {
      ...javascript,
      kind: 'pro',
      mode: 'code',
      tree: { src: { kind: 'dir' }, 'src/main.ts': { kind: 'file', content: 'console.log(42)' } },
      proMeta: {
        templateId: 'vite',
        devScript: 'dev',
        origin: { projectId: 'backup-1', revision: 4 },
        publication: { playId: '00000000-0000-0000-0000-000000000001' },
        assistance: {
          version: 1,
          briefing: 'Meu jogo',
          decisions: [{ id: '1', text: 'Pular', provenance: 'learner', confirmed: true }],
        },
      },
    }
    expect<unknown>(StudioProjectDocumentSchema.parse(pro)).toEqual(pro)
  })

  test('Python does not acquire synthetic HTML/CSS/JavaScript or a dev script', () => {
    const classic = StudioProjectDocumentSchema.parse(pythonClassic)
    const pro = StudioProjectDocumentSchema.parse(pythonPro)
    expect<unknown>(classic).toEqual(pythonClassic)
    expect<unknown>(pro).toEqual(pythonPro)
    expect(Object.hasOwn(pro, 'files')).toBe(false)
    expect(Object.hasOwn(pro, 'extraFiles')).toBe(false)
    expect(Object.hasOwn(pythonPro.proMeta, 'devScript')).toBe(false)
    expect(
      StudioProjectDocumentSchema.safeParse({ ...pythonPro, files: javascript.files }).success,
    ).toBe(false)
    expect(
      StudioProjectDocumentSchema.safeParse({
        ...pythonPro,
        proMeta: { ...pythonPro.proMeta, devScript: 'dev' },
      }).success,
    ).toBe(false)
    expect(
      StudioProjectDocumentSchema.safeParse({ ...pythonClassic, extraFiles: [] }).success,
    ).toBe(false)
  })

  test('the entrypoint must be an existing Python source in the right variant', () => {
    for (const entrypoint of ['missing.py', 'app', '../main.py', 'app/main.js']) {
      expect(
        StudioProjectDocumentSchema.safeParse({
          ...pythonPro,
          python: { ...pythonPro.python, entrypoint },
        }).success,
      ).toBe(false)
    }
    expect(
      StudioProjectDocumentSchema.safeParse({
        ...pythonClassic,
        python: { ...python, entrypoint: 'helper.py' },
      }).success,
    ).toBe(false)
    expect(
      StudioProjectDocumentSchema.safeParse({ ...pythonClassic, files: { 'helper.py': 'x=1' } })
        .success,
    ).toBe(false)
  })

  test('Python source with a syntax error remains exact and recoverable', () => {
    const source = 'def broken(:\n    ação = "não apague"\n'
    const value = {
      ...pythonClassic,
      files: { ...pythonClassic.files, 'main.py': source },
      bridgeCodeAhead: true,
    }
    const parsed = StudioProjectDocumentSchema.parse(value)
    expect<unknown>(parsed).toEqual(value)
    expect(parsed).not.toBe(value)
    if (parsed.programmingLanguage !== 'python') throw new Error('Python changed language')
    expect(parsed.python).not.toBe(value.python)
  })

  test('variant disagreement or an unknown future version fails without fallback', () => {
    for (const variant of [
      { ...pythonPro, mode: 'blocks' },
      { ...pythonClassic, kind: 'pro' },
      { ...pythonClassic, programmingLanguage: 'Python' },
      { ...pythonClassic, formatVersion: 4 },
      { ...pythonClassic, programmingLanguage: undefined },
      { ...javascript, python },
      {
        ...pythonClassic,
        python: {
          ...python,
          dependencyLock: { ...python.dependencyLock, runtimeManifestSha256: 'b'.repeat(64) },
        },
      },
    ])
      expect(StudioProjectDocumentSchema.safeParse(variant).success).toBe(false)
  })

  test('Python trees preserve explicit directories and reject aliases and file parents', () => {
    for (const tree of [
      { 'app/main.py': pythonPro.tree['app/main.py'] },
      { app: { kind: 'file', content: '' }, 'app/main.py': pythonPro.tree['app/main.py'] },
      { ...pythonPro.tree, App: { kind: 'dir' } },
    ])
      expect(StudioProjectDocumentSchema.safeParse({ ...pythonPro, tree }).success).toBe(false)
    expect(
      StudioProjectDocumentSchema.safeParse({
        ...pythonClassic,
        files: { 'main.py': '', app: '', 'app/helper.py': '' },
      }).success,
    ).toBe(false)
  })

  test('payloads are required and unknown authored fields are not silently discarded', () => {
    const { ir: _ir, ...withoutIr } = pythonClassic
    expect(StudioProjectDocumentSchema.safeParse(withoutIr).success).toBe(false)
    expect(
      StudioProjectDocumentSchema.safeParse({
        ...pythonPro,
        proMeta: { ...pythonPro.proMeta, futureDecision: 'keep me' },
      }).success,
    ).toBe(false)
    expect(
      StudioProjectDocumentSchema.safeParse({
        ...pythonPro,
        proMeta: {
          ...pythonPro.proMeta,
          assistance: { version: 1, questions: [{ id: 'a', text: 'Como?', status: 'answered' }] },
        },
      }).success,
    ).toBe(false)
  })

  test('reserved record keys are rejected before the schema can discard an authored file', () => {
    const tree = JSON.parse('{"__proto__":{"kind":"file","content":"preserve me"}}')
    expect(
      StudioProjectDocumentSchema.safeParse({
        ...javascript,
        kind: 'pro',
        mode: 'code',
        tree,
        proMeta: { templateId: 't', devScript: 'dev' },
      }).success,
    ).toBe(false)
    const files = JSON.parse('{"main.py":"print(1)","__proto__":"preserve me"}')
    expect(StudioProjectDocumentSchema.safeParse({ ...pythonClassic, files }).success).toBe(false)
    expect(Object.hasOwn(files, '__proto__')).toBe(true)
    expect(files.__proto__).toBe('preserve me')
  })
})

describe('project JSON budget before payload schemas', () => {
  test('does not call getters or toJSON and rejects cycles/classes', () => {
    let calls = 0
    const payload = {
      get danger() {
        calls++
        return 'bad'
      },
    }
    expect(() => copyStudioProjectJson(payload)).toThrow('executável')
    expect(calls).toBe(0)
    expect(
      StudioProjectDocumentSchema.safeParse({ ...pythonClassic, blocksState: payload }).success,
    ).toBe(false)
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    expect(() => copyStudioProjectJson(cycle)).toThrow('circular')
    expect(() => copyStudioProjectJson(new Date())).toThrow()
    expect(() =>
      copyStudioProjectJson({
        toJSON: () => {
          calls++
          return 1
        },
      }),
    ).toThrow()
    expect(calls).toBe(0)
  })

  test('budgets include keys and queued nodes, reject sparse arrays and do not pollute prototypes', () => {
    const budget = { nodes: 4, textChars: 8, depth: 3 }
    expect(copyStudioProjectJson({ a: [1, 2] }, budget)).toEqual({ a: [1, 2] })
    expect(() => copyStudioProjectJson({ a: [1, 2, 3] }, budget)).toThrow('complexidade')
    expect(() => copyStudioProjectJson({ 'very-long-key': '' }, budget)).toThrow('complexidade')
    expect(() =>
      copyStudioProjectJson({ a: { b: { c: { d: 1 } } } }, { ...budget, nodes: 20 }),
    ).toThrow('complexidade')
    expect(() => copyStudioProjectJson(Array(2))).toThrow()
    expect(() => copyStudioProjectJson([undefined])).toThrow()
    const raw = JSON.parse('{"__proto__":{"polluted":true}}')
    const copied = copyStudioProjectJson(raw) as Record<string, unknown>
    expect(Object.hasOwn(copied, '__proto__')).toBe(true)
    expect(Object.getPrototypeOf(copied)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('deep Blockly chains are copied iteratively and remain detached from the input', () => {
    let nested: Record<string, unknown> = { leaf: 42 }
    for (let index = 0; index < 2500; index++) nested = { next: nested }
    const result = StudioProjectDocumentSchema.parse({ ...pythonClassic, blocksState: nested })
    expect(result.blocksState).not.toBe(nested)
    let cursor = result.blocksState as Record<string, unknown>
    for (let index = 0; index < 2500; index++) cursor = cursor.next as Record<string, unknown>
    expect(cursor.leaf).toBe(42)
  })
})

describe('explicit v2 to v3 migration', () => {
  let release: StudioRuntimeRelease
  beforeAll(async () => {
    release = await createStudioRuntimeRelease({
      manifestVersion: 1,
      profileId: 'javascript-web',
      releaseId: 'javascript-1',
      programmingLanguage: 'javascript',
      kinds: ['classic', 'pro'],
      modes: ['blocks', 'bridge', 'code'],
      capabilities: ['edit', 'execute', 'export-source'],
      extensions: [],
      sourceTargets: ['browser'],
      requiredBrowserFeatures: [],
      artifacts: [{ path: 'runtime/preview.js', sha256: hash }],
    })
  })
  function legacy() {
    const { programmingLanguage: _language, runtime: _runtime, kind: _kind, ...prior } = javascript
    return { ...prior, formatVersion: 2 }
  }

  test('adds identity without running old JavaScript/block transformations again', () => {
    const original = {
      ...legacy(),
      files: {
        ...javascript.files,
        'script.js': 'const game = new Game2D();\n// never rewrite v2 source',
      },
      bridgeCodeAhead: true,
      ir: { old: true },
      blocksState: { old: true },
      coverAssetName: 'capa.png',
      assets: [{ id: 'drawing-1', name: 'capa.png', dataUrl: 'data:image/png;base64,YQ==' }],
    }
    const snapshot = structuredClone(original)
    const result = upgradeStudioProjectDocumentV2(original, release)
    expect(original).toEqual(snapshot)
    expect(result.fromVersion).toBe(2)
    expect(result.document.programmingLanguage).toBe('javascript')
    expect(result.document.kind).toBe('classic')
    expect(result.document.updatedAt).toBe(original.updatedAt)
    expect(result.document.ir).toEqual(original.ir)
    expect(result.document.blocksState).toEqual(original.blocksState)
    expect(result.document.assets).toEqual(original.assets)
    if (result.document.programmingLanguage !== 'javascript') throw new Error('Invalid migration')
    expect(result.document.files).toEqual(original.files)
    expect<unknown>(result.document.extraFiles).toEqual(original.extraFiles)
    const again = upgradeStudioProjectDocumentV2(result.document, release)
    expect(again.document).toEqual(result.document)
    expect(again.changes).toEqual([])
  })

  test('preserves the Pro tree, publication, learner context and origin in place', () => {
    const original = {
      ...legacy(),
      kind: 'pro',
      mode: 'code',
      tree: {
        src: { kind: 'dir' },
        'src/main.ts': { kind: 'file', content: 'document.body.textContent = "Meu jogo"' },
        'package.json': { kind: 'file', content: '{"scripts":{"dev":"vite"}}' },
      },
      proMeta: {
        templateId: 'vite',
        devScript: 'dev',
        origin: { projectId: 'backup-1', revision: 4 },
        publication: { playId: '00000000-0000-0000-0000-000000000001' },
        assistance: { version: 1, briefing: 'Minha ideia' },
      },
    }
    const { document } = upgradeStudioProjectDocumentV2(original, release)
    if (document.kind !== 'pro') throw new Error('Lost project kind')
    expect<unknown>(document.tree).toEqual(original.tree)
    expect<unknown>(document.proMeta).toEqual(original.proMeta)
  })

  test('migration only binds a release that supports the existing kind, mode and extension versions', async () => {
    const original = legacy()
    const snapshot = structuredClone(original)
    for (const manifest of [
      { ...release.manifest, kinds: ['pro' as const], modes: ['code' as const] },
      { ...release.manifest, modes: ['blocks' as const] },
    ]) {
      const incompatible = await createStudioRuntimeRelease(manifest)
      expect(() => upgradeStudioProjectDocumentV2(original, incompatible)).toThrow('não suporta')
      expect(original).toEqual(snapshot)
    }
    const withExtension = {
      ...original,
      installedExtensions: [{ id: 'g2d', version: '1.0.0', installedAt: 1 }],
    }
    const before = structuredClone(withExtension)
    expect(() => upgradeStudioProjectDocumentV2(withExtension, release)).toThrow('não suporta')
    const otherVersion = await createStudioRuntimeRelease({
      ...release.manifest,
      extensions: [{ id: 'g2d', versions: ['2.0.0'] }],
    })
    expect(() => upgradeStudioProjectDocumentV2(withExtension, otherVersion)).toThrow('não suporta')
    expect(withExtension).toEqual(before)
    const supported = await createStudioRuntimeRelease({
      ...release.manifest,
      extensions: [{ id: 'g2d', versions: ['1.0.0'] }],
    })
    const migrated = upgradeStudioProjectDocumentV2(withExtension, supported)
    expect(migrated.document.installedExtensions).toEqual(withExtension.installedExtensions)
    // Reading an existing v3 document is not a request to rebind it to the supplied release.
    expect(upgradeStudioProjectDocumentV2(migrated.document, release).document).toEqual(
      migrated.document,
    )
  })

  test('rejects incomplete/future/Python legacy documents and never modifies the original', () => {
    for (const original of [
      { ...legacy(), formatVersion: 1 },
      { ...legacy(), formatVersion: 4 },
      { ...legacy(), programmingLanguage: 'python' },
      { ...legacy(), kind: 'unexpected' },
      { ...legacy(), runtime: javascriptRuntime },
      { ...legacy(), python },
    ]) {
      const snapshot = structuredClone(original)
      expect(() => upgradeStudioProjectDocumentV2(original, release)).toThrow()
      expect(original).toEqual(snapshot)
    }
    const result = upgradeStudioProjectDocumentV2(
      { ...legacy(), mode: 'code', tree: undefined, proMeta: undefined },
      release,
    )
    expect(result.document.mode).toBe('bridge')
    expect(result.changes).toContainEqual({ rule: 'document.classic-code-mode', path: '$.mode' })
  })
})
