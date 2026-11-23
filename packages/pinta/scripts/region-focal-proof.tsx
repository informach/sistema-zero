import { createRoot, type Root } from 'react-dom/client'
import { TilemapEditor } from '../src/components/editor/TilemapEditor'
import { PintaApp } from '../src/components/PintaApp'
import { ToastProvider } from '../src/components/ui/Toast'
import { isTileLayer } from '../src/core/project'
import type { LocalRegionAuthorSession } from '../src/state/localRegionAuthorSession'
import { createRegionPintaPersistence } from '../src/state/localRegionPersistence'
import { setPintaStorageNamespace } from '../src/state/persistence'
import { createSessionStore, TILEMAP_ZOOM_LEVELS } from '../src/state/sessionStore'
import { createWorkshopPintaPersistence } from '../src/state/workshopPersistence'
import { cellAt, setCell } from '../src/tiles/tilemapOps'
import { loadRegionalProofStyles } from './region-authoring-view-proof'
import { measureRegionalIo, type seedRegionalIoProfile } from './region-io-proof'

type Seed = Awaited<ReturnType<typeof seedRegionalIoProfile>>
let mounted: { root: Root; focal: LocalRegionAuthorSession } | null = null
let gesture: ReturnType<typeof measureRegionalIo<boolean>> | null = null
let workshopLoads = { fullListings: 0, fullDocuments: 0 }
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
const isBusy = () => document.querySelector('.pin-stage')?.getAttribute('aria-busy') !== 'false'

async function painted() {
  const start = performance.now()
  while (isBusy()) {
    if (performance.now() - start > 6_000) throw Error('Janela regional não pintou')
    await frame()
  }
}

export async function openFocalRegionalAuthoring(seed: Seed) {
  await loadRegionalProofStyles()
  mounted?.root.unmount()
  mounted?.focal.close()
  setPintaStorageNamespace(seed.namespace)
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  const { value: focal, ...open } = await measureRegionalIo(() => local.openRegionSession!(seed.id))
  if (!focal) throw Error('Sessão regional ausente')
  const root = createRoot(document.body)
  const session = createSessionStore({
    tool: 'eraser',
    zoom: 1,
    zoomLevels: TILEMAP_ZOOM_LEVELS,
  })
  const { value: revision, ...camera } = await measureRegionalIo(async () => {
    root.render(
      <ToastProvider>
        <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
          <TilemapEditor regional={{ focal, session }} />
        </main>
      </ToastProvider>,
    )
    await painted()
    return focal.store.getState().revision
  })
  mounted = { root, focal }
  const shape = focal.store.getState().document
  return {
    open,
    camera,
    revision,
    metadataOnly:
      !('kind' in shape) &&
      !('schema' in shape) &&
      shape.layers.every((layer) => !('cells' in layer)),
  }
}

export async function focalRegionalCamera(left: number, top: number) {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[role=img]')
  const stage = canvas?.parentElement?.parentElement
  if (!canvas || !stage) throw Error('Palco ausente')
  const previous = canvas.style.transform
  const { value: transform, ...io } = await measureRegionalIo(async () => {
    stage.scrollLeft = left
    stage.scrollTop = top
    const start = performance.now()
    while (previous === canvas.style.transform) {
      if (performance.now() - start > 6_000) throw Error('O canvas ficou na câmera anterior')
      await frame()
    }
    await painted()
    return canvas.style.transform
  })
  return { ...io, transform }
}

export function focalRegionalPoint(col: number, row: number) {
  if (!mounted) throw Error('Editor ausente')
  const map = mounted.focal.store.getState().document
  const paper = document.querySelector('.pin-paper')?.getBoundingClientRect()
  if (!paper) throw Error('Papel ausente')
  return {
    x: paper.left + (col - map.origin.col + 0.5) * 16,
    y: paper.top + (row - map.origin.row + 0.5) * 16,
  }
}

export function measureNextFocalRegionalGesture() {
  if (!mounted) throw Error('Editor ausente')
  const { store } = mounted.focal
  gesture = measureRegionalIo(
    () =>
      new Promise<boolean>((resolve) => {
        const stop = store.subscribe((state, previous) => {
          if (!previous.saving || state.saving) return
          stop()
          resolve(!state.error)
        })
      }),
  )
}

export function measuredFocalRegionalGesture() {
  if (!gesture) throw Error('Gesto não observado')
  return gesture
}

export async function inspectFocalRegionalCells(seed: Seed, change = false) {
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  const map = await local.loadAssetById(seed.id)
  if (map?.kind !== 'tilemap' || !('origin' in map)) throw Error('Mapa ausente')
  const ground = map.layers.find(isTileLayer)
  if (!ground) throw Error('Mapa ausente')
  if (change) await local.persistAsset(setCell(map, ground.id, -33, -53, 12))
  return [
    cellAt(map, ground.id, -33, -55),
    cellAt(map, ground.id, -32, -55),
    cellAt(map, ground.id, 1000, 800),
    cellAt(map, ground.id, -33, -53),
  ]
}

export async function mountRegionalWorkshop(seed: Seed) {
  await loadRegionalProofStyles()
  setPintaStorageNamespace(seed.namespace)
  workshopLoads = { fullListings: 0, fullDocuments: 0 }
  const local = createWorkshopPintaPersistence({ namespace: seed.namespace })
  const persistence = {
    ...local,
    async listAllAssets() {
      workshopLoads.fullListings++
      return local.listAllAssets()
    },
    async loadAssetById(id: string) {
      workshopLoads.fullDocuments++
      return local.loadAssetById(id)
    },
  }
  createRoot(document.body).render(
    <main style={{ width: '100vw', height: '100vh' }}>
      <PintaApp persistence={persistence} />
    </main>,
  )
}

export function regionalWorkshopLoads() {
  return workshopLoads
}

export function regionalWorkshopPoint() {
  const paper = document.querySelector('.pin-paper')?.getBoundingClientRect()
  if (!paper) throw Error('Mapa ausente')
  return { x: paper.left + 16, y: paper.top + 16 }
}

export async function inspectWorkshopFirstCell(seed: Seed) {
  const local = createRegionPintaPersistence({ namespace: seed.namespace })
  const map = await local.loadAssetById(seed.id)
  if (map?.kind !== 'tilemap' || !('origin' in map)) throw Error('Mapa ausente')
  const ground = map.layers.find(isTileLayer)
  if (!ground) throw Error('Camada ausente')
  return cellAt(map, ground.id, map.origin.col, map.origin.row)
}
