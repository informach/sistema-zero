import 'blockly/blocks'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { pngCrc32 } from '@sistemazero/core/studio/pinta-png-binary'
import * as Blockly from 'blockly/core'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { embedPintaRegionImage } from '../../../pinta/src/export/regionImage'
import { getPersonalAssetsNamespace, setPersonalAssetsNamespace } from '../asset-library/personal'
import {
  PINTA_REGIONAL_PERSONAL_CAPTURE,
  savePersonalRegionalMap,
} from '../asset-library/personalRegional'
import { syncDrawingsIntoProjects } from '../asset-library/personalSync'
import { registerExtensionBlocks } from '../blockly/blocks'
import { buildIRFromWorkspace } from '../blockly/buildIR'
import { loadWorkspaceState } from '../blockly/loadWorkspaceState'
import { saveWorkspaceState } from '../blockly/savedWorkspaceState'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
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
import { assertProjectContentPreserved, isDocumentRecord } from '../core/projectDocumentGuards'
import { generateProjectFiles } from '../generators'
import { createPintaRegionalProRuntime } from '../modes/pro/pintaRegionalProRuntime'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { gameTwoDManifest } from '../official-extensions/game-2d/manifest'
import { gameKitBlocks } from '../official-extensions/game-2d-advanced/blocks'
import { gameKitManifest } from '../official-extensions/game-2d-advanced/manifest'
import { pintaSceneExample } from '../official-extensions/map-2d/examples'
import { renderProjectToPreviewDocAsync } from '../preview/renderProject'
import { discardImportedProjectSnapshot, restoreProjectFromCloud } from '../projects/importSnapshot'
import { PYGAME_EXTENSION } from '../runtime/python/pygame/contract'
import {
  preparePythonExecutionSnapshot,
  requiresAdmittedPythonPintaScenes,
} from '../runtime/python/snapshot'
import type { StudioProRuntimeBuildInput } from '../studio/pro-runtime'
import { THREE_VERSION } from '../three/threeRuntimeContract'
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
const initialKeyRange = Object.getOwnPropertyDescriptor(globalThis, 'IDBKeyRange')
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
const installedEngine = (manifest: typeof gameTwoDManifest, version = manifest.version) => ({
  id: manifest.id,
  version,
  installedAt: 1,
})
const authoredFiles = {
  'index.html': '<canvas id="game"></canvas>',
  'style.css': 'body{margin:0}',
  'script.js': 'window.PROGRAMA_AUTORAL = "continua";',
}

const blocksState = {
  blocks: {
    languageVersion: 0,
    blocks: [
      { type: 'sz_js_console_log_text', id: 'author-block-id', fields: { VALUE: 'um jogo' } },
    ],
  },
}

// Only a JavaScript project with one 2D engine can run (and so receive) regional material.
const regionalEngine = { installedExtensions: [installedEngine(gameTwoDManifest)] }

beforeAll(async () => {
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: IDBKeyRange, configurable: true })
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
  if (initialKeyRange) Object.defineProperty(globalThis, 'IDBKeyRange', initialKeyRange)
  else Reflect.deleteProperty(globalThis, 'IDBKeyRange')
  if (bitmapDescriptor) Object.defineProperty(globalThis, 'createImageBitmap', bitmapDescriptor)
  else Reflect.deleteProperty(globalThis, 'createImageBitmap')
})

test('JS v2 e v3 públicos admitem o mesmo material verificado por inteiro', async () => {
  const v3 = documentFixture('javascript', 'classic')
  if (v3.programmingLanguage !== 'javascript') throw new Error('Invalid JS fixture')
  for (const base of [createEmptyProject('v2-regional', 'Mapa'), v3]) {
    const material = { ...image, ...before }
    const document = { ...base, assets: [material], blocksState, coverAssetName: image.name }
    expect((await prepareEditableStudioProject(document))?.assets).toEqual([material])
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
  const legacy = {
    ...createEmptyProject('regional-project', 'Mapa'),
    ...regionalEngine,
    blocksState,
    assets: [image],
  }
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
    { id: legacy.id, assets: [image] },
  ])
})

