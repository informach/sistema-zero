import { PINTA_REGION_SIDE } from '@sistemazero/core/creations'
import { createStore } from 'zustand/vanilla'
import {
  applyMapBrush,
  BrushStrokeBudget,
  brushTerrain,
  collectShapeBrushCells,
  collectTargetBrushCells,
  type MapBrushContext,
} from '../components/editor/mapTools/mapBrush'
import { mapBrushMessage } from '../components/editor/mapTools/mapBrushMessages'
import { readStoredRegionMapViewport } from '../components/editor/mapTools/storedRegionMapCanvas'
import { pintaValuesEqual } from '../core/assetEquality'
import { retainedAssetBytes, sharedAssetParts } from '../core/assetMemory'
import { COPY } from '../core/copy'
import { createHistory } from '../core/history'
import type { PintaResourceObservation } from '../core/localAssetOrigin'
import { PintaLocalStorageError } from '../core/localStorageErrors'
import {
  type AnyTilesetAsset,
  effectiveLayer,
  isTileLayer,
  isTilesetKind,
  type RegionTilemapAsset,
  tileLayerTilesetId,
  tilemapTilesetIds,
} from '../core/project'
import type { CellPos } from '../tiles/cellGeometry'
import { isCellPosition } from '../tiles/mapCellEdits'
import { resolveMapTilesets } from '../tiles/mapTilesets'
import { REGION_EDIT_LIMIT } from '../tiles/regionCells'
import { localRegionChunkKey } from './localRegionChunkStorage'
import {
  commitLocalRegionChange,
  type LocalRegionCausalBinding,
  readLocalRegionEditBase,
} from './localRegionEditing'
import { getPintaStorageNamespace } from './persistence'

export type FocalRegionMap = ReturnType<typeof visualDocument>
export interface RegionalBrushGesture {
  tool: 'pencil' | 'eraser' | 'line' | 'rect'
  path: readonly CellPos[]
  layerId: string
  stamp: MapBrushContext['stamp']
  selectedTile: number
  brush: MapBrushContext['brush']
}

export type RegionalGestureResult = {
  ok: boolean
  changed: boolean
  message?: string
}

function visualDocument(map: RegionTilemapAsset) {
  return {
    id: map.id,
    name: map.name,
    origin: map.origin,
    cols: map.cols,
    rows: map.rows,
    tilesetId: map.tilesetId,
    resources: map.resources,
    layers: map.layers.map((layer) => {
      const placement = effectiveLayer(map, layer)
      if (!isTileLayer(layer)) return { ...layer, placement }
      const { cells: _cells, ...metadata } = layer
      return { ...metadata, placement }
    }),
  }
}

const refusal = (message?: string | null) =>
  new PintaLocalStorageError(message ?? COPY.scene.focal.refused)

/** A frase que a criança lê: a do Pinta, nunca a mensagem crua do IndexedDB (em inglês). */
const childMessage = (error: unknown) =>
  error instanceof PintaLocalStorageError ? error.message : COPY.scene.focal.saveError

