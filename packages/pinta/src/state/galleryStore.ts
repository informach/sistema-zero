/**
 * Store da GALERIA por instância do <PintaApp> (factory, nunca singleton):
 * lista de assets do perfil + criação/renome/duplicar/apagar. Toda a
 * persistência passa por `state/persistence.ts` (IndexedDB local); erros viram
 * mensagem gentil no estado (a UI oferece retry) — nunca lançam.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import { createAsset, type NewAssetInput } from '../core/newAsset'
import { perfSpanAsync } from '../core/perf'
import {
  assetStyle,
  isTilesetKind,
  normalizeAssetName,
  PINTA_LIMITS,
  type PintaAsset,
  type PintaAssetStyle,
  type PintaProjectRef,
  sanitizeProjectRef,
} from '../core/project'
import { findTemplate } from '../templates/catalog'
import {
  createPintaPersistence,
  isPintaStorageBudgetError,
  type PintaPersistence,
} from './persistence'

/** A fábrica e o input moram em `core/newAsset.ts` (puros); aqui só o que tem EFEITO. */
export type { NewAssetInput }

export interface PintaGalleryState {
  assets: PintaAsset[]
  loaded: boolean
  loading: boolean
  /**
   * O armazenamento está sincronizando por fora (nuvem do host): a galeria já mostra o local e
   * avisa "buscando…"; quem procura um desenho que ainda não chegou (`?desenho=`) espera isto
   * cair antes de dizer "sumiu".
   */
  syncing: boolean
  /**
   * Liga a escuta do armazenamento (`persistence.subscribe?`): `sync-start`/`changed`/`sync-end`.
   * Idempotente; devolve o desligar. Sem `subscribe` na persistência, não faz nada.
   */
  attachPersistence: () => () => void
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
  /** Publica uma transação confirmada do editor em uma única atualização. */
  absorbMany(assets: readonly PintaAsset[]): void
  /**
   * Restaura assets de um backup `.pinta.json`: ids NOVOS + nome com sufixo em
   * colisão (import nunca sobrescreve o que existe); respeita o orçamento de bytes
   * (`MAX_BACKUP_FILE_BYTES`; quantidade não tem teto) — devolve quantos entraram e
   * quantos ficaram de fora.
   */
  importAssets(
    assets: PintaAsset[],
    options?: { atomic?: boolean },
  ): Promise<{ added: number; skipped: number }>
  clearMutateError(): void
}

export type PintaGalleryStore = StoreApi<PintaGalleryState>

function upsertSorted(assets: PintaAsset[], asset: PintaAsset): PintaAsset[] {
  const next = assets.filter((a) => a.id !== asset.id)
  next.unshift(asset)
  next.sort((a, b) => b.updatedAt - a.updatedAt)
  return next
}

function persistenceErrorMessage(error: unknown): string {
  return isPintaStorageBudgetError(error) ? COPY.gallery.storageBudget : COPY.editor.saveError
}