test('an aborted refresh or another profile cannot replace the captured partition', async () => {
  const owner = privateRegionalProjectScope('owner')
  const other = createProjectStorageScope('pinta-region-other')
  const ownerProject = {
    ...createEmptyProject('profile-project', 'Mapa'),
    ...regionalEngine,
    assets: [image],
  }
  const otherProject = { ...ownerProject, name: 'Outro projeto' }
  await persistProject(ownerProject, {}, owner)
  await persistProject(otherProject, {}, other)
  const signal = AbortSignal.abort()
  const target = { projectId: ownerProject.id, assetId: image.id, capture: before }
  await expect(
    refreshPrivateRegionalProjectAsset({
      ...target,
      scope: { ...other, identity: owner.identity },
    }),
  ).rejects.toThrow('perfil do projeto mudou')
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
  const old = {
    ...createEmptyProject('reserved-project', 'Mapa'),
    ...regionalEngine,
    assets: [image],
  }
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

for (const privateScope of [false, true]) {
  test(
    (privateScope ? 'private' : 'public') + ' regional Pro preserves the hosted routing boundary',
    async () => {
      const scope = privateScope
        ? privateRegionalProjectScope('hosted-routing-boundary')
        : createProjectStorageScope('account-hosted-routing-boundary')
      const classic = {
        ...createEmptyProject('hosted-regional', 'Meu mapa'),
        assets: [{ ...image, ...before }],
        installedExtensions: [installedEngine(gameTwoDManifest)],
        files: authoredFiles,
      }
      const tree = await convertClassicToProTree(classic)
      const node = tree['package.json']
      if (node?.kind !== 'file') throw new Error('Conversão sem package.json')
      tree['package.json'] = {
        kind: 'file',
        content: JSON.stringify({
          ...JSON.parse(node.content),
          dependencies: { three: THREE_VERSION },
        }),
      }
      const pro = {
        ...classic,
        kind: 'pro' as const,
        mode: 'code' as const,
        tree,
        proMeta: {
          templateId: 'vanilla-vite',
          devScript: 'dev',
          origin: { projectId: 'original', revision: 1 },
        },
      }
      const authored = JSON.stringify(pro)
      const calls: StudioProRuntimeBuildInput[] = []
      const hosted = {
        build: async (input: StudioProRuntimeBuildInput) => {
          calls.push(input)
          return { html: '<p>Compilado no executor configurado</p>' }
        },
      }
      const runtime = createPintaRegionalProRuntime(scope, undefined, hosted)
      if (privateScope) {
        await expect(runtime.build({ project: pro })).rejects.toThrow('ambiente local')
        expect(calls).toEqual([])
      } else {
        expect(await runtime.build({ project: pro })).toEqual({
          html: '<p>Compilado no executor configurado</p>',
        })
        expect(calls).toHaveLength(1)
        expect(JSON.stringify(calls[0]!.project)).toBe(authored)
      }
      expect(JSON.stringify(pro)).toBe(authored)
    },
  )
}

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
    expect(await renderProjectToPreviewDocAsync(ready)).toContain('_pintaRegionFactory')
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

test('a project that recorded an older Jogo 2D runs its regional material on the current engine, like Classic', async () => {
  const scope = privateRegionalProjectScope('older-engine-record')
  const base = {
    ...createEmptyProject('older-engine-record', 'Mapa antigo'),
    assets: [{ ...image, ...before }],
    files: authoredFiles,
  }
  for (const older of [
    installedEngine(gameTwoDManifest, '2.0.0'),
    installedEngine(gameKitManifest, '0.1.0'),
  ])
    expect(
      await renderProjectToPreviewDocAsync(
        { ...base, installedExtensions: [older] },
        capability(scope),
      ),
    ).toContain('_pintaRegionFactory')
  // No engine, or two different 2D engines, still leave no single engine to compose.
  for (const installedExtensions of [
    [],
    [installedEngine(gameTwoDManifest), installedEngine(gameKitManifest)],
  ])
    await expect(
      renderProjectToPreviewDocAsync({ ...base, installedExtensions }, capability(scope)),
    ).rejects.toThrow('Jogo 2D')
})

// Subir a versão do Jogo 2D ou do Jogo 2D Avançado num projeto Clássico não tem um passo próprio: o
// Estúdio novo carrega o motor de agora pelo id, e a versão gravada na instalação fica como estava.
// O caminho é reabrir o projeto, carregar os blocos no editor e rodar.
/** O que o painel de blocos faz ao carregar: o estado que ele salva e o programa que ele gera. */
function editorPass(state: unknown, projectName: string) {
  if (!isDocumentRecord(state)) throw new Error('Estado de blocos inválido.')
  const workspace = new Blockly.Workspace()
  try {
    loadWorkspaceState(state, workspace)
    const ir = buildIRFromWorkspace(workspace)
    return {
      blocksState: saveWorkspaceState(workspace),
      ir,
      files: generateProjectFiles({ ir, projectName }),
    }
  } finally {
    workspace.dispose()
  }
}
for (const [manifest, target, blocks, recorded] of [
  [gameTwoDManifest, 'g2d', gameTwoDBlocks, '2.0.0'],
  [gameKitManifest, 'gk', gameKitBlocks, '0.1.0'],
] as const)
  test(`${manifest.id}: o motor novo abre o projeto Clássico com blocos e cenário regional sem mudar blocos, programa nem arquivos`, async () => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(blocks)
    // Os blocos de cenário do exemplo da Vila, como o editor os guardou, e o material regional com
    // o nome que eles usam.
    const name = 'Vila antiga'
    const authored = editorPass(buildWorkspaceStateFromIR(pintaSceneExample(target).ir), name)
    const material = { ...image, id: 'vila', name: 'vila-e-floresta', ...before }
    const scope = privateRegionalProjectScope(`classic-engine-update-${target}`)
    const stored = {
      ...createEmptyProject(`classic-engine-update-${target}`, name),
      ...authored,
      assets: [material],
      installedExtensions: [installedEngine(manifest, recorded)],
    }
    await persistProject(stored, {}, scope)
    const reopened = await prepareEditableStudioProject(
      await loadProjectById(stored.id, scope),
      capability(scope),
    )
    if (!reopened || isPythonProject(reopened)) throw new Error('O projeto Clássico não reabriu.')
    expect(reopened.files).toEqual(authored.files)
    expect(reopened.blocksState).toEqual(authored.blocksState)
    expect(reopened.assets).toEqual([material])
    expect(reopened.installedExtensions).toEqual(stored.installedExtensions)
    // O painel de blocos só regrava ao abrir quando os blocos ou o programa gerado mudam
    // (`regenerateFromBlocks` com `force`): com o motor de agora, os dois saem iguais.
    const loaded = editorPass(reopened.blocksState, name)
    expect(JSON.stringify(loaded.blocksState)).toBe(JSON.stringify(authored.blocksState))
    expect(loaded.files).toEqual(authored.files)
    // E o jogo reaberto roda com o motor de agora e o cenário regional.
    expect(await renderProjectToPreviewDocAsync(reopened, capability(scope))).toContain(
      '_pintaRegionFactory',
    )
  })

test('the automatic exchange converts only projects that can run the regional material and keeps the others', async () => {
  const namespace = privateRegionalProjectScope('sweep-engines').namespace
  const previousProject = captureProjectStorageScope().namespace
  const previousLibrary = getPersonalAssetsNamespace()
  setProjectStorageNamespace(namespace)
  setPersonalAssetsNamespace(namespace)
  const scope = captureProjectStorageScope()
  const project = (id: string, installedExtensions: ReturnType<typeof installedEngine>[]) => ({
    ...createEmptyProject(id, id),
    assets: [image],
    files: authoredFiles,
    installedExtensions,
  })
  const older = project('sweep-older-engine', [installedEngine(gameTwoDManifest, '2.0.0')])
  const bare = project('sweep-without-engine', [])
  const both = project('sweep-two-engines', [
    installedEngine(gameTwoDManifest),
    installedEngine(gameKitManifest),
  ])
  try {
    for (const stored of [older, bare, both]) await persistProject(stored, {}, scope)
    expect(
      await savePersonalRegionalMap(
        { id: 'world', name: 'Mapa', dataUrl: before.dataUrl, ...box },
        { namespace, capability: PINTA_REGIONAL_PERSONAL_CAPTURE, expectedRevision: null },
      ),
    ).toMatchObject({ ok: true })
    expect(await syncDrawingsIntoProjects(createProjectStore())).toEqual({
      updatedInOpenProject: 0,
      updatedInOtherProjects: 1,
      failures: [],
    })
    for (const kept of [bare, both])
      expect((await loadProjectAssetsSnapshotById(kept.id, scope)).assets).toEqual([image])
    expect(
      (await loadProjectAssetsSnapshotById(older.id, scope, capability(scope))).assets,
    ).toEqual([{ ...image, ...before }])
    const converted = await prepareEditableStudioProject(
      await loadProjectById(older.id, scope),
      capability(scope),
    )
    if (!converted || isPythonProject(converted)) throw new Error('Projeto convertido não reabriu')
    expect(await renderProjectToPreviewDocAsync(converted, capability(scope))).toContain(
      '_pintaRegionFactory',
    )
  } finally {
    setPersonalAssetsNamespace(previousLibrary)
    setProjectStorageNamespace(previousProject)
  }
})

test('the automatic exchange keeps the old drawing in a converted Pro whose engine copy cannot be replaced', async () => {
  const scope = privateRegionalProjectScope('pro-engine-copy')
  const classic = {
    ...createEmptyProject('pro-engine-copy-origin', 'Pro'),
    assets: [image],
    files: authoredFiles,
    installedExtensions: [installedEngine(gameTwoDManifest)],
  }
  const tree = await convertClassicToProTree(classic)
  const enginePath = `public/sz-ext/${gameTwoDManifest.id}.js`
  const engine = tree[enginePath]
  if (engine?.kind !== 'file') throw new Error('Conversão sem motor')
  const pro = (id: string, content: string) => ({
    ...classic,
    id,
    kind: 'pro' as const,
    mode: 'code' as const,
    tree: { ...tree, [enginePath]: { kind: 'file' as const, content } },
    proMeta: {
      templateId: 'vanilla-vite',
      devScript: 'dev',
      origin: { projectId: classic.id, revision: 0 },
    },
  })
  const intact = pro('pro-engine-copy-intact', engine.content)
  const changed = pro('pro-engine-copy-changed', `${engine.content}\n// outra versão do motor`)
  for (const stored of [intact, changed]) await persistProject(stored, {}, scope)
  const refresh = (projectId: string) =>
    refreshPrivateRegionalProjectAsset({ scope, projectId, assetId: image.id, capture: before })
  expect(await refresh(changed.id)).toBe('kept')
  expect((await loadProjectAssetsSnapshotById(changed.id, scope)).assets).toEqual([image])
  expect(await refresh(intact.id)).toBe(true)
  expect((await loadProjectAssetsSnapshotById(intact.id, scope, capability(scope))).assets).toEqual(
    [{ ...image, ...before }],
  )
})

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
  const project = {
    ...createEmptyProject('png-idat-proof', 'Mapa'),
    ...regionalEngine,
    assets: [image],
  }
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
  ).rejects.toThrow('pixels de uma das imagens')
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
    ...regionalEngine,
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
  const project = {
    ...createEmptyProject('late-decoder-project', 'Mapa'),
    ...regionalEngine,
    assets: [image],
  }
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
    ...regionalEngine,
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