function planRegionalBrush(
  map: RegionTilemapAsset,
  draft: RegionalBrushGesture,
  tilesets: ReadonlyMap<string, AnyTilesetAsset>,
) {
  const anchor = draft.path[0]
  if (
    !anchor ||
    draft.path.length > REGION_EDIT_LIMIT ||
    draft.path.some((at) => !at || !isCellPosition(at))
  )
    throw refusal()
  const layer = map.layers.find((layer) => layer.id === draft.layerId)
  if (!layer || !isTileLayer(layer)) throw refusal()
  const context: MapBrushContext = {
    anchor,
    layerId: draft.layerId,
    erasing: draft.tool === 'eraser',
    selectedTile: draft.selectedTile,
    stamp: draft.stamp,
    tileset: tilesets.get(tileLayerTilesetId(map, layer)) ?? null,
    brush: draft.brush,
  }
  if (!context.tileset) throw refusal()
  const batches: CellPos[][] = []
  if (draft.tool === 'line' || draft.tool === 'rect') {
    const shape = collectShapeBrushCells(map, draft.tool, anchor, draft.path.at(-1)!)
    if (!shape.ok) throw refusal(mapBrushMessage({ failure: shape.reason }))
    batches.push(shape.positions)
  } else {
    const budget = new BrushStrokeBudget()
    let last = anchor
    for (const at of draft.path) {
      const line = collectShapeBrushCells(map, 'line', last, at)
      const collected = line.ok ? collectTargetBrushCells(line.positions, context) : line
      if (!collected.ok) throw refusal(mapBrushMessage({ failure: collected.reason }))
      const admitted = budget.collect(collected.positions, anchor)
      if (!admitted.ok) throw refusal(mapBrushMessage({ failure: admitted.reason }))
      if (admitted.positions.length) batches.push(admitted.positions)
      last = at
    }
  }
  // Shapes and stamps can touch different cells. Use the same stamp geometry as the painter.
  const shape = draft.tool === 'line' || draft.tool === 'rect'
  const halo = brushTerrain(context) ? 1 : 0
  const keys = new Set<string>()
  const range = (col: number, row: number) =>
    col >= map.origin.col &&
    row >= map.origin.row &&
    col < map.origin.col + map.cols &&
    row < map.origin.row + map.rows
  for (const batch of batches) {
    const touched = shape
      ? collectTargetBrushCells(batch, context)
      : { ok: true as const, positions: batch }
    if (!touched.ok) throw refusal(mapBrushMessage({ failure: touched.reason }))
    for (const at of touched.positions) {
      if (!range(at.col, at.row)) continue
      for (let y = -halo; y <= halo; y++)
        for (let x = -halo; x <= halo; x++) {
          const col = at.col + x,
            row = at.row + y
          if (!range(col, row)) continue
          keys.add(
            localRegionChunkKey(
              map.id,
              context.layerId,
              Math.floor(col / PINTA_REGION_SIDE),
              Math.floor(row / PINTA_REGION_SIDE),
            ),
          )
        }
    }
  }
  return { keys, batches, context }
}

type Patch = {
  footprint: ReadonlySet<string>
  before: RegionTilemapAsset
  after: RegionTilemapAsset
}

/**
 * `causal`: the account writer's binding. Each gesture, undo and redo then commits its chunks and
 * the V4 unit in one transaction; without it the session only opens on a purely local profile.
 */
