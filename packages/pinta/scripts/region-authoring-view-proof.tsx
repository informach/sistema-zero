import { createRoot, type Root } from 'react-dom/client'
import { paintMapCanvas } from '../src/components/editor/mapTools/mapCanvas'
import { TilemapEditor } from '../src/components/editor/TilemapEditor'
import { Button } from '../src/components/ui/Button'
import { ToastProvider } from '../src/components/ui/Toast'
import type { PintaMemoryAsset } from '../src/core/assetMemory'
import { pintaLocalRevisionOf } from '../src/core/localAssetOrigin'
import { PintaLocalConflictError } from '../src/core/localStorageErrors'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
  isTileLayer,
  type RegionTilemapAsset,
  sanitizePintaAsset,
} from '../src/core/project'
import { observePintaReferences } from '../src/core/sceneMapClosure'
import { createEditorStore, type PintaEditorStore } from '../src/state/editorStore'
import { createRegionPintaPersistence } from '../src/state/localRegionPersistence'
import { setPintaStorageNamespace } from '../src/state/persistence'
import { createSessionStore, TILEMAP_ZOOM_LEVELS } from '../src/state/sessionStore'
import { TileChunkCache } from '../src/tiles/chunks'
import { addMapObject, createRegionMapObject } from '../src/tiles/mapObjects'
import { expandRegionMap, prepareMapRegions } from '../src/tiles/regionMap'
import { captureMapResourceVersion } from '../src/tiles/resourceVersions'
import { pixelSheetCanvas } from '../src/tiles/sheetCanvas'
import { addObjectLayer, cellAt, setCell } from '../src/tiles/tilemapOps'
import { measureRegionalIo } from './region-io-proof'

type Seed = { namespace: string; id: string; ground: string; objects: string; sheet: string }
let mounted: { root: Root; editor: PintaEditorStore<PintaMemoryAsset> } | undefined

export async function seedRegionalAuthoringView(): Promise<Seed> {
  const namespace = crypto.randomUUID()
  const local = createRegionPintaPersistence({ namespace })
  const sheet = createTilesetAsset({ name: 'Peças da Vila', tileSize: 16 })
  const block = sheet.tiles[0]!
  sheet.tiles = Array.from({ length: 16 }, (_, index) => ({
    ...block,
    data: new Uint8Array(256).fill(index % 2 ? 2 : 1),
  }))
  sheet.solid = new Array(16).fill(false)
  sheet.platform = new Array(16).fill(false)
  sheet.terrains = [
    {
      id: 'terra',
      name: 'Terra',
      mode: 'edge',
      colors: ['#337733'],
      tiles: Object.fromEntries(
        sheet.tiles.map((_tile, index) => [
          index,
          Array.from({ length: 8 }, (_, slot) => (slot % 2 === 0 ? (index >> (slot / 2)) & 1 : 0)),
        ]),
      ),
    },
  ]
  const candidate = prepareMapRegions(
    addObjectLayer(
      createTilemapAsset({
        name: 'Vila de autoria',
        tilesetId: sheet.id,
        cols: 64,
        rows: 32,
      }),
      'Marcas',
    ),
  )
  if (!candidate.ok) throw Error(candidate.reason)
  const expanded = expandRegionMap(candidate.map, { col: -64, row: -64, cols: 10000, rows: 10000 })
  if (!expanded.ok) throw Error(expanded.reason)
  const ground = expanded.map.layers.find(isTileLayer)
  const objects = expanded.map.layers.find(isObjectLayer)
  if (!ground || !objects) throw Error('Camadas ausentes')
  const tree = createPixelSpriteAsset({ name: 'Árvore', frameSize: 8 })
  const frame = tree.animations[0]!.frames[0]!
  ;(Array.isArray(frame) ? frame[0]! : frame).data.fill(1)
  const portableTree = sanitizePintaAsset(tree)
  if (!portableTree) throw Error('Arte ausente')
  const captured = captureMapResourceVersion(expanded.map, portableTree)
  if (!captured.ok) throw Error(captured.reason)
  const artwork = createRegionMapObject({
    name: 'Árvore da Vila',
    x: -800,
    y: -720,
    width: 16,
    height: 16,
    art: { assetId: captured.version.asset.id },
  })
  if (!artwork) throw Error('Arte regional ausente')
  const withArt = addMapObject(captured.map, objects.id, artwork)
  const map = setCell(setCell(withArt, ground.id, -35, -55, 0), ground.id, -29, -55, 0)
  await local.persistAssets([sheet, map])
  return { namespace, id: map.id, ground: ground.id, objects: objects.id, sheet: sheet.id }
}

