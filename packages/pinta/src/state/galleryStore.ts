/**
 * Store da GALERIA por instância do <PintaApp> (factory, nunca singleton):
 * lista de assets do perfil + criação/renome/duplicar/apagar. Toda a
 * persistência passa por `state/persistence.ts` (IndexedDB local); erros viram
 * mensagem gentil no estado (a UI oferece retry) — nunca lançam.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorAsset,
  normalizeAssetName,
  PINTA_LIMITS,
  type PintaAsset,
} from '../core/project'
import { deleteAsset, listAllAssets, persistAsset } from './persistence'

export type NewAssetInput =
  | { kind: 'pixel-sprite'; name: string; frameSize: number }
  | { kind: 'pixel-background'; name: string; width: number; height: number }
  | { kind: 'tileset'; name: string; tileSize: number }
  | { kind: 'tilemap'; name: string; tilesetId: string; cols: number; rows: number }
  | { kind: 'vector'; name: string; width: number; height: number }

export interface PintaGalleryState {
  assets: PintaAsset[]
  loaded: boolean
  loading: boolean
  loadError: string | null
  /** Erro da última mutação (criar/renomear/duplicar/apagar) — copy amigável. */
  mutateError: string | null

  load(): Promise<void>
  /** Cria e persiste; devolve o asset novo ou null (nome inválido/duplicado/cota). */
  create(input: NewAssetInput): Promise<PintaAsset | null>
  rename(id: string, name: string): Promise<boolean>
  duplicate(id: string): Promise<PintaAsset | null>
  remove(id: string): Promise<boolean>
  /** Absorve um asset atualizado pelo editor (autosave) sem reler o disco. */
  absorb(asset: PintaAsset): void
  /**
   * Restaura assets de um backup `.pinta.json`: ids NOVOS + nome com sufixo em
   * colisão (import nunca sobrescreve o que existe); respeita a quota — devolve
   * quantos entraram e quantos ficaram de fora.
   */
  importAssets(assets: PintaAsset[]): Promise<{ added: number; skipped: number }>
  clearMutateError(): void
}

export type PintaGalleryStore = StoreApi<PintaGalleryState>

function upsertSorted(assets: PintaAsset[], asset: PintaAsset): PintaAsset[] {
  const next = assets.filter((a) => a.id !== asset.id)
  next.unshift(asset)
  next.sort((a, b) => b.updatedAt - a.updatedAt)
  return next
}

/** Nome único por sufixo numérico (`heroi` → `heroi-2`), respeitando o teto. */
function uniqueName(base: string, taken: Set<string>): string | null {
  if (!taken.has(base)) return base
  for (let n = 2; n <= 99; n += 1) {
    const candidate = `${base}-${n}`
    if (candidate.length > PINTA_LIMITS.maxNameChars) return null
    if (!taken.has(candidate)) return candidate
  }
  return null
}

function buildAsset(input: NewAssetInput, name: string): PintaAsset {
  switch (input.kind) {
    case 'pixel-sprite':
      return createPixelSpriteAsset({ name, frameSize: input.frameSize })
    case 'pixel-background':
      return createPixelBackgroundAsset({ name, width: input.width, height: input.height })
    case 'tileset':
      return createTilesetAsset({ name, tileSize: input.tileSize })
    case 'tilemap':
      return createTilemapAsset({
        name,
        tilesetId: input.tilesetId,
        cols: input.cols,
        rows: input.rows,
      })
    case 'vector':
      return createVectorAsset({ name, width: input.width, height: input.height })
  }
}

/** Clona um asset com ids NOVOS (asset + animações + camadas) p/ o Duplicar. */
function cloneWithNewIds(asset: PintaAsset, name: string): PintaAsset {
  const now = Date.now()
  const copy = structuredClone(asset)
  copy.id = newId()
  copy.name = name
  copy.createdAt = now
  copy.updatedAt = now
  if (copy.kind === 'pixel-sprite') {
    copy.animations = copy.animations.map((a) => ({ ...a, id: newId() }))
  } else if (copy.kind === 'tilemap') {
    copy.layers = copy.layers.map((l) => ({ ...l, id: newId() }))
  }
  return copy
}