test('retém a V4 editável, os materiais e o placar; lista a V5 após descarte por escritor antigo', async () => {
  const { IDBKeyRange: Range } = await import('fake-indexeddb')
  const { promoteLocalRegionalProject, legacyProjectKeys } = await import(
    '../project-migrations/localRegionalAuthority'
  )
  const { readRetainedManifest, readRetainedParts } = await import('./retainedProjectStore')
  const { readValue, writeInOneTransaction } = await import('./idbTransaction')
  const { listProjectSummariesLight, loadProjectSummaryById, loadProjectSummariesByIds } =
    await import('./projectListStorage')
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'IDBKeyRange')
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: Range, configurable: true })
  try {
    const scope = privateRegionalProjectScope('promocao-v5'),
      id = 'projeto-em-duas-abas'
    const base = { ...createEmptyProject(id, 'Vila V4'), blocksState, assets: [image] }
    await persistProject(base, {}, scope)
    const keys = legacyProjectKeys(id)
    await writeInOneTransaction(scope.store, { puts: [[keys.game, { placar: 'oito' }]] })
    const expected = (await readValue(scope.store, keys.head)) as { token: string }
    const options = {
      scope,
      id,
      expectedV4Token: expected.token,
      assets: [{ ...image, ...before }],
    }
    const recovery = `sz:v4:project-recovery:${id}:outra-aba`
    await writeInOneTransaction(scope.store, { puts: [[recovery, { pendente: true }]] })
    await expect(promoteLocalRegionalProject(options)).rejects.toThrow()
    expect(await readRetainedManifest(scope, id)).toBeUndefined()
    await writeInOneTransaction(scope.store, { deletes: [recovery] })
    const head = await promoteLocalRegionalProject(options)
    const retained = await readRetainedParts(scope, head)
    expect(retained.game).toStrictEqual({ placar: 'oito' })
    expect(retained.assets).toStrictEqual({ id, assets: options.assets })
    expect(retained.blocks).toStrictEqual({ id, blocksState })
    expect(await readValue(scope.store, keys.assets)).toStrictEqual({ id, assets: [image] })
    await writeInOneTransaction(scope.store, { deletes: Object.values(keys) })
    expect((await listProjectSummariesLight(scope)).map((s) => s.id)).toEqual([id])
    expect((await loadProjectSummaryById(id, scope))?.name).toBe(base.name)
    expect((await loadProjectSummariesByIds([id], scope))[0]?.name).toBe(base.name)
    expect(await readRetainedParts(scope, head)).toStrictEqual(retained)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'IDBKeyRange', descriptor)
    else Reflect.deleteProperty(globalThis, 'IDBKeyRange')
  }
})
test('projeto V4 válido acima de 16MiB privados mantém as fontes editáveis e a exportação integral', async () => {
  const { promoteLocalRegionalProject, legacyProjectKeys } = await import(
    '../project-migrations/localRegionalAuthority'
  )
  const { readRetainedManifest } = await import('./retainedProjectStore')
  const { exportProjectSource } = await import('../export/sourceExport')
  const { unzipSync, strFromU8 } = await import('fflate')
  const { readValue } = await import('./idbTransaction')
  const scope = privateRegionalProjectScope('limite-regional-v5'),
    id = 'fonte-ampla'
  const base = { ...createEmptyProject(id, 'Vila ampla'), blocksState, assets: [image] }
  const text = '漢'.repeat(2_000_000)
  base.extraFiles = Array.from({ length: 3 }, (_, i) => ({
    name: `modulo${i}.js`,
    language: 'javascript' as const,
    content: `/*${i}${text}*/`,
  }))
  await persistProject(base, {}, scope)
  const keys = legacyProjectKeys(id),
    expected = (await readValue(scope.store, keys.head)) as { token: string }
  await expect(
    promoteLocalRegionalProject({
      scope,
      id,
      expectedV4Token: expected.token,
      assets: [{ ...image, ...before }],
    }),
  ).rejects.toThrow('espaço privado')
  expect(await readRetainedManifest(scope, id)).toBeUndefined()
  const still = await prepareEditableStudioProject(await loadProjectById(id, scope))
  if (!still || isPythonProject(still)) throw Error('Origem JS não abriu')
  expect(still.extraFiles).toEqual(base.extraFiles)
  still.name = 'Vila editada'
  await persistProject(still, {}, scope)
  const output = await exportProjectSource(still, { runtimeCatalog: null })
  const files = unzipSync(new Uint8Array(await output.blob.arrayBuffer()))
  for (const module of base.extraFiles) expect(strFromU8(files[module.name]!)).toBe(module.content)
})

