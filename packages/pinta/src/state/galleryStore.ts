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
  assetStyle,
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  isTilesetKind,
  normalizeAssetName,
  PINTA_LIMITS,
  type PintaAsset,
  type PintaAssetStyle,
  type PintaProjectRef,
  sanitizeProjectRef,
} from '../core/project'
import { findTemplate } from '../templates/catalog'
import { createPintaPersistence } from './persistence'

export type NewAssetInput = (
  | { kind: 'pixel-sprite'; name: string; frameSize: number }
  | { kind: 'pixel-background'; name: string; width: number; height: number }
  | { kind: 'tileset'; name: string; tileSize: number }
  | { kind: 'tilemap'; name: string; tilesetId: string; cols: number; rows: number }
  | { kind: 'vector-sprite'; name: string; frameSize: number }
  | { kind: 'vector-background'; name: string; width: number; height: number }
  | { kind: 'vector-tileset'; name: string; tileSize: number }
) & {
  /** Vínculo com o projeto do Pensa (agrupa a galeria; paleta nos swatches do vetor). */
  projectRef?: PintaProjectRef
}

export interface PintaGalleryState {
  assets: PintaAsset[]
  loaded: boolean
  loading: boolean
  loadError: string | null
  /** Erro da última mutação (criar/renomear/duplicar/apagar) — copy amigável. */
  mutateError: string | null
  /**
   * Último ESTILO usado (pixel/vetor) — pré-seleciona o primeiro passo do
   * "Criar novo". Derivado do asset mais recente no load; atualizado no create.
   */
  lastStyle: PintaAssetStyle

  load(): Promise<void>
  /** Cria e persiste; devolve o asset novo ou null (nome inválido/duplicado/cota). */
  create(input: NewAssetInput): Promise<PintaAsset | null>
  /**
   * Cria a partir de um MODELO PRONTO: pode gerar VÁRIOS assets (um mapa vem com
   * o tileset). O principal recebe o nome escolhido; companheiros ganham sufixo
   * anti-colisão. Devolve o asset PRINCIPAL (o que a criança abre) ou null.
   */
  createFromTemplate(input: {
    templateId: string
    name: string
    projectRef?: PintaProjectRef
  }): Promise<PintaAsset | null>
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
  const built = buildAssetByKind(input, name)
  // Vínculo com o projeto do Pensa (07/2026): passa pelo MESMO portão do load
  // (hex minúsculo, teto de nome/cores) p/ o asset nascer igual ao round-trip.
  const projectRef = sanitizeProjectRef(input.projectRef)
  return projectRef ? { ...built, projectRef } : built
}

function buildAssetByKind(input: NewAssetInput, name: string): PintaAsset {
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
    case 'vector-sprite':
      return createVectorSpriteAsset({ name, frameSize: input.frameSize })
    case 'vector-background':
      return createVectorBackgroundAsset({ name, width: input.width, height: input.height })
    case 'vector-tileset':
      return createVectorTilesetAsset({ name, tileSize: input.tileSize })
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
  } else if (copy.kind === 'vector-sprite') {
    copy.animations = copy.animations.map((a) => ({ ...a, id: newId() }))
  } else if (copy.kind === 'tilemap') {
    copy.layers = copy.layers.map((l) => ({ ...l, id: newId() }))
  }
  return copy
}

