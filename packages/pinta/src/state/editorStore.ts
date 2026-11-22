/**
 * Store do EDITOR por asset aberto (factory): o asset vivo + undo/redo por
 * snapshots (`core/history.ts`) + autosave debounced (~1s) com flush explícito
 * (pagehide/unmount/voltar). O `persist` é injetado (testes passam um fake; a
 * produção usa `persistAssets`), e `onSaved` deixa a galeria absorver o snapshot
 * confirmado sem reler o disco.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { type PintaMemoryAsset, retainedAssetBytes, sharedAssetParts } from '../core/assetMemory'
import { createHistory, type SharedPart } from '../core/history'
import type { PintaResourceObservation } from '../core/localAssetOrigin'
import { RegionMetadataBudgetCache, regionDocumentMetadata } from '../core/mapDocumentBoundary'
import { isTilesetKind, type PintaAsset } from '../core/project'
import { RegionBackupSizeCache } from '../export/regionBackupSize'
import type { TileIndexChange } from '../tiles/tilesetOps'

export { assetBytes } from '../core/assetMemory'

export type PintaSaveState = 'saved' | 'pending' | 'saving' | 'error'

export type PintaSaveResult = { ok: true } | { ok: false; error: string }

export interface PintaEditorLayoutChange {
  oldToNew: readonly number[]
  count: number
}

export interface PintaEditorWriteContext {
  layout?: PintaEditorLayoutChange
  resources: readonly PintaResourceObservation[]
}

export interface PintaEditorState<Asset extends PintaMemoryAsset = PintaAsset> {
  asset: Asset
  /** Último snapshot efetivamente confirmado pela persistência. */
  savedAsset: Asset
  /** Assets ligados ao estado vivo do editor; `null` até o primeiro remapeamento. */
  linkedAssets: readonly Asset[] | null
  /** Há uma revisão local que ainda não foi confirmada pela persistência. */
  dirty: boolean
  saveState: PintaSaveState
  saveError: string | null
  canUndo: boolean
  canRedo: boolean

  /** Aplica a edição, grava história e agenda autosave. False se o host/linhagem recusar. */
  commit(next: Asset): boolean
  /**
   * Como `commit`, mas a edição TAMBÉM remapeia ASSETS LIGADOS (ex.: editar uma
   * peça do tileset remapeia as células dos mapas dependentes). Os mapas entram
   * na MESMA entrada de undo: desfazer/refazer restaura o tileset E os mapas
   * juntos. `before` = mapas antes; `after` = mapas remapeados (já com
   * updatedAt). A galeria só recebe o conjunto depois da persistência confirmar.
   */
  commitLinked(
    next: Asset,
    linked: { before: Asset[]; after: Asset[] },
    indices?: TileIndexChange,
  ): boolean
  /** Substitui SEM entrada de undo (ex.: rename vindo da galeria). */
  replace(next: Asset): void
  /** Conditional gesture write; returns its surviving snapshot, or null if superseded/refused. */
  replaceIfCurrent(expected: Asset, next: Asset): Asset | null
  /**
   * Fecha um gesto de VÁRIOS passos aplicados via `replace` (ex.: arrastar
   * pintando células do tilemap): grava o snapshot INICIAL do gesto no undo —
   * desfazer volta ao antes do arrasto inteiro, não célula a célula.
   */
  commitGesture(base: Asset): void
  undo(): void
  redo(): void
  /** Salva imediatamente tudo que estiver pendente e informa se confirmou. */
  flush(): Promise<PintaSaveResult>
}

export type PintaEditorStore<Asset extends PintaMemoryAsset = PintaAsset> = StoreApi<
  PintaEditorState<Asset>
>

/**
 * Snapshot de undo. Além do asset editado, carrega os ASSETS LIGADOS remapeados
 * por aquela edição (mapas de um tileset) — assim o histórico restaura os dois
 * juntos. `linkedMaps` só é não-nulo depois de um `commitLinked`; edições comuns
 * (pincel etc.) carregam o `linkedMaps` corrente adiante (mapas não mudaram).
 */