test('reabre a autoria regional e cria só um fork completo do restauro V4 posterior', async () => {
  const { IDBKeyRange: Range } = await import('fake-indexeddb')
  const { promoteLocalRegionalProject, preserveLegacyRegionalEdit, legacyProjectKeys } =
    await import('../project-migrations/localRegionalAuthority')
  const { readRetainedManifest, readRetainedParts } = await import('./retainedProjectStore')
  const { readValue, writeInOneTransaction } = await import('./idbTransaction')
  const { listProjectSummariesLight } = await import('./projectListStorage')
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'IDBKeyRange')
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: Range, configurable: true })
  try {
    const scope = privateRegionalProjectScope('fork-da-aba-antiga'),
      id = 'original'
    const base = { ...createEmptyProject(id, 'Oficina'), blocksState, assets: [image] }
    await persistProject(base, {}, scope)
    const keys = legacyProjectKeys(id)
    await writeInOneTransaction(scope.store, { puts: [[keys.game, { visita: '1' }]] })
    const expected = (await readValue(scope.store, keys.head)) as { token: string }
    const head = await promoteLocalRegionalProject({
      scope,
      id,
      expectedV4Token: expected.token,
      assets: [{ ...image, ...after }],
    })
    const previous = await readRetainedParts(scope, head)
    expect((await preserveLegacyRegionalEdit(scope, head)).fork).toBeUndefined()
    const alt = structuredClone(base)
    alt.name = 'Outro programa'
    alt.files['script.js'] = 'console.log("revisão alternativa")'
    alt.blocksState.blocks.blocks[0]!.id = 'outro-bloco'
    await expect(
      restoreProjectFromCloud(alt, { expectedId: id, namespace: scope.namespace }),
    ).rejects.toThrow()
    // The immutable 16bf Chrome runner covers the old restore itself. Only its V4 rows change here.
    const { projectStorageEntries } = await import('./projectStorageRecords')
    await writeInOneTransaction(scope.store, {
      puts: [
        ...projectStorageEntries(alt, 4),
        [
          keys.head,
          {
            ...expected,
            version: 1,
            base: expected.token,
            writer: '',
            sequence: 0,
            token: crypto.randomUUID(),
          },
        ],
      ],
    })
    await writeInOneTransaction(scope.store, { puts: [[keys.game, { visita: '9' }]] })
    // The caller changes its copy while the first IDB read is pending. The captured head owns the fork.
    const mutable = structuredClone(head)
    const inFlight = preserveLegacyRegionalEdit(scope, mutable)
    mutable.origin = 'a'.repeat(64)
    mutable.token = crypto.randomUUID()
    const { fork } = await inFlight
    await expect(preserveLegacyRegionalEdit(scope, mutable)).rejects.toThrow()
    expect(fork).toBeString()
    const other = (await readRetainedManifest(scope, fork!))!
    const saved = await readRetainedParts(scope, other)
    expect(saved.files).toMatchObject({ id: fork, files: { 'script.js': alt.files['script.js'] } })
    expect(saved.blocks).toStrictEqual({ id: fork, blocksState: alt.blocksState })
    expect(saved.assets).toStrictEqual({ id: fork, assets: base.assets })
    expect(saved.game).toStrictEqual({ visita: '9' })
    expect((await preserveLegacyRegionalEdit(scope, head)).fork).toBe(fork)
    expect((await listProjectSummariesLight(scope)).map((s) => s.id).sort()).toEqual(
      [id, fork!].sort(),
    )
    await expect(
      discardImportedProjectSnapshot(id, { namespace: scope.namespace }),
    ).rejects.toThrow()
    await writeInOneTransaction(scope.store, { deletes: Object.values(keys) })
    expect((await preserveLegacyRegionalEdit(scope, head)).fork).toBeUndefined()
    expect(await readRetainedParts(scope, head)).toStrictEqual(previous)
    expect(await readRetainedParts(scope, other)).toStrictEqual(saved)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'IDBKeyRange', descriptor)
    else Reflect.deleteProperty(globalThis, 'IDBKeyRange')
  }
})