export function createGalleryStore(): PintaGalleryStore {
  return createStore<PintaGalleryState>((set, get) => ({
    assets: [],
    loaded: false,
    loading: false,
    loadError: null,
    mutateError: null,

    async load() {
      set({ loading: true, loadError: null })
      try {
        const assets = await listAllAssets()
        set({ assets, loaded: true, loading: false })
      } catch {
        set({ loading: false, loadError: COPY.gallery.loadError })
      }
    },

    async create(input) {
      const { assets } = get()
      if (assets.length >= PINTA_LIMITS.maxAssets) {
        set({ mutateError: COPY.gallery.quotaFull })
        return null
      }
      const name = normalizeAssetName(input.name)
      if (!name) {
        set({ mutateError: COPY.newAsset.nameInvalid })
        return null
      }
      if (assets.some((a) => a.name === name)) {
        set({ mutateError: COPY.newAsset.nameTaken })
        return null
      }
      const asset = buildAsset(input, name)
      try {
        await persistAsset(asset)
        set((state) => ({ assets: upsertSorted(state.assets, asset), mutateError: null }))
        return asset
      } catch {
        set({ mutateError: COPY.editor.saveError })
        return null
      }
    },

    async rename(id, name) {
      const normalized = normalizeAssetName(name)
      if (!normalized) {
        set({ mutateError: COPY.newAsset.nameInvalid })
        return false
      }
      const { assets } = get()
      const asset = assets.find((a) => a.id === id)
      if (!asset) return false
      if (normalized === asset.name) return true
      if (assets.some((a) => a.id !== id && a.name === normalized)) {
        set({ mutateError: COPY.newAsset.nameTaken })
        return false
      }
      const renamed = { ...asset, name: normalized, updatedAt: Date.now() } as PintaAsset
      try {
        await persistAsset(renamed)
        set((state) => ({ assets: upsertSorted(state.assets, renamed), mutateError: null }))
        return true
      } catch {
        set({ mutateError: COPY.editor.saveError })
        return false
      }
    },

    async duplicate(id) {
      const { assets } = get()
      if (assets.length >= PINTA_LIMITS.maxAssets) {
        set({ mutateError: COPY.gallery.quotaFull })
        return null
      }
      const asset = assets.find((a) => a.id === id)
      if (!asset) return null
      const taken = new Set(assets.map((a) => a.name))
      const name = uniqueName(asset.name, taken)
      if (!name) {
        set({ mutateError: COPY.newAsset.nameTaken })
        return null
      }
      const copy = cloneWithNewIds(asset, name)
      try {
        await persistAsset(copy)
        set((state) => ({ assets: upsertSorted(state.assets, copy), mutateError: null }))
        return copy
      } catch {
        set({ mutateError: COPY.editor.saveError })
        return null
      }
    },

    async remove(id) {
      try {
        await deleteAsset(id)
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id), mutateError: null }))
        return true
      } catch {
        set({ mutateError: COPY.editor.saveError })
        return false
      }
    },

    absorb(asset) {
      set((state) => ({ assets: upsertSorted(state.assets, asset) }))
    },

    async importAssets(incoming) {
      let added = 0
      let skipped = 0
      // Mapa id-antigo → id-novo p/ religar tilemaps aos SEUS tilesets do backup.
      const idMap = new Map<string, string>()
      const prepared: PintaAsset[] = []
      for (const asset of incoming) {
        const taken = new Set([...get().assets, ...prepared].map((a) => a.name))
        if (get().assets.length + prepared.length >= PINTA_LIMITS.maxAssets) {
          skipped += 1
          continue
        }
        const name = uniqueName(asset.name, taken)
        if (!name) {
          skipped += 1
          continue
        }
        const clone = cloneWithNewIds(asset, name)
        idMap.set(asset.id, clone.id)
        prepared.push(clone)
      }
      for (const asset of prepared) {
        const restored =
          asset.kind === 'tilemap'
            ? { ...asset, tilesetId: idMap.get(asset.tilesetId) ?? asset.tilesetId }
            : asset
        try {
          await persistAsset(restored)
          set((state) => ({ assets: upsertSorted(state.assets, restored) }))
          added += 1
        } catch {
          skipped += 1
        }
      }
      return { added, skipped }
    },

    clearMutateError() {
      set({ mutateError: null })
    },
  }))
}