function requireRegion(asset: PintaMemoryAsset | null): RegionTilemapAsset {
  if (asset?.kind !== 'tilemap' || !('origin' in asset)) throw Error('Mapa ausente')
  return asset
}

export async function loadRegionalProofStyles() {
  if (!document.head.querySelector('link[rel="stylesheet"]')) {
    const markup = new DOMParser().parseFromString(await (await fetch('/')).text(), 'text/html')
    for (const style of markup.querySelectorAll('link[rel="stylesheet"]')) {
      const href = new URL(style.getAttribute('href') ?? '', location.href)
      if (href.origin !== location.origin) continue
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href.href
      await new Promise<void>((resolve, reject) => {
        link.onload = () => resolve()
        link.onerror = () => reject(Error('Estilos da oficina ausentes'))
        document.head.append(link)
      })
    }
  }
}

export async function openRegionalAuthoringView(seed: Seed) {
  await loadRegionalProofStyles()
  setPintaStorageNamespace(seed.namespace)
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  const asset = requireRegion(await local.loadAssetById(seed.id))
  const sheet = await local.loadAssetById(seed.sheet)
  if (!sheet) throw Error('Peças ausentes')
  const editor = createEditorStore<PintaMemoryAsset>({
    asset,
    persist: (edited, linked) => local.persistAssets([edited, ...linked]),
    observeResources: (asset) => observePintaReferences(asset, [sheet]),
    persistRevision: local.persistRevision!,
    recoverPersisted(error, id) {
      if (!(error instanceof PintaLocalConflictError)) return null
      const asset = error.forks.get(id)
      return asset ? { asset, linked: [] } : null
    },
  })
  mounted?.root.unmount()
  const root = createRoot(document.body)
  const session = createSessionStore({
    tool: 'pencil',
    zoom: 1,
    zoomLevels: TILEMAP_ZOOM_LEVELS,
  })
  root.render(
    <ToastProvider>
      <main style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
        <div>
          <Button onClick={() => editor.getState().undo()}>Desfazer</Button>
          <Button onClick={() => editor.getState().redo()}>Refazer</Button>
        </div>
        <TilemapEditor regional={{ editor, session, gallery: [asset, sheet] }} />
      </main>
    </ToastProvider>,
  )
  mounted = { root, editor }
}

export function regionalAuthoringCells(col: number, row: number) {
  const map = requireRegion(mounted?.editor.getState().asset ?? null)
  const paper = document.querySelector('.pin-paper')?.getBoundingClientRect()
  if (!paper) throw Error('Palco ausente')
  return {
    x: paper.left + (col - map.origin.col + 0.5) * 16,
    y: paper.top + (row - map.origin.row + 0.5) * 16,
  }
}

export async function flushRegionalAuthoringView() {
  if (!mounted) throw Error('Editor ausente')
  return measureRegionalIo(mounted.editor.getState().flush)
}

export async function inspectRegionalAuthoringView(
  seed: Seed,
  coords: readonly { col: number; row: number }[],
  id = seed.id,
) {
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  const map = requireRegion(await local.loadAssetById(id))
  const ground = map.layers.find(isTileLayer)
  if (!ground) throw Error('Camada de peças ausente')
  return {
    id: mounted?.editor.getState().asset.id,
    name: map.name,
    cells: coords.map(({ col, row }) => cellAt(map, ground.id, col, row)),
    objects: map.layers.find(isObjectLayer)?.objects ?? [],
  }
}