test('entradas normais mantêm a cabeça autoral na capa/placar, recusam a aba atrasada e retiram as duas fontes no delete explícito', async () => {
  const { IDBKeyRange: Range } = await import('fake-indexeddb')
  const { promoteLocalRegionalProject, legacyProjectKeys } = await import(
    '../project-migrations/localRegionalAuthority'
  )
  const { readRetainedManifest, readRetainedParts } = await import('./retainedProjectStore')
  const { readValue } = await import('./idbTransaction')
  const { listProjectSummariesLight } = await import('./projectListStorage')
  const { loadGameStorage, writeGameStorage } = await import('./gameStorage')
  const { writeProjectThumb, loadProjectThumb, loadProjectBlocksById, loadProjectShellById } =
    await import('./persistence')
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'IDBKeyRange')
  const previous = captureProjectStorageScope()
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: Range, configurable: true })
  try {
    const scope = privateRegionalProjectScope('editor-v5'),
      id = 'vila-editavel'
    setProjectStorageNamespace(scope.namespace)
    const keys = legacyProjectKeys(id)
    const baseline = { ...createEmptyProject(id, 'Vila'), assets: [image], blocksState }
    await persistProject(baseline, {}, scope)
    const expected = (await readValue(scope.store, keys.head)) as { token: string }
    await promoteLocalRegionalProject({
      scope,
      id,
      expectedV4Token: expected.token,
      assets: [{ ...image, ...before }],
    })
    const open = () => loadSanitizedProjectById(id, scope, true)
    const a = await open(),
      b = await open()
    if (!a || isPythonProject(a) || !b || isPythonProject(b)) throw Error('O projeto não abriu.')
    expect(a.assets?.[0]?.dataUrl).toBe(before.dataUrl)
    expect((await loadProjectShellById(id, scope))?.id).toBe(id)
    expect(await writeProjectThumb(id, image.dataUrl, {}, scope)).toBe(true)
    expect(await loadProjectThumb(id, scope)).toBe(image.dataUrl)
    await writeGameStorage(id, { placar: '5' })
    expect(await loadGameStorage(id)).toStrictEqual({ placar: '5' })
    a.files = { ...a.files, 'script.js': 'console.log("V5")' }
    await persistProject(a, {}, scope)
    b.files = { ...b.files, 'script.js': 'console.log("atrasado")' }
    await expect(persistProject(b, {}, scope)).rejects.toThrow()
    const head = (await readRetainedManifest(scope, id))!
    const saved = await readRetainedParts(scope, head)
    expect(saved.files).toMatchObject({ files: { 'script.js': a.files['script.js'] } })
    expect(await loadProjectBlocksById(id, scope)).toStrictEqual(blocksState)
    expect(await readValue(scope.store, keys.files)).toMatchObject({ files: baseline.files })
    expect(await readValue(scope.store, keys.game)).toBeUndefined()
    await expect(
      discardImportedProjectSnapshot(id, { namespace: scope.namespace }),
    ).rejects.toThrow()
    const digest = '1'.repeat(64)
    const archive = `sz:v4:project-backup:${id}:recovery-${digest}`
    const sibling = `sz:v4:project-backup:${id}:vizinho:recovery-${digest}`
    const { writeInOneTransaction } = await import('./idbTransaction')
    await writeInOneTransaction(scope.store, {
      puts: [
        [archive, { raw: true }],
        [sibling, 'vizinho'],
      ],
    })
    await deleteProject(id, scope)
    expect(await readValue(scope.store, archive)).toBeUndefined()
    expect(await readValue(scope.store, sibling)).toBe('vizinho')
    expect(await loadProjectById(id, scope)).toBeNull()
    expect((await readRetainedManifest(scope, id))?.deleted).toBe(true)
    expect(await readValue(scope.store, keys.meta)).toBeUndefined()
    expect(await readValue(scope.store, keys.head)).toMatchObject({ deleted: true })
    await writeGameStorage(id, { placar: 'tardio' })
    expect(await loadGameStorage(id)).toEqual({})
    expect((await listProjectSummariesLight(scope)).some((card) => card.id === id)).toBe(false)
    // A late V4 writer can repopulate a deleted ID. Recovery exposes a copy, never an editable original.
    await writeInOneTransaction(scope.store, {
      puts: [[keys.files, { id, files: baseline.files }]],
    })
    expect(await loadProjectById(id, scope)).toBeNull()
    expect((await listProjectSummariesLight(scope)).find((card) => card.id === id)).toMatchObject({
      migrationPending: true,
      hasPreservedEdit: true,
    })
  } finally {
    setProjectStorageNamespace(previous.namespace)
    if (descriptor) Object.defineProperty(globalThis, 'IDBKeyRange', descriptor)
    else Reflect.deleteProperty(globalThis, 'IDBKeyRange')
  }
})

