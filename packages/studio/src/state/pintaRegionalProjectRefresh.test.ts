import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { pngCrc32 } from '@sistemazero/core/studio/pinta-png-binary'
import { IDBFactory } from 'fake-indexeddb'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { embedPintaRegionImage } from '../../../pinta/src/export/regionImage'
import { getPersonalAssetsNamespace, setPersonalAssetsNamespace } from '../asset-library/personal'
import {
  PINTA_REGIONAL_PERSONAL_CAPTURE,
  savePersonalRegionalMap,
} from '../asset-library/personalRegional'
import { syncDrawingsIntoProjects } from '../asset-library/personalSync'
import { decodeProjectAsset, encodeAssetBase64 } from '../core/assetBinary'
import { isPythonProject } from '../core/editableProject'
import {
  admitPintaRegionalMaterial,
  type PintaRegionalMarker,
  pintaRegionalMarkerOf,
} from '../core/pintaRegionalMaterial'
import { admitRegionalProjectAssets } from '../core/pintaRegionalProjectAdmission'
import {
  assertLegacyStudioProjectMaterials,
  PRIVATE_REGIONAL_PROJECT,
} from '../core/pintaRegionalReference'
import { createEmptyProject, type ProjectAsset } from '../core/project'
import {
  PROJECT_ASSET_LIMITS,
  projectAssetBudgetChars,
  sanitizeProjectAssets,
} from '../core/projectAssets'
import { assertProjectContentPreserved } from '../core/projectDocumentGuards'
import { createPintaRegionalProRuntime } from '../modes/pro/pintaRegionalProRuntime'
import { gameTwoDManifest } from '../official-extensions/game-2d/manifest'
import { gameKitManifest } from '../official-extensions/game-2d-advanced/manifest'
import { renderProjectToPreviewDocAsync } from '../preview/renderProject'
import { discardImportedProjectSnapshot, restoreProjectFromCloud } from '../projects/importSnapshot'
import { PYGAME_EXTENSION } from '../runtime/python/pygame/contract'
import {
  preparePythonExecutionSnapshot,
  requiresAdmittedPythonPintaScenes,
} from '../runtime/python/snapshot'
import { convertClassicToProTree } from './convertToPro'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { documentFixture } from './fixtures/projectDocuments'
import { readValues } from './idbTransaction'
import {
  deleteProject,
  loadProjectAssetsSnapshotById,
  loadProjectById,
  persistProject,
  persistProjectAssets,
} from './persistence'
import {
  privateRegionalProjectScope,
  refreshPrivateRegionalProjectAsset,
} from './pintaRegionalProjectRefresh'
import { registerProjectPersistence } from './projectOperations'
import {
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectStateKey,
} from './projectStorageKeys'
import {
  captureProjectStorageScope,
  createProjectStorageScope,
  type ProjectStorageScope,
  setProjectStorageNamespace,
} from './projectStorageRuntime'
import {
  createLocalPersistenceAdapter,
  createProjectStore,
  loadSanitizedProjectById,
} from './projectStore'
import { validateEditableStudioCreationSnapshot } from './projectValidation'

const { createCanvas, loadImage } = createRequire(
  new URL('../../../pinta/package.json', import.meta.url),
)('@napi-rs/canvas') as typeof import('../../../pinta/node_modules/@napi-rs/canvas')
const png = (width: number, height: number, color = '#3355dd') => {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
const url = (bytes: Uint8Array) => `data:image/png;base64,${encodeAssetBase64(bytes)}`
const capability = (scope: ProjectStorageScope) => ({ [PRIVATE_REGIONAL_PROJECT]: scope })
const initialDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')
const box = { width: 64, height: 32 }
type Capture = typeof box & { regional: PintaRegionalMarker; dataUrl: string }
let before: Capture
let after: Capture
let bitmapCalls = 0

const image: ProjectAsset = {
  id: 'stable-material-id',
  name: 'nome-do-jogo',
  kind: 'image',
  source: 'library',
  libOrigin: 'pinta',
  libId: 'personal:world',
  proPath: 'public/assets/nome-do-jogo.png',
  ...box,
  dataUrl: url(png(64, 32)),
}
const blocksState = {
  blocks: {
    languageVersion: 0,
    blocks: [
      { type: 'sz_js_console_log_text', id: 'author-block-id', fields: { VALUE: 'um jogo' } },
    ],
  },
}

beforeAll(async () => {
  Object.defineProperty(globalThis, 'indexedDB', { value: new IDBFactory(), configurable: true })
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: async (pngBytes: Blob) => {
      bitmapCalls++
      const { width, height } = await loadImage(Buffer.from(await pngBytes.arrayBuffer()))
      return { width, height, close: () => {} }
    },
  })
  const fixture = scene4Fixture()
  const scene = JSON.stringify({
    ...fixture,
    physics: 'precise',
    tilesets: fixture.tilesets.map((sheet) => ({ ...sheet, image: url(png(64, 16)) })),
    art: fixture.art.map((art) => ({ ...art, image: url(png(art.width, art.height)) })),
  })
  const capture = async (color: string) => {
    const { png: bytes } = await embedPintaRegionImage(png(64, 32, color), scene)
    const dataUrl = url(bytes)
    const { regional } = await admitPintaRegionalMaterial({ dataUrl, sourceId: 'world', ...box })
    return { regional, dataUrl, ...box }
  }
  before = await capture('#002244')
  after = await capture('#008844')
})