interface EditorSnapshot<Asset extends PintaMemoryAsset> {
  asset: Asset
  linkedMaps: Asset[] | null
  slots: readonly symbol[] | null
  resources: readonly PintaResourceObservation[] | undefined
}

/** Mescla revisões ligadas por id, preservando assets tocados em commits anteriores. */
function mergeLinkedAssets<Asset extends PintaMemoryAsset>(
  current: readonly Asset[] | null,
  changed: readonly Asset[],
): Asset[] {
  const merged = new Map((current ?? []).map((asset) => [asset.id, asset]))
  for (const asset of changed) merged.set(asset.id, asset)
  return [...merged.values()]
}

/** Bytes do snapshot de undo = o asset + os mapas ligados (se houver). */
function snapshotBytes(snapshot: EditorSnapshot<PintaMemoryAsset>): number {
  let bytes = retainedAssetBytes(snapshot.asset, false)
  if (snapshot.linkedMaps)
    for (const map of snapshot.linkedMaps) bytes += retainedAssetBytes(map, false)
  return bytes
}

/**
 * As células das camadas de peças, pelo próprio buffer. As operações do mapa copiam só a camada
 * que o gesto tocou, então os passos do histórico dividem todas as outras: contar cada buffer uma
 * vez é o que a memória gasta de verdade.
 */
export function* snapshotShared(snapshot: {
  asset: PintaMemoryAsset
  linkedMaps: readonly PintaMemoryAsset[] | null
  slots?: readonly symbol[] | null
  resources?: readonly PintaResourceObservation[]
}): Iterable<SharedPart> {
  const maps = [snapshot.asset, ...(snapshot.linkedMaps ?? [])]
  for (const asset of maps) yield* sharedAssetParts(asset)
  if (snapshot.slots) yield { key: snapshot.slots, bytes: snapshot.slots.length * 8 }
  if (snapshot.resources)
    yield {
      key: snapshot.resources,
      bytes: snapshot.resources.reduce(
        (sum, item) => sum + (item.id.length + (item.localRevision?.length ?? 0)) * 2,
        0,
      ),
    }
}

export interface PintaEditorStoreOptions<Asset extends PintaMemoryAsset = PintaAsset> {
  asset: Asset
  persist: (
    asset: Asset,
    linkedAssets: readonly Asset[],
    layout?: PintaEditorLayoutChange,
    resources?: readonly PintaResourceObservation[],
  ) => Promise<void>
  observeResources?: (asset: Asset) => readonly PintaResourceObservation[]
  onSaved?: (asset: Asset, linkedAssets: readonly Asset[]) => void
  /** Delay por instância; produção usa 1s, testes podem injetar um valor curto. */
  autosaveDelayMs?: number
  /** Traduz erros de persistência para o badge sem acoplar o store à UI. */
  persistErrorMessage?: (error: unknown) => string
  /** Orçamento do host (ex.: entrega de aula). Recusa antes do histórico e do autosave. */
  acceptEdit?: (asset: Asset) => boolean
  /** A persistência confirmou a edição num fork; adota esse documento, sem alterar o original. */
  recoverPersisted?: (error: unknown, sourceId: string) => { asset: Asset; linked: Asset[] } | null
}