/** Nome único por sufixo numérico (`heroi` → `heroi-2`), respeitando o teto. */
function uniqueName(base: string, taken: Set<string>): string | null {
  if (!taken.has(base)) return base
  // Sem teto de desenhos na galeria, o sufixo vai até 999 antes de desistir.
  for (let n = 2; n <= 999; n += 1) {
    const suffix = `-${n}`
    const prefix = base.slice(0, PINTA_LIMITS.maxNameChars - suffix.length).replace(/-+$/, '')
    const candidate = `${prefix}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return null
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

/**
 * `persistence` injetável: o Pinta solto usa o IndexedDB do perfil, e o bloco de aula passa o
 * armazenamento dele (ver `state/memoryPersistence.ts`). A store não sabe a diferença — toda
 * gravação já passava por este único objeto.
 */
/** Coalesce as releituras pedidas por `changed` (cada desenho que desce avisa uma vez). */
const CHANGED_RELOAD_DELAY_MS = 250

export function createGalleryStore(
  persistence: PintaPersistence = createPintaPersistence(),
): PintaGalleryStore {
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
    syncing: false,
    attachPersistence: () => () => {},
    loadError: null,
    mutateError: null,
    lastStyle: 'pixel',

    async load() {
      set({ loading: true, loadError: null })
      try {
        const assets = await perfSpanAsync('pinta:gallery:load', () => persistence.listAllAssets())
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
      const name = normalizeAssetName(input.name)
      if (!name) {
        set({ mutateError: COPY.newAsset.nameInvalid })
        return null
      }
      if (assets.some((a) => a.name === name)) {
        set({ mutateError: COPY.newAsset.nameTaken })
        return null
      }
      const asset = createAsset(input, name)
      try {
        await persistence.persistAsset(asset)
        set((state) => ({
          assets: upsertSorted(state.assets, asset),
          mutateError: null,
          lastStyle: assetStyle(asset.kind) ?? state.lastStyle,
        }))
        return asset
      } catch (error) {
        set({ mutateError: persistenceErrorMessage(error) })
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
        // Um modelo é UMA criação lógica: o setMany do IndexedDB grava todos
        // na mesma transação, sem deixar companheiro órfão em falha parcial.
        await persistence.persistAssets(prepared)
        set((state) => ({
          assets: prepared.reduce(upsertSorted, state.assets),
          mutateError: null,
          lastStyle: assetStyle(primary.kind) ?? state.lastStyle,
        }))
        return primary
      } catch (error) {
        set({ mutateError: persistenceErrorMessage(error) })
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
      } catch (error) {
        set({ mutateError: persistenceErrorMessage(error) })
        return false
      }
    },

    async duplicate(id) {
      const { assets } = get()
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
      } catch (error) {
        set({ mutateError: persistenceErrorMessage(error) })
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

    absorbMany(assets) {
      set((state) => ({ assets: assets.reduce(upsertSorted, state.assets) }))
    },

    async importAssets(incoming, options = {}) {
      let added = 0
      let skipped = 0
      let importError: string | null = null
      set({ mutateError: null })
      const current = get().assets
      const currentTilesetIds = new Set(current.filter(isTilesetKind).map((asset) => asset.id))
      const incomingTilesetIds = new Set(incoming.filter(isTilesetKind).map((asset) => asset.id))
      // Tilesets ENTRAM PRIMEIRO: se a quota cortar no meio, é melhor perder um
      // mapa (degrada com "peças sumiram") do que importar o mapa sem as peças.
      const ordered = [...incoming].sort(
        (a, b) => (a.kind === 'tilemap' ? 1 : 0) - (b.kind === 'tilemap' ? 1 : 0),
      )
      const eligible: PintaAsset[] = []
      for (const asset of ordered) {
        if (
          asset.kind === 'tilemap' &&
          !currentTilesetIds.has(asset.tilesetId) &&
          !incomingTilesetIds.has(asset.tilesetId)
        ) {
          skipped += 1
          importError ??= COPY.gallery.restoreMissingTileset
          continue
        }
        eligible.push(asset)
      }
      if (options.atomic && skipped > 0) {
        set({ mutateError: importError })
        return { added: 0, skipped: incoming.length }
      }

      // Mapa id-antigo → id-novo p/ religar tilemaps aos SEUS tilesets do backup.
      const idMap = new Map<string, string>()
      const prepared: PintaAsset[] = []
      const preparedTilesetIds = new Set<string>()
      const taken = new Set(current.map((asset) => asset.name))
      for (const asset of eligible) {
        if (
          asset.kind === 'tilemap' &&
          incomingTilesetIds.has(asset.tilesetId) &&
          !preparedTilesetIds.has(asset.tilesetId)
        ) {
          skipped += 1
          importError ??= COPY.gallery.restoreMissingTileset
          continue
        }
        const name = uniqueName(asset.name, taken)
        if (!name) {
          skipped += 1
          importError ??= COPY.newAsset.nameTaken
          continue
        }
        const clone = cloneWithNewIds(asset, name)
        idMap.set(asset.id, clone.id)
        if (isTilesetKind(asset)) preparedTilesetIds.add(asset.id)
        prepared.push(clone)
        taken.add(name)
      }
      if (options.atomic && prepared.length !== incoming.length) {
        set({ mutateError: importError ?? COPY.editor.saveError })
        return { added: 0, skipped: incoming.length }
      }

      const restoredPairs = prepared.map((source) => ({
        source,
        restored:
          source.kind === 'tilemap'
            ? { ...source, tilesetId: idMap.get(source.tilesetId) ?? source.tilesetId }
            : source,
      }))
      const restored = restoredPairs.map(({ restored: asset }) => asset)
      if (options.atomic) {
        try {
          await persistence.persistAssets(restored)
          set((state) => ({
            assets: restored.reduce(upsertSorted, state.assets),
            mutateError: null,
          }))
          return { added: restored.length, skipped: 0 }
        } catch (error) {
          set({ mutateError: persistenceErrorMessage(error) })
          return { added: 0, skipped: incoming.length }
        }
      }

      // Ids que REALMENTE gravaram (tilesets vêm antes) — um mapa cujo tileset
      // deste import falhou no disco NÃO pode ser importado apontando p/ o vazio.
      const persistedIds = new Set<string>()
      for (const { source, restored: restoredAsset } of restoredPairs) {
        const oldTilesetId = source.kind === 'tilemap' ? source.tilesetId : null
        // Tileset veio NESTE import (idMap tem o id ANTIGO) mas não persistiu →
        // pular o mapa (senão fica órfão). Referência externa segue igual.
        if (
          restoredAsset.kind === 'tilemap' &&
          oldTilesetId !== null &&
          idMap.has(oldTilesetId) &&
          !persistedIds.has(restoredAsset.tilesetId)
        ) {
          skipped += 1
          continue
        }
        try {
          await persistence.persistAsset(restoredAsset)
          persistedIds.add(restoredAsset.id)
          set((state) => ({ assets: upsertSorted(state.assets, restoredAsset) }))
          added += 1
        } catch (error) {
          skipped += 1
          importError ??= persistenceErrorMessage(error)
        }
      }
      set({ mutateError: importError })
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
    importAssets: (assets, options) => enqueueMutation(() => actions.importAssets(assets, options)),
  })
  // O armazenamento avisa mudanças feitas por fora (a nuvem do host): `changed` relê a lista
  // (coalescido, na fila de mutações — e sem piscar: "Carregando…" exige `!loaded`);
  // `sync-start`/`sync-end` ligam e desligam `syncing` — o `end` só depois da última releitura,
  // para quem espera um desenho que "ainda não chegou" ver a lista completa antes de desistir.
  // Ligado por `attachPersistence()` (o `PintaApp` liga num efeito e desliga ao desmontar: um
  // `useState` duplicado do StrictMode não deixa uma store zumbi inscrita para sempre).
  let detach: (() => void) | null = null
  let reloadTimer: ReturnType<typeof setTimeout> | null = null
  // Geração: um `sync-start` que chega DURANTE a releitura do `sync-end` anterior não pode ser
  // apagado pelo `syncing: false` daquela releitura.
  let syncGeneration = 0
  store.setState({
    attachPersistence: () => {
      if (detach || !persistence.subscribe) return () => {}
      const reloadSoon = () => {
        if (reloadTimer) return
        reloadTimer = setTimeout(() => {
          reloadTimer = null
          // `load` público já entra na fila de mutações (não embrulhar de novo: travaria).
          void store.getState().load()
        }, CHANGED_RELOAD_DELAY_MS)
      }
      const unsubscribe = persistence.subscribe((event) => {
        if (event.type === 'sync-start') {
          syncGeneration += 1
          store.setState({ syncing: true })
        } else if (event.type === 'changed') {
          reloadSoon()
        } else if (event.type === 'sync-end') {
          if (reloadTimer) {
            clearTimeout(reloadTimer)
            reloadTimer = null
          }
          const generation = syncGeneration
          void store
            .getState()
            .load()
            .finally(() => {
              if (syncGeneration === generation) store.setState({ syncing: false })
            })
        }
      })
      detach = () => {
        detach = null
        if (reloadTimer) {
          clearTimeout(reloadTimer)
          reloadTimer = null
        }
        unsubscribe()
      }
      return () => detach?.()
    },
  })

  return store
}