afterAll(() => {
  if (initialDescriptor) Object.defineProperty(globalThis, 'indexedDB', initialDescriptor)
  else Reflect.deleteProperty(globalThis, 'indexedDB')
  if (bitmapDescriptor) Object.defineProperty(globalThis, 'createImageBitmap', bitmapDescriptor)
  else Reflect.deleteProperty(globalThis, 'createImageBitmap')
})

test('JS v2 and v3 admit the same captured material only with the private reader', async () => {
  const v3 = documentFixture('javascript', 'classic')
  if (v3.programmingLanguage !== 'javascript') throw new Error('Invalid JS fixture')
  for (const base of [createEmptyProject('v2-regional', 'Mapa'), v3]) {
    const material = { ...image, ...before }
    const document = { ...base, assets: [material], blocksState, coverAssetName: image.name }
    await expect(prepareEditableStudioProject(document)).rejects.toThrow(
      'O original foi preservado',
    )
    const prepared = await prepareEditableStudioProject(
      document,
      capability(privateRegionalProjectScope('reader')),
    )
    expect(prepared?.assets).toEqual([material])
    expect(prepared && 'files' in prepared ? prepared.files : undefined).toEqual(document.files)
    expect(prepared?.blocksState).toEqual(blocksState)
    expect(prepared?.id).toBe(document.id)
    expect(Object.keys(prepared!.assets![0]!).sort()).toEqual(Object.keys(material).sort())
    expect(() => assertLegacyStudioProjectMaterials(prepared!)).toThrow('O original foi preservado')
  }
})

test('private refresh uses the observed asset partition CAS and does not write files or blocks', async () => {
  const scope = privateRegionalProjectScope('refresh')
  const legacy = { ...createEmptyProject('regional-project', 'Mapa'), blocksState, assets: [image] }
  await persistProject(legacy, {}, scope)
  const keys = [projectFilesKey(legacy.id), projectBlocksKey(legacy.id), projectStateKey(legacy.id)]
  const program = await readValues(scope.store, keys)
  const old = await loadProjectAssetsSnapshotById(legacy.id, scope)
  const refresh = (capture: Capture) =>
    refreshPrivateRegionalProjectAsset({
      projectId: legacy.id,
      assetId: image.id,
      scope,
      capture,
    })
  expect(await refresh(before)).toBe(true)
  await expect(persistProjectAssets(legacy.id, [image], scope, old.assets)).rejects.toThrow()
  await expect(loadProjectAssetsSnapshotById(legacy.id, scope)).rejects.toThrow(
    'O original foi preservado',
  )
  expect(await refresh(after)).toBe(true)
  const reopened = await prepareEditableStudioProject(
    await loadProjectById(legacy.id, createProjectStorageScope(scope.namespace)),
    capability(scope),
  )
  expect(reopened?.assets).toEqual([{ ...image, ...after }])
  expect(reopened && 'files' in reopened ? reopened.files : undefined).toEqual(legacy.files)
  expect(reopened?.blocksState).toEqual(blocksState)
  expect(await readValues(scope.store, keys)).toEqual(program)
  expect(await readValues(scope.store, [projectAssetsKey(legacy.id)])).toEqual([
    { id: legacy.id, assets: [{ ...image, ...after }] },
  ])
})