/** Promote a private regional project and return the helpers that observe its exit copies. */
async function retainedWithExitCopies(profile: string, id: string) {
  const { IDBKeyRange: Range } = await import('fake-indexeddb')
  Object.defineProperty(globalThis, 'IDBKeyRange', { value: Range, configurable: true })
  const { promoteLocalRegionalProject, legacyProjectKeys } = await import(
    '../project-migrations/localRegionalAuthority'
  )
  const { readValue, readAllKeys } = await import('./idbTransaction')
  const { readSynchronousExitJournal } = await import('./synchronousExitJournalRead')
  const scope = privateRegionalProjectScope(profile)
  setProjectStorageNamespace(scope.namespace)
  const keys = legacyProjectKeys(id)
  await persistProject(
    { ...createEmptyProject(id, 'Vila'), assets: [image], blocksState },
    {},
    scope,
  )
  const expected = (await readValue(scope.store, keys.head)) as { token: string }
  await promoteLocalRegionalProject({
    scope,
    id,
    expectedV4Token: expected.token,
    assets: [{ ...image, ...before }],
  })
  return {
    scope,
    drafts: async () =>
      (await readAllKeys(scope.store)).filter((key) =>
        String(key).startsWith(`sz:v4:project-recovery:${id}:`),
      ),
    journal: () => readSynchronousExitJournal(scope.exitJournalStorage, scope.identity, id),
    script: (project: unknown) =>
      (project as { files?: Record<string, string> } | null)?.files?.['script.js'],
  }
}