export function createEditorStore<Asset extends PintaMemoryAsset = PintaAsset>(
  options: NoInfer<PintaEditorStoreOptions<Asset>>,
): PintaEditorStore<Asset> {
  const metadataBudget = new RegionMetadataBudgetCache()
  let backupSizes: RegionBackupSizeCache | null = null
  function admitsMetadata(asset: Asset): boolean {
    if ((asset.kind !== 'tilemap' && asset.kind !== 'map-set') || asset.schema !== 8) return true
    const metadata = regionDocumentMetadata(asset)
    return metadata !== null && metadataBudget.accepts(metadata)
  }
  function admitsSnapshot(asset: Asset, linked: readonly Asset[] = []): boolean {
    const assets = [asset, ...linked]
    if (!assets.every(admitsMetadata)) return false
    if (
      !assets.some(
        (item) => (item.kind === 'tilemap' || item.kind === 'map-set') && item.schema === 8,
      )
    )
      return true
    if (!backupSizes) backupSizes = new RegionBackupSizeCache()
    return Number.isFinite(backupSizes.byteLength(assets))
  }
  if (!admitsSnapshot(options.asset)) throw new RangeError('O cenário excede o orçamento de dados.')
  const history = createHistory<EditorSnapshot<Asset>>({
    sizeOf: snapshotBytes,
    sharedOf: snapshotShared,
  })
  let timer: ReturnType<typeof setTimeout> | null = null
  let saving: Promise<PintaSaveResult> | null = null
  let dirty = false
  // Mapas ligados ao ESTADO CORRENTE do asset (null até o 1º commitLinked).
  let currentLinked: Asset[] | null = null
  // The same logical slots follow the snapshots already kept for undo, even when pixel data changes.
  let currentSlots: readonly symbol[] | null = isTilesetKind(options.asset)
    ? options.asset.tiles.map(() => Symbol())
    : null
  let savedSlots = currentSlots
  let currentResources = options.observeResources?.(options.asset)
  function observeNewBindings(asset: Asset): void {
    const observed = options.observeResources?.(asset)
    if (!observed) return
    const previous = new Map(currentResources?.map((resource) => [resource.id, resource]))
    const next = observed.map((resource) => previous.get(resource.id) ?? resource)
    if (
      !currentResources ||
      next.length !== currentResources.length ||
      next.some((resource, index) => resource !== currentResources?.[index])
    )
      currentResources = next
  }

  const store = createStore<PintaEditorState<Asset>>((set, get) => {
    async function saveNow(): Promise<PintaSaveResult> {
      // Drena revisões criadas durante uma gravação antes de confirmar o flush.
      // Em erro, para imediatamente e conserva `dirty=true` para o retry.
      while (true) {
        if (saving) {
          const result = await saving
          if (!result.ok) return result
          continue
        }
        if (!dirty) return { ok: true }

        dirty = false
        const snapshot = get().asset
        const linkedSnapshot = currentLinked ? [...currentLinked] : []
        const slots = currentSlots
        const resources = currentResources
        const layout =
          slots && savedSlots && slots !== savedSlots
            ? { oldToNew: savedSlots.map((slot) => slots.indexOf(slot)), count: slots.length }
            : undefined
        set({ dirty: false, saveState: 'saving', saveError: null })

        const request = (async (): Promise<PintaSaveResult> => {
          try {
            if (resources) await options.persist(snapshot, linkedSnapshot, layout, resources)
            else if (layout) await options.persist(snapshot, linkedSnapshot, layout)
            else await options.persist(snapshot, linkedSnapshot)
            savedSlots = slots
            options.onSaved?.(snapshot, linkedSnapshot)
            set(
              dirty
                ? { savedAsset: snapshot }
                : {
                    savedAsset: snapshot,
                    dirty: false,
                    saveState: 'saved',
                    saveError: null,
                  },
            )
            return { ok: true }
          } catch (error) {
            const recovered = !dirty ? options.recoverPersisted?.(error, snapshot.id) : null
            if (recovered && admitsSnapshot(recovered.asset, recovered.linked)) {
              history.clear()
              currentLinked = recovered.linked
              savedSlots = slots
              currentResources = options.observeResources?.(recovered.asset)
              options.onSaved?.(recovered.asset, recovered.linked)
              set({
                asset: recovered.asset,
                savedAsset: recovered.asset,
                linkedAssets: recovered.linked,
                dirty: false,
                saveState: 'saved',
                saveError: null,
                canUndo: false,
                canRedo: false,
              })
              return { ok: true }
            }
            dirty = true
            const message =
              options.persistErrorMessage?.(error) ??
              (error instanceof Error ? error.message : String(error))
            set({ dirty: true, saveState: 'error', saveError: message })
            return { ok: false, error: message }
          }
        })()
        saving = request
        const result = await request
        if (saving === request) saving = null
        if (!result.ok) return result
      }
    }

    function scheduleAutosave(): void {
      dirty = true
      set({ dirty: true, saveState: 'pending', saveError: null })
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        void saveNow()
      }, options.autosaveDelayMs ?? 1000)
    }

    function apply(
      next: Asset,
      recordHistory: boolean,
      linked?: { before: Asset[]; after: Asset[] },
      indices?: TileIndexChange,
    ): Asset | null {
      const current = get().asset
      // A controller from a gesture that began before conflict recovery may still finish.
      // It must never put the old document back into the adopted copy or its history.
      if (next.id !== current.id) return null
      // Size exactly the timestamped snapshot that would survive this operation.
      const applied = { ...next, updatedAt: Date.now() }
      const previousLinked = linked
        ? mergeLinkedAssets(currentLinked, linked.before)
        : currentLinked
      const proposedLinked = linked
        ? mergeLinkedAssets(previousLinked, linked.after)
        : currentLinked
      if (
        !admitsSnapshot(applied, proposedLinked ?? []) ||
        (linked && !admitsSnapshot(current, previousLinked ?? []))
      )
        return null
      const acceptEdit = options.acceptEdit
      if (acceptEdit && (!acceptEdit(next) || linked?.after.some((asset) => !acceptEdit(asset))))
        return null
      if (get().asset !== current) return null
      let slots = currentSlots
      if (indices) {
        if (!slots || !isTilesetKind(applied)) return null
        const inserted = 'insertedAt' in indices
        const at = inserted ? indices.insertedAt : indices.removedAt
        if (
          !Number.isInteger(at) ||
          at < 0 ||
          at >= (inserted ? applied.tiles.length : slots.length) ||
          applied.tiles.length !== slots.length + (inserted ? 1 : -1)
        )
          return null
        const changed = [...slots]
        if (inserted) changed.splice(at, 0, Symbol())
        else changed.splice(at, 1)
        slots = changed
      }
      if (recordHistory) {
        // O snapshot restaurado por undo carrega o ESTADO ANTERIOR: para uma
        // edição com remap, os mapas ANTES; senão, o `currentLinked` corrente.
        history.record({
          asset: current,
          linkedMaps: previousLinked,
          slots: currentSlots,
          resources: currentResources,
        })
        observeNewBindings(applied)
      }
      currentSlots = slots
      if (linked) currentLinked = proposedLinked
      set({
        asset: applied,
        linkedAssets: currentLinked,
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      })
      scheduleAutosave()
      return get().asset === applied ? applied : null
    }

    return {
      asset: options.asset,
      savedAsset: options.asset,
      linkedAssets: null,
      dirty: false,
      saveState: 'saved',
      saveError: null,
      canUndo: false,
      canRedo: false,

      commit(next) {
        return apply(next, true) !== null
      },

      commitLinked(next, linked, indices) {
        return apply(next, true, linked, indices) !== null
      },

      replace(next) {
        apply(next, false)
      },

      replaceIfCurrent(expected, next) {
        return get().asset === expected ? apply(next, false) : null
      },

      commitGesture(base) {
        if (
          base.id !== get().asset.id ||
          base === get().asset ||
          !admitsSnapshot(base, currentLinked ?? [])
        )
          return
        history.record({
          asset: base,
          linkedMaps: currentLinked,
          slots: currentSlots,
          resources: currentResources,
        })
        set({ canUndo: history.canUndo(), canRedo: history.canRedo() })
        scheduleAutosave()
      },

      undo() {
        const prev = history.undo({
          asset: get().asset,
          linkedMaps: currentLinked,
          slots: currentSlots,
          resources: currentResources,
        })
        if (!prev) return
        currentLinked = prev.linkedMaps
        currentSlots = prev.slots
        currentResources = prev.resources
        set({
          asset: prev.asset,
          linkedAssets: currentLinked,
          canUndo: history.canUndo(),
          canRedo: history.canRedo(),
        })
        scheduleAutosave()
      },

      redo() {
        const next = history.redo({
          asset: get().asset,
          linkedMaps: currentLinked,
          slots: currentSlots,
          resources: currentResources,
        })
        if (!next) return
        currentLinked = next.linkedMaps
        currentSlots = next.slots
        currentResources = next.resources
        set({
          asset: next.asset,
          linkedAssets: currentLinked,
          canUndo: history.canUndo(),
          canRedo: history.canRedo(),
        })
        scheduleAutosave()
      },

      async flush() {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        return saveNow()
      },
    }
  })

  return store
}