test('an aborted refresh or another profile cannot replace the captured partition', async () => {
  const owner = privateRegionalProjectScope('owner')
  const other = createProjectStorageScope('pinta-region-other')
  const ownerProject = { ...createEmptyProject('profile-project', 'Mapa'), assets: [image] }
  const otherProject = { ...ownerProject, name: 'Outro projeto' }
  await persistProject(ownerProject, {}, owner)
  await persistProject(otherProject, {}, other)
  const signal = AbortSignal.abort()
  const target = { projectId: ownerProject.id, assetId: image.id, capture: before }
  await expect(refreshPrivateRegionalProjectAsset({ ...target, scope: other })).rejects.toThrow(
    'perfil de teste local',
  )
  await expect(
    refreshPrivateRegionalProjectAsset({ ...target, scope: owner, signal }),
  ).rejects.toThrow()
  expect((await loadProjectAssetsSnapshotById(ownerProject.id, owner)).assets).toEqual([image])
  expect(await refreshPrivateRegionalProjectAsset({ ...target, scope: owner })).toBe(true)
  expect((await loadProjectAssetsSnapshotById(ownerProject.id, other)).assets).toEqual([image])
  expect(
    (await loadProjectAssetsSnapshotById(ownerProject.id, owner, capability(owner))).assets,
  ).toEqual([{ ...image, ...before }])
})

test('cloud restore and silent remote deletion preserve the private project; explicit local deletion still works', async () => {
  const scope = privateRegionalProjectScope('cloud-restore')
  const old = { ...createEmptyProject('reserved-project', 'Mapa'), assets: [image] }
  await persistProject(old, {}, scope)
  await refreshPrivateRegionalProjectAsset({
    scope,
    projectId: old.id,
    assetId: image.id,
    capture: before,
  })
  await expect(
    restoreProjectFromCloud(old, {
      expectedId: old.id,
      namespace: scope.namespace,
    }),
  ).rejects.toThrow('O original foi preservado')
  await expect(
    discardImportedProjectSnapshot(old.id, {
      namespace: scope.namespace,
    }),
  ).rejects.toThrow('O original foi preservado')
  expect((await loadProjectAssetsSnapshotById(old.id, scope, capability(scope))).assets).toEqual([
    { ...image, ...before },
  ])
  await deleteProject(old.id, scope)
  expect(await loadProjectById(old.id, scope)).toBeNull()
})

test('regional preflight cannot drop ordinary materials to make room for a large capture', async () => {
  const marked = { ...image, ...before }
  const plain = { ...image, id: 'ordinary', name: 'fundo', proPath: 'public/assets/fundo.png' }
  const source = [plain, marked]
  const admissions = await admitRegionalProjectAssets(source)
  const total = source.reduce((sum, asset) => sum + projectAssetBudgetChars(asset), 0)
  const fits = (limit: number) =>
    sanitizeProjectAssets(source, {
      regionalMaterials: admissions,
      dataLimits: { ...PROJECT_ASSET_LIMITS, maxAssetsTotalChars: limit },
    })
  expect(fits(total)).toEqual(source)
  expect(() =>
    assertProjectContentPreserved(
      { assets: source },
      {
        assets: fits(total - 1),
      },
    ),
  ).toThrow('Nenhuma cópia foi gravada')
  const stale = { ...marked, dataUrl: after.dataUrl }
  expect(() => sanitizeProjectAssets([stale], { regionalMaterials: admissions })).toThrow(
    'O original foi preservado',
  )
})

test('edits made after capture cannot grow the admitted list or swap material bytes', async () => {
  const scope = privateRegionalProjectScope('changed-admission')
  const project = { ...createEmptyProject('immutable-admission', 'Mapa'), assets: [image] }
  await persistProject(project, {}, scope)
  const { assets: observed } = await loadProjectAssetsSnapshotById(project.id, scope)
  const attempt = async (candidate: Array<ProjectAsset | (ProjectAsset & Capture)>) => {
    const proof = await admitRegionalProjectAssets(candidate)
    const materials = sanitizeProjectAssets(candidate, { regionalMaterials: proof })
    return persistProjectAssets(project.id, materials, scope, observed)
  }
  const regional = { ...image, ...before }
  const companion = { ...image, id: 'other', name: 'fundo', proPath: 'public/assets/fundo.png' }
  const growing = [regional, companion]
  const append = attempt(growing)
  growing.push({ ...companion, id: 'late', name: 'exemplo' })
  await expect(append).rejects.toThrow('O original foi preservado')

  const changing = [regional, companion]
  const replaceBytes = attempt(changing)
  companion.dataUrl = url(png(64, 32, '#dd5522'))
  await expect(replaceBytes).rejects.toThrow('O original foi preservado')
  expect((await loadProjectAssetsSnapshotById(project.id, scope)).assets).toEqual([image])
})