test('projeto retido: abrir adota a cópia de saída e o save retido a aposenta; nenhuma sessão cria "(edição recuperada)"', async () => {
  const { listProjectSummariesLight } = await import('./projectListStorage')
  const { loadProjectShellById } = await import('./persistence')
  const previous = captureProjectStorageScope()
  const id = 'vila-saida'
  try {
    const { scope, drafts, journal, script } = await retainedWithExitCopies('saida-retida', id)
    const open = async () => {
      const shell = await prepareEditableStudioProject(
        await loadProjectShellById(id, scope),
        capability(scope),
      )
      if (!shell || isPythonProject(shell)) throw Error('O projeto não abriu.')
      return shell
    }
    for (const session of [1, 2, 3]) {
      const editor = await open()
      editor.files = { ...editor.files, 'script.js': `console.log("saida-${session}")` }
      await persistProject(editor, { exit: true, pageAlive: true }, scope)
      expect(await drafts()).toHaveLength(1)
      // A galeria abre antes do editor: a cópia de saída continua deste projeto.
      expect((await listProjectSummariesLight(scope)).map(({ name }) => name)).toEqual(['Vila'])
      const reopened = await open()
      expect(script(reopened)).toBe(`console.log("saida-${session}")`)
      reopened.files = { ...reopened.files, 'script.js': `console.log("salvo-${session}")` }
      await persistProject(reopened, {}, scope)
      expect(await drafts()).toEqual([])
      expect(journal()).toEqual([])
    }
    // Uma cópia de saída já coberta por um save posterior do mesmo editor também sai.
    const editor = await open()
    editor.files = { ...editor.files, 'script.js': 'console.log("saida-coberta")' }
    await persistProject(editor, { exit: true, pageAlive: true }, scope)
    editor.files = { ...editor.files, 'script.js': 'console.log("final")' }
    await persistProject(editor, {}, scope)
    expect(await drafts()).toEqual([])
    expect(journal()).toEqual([])
    expect((await listProjectSummariesLight(scope)).map(({ name }) => name)).toEqual(['Vila'])
    expect(script(await open())).toBe('console.log("final")')
  } finally {
    setProjectStorageNamespace(previous.namespace)
  }
})

