import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { IDBFactory } from 'fake-indexeddb'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { embedPintaRegionImage } from '../../../pinta/src/export/regionImage'
import { encodeAssetBase64 } from '../core/assetBinary'
import { admitPintaRegionalMaterial, type PintaRegionalMarker } from '../core/pintaRegionalMaterial'
import { admitRegionalProjectAssets } from '../core/pintaRegionalProjectAdmission'
import {
  assertLegacyStudioProjectMaterials,
  PRIVATE_REGIONAL_JS_PROJECT,
} from '../core/pintaRegionalReference'
import { createEmptyProject, type ProjectAsset } from '../core/project'
import {
  PROJECT_ASSET_LIMITS,
  projectAssetBudgetChars,
  sanitizeProjectAssets,
} from '../core/projectAssets'
import { assertProjectContentPreserved } from '../core/projectDocumentGuards'
import { discardImportedProjectSnapshot, restoreProjectFromCloud } from '../projects/importSnapshot'
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
import {
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectStateKey,
} from './projectStorageKeys'
import { createProjectStorageScope } from './projectStorageRuntime'
import { validateEditableStudioCreationSnapshot } from './projectValidation'

const { createCanvas } = createRequire(new URL('../../../pinta/package.json', import.meta.url))(
  '@napi-rs/canvas',
)
const png = (width: number, height: number, color = '#3355dd') => {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
const url = (bytes: Uint8Array) => `data:image/png;base64,${encodeAssetBase64(bytes)}`
const capability = { [PRIVATE_REGIONAL_JS_PROJECT]: true } as const
const initialDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
const box = { width: 64, height: 32 }
type Capture = typeof box & { regional: PintaRegionalMarker; dataUrl: string }
let before: Capture
let after: Capture

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
    const prepared = await prepareEditableStudioProject(document, capability)
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
    capability,
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
  expect((await loadProjectAssetsSnapshotById(ownerProject.id, owner, capability)).assets).toEqual([
    { ...image, ...before },
  ])
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
  expect((await loadProjectAssetsSnapshotById(old.id, scope, capability)).assets).toEqual([
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