test('ordinary server admission refuses a complete regional source and sees only the program in the old parts envelope', async () => {
  const base = createEmptyProject('cloud-capability-probe', 'Mapa')
  const source = { ...base, assets: [{ ...image, ...before }] }
  await expect(validateEditableStudioCreationSnapshot(source, base.id)).rejects.toThrow(
    'O original foi preservado',
  )
  const programOnly = await validateEditableStudioCreationSnapshot(
    {
      format: 'sz-studio-parts',
      version: 1,
      program: { ...source, assets: [] },
      assets: ['f'.repeat(64)],
    },
    base.id,
  )
  expect(programOnly.assets).toEqual([])
})

for (const manifest of [gameTwoDManifest, gameKitManifest]) {
  test(`${manifest.id} prepares the stored material and keeps the original program in Classic and converted Pro`, async () => {
    const scope = privateRegionalProjectScope(manifest.id)
    const project = {
      ...createEmptyProject(`${manifest.id}-stored`, 'Meu mapa'),
      assets: [image],
      installedExtensions: [{ id: manifest.id, version: manifest.version, installedAt: 1 }],
      files: {
        'index.html': '<canvas id="game"></canvas>',
        'style.css': 'body{margin:0}',
        'script.js': 'window.PROGRAMA_AUTORAL = "continua";',
      },
    }
    const ready = { ...project, assets: [{ ...image, ...before }] }
    await expect(renderProjectToPreviewDocAsync(ready)).rejects.toThrow('O original foi preservado')
    const classic = await renderProjectToPreviewDocAsync(ready, capability(scope))
    expect(classic).toContain('__SZGAME_ASSETS')
    expect(classic).toContain(before.dataUrl)
    expect(classic).toContain('_pintaRegionFactory')
    const tree = await convertClassicToProTree(project)
    const pro = {
      ...ready,
      kind: 'pro' as const,
      mode: 'code' as const,
      tree,
      proMeta: {
        templateId: 'vanilla-vite',
        devScript: 'dev',
        origin: { projectId: project.id, revision: 0 },
      },
    }
    const author = JSON.stringify(pro)
    const runtime = createPintaRegionalProRuntime(scope)
    const built = await runtime.build({ project: pro })
    expect(built.html).toContain('PROGRAMA_AUTORAL')
    expect(built.html).toContain(before.dataUrl)
    expect(built.html).toContain('_pintaRegionFactory')
    expect(JSON.stringify(pro)).toBe(author)
    const enginePath = `public/sz-ext/${manifest.id}.js`
    const engine = tree[enginePath]
    if (engine?.kind !== 'file') throw new Error('Conversão sem motor')
    await expect(
      runtime.build({
        project: {
          ...pro,
          tree: { ...tree, [enginePath]: { kind: 'file', content: `${engine.content} ` } },
        },
      }),
    ).rejects.toThrow('foi editado')
    await expect(
      runtime.build({
        project: {
          ...pro,
          tree: {
            ...tree,
            'public/sz-ext/parece-oficial.js': { kind: 'file', content: ' '.repeat(256_001) },
          },
        },
      }),
    ).rejects.toThrow('cotas do compilador')
  })
}

for (const kind of ['classic', 'pro'] as const) {
  test(`Python ${kind} reopens after refresh with a byte-exact file and an admitted-only capability`, async () => {
    const scope = privateRegionalProjectScope(`python-${kind}`)
    const { proPath: _javascriptPath, ...ordinary } = image
    const material = { ...ordinary, proPath: 'assets/nome-do-jogo.png' }
    const raw = {
      ...documentFixture('python', kind),
      installedExtensions: [{ ...PYGAME_EXTENSION, installedAt: 1 }],
      assets: [material],
    }
    const original = await prepareEditableStudioProject(raw)
    if (!original || !isPythonProject(original)) throw new Error('Invalid Python fixture')
    await persistProject(original, {}, scope)
    expect(
      await refreshPrivateRegionalProjectAsset({
        scope,
        projectId: original.id,
        assetId: image.id,
        capture: before,
      }),
    ).toBe(true)
    const reopened = await loadProjectById(original.id, scope)
    await expect(preparePythonExecutionSnapshot(reopened)).rejects.toThrow(
      'O original foi preservado',
    )
    const snapshot = await preparePythonExecutionSnapshot(reopened, capability(scope))
    expect(requiresAdmittedPythonPintaScenes(snapshot)).toBe(true)
    expect(snapshot.files.find(({ path }) => path === material.proPath)?.bytes).toEqual(
      decodeProjectAsset(before.dataUrl).bytes,
    )
    const legacy = await preparePythonExecutionSnapshot(original)
    expect(requiresAdmittedPythonPintaScenes(legacy)).toBe(false)
    expect(snapshot.files.filter(({ kind }) => kind === 'source')).toEqual(
      legacy.files.filter(({ kind }) => kind === 'source'),
    )
  })
}