test('projeto retido: a cópia de saída sem blocos abre com os blocos guardados e não trava o apagar', async () => {
  const { loadProjectShellById } = await import('./persistence')
  const { readRetainedManifest } = await import('./retainedProjectStore')
  const previous = captureProjectStorageScope()
  const id = 'vila-sem-blocos'
  try {
    const { scope, drafts, journal, script } = await retainedWithExitCopies('saida-incompleta', id)
    const shell = await prepareEditableStudioProject(
      await loadProjectShellById(id, scope),
      capability(scope),
    )
    if (!shell || isPythonProject(shell)) throw Error('O projeto não abriu.')
    shell.files = { ...shell.files, 'script.js': 'console.log("antes-dos-blocos")' }
    await persistProject(
      { ...shell, blocksState: null },
      { exit: true, incompleteBlocks: true, pageAlive: true },
      scope,
    )
    expect(await drafts()).toHaveLength(1)
    const adopted = await loadProjectShellById(id, scope)
    expect(script(adopted)).toBe('console.log("antes-dos-blocos")')
    expect((adopted as { blocksState?: unknown }).blocksState).toStrictEqual(blocksState)
    await deleteProject(id, scope)
    expect((await readRetainedManifest(scope, id))?.deleted).toBe(true)
    expect(await drafts()).toEqual([])
    expect(journal()).toEqual([])
  } finally {
    setProjectStorageNamespace(previous.namespace)
  }
})

test('placar do jogo num projeto retido: sobrevive ao autosave, a fila espera o commit e a leitura relê', async () => {
  const { loadProjectShellById } = await import('./persistence')
  const { readRetainedManifest } = await import('./retainedProjectStore')
  const { editRetainedAuxiliary } = await import('./retainedProjectEditor')
  const { loadGameStorage, writeGameStorage, createGameStorageSession } = await import(
    './gameStorage'
  )
  const { runSerializedProjectWrite } = await import('./projectStorageRuntime')
  const previous = captureProjectStorageScope()
  const id = 'vila-placar'
  try {
    const { scope, script } = await retainedWithExitCopies('placar-retido', id)
    const editor = await prepareEditableStudioProject(
      await loadProjectShellById(id, scope),
      capability(scope),
    )
    if (!editor || isPythonProject(editor)) throw Error('O projeto não abriu.')
    const save = async (text: string) => {
      editor.files = { ...editor.files, 'script.js': text }
      await persistProject(editor, {}, scope)
    }

    // O placar capturou o manifesto antes de um autosave do editor: repete sobre a cabeça nova.
    const captured = (await readRetainedManifest(scope, id))!
    await save('console.log("autosave")')
    await editRetainedAuxiliary(scope, captured, { game: { placar: '7' } })
    expect(await loadGameStorage(id)).toStrictEqual({ placar: '7' })
    await save('console.log("depois-do-placar")')
    expect(script(await loadProjectShellById(id, scope))).toBe('console.log("depois-do-placar")')

    // A próxima escrita do projeto só começa depois de o placar chegar ao disco.
    const written = writeGameStorage(id, { placar: '8' })
    let seen: unknown
    const next = runSerializedProjectWrite(scope, id, async () => {
      seen = await loadGameStorage(id)
      return undefined
    })
    await Promise.all([written, next])
    expect(seen).toStrictEqual({ placar: '8' })

    // Um save entre ler o manifesto e ler o placar não faz o jogo começar vazio.
    let raced = false
    const racing = {
      ...scope,
      store: ((mode, callback) => {
        const read = scope.store(mode, callback)
        if (raced || mode !== 'readonly') return read
        raced = true
        return read.then(async (value) => {
          await save('console.log("no-meio-da-leitura")')
          return value
        })
      }) as typeof scope.store,
    }
    expect(await createGameStorageSession(id, racing).load()).toStrictEqual({ placar: '8' })
    expect(raced).toBe(true)
  } finally {
    setProjectStorageNamespace(previous.namespace)
  }
})