export function createGalleryStore(): PintaGalleryStore {
  const persistence = createPintaPersistence()
  let mutationTail = Promise.resolve()
  function enqueueMutation<T>(task: () => Promise<T>): Promise<T> {
    const result = mutationTail.then(task, task)
    mutationTail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  const store = createStore<PintaGalleryState>((set, get) => ({
    assets: [],
    loaded: false,
    loading: false,
    loadError: null,
    mutateError: null,
    lastStyle: 'pixel',

    async load() {
      set({ loading: true, loadError: null })
      try {
        const assets = await persistence.listAllAssets()
        // O estilo do asset mais recente vira o default do "Criar novo".
        const recentStyle = assets
          .map((a) => assetStyle(a.kind))
          .find((style): style is PintaAssetStyle => style !== null)
        set((state) => ({
          assets,
          loaded: true,
          loading: false,
          lastStyle: recentStyle ?? state.lastStyle,
        }))
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
        await persistence.persistAsset(asset)
        set((state) => ({
          assets: upsertSorted(state.assets, asset),
          mutateError: null,
          lastStyle: assetStyle(asset.kind) ?? state.lastStyle,
        }))
        return asset
      } catch {
        set({ mutateError: COPY.editor.saveError })
        return null
      }
    },

    async createFromTemplate(input) {
      const template = findTemplate(input.templateId)
      if (!template) {
        set({ mutateError: COPY.newAsset.nameInvalid })
        return null
      }
      const built = template.build()
      const { assets } = get()
      if (assets.length + built.assets.length > PINTA_LIMITS.maxAssets) {
        set({ mutateError: COPY.gallery.quotaFull })
        return null
      }
      const chosen = normalizeAssetName(input.name)
      if (!chosen) {
        set({ mutateError: COPY.newAsset.nameInvalid })
        return null
      }
      const projectRef = sanitizeProjectRef(input.projectRef)
      const taken = new Set(assets.map((a) => a.name))
      // Nomeia: o principal com o nome escolhido, os companheiros com o próprio
      // (sufixo em colisão). Renomear NÃO mexe no `tilesetId` (é por id).
      const prepared: PintaAsset[] = []
      for (let i = 0; i < built.assets.length; i += 1) {
        const asset = built.assets[i]
        if (!asset) continue
        const desired = i === built.primaryIndex ? chosen : asset.name
        const name = uniqueName(desired, taken)
        if (!name) {
          set({ mutateError: COPY.newAsset.nameTaken })
          return null
        }
        taken.add(name)
        prepared.push(projectRef ? { ...asset, name, projectRef } : { ...asset, name })
      }
      const primary = prepared[built.primaryIndex]
      if (!primary) {
        // Modelo mal-formado (primaryIndex fora dos assets construídos) — sinaliza
        // o erro p/ o toast em vez de sumir em silêncio (clique-morto no wizard).
        set({ mutateError: COPY.editor.saveError })
        return null
      }
      try {
        // Persiste na ORDEM do build (tileset antes do mapa) — se a quota ou o
        // disco falhar no meio, o mapa não fica órfão sem as peças.
        for (const asset of prepared) {
          await persistence.persistAsset(asset)
          set((state) => ({ assets: upsertSorted(state.assets, asset) }))
        }
        set((state) => ({
          mutateError: null,
          lastStyle: assetStyle(primary.kind) ?? state.lastStyle,
        }))
        return primary
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
        await persistence.persistAsset(renamed)
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
        await persistence.persistAsset(copy)
        set((state) => ({ assets: upsertSorted(state.assets, copy), mutateError: null }))
        return copy
      } catch {
        set({ mutateError: COPY.editor.saveError })
        return null
      }
    },

    async remove(id) {
      const asset = get().assets.find((item) => item.id === id)
      if (!asset) return false
      if (
        isTilesetKind(asset) &&
        get().assets.some((item) => item.kind === 'tilemap' && item.tilesetId === asset.id)
      ) {
        set({ mutateError: COPY.gallery.tilesetInUse })
        return false
      }
      try {
        await persistence.deleteAsset(id)
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
      // Tilesets ENTRAM PRIMEIRO: se a quota cortar no meio, é melhor perder um
      // mapa (degrada com "peças sumiram") do que importar o mapa sem as peças.
      const ordered = [...incoming].sort(
        (a, b) => (a.kind === 'tilemap' ? 1 : 0) - (b.kind === 'tilemap' ? 1 : 0),
      )
      // Mapa id-antigo → id-novo p/ religar tilemaps aos SEUS tilesets do backup.
      const idMap = new Map<string, string>()
      const prepared: PintaAsset[] = []
      for (const asset of ordered) {
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
      // Ids que REALMENTE gravaram (tilesets vêm antes) — um mapa cujo tileset
      // deste import falhou no disco NÃO pode ser importado apontando p/ o vazio.
      const persistedIds = new Set<string>()
      for (const asset of prepared) {
        const oldTilesetId = asset.kind === 'tilemap' ? asset.tilesetId : null
        const restored =
          asset.kind === 'tilemap'
            ? { ...asset, tilesetId: idMap.get(asset.tilesetId) ?? asset.tilesetId }
            : asset
        // Tileset veio NESTE import (idMap tem o id ANTIGO) mas não persistiu →
        // pular o mapa (senão fica órfão). Referência externa segue igual.
        if (
          restored.kind === 'tilemap' &&
          oldTilesetId !== null &&
          idMap.has(oldTilesetId) &&
          !persistedIds.has(restored.tilesetId)
        ) {
          skipped += 1
          continue
        }
        try {
          await persistence.persistAsset(restored)
          persistedIds.add(restored.id)
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
  const actions = store.getState()
  store.setState({
    load: () => enqueueMutation(actions.load),
    create: (input) => enqueueMutation(() => actions.create(input)),
    createFromTemplate: (input) => enqueueMutation(() => actions.createFromTemplate(input)),
    rename: (id, name) => enqueueMutation(() => actions.rename(id, name)),
    duplicate: (id) => enqueueMutation(() => actions.duplicate(id)),
    remove: (id) => enqueueMutation(() => actions.remove(id)),
    importAssets: (assets) => enqueueMutation(() => actions.importAssets(assets)),
  })
  return store
}