test('a CRC-valid child with bad compressed pixels cannot replace the stored material', async () => {
  const scope = privateRegionalProjectScope('bad-pixels')
  const project = { ...createEmptyProject('png-idat-proof', 'Mapa'), assets: [image] }
  await persistProject(project, {}, scope)
  const bad = png(64, 16)
  const view = new DataView(bad.buffer)
  for (let offset = 8; offset + 12 <= bad.length; ) {
    const length = view.getUint32(offset)
    if (view.getUint32(offset + 4) === 0x49444154) {
      bad[offset + 8] = 0
      view.setUint32(offset + 8 + length, pngCrc32(bad, offset + 4, offset + 8 + length))
    }
    offset += length + 12
  }
  const fixture = scene4Fixture()
  const scene = JSON.stringify({
    ...fixture,
    physics: 'precise',
    tilesets: fixture.tilesets.map((sheet) => ({ ...sheet, image: url(bad) })),
    art: fixture.art.map((art) => ({ ...art, image: url(png(art.width, art.height)) })),
  })
  const { png: original } = await embedPintaRegionImage(png(64, 32), scene)
  const dataUrl = url(original)
  const { regional } = await admitPintaRegionalMaterial({ dataUrl, sourceId: 'world', ...box })
  await expect(
    refreshPrivateRegionalProjectAsset({
      scope,
      projectId: project.id,
      assetId: image.id,
      capture: { dataUrl, regional, ...box },
    }),
  ).rejects.toThrow('Não consegui abrir todas as imagens')
  expect((await loadProjectAssetsSnapshotById(project.id, scope)).assets).toEqual([image])
})

test('a second independent material cannot start pixel decoding until the joint limit is proven', async () => {
  const fixture = scene4Fixture()
  const cover = png(2048, 2048)
  const atlas = url(png(2048, 2048))
  const make = async (id: string, extraPixels = false) => {
    const artImage = url(png(1, 1))
    const scene = JSON.stringify({
      ...fixture,
      physics: 'precise',
      tilesets: fixture.tilesets.map((sheet) => ({ ...sheet, image: atlas })),
      art: extraPixels ? [{ id: 'dot', image: artImage, width: 1, height: 1 }] : [],
      // The budget comparison here is independent of object art and destinations.
      layers: fixture.layers.filter(({ kind }) => kind !== 'objects'),
      sets: undefined,
    })
    const { png: capturedPng } = await embedPintaRegionImage(cover, scene)
    const dataUrl = url(capturedPng),
      width = 2048,
      height = 2048
    const { regional } = await admitPintaRegionalMaterial({
      sourceId: 'world',
      dataUrl,
      width,
      height,
    })
    return {
      ...image,
      id,
      name: id,
      proPath: `public/assets/${id}.png`,
      dataUrl,
      width,
      height,
      regional,
    }
  }
  const [first, exact, overflow] = await Promise.all([
    make('primeiro'),
    make('segundo'),
    make('segundo', true),
  ])
  const decoded: string[] = []
  await expect(
    admitRegionalProjectAssets([first, overflow], undefined, (id) => {
      decoded.push(id)
    }),
  ).rejects.toThrow('grande demais')
  expect(decoded).toEqual([])
  await admitRegionalProjectAssets([first, exact], undefined, (id) => {
    decoded.push(id)
  })
  expect(decoded).toEqual(['primeiro', 'segundo'])

  const scope = privateRegionalProjectScope('pixel-budget')
  const ordinary = { ...image, id: exact.id, proPath: exact.proPath, name: exact.name }
  const project = {
    ...createEmptyProject('budget-project-png5', 'Mapa'),
    assets: [first, ordinary],
  }
  await persistProject(project, {}, scope)
  const beforeRefresh = bitmapCalls
  await expect(
    refreshPrivateRegionalProjectAsset({
      scope,
      projectId: project.id,
      assetId: ordinary.id,
      capture: overflow,
    }),
  ).rejects.toThrow('grande demais')
  expect(bitmapCalls).toBe(beforeRefresh)
  expect(
    (await loadProjectAssetsSnapshotById(project.id, scope, capability(scope))).assets,
  ).toEqual(project.assets)
})