export async function openLocalRegionAuthorSession(
  namespace: string,
  id: string,
  signal?: AbortSignal,
  causal?: LocalRegionCausalBinding,
) {
  const opened = await readLocalRegionEditBase(namespace, id, signal, !!causal)
  if (opened?.directory.empty.kind !== 'tilemap') return null
  const root = opened.directory.empty
  const ids = tilemapTilesetIds(root)
  const tilesets = new Map(
    resolveMapTilesets(root, opened.assets.filter(isTilesetKind)).flatMap((tileset, index) =>
      tileset ? [[ids[index]!, tileset] as const] : [],
    ),
  )
  if (!tilesets.has(root.tilesetId)) return null
  const store = createStore(() => ({
    document: visualDocument(root),
    revision: opened.base.revision,
    saving: false,
    error: null as string | null,
    canUndo: false,
    canRedo: false,
  }))
  const history = createHistory<Patch>({
    sizeOf: ({ before, after }) =>
      retainedAssetBytes(before, false) + retainedAssetBytes(after, false),
    sharedOf: ({ before, after }) => [...sharedAssetParts(before), ...sharedAssetParts(after)],
  })
  const scope = new AbortController()
  const lifetime = signal ? AbortSignal.any([scope.signal, signal]) : scope.signal
  let pending: Promise<RegionalGestureResult> | null = null
  let failed = false
  let retryAction: Parameters<typeof run>[0] | null = null

  function run(
    action: () => Promise<{
      revision: string
      changed: boolean
      document: FocalRegionMap
      message?: string
    }>,
  ): Promise<RegionalGestureResult> {
    if (pending) return Promise.resolve({ ok: false, changed: false })
    if (failed && action !== retryAction)
      return Promise.resolve({
        ok: false,
        changed: false,
        message: store.getState().error ?? undefined,
      })
    retryAction = action
    store.setState({ saving: true, error: null })
    const queued = action()
      .then(
        (result) => {
          const { revision, document, changed, message } = result
          store.setState({
            revision,
            document,
            saving: false,
            canUndo: history.canUndo(),
            canRedo: history.canRedo(),
          })
          failed = false
          retryAction = null
          return { ok: true, changed, message }
        },
        (error: unknown) => {
          const message = childMessage(error)
          store.setState({ saving: false, error: message })
          failed = true
          return { ok: false, changed: false, message }
        },
      )
      .finally(() => {
        if (pending === queued) pending = null
      })
    pending = queued
    return queued
  }

  const base = () => ({ ...opened.base, revision: store.getState().revision })
  function apply(draft: RegionalBrushGesture) {
    return run(async () => {
      lifetime.throwIfAborted()
      const plan = planRegionalBrush(root, draft, tilesets)
      const result = await commitLocalRegionChange(
        base(),
        () => plan.keys,
        (asset) => {
          if (asset.kind !== 'tilemap') throw refusal()
          const before = asset
          let after = before
          let message: string | undefined
          for (const batch of plan.batches) {
            const painted = applyMapBrush(after, batch, plan.context)
            const warning = mapBrushMessage(painted)
            if (painted.failure) throw refusal(warning)
            if (warning) message = warning
            after = painted.map
          }
          if (!pintaValuesEqual(before, after)) after = { ...after, updatedAt: Date.now() }
          return {
            asset: after,
            value: { patch: { before, after, footprint: plan.keys }, message },
          }
        },
        lifetime,
        causal,
      )
      if (result.changed) history.record(result.value.patch)
      return {
        revision: result.revision,
        changed: result.changed,
        document: visualDocument(result.value.patch.after),
        message: result.value.message,
      }
    })
  }

  function restore(direction: 'undo' | 'redo') {
    return run(async () => {
      lifetime.throwIfAborted()
      const step = direction === 'undo' ? history.peekUndo() : history.peekRedo()
      if (!step) return { ...store.getState(), changed: false }
      const next = { ...(direction === 'undo' ? step.before : step.after), updatedAt: Date.now() }
      const result = await commitLocalRegionChange(
        base(),
        () => step.footprint,
        () => ({ asset: next, value: visualDocument(next) }),
        lifetime,
        causal,
      )
      if (direction === 'undo') history.undo(step)
      else history.redo(step)
      return { revision: result.revision, changed: result.changed, document: result.value }
    })
  }

  /** Every resource the window reads, at the revision each gesture's CAS confers. */
  const resources: readonly PintaResourceObservation[] = [
    ...opened.base.resources,
    ...[...opened.base.inlineResources.keys()].map((resource) => ({
      id: resource,
      localRevision: null,
    })),
  ]
  return {
    id,
    namespace,
    store,
    tilesets,
    catalog: opened.assets as readonly (typeof opened.assets)[number][],
    resources,
    apply,
    undo: () => restore('undo'),
    redo: () => restore('redo'),
    viewport(
      options: Omit<Parameters<typeof readStoredRegionMapViewport>[1], 'namespace' | 'revision'>,
    ) {
      if (namespace !== getPintaStorageNamespace()) return Promise.resolve(null)
      return readStoredRegionMapViewport(id, {
        ...options,
        namespace,
        revision: store.getState().revision,
        tilesetPins: tilesets,
        signal: options.signal ? AbortSignal.any([lifetime, options.signal]) : lifetime,
      })
    },
    flush: () =>
      pending ??
      Promise.resolve({
        ok: !failed,
        changed: false,
        message: store.getState().error ?? undefined,
      }),
    retry: () => (retryAction ? run(retryAction) : Promise.resolve({ ok: true, changed: false })),
    close: () => {
      scope.abort()
      history.clear()
      retryAction = null
    },
  }
}

export type LocalRegionAuthorSession = NonNullable<
  Awaited<ReturnType<typeof openLocalRegionAuthorSession>>
>