export async function changeRegionalAuthoringInAnotherTab(seed: Seed, col: number, row: number) {
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  const map = requireRegion(await local.loadAssetById(seed.id))
  await local.persistAsset({ ...setCell(map, seed.ground, col, row, 11), name: 'Outra aba' })
}

export async function compareRegionalAuthoringPixels(seed: Seed) {
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  const map = requireRegion(await local.loadAssetById(seed.id))
  const sheetAsset = await local.loadAssetById(seed.sheet)
  const actual = document.querySelector<HTMLCanvasElement>('canvas[role=img]')
  const stage = actual?.parentElement?.parentElement ?? null
  if (!actual || !stage || sheetAsset?.kind !== 'tileset') throw Error('Palco ausente')
  const expected = document.createElement('canvas')
  const sheet = pixelSheetCanvas(sheetAsset)
  paintMapCanvas({
    canvas: expected,
    stage,
    map,
    pad: 0,
    cellPx: 16,
    tileSize: 16,
    cache: new TileChunkCache(),
    tilesetById: new Map([[sheetAsset.id, sheetAsset]]),
    sheetOf: () => sheet,
    showCollision: false,
    time: 0,
  })
  const hash = async (canvas: HTMLCanvasElement) => {
    const bytes = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  }
  return { actual: await hash(actual), expected: await hash(expected), width: actual.width }
}

export async function verifyRegionalAuthoringAbortAndCausalFence(seed: Seed) {
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  setPintaStorageNamespace(seed.namespace)
  const before = requireRegion(await local.loadAssetById(seed.id))
  const sheet = await local.loadAssetById(seed.sheet)
  if (!sheet) throw Error('Peças ausentes')
  const revision = pintaLocalRevisionOf(before)
  const resources = observePintaReferences(before, [sheet])
  const next = setCell(before, seed.ground, -35, -55, 7)
  const original = IDBObjectStore.prototype.put
  let chunkPuts = 0
  let stopped = false
  IDBObjectStore.prototype.put = function (value, key) {
    const request = original.call(this, value, key)
    if (typeof key === 'string' && key.startsWith('pinta:local:chunk:')) {
      chunkPuts++
      request.addEventListener('success', () => {
        stopped = true
        this.transaction.abort()
      })
    }
    return request
  }
  try {
    await local.persistRevision!(before, next, resources).then(
      () => {
        throw Error('O autosave não foi interrompido')
      },
      (error) => {
        if (!stopped || error.message !== 'A gravação foi interrompida.') throw error
      },
    )
  } finally {
    IDBObjectStore.prototype.put = original
  }
  const reverted = requireRegion(await local.loadAssetById(seed.id))
  const rolledBack =
    pintaLocalRevisionOf(reverted) === revision &&
    cellAt(reverted, seed.ground, -35, -55) === 0 &&
    pintaLocalRevisionOf(next) === revision
  await local.persistRevision!(before, next, resources)
  const saved = requireRegion(await local.loadAssetById(seed.id))
  await local.causal.rememberProtocol()
  const forbidden = setCell(saved, seed.ground, -35, -55, 13)
  const fenced = await local.persistRevision!(saved, forbidden, resources).then(
    () => false,
    (error) => error.message.includes('pela sua conta'),
  )
  const reopened = requireRegion(await local.loadAssetById(seed.id))
  return {
    rolledBack,
    stopped,
    chunkPuts,
    fenced,
    confirmed: cellAt(reopened, seed.ground, -35, -55),
    revisionPreserved: pintaLocalRevisionOf(saved) === pintaLocalRevisionOf(reopened),
    protocolKnown: (await local.causal.inspect()).protocolKnown,
  }
}