test('cancelled graphical admission disposes a late bitmap and preserves the durable project', async () => {
  const scope = privateRegionalProjectScope('cancel-bitmaps')
  const project = { ...createEmptyProject('late-decoder-project', 'Mapa'), assets: [image] }
  await persistProject(project, {}, scope)
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')!
  const decode = globalThis.createImageBitmap
  const lifetime = new AbortController()
  let unpause: () => void = () => {}
  let started: () => void = () => {}
  let closed: () => void = () => {}
  const wait = new Promise<void>((resolve) => {
    unpause = resolve
  })
  const ready = new Promise<void>((resolve) => {
    started = resolve
  })
  const disposed = new Promise<void>((resolve) => {
    closed = resolve
  })
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    async value(pngBytes: Blob) {
      const image = await decode(pngBytes)
      started()
      await wait
      return {
        width: image.width,
        height: image.height,
        close: () => {
          image.close()
          closed()
        },
      }
    },
  })
  try {
    const pending = refreshPrivateRegionalProjectAsset({
      scope,
      projectId: project.id,
      assetId: image.id,
      capture: before,
      signal: lifetime.signal,
    })
    await ready
    lifetime.abort()
    await expect(pending).rejects.toThrow()
    expect((await loadProjectAssetsSnapshotById(project.id, scope)).assets).toEqual([image])
    unpause()
    await disposed
  } finally {
    unpause()
    Object.defineProperty(globalThis, 'createImageBitmap', descriptor)
  }
})

test('existing library sync commits the live editor asset revision before publishing it and preserves its next authored source save', async () => {
  const namespace = privateRegionalProjectScope('open-studio').namespace
  const previousProject = captureProjectStorageScope().namespace
  const previousLibrary = getPersonalAssetsNamespace()
  setProjectStorageNamespace(namespace)
  setPersonalAssetsNamespace(namespace)
  const scope = captureProjectStorageScope()
  const source = {
    ...createEmptyProject('open-and-running-png5', 'Meu jogo'),
    assets: [image],
    files: { 'index.html': '', 'style.css': '', 'script.js': 'let pontos = 42;' },
  }
  const store = createProjectStore()
  const adapter = createLocalPersistenceAdapter()
  const release = registerProjectPersistence(store, adapter)
  try {
    await adapter.save(source)
    const observed = await loadSanitizedProjectById(source.id, scope)
    if (!observed) throw new Error('Projeto de teste não reabriu')
    store.getState().hydrateProject(observed)
    expect(
      await savePersonalRegionalMap(
        {
          id: 'world',
          name: 'Mapa',
          dataUrl: before.dataUrl,
          ...box,
        },
        { namespace, capability: PINTA_REGIONAL_PERSONAL_CAPTURE, expectedRevision: null },
      ),
    ).toMatchObject({ ok: true })
    expect(await syncDrawingsIntoProjects(store)).toEqual({
      updatedInOpenProject: 1,
      updatedInOtherProjects: 0,
      failures: [],
    })
    const installed = store.getState().project
    if (!installed || isPythonProject(installed) || !installed.assets?.[0])
      throw new Error('Editor perdeu o jogo')
    expect(installed.files).toEqual(source.files)
    expect(pintaRegionalMarkerOf(installed.assets[0])).toEqual(before.regional)
    store.getState().setFile('script.js', 'let pontos = 43;')
    const edited = store.getState().project
    if (!edited) throw new Error('Editor perdeu as alterações')
    await adapter.save(edited)
    const reopened = await loadSanitizedProjectById(source.id, scope)
    if (!reopened || isPythonProject(reopened)) throw new Error('Projeto de teste não reabriu')
    expect(reopened.files['script.js']).toBe('let pontos = 43;')
    expect(reopened.assets).toEqual([{ ...image, ...before }])
  } finally {
    release()
    setPersonalAssetsNamespace(previousLibrary)
    setProjectStorageNamespace(previousProject)
  }
})
