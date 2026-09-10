/**
 * A galeria: a lista de criações do namespace, com CRUD serializado (uma
 * mutação por vez: criar/renomear/apagar nunca intercalam com uma releitura),
 * nome único por sufixo (`nave` → `nave-2`), import atômico com ids novos e
 * releitura quando a persistência avisa que algo mudou por fora (outra aba,
 * nuvem). Um store zustand POR INSTÂNCIA do app (nada global).
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import { type MoldaAssetSummary, summarizeAsset } from '../core/assetSummary'
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import { createAsset, type MoldaAsset, type NewAssetInput } from '../core/model'
import { normalizeAssetName, uniqueAssetName } from '../core/names'
import { findTemplate } from '../templates/catalog'
import type { GallerySceneSource } from './gallerySceneSource'
import { isMoldaAssetOpen, isStorageBudgetError, type MoldaPersistence } from './persistence'

export type CreateResult =
  | { ok: true; asset: MoldaAsset }
  | {
      ok: false
      reason: 'invalid-name' | 'storage-budget' | 'save-failed' | 'unknown-template'
    }

export type GalleryPersistenceFailure = 'storage-budget' | 'save-failed'
export type RenameResult =
  | 'ok'
  | 'invalid'
  | 'taken'
  | 'missing'
  | 'open'
  | 'changed'
  | GalleryPersistenceFailure
export type RemoveResult = { ok: true } | { ok: false; reason: GalleryPersistenceFailure }

export interface ImportResult {
  imported: number
  reason?: 'storage-budget' | 'save-failed'
}

export interface GalleryState {
  /** Da mais recente para a mais antiga. */
  assets: MoldaAssetSummary[]
  loaded: boolean
  loading: boolean
  /** A persistência está buscando fora (nuvem): a galeria mostra o aviso. */
  syncing: boolean
  error: string | null
  /**
   * O inventário da geração seguinte não respondeu nesta leitura. A galeria v1 continua de
   * pé (é para isso que a falha não derruba a lista), mas quem promete algo COMPLETO — o
   * "Baixar tudo" — precisa saber que o que está na tela pode não ser tudo.
   */
  sceneUnavailable: boolean
}

export interface GalleryActions {
  load(): Promise<void>
  reload(): Promise<void>
  create(input: NewAssetInput): Promise<CreateResult>
  /** Cria a partir de um MODELO PRONTO do catálogo (`templates/`), já com o nome escolhido. */
  createFromTemplate(input: { templateId: string; name: string }): Promise<CreateResult>
  rename(id: string, name: string): Promise<RenameResult>
  /** A geração seguinte não produz um `MoldaAsset`: a cópia dela é resumo. */
  duplicate(id: string): Promise<MoldaAsset | MoldaAssetSummary | null>
  remove(id: string): Promise<RemoveResult>
  /** O editor salvou: atualiza a lista SEM gravar de novo. */
  absorb(asset: MoldaAsset): void
  importAssets(assets: readonly MoldaAsset[]): Promise<ImportResult>
  /** Liga a releitura por aviso externo; devolve o desligar. */
  attachPersistence(): () => void
  getById(id: string): MoldaAssetSummary | undefined
}

export type GalleryStore = StoreApi<GalleryState & GalleryActions>

/** Espera depois de um `changed` antes de reler (vários avisos seguidos viram uma leitura). */
export const CHANGED_RELOAD_DELAY_MS = 250

function sortAssets(assets: readonly MoldaAssetSummary[]): MoldaAssetSummary[] {
  return [...assets].sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name))
}

function upsertSorted(
  assets: readonly MoldaAssetSummary[],
  asset: MoldaAsset,
): MoldaAssetSummary[] {
  return upsertSummary(assets, summarizeAsset(asset))
}

/** A geração seguinte já entrega resumo pronto: não há criação inteira para resumir. */
function upsertSummary(
  assets: readonly MoldaAssetSummary[],
  summary: MoldaAssetSummary,
): MoldaAssetSummary[] {
  return sortAssets([...assets.filter((item) => item.id !== summary.id), summary])
}

function takenNames(assets: readonly MoldaAssetSummary[]): Set<string> {
  return new Set(assets.map((asset) => asset.name))
}

/** Cópia com id novo (e ids novos nas peças, gêmeos remapeados), nome e horas novas. */
export function cloneWithNewIds(asset: MoldaAsset, name: string, now: number): MoldaAsset {
  const copy = structuredClone(asset)
  copy.id = newId()
  copy.name = name
  copy.createdAt = now
  copy.updatedAt = now
  if (copy.kind === 'model') {
    const idMap = new Map<string, string>()
    for (const part of copy.parts) idMap.set(part.id, newId())
    for (const part of copy.parts) {
      part.id = idMap.get(part.id) ?? newId()
      if (part.mirrorOf) {
        const mapped = idMap.get(part.mirrorOf)
        if (mapped) part.mirrorOf = mapped
        else delete part.mirrorOf
      }
    }
  }
  return copy
}

export interface CreateGalleryStoreOptions {
  now?: () => number
  /** Geração seguinte, quando o host a habilita. Ausente = só a galeria v1. */
  scene?: GallerySceneSource
}

export function createGalleryStore(
  persistence: MoldaPersistence,
  options: CreateGalleryStoreOptions = {},
): GalleryStore {
  const scene = options.scene
  const now = options.now ?? (() => Date.now())
  let chain: Promise<unknown> = Promise.resolve()
  let loadPromise: Promise<void> | null = null

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = chain.catch(() => undefined).then(task)
    chain = next
    return next
  }

  return createStore<GalleryState & GalleryActions>((set, get) => {
    async function readAndMerge(): Promise<void> {
      const v1 = persistence.listSummaries
        ? await persistence.listSummaries()
        : (await persistence.loadAll()).map(summarizeAsset)
      // A geração seguinte tem inventário próprio; a lista da criança é uma só.
      //
      // Falhar ao ler o inventário da geração seguinte NÃO pode derrubar a galeria v1.
      // As duas vivem no mesmo banco, então na prática elas falham juntas e o erro de
      // carga já cobre esse caso; o que este `catch` evita é o contrário, uma galeria
      // inteira em branco por causa de um inventário que talvez nem exista ainda.
      let sceneUnavailable = false
      const next = scene
        ? await scene
            .listSummaries()
            .then((result) => result.summaries)
            .catch(() => {
              sceneUnavailable = true
              return []
            })
        : []
      // Deduplicar por id, e a geração seguinte VENCE: o espelho da nuvem do host soma as
      // duas gerações no `listSummaries` dele (é assim que a promoção não parece exclusão
      // para a reconciliação), então a criação promovida chega pelos DOIS lados e vira dois
      // cartões com a mesma chave. Somar sem deduplicar é o que quebra.
      const fresh = [...new Map([...v1, ...next].map((asset) => [asset.id, asset])).values()]
      const current = new Map(get().assets.map((asset) => [asset.id, asset]))
      // Uma criação ABERTA no editor tem a versão mais nova em memória: a
      // releitura não pode regredi-la para o que está no disco.
      const merged = fresh.map((asset) => {
        const mine = current.get(asset.id)
        return mine && isMoldaAssetOpen(asset.id) && mine.updatedAt >= asset.updatedAt
          ? mine
          : asset
      })
      set({
        assets: sortAssets(merged),
        loaded: true,
        loading: false,
        error: null,
        sceneUnavailable,
      })
    }

    return {
      assets: [],
      loaded: false,
      loading: false,
      syncing: false,
      sceneUnavailable: false,
      error: null,

      load() {
        if (loadPromise) return loadPromise
        set({ loading: true, error: null })
        loadPromise = enqueue(async () => {
          try {
            await readAndMerge()
          } catch {
            set({ loading: false, error: COPY.gallery.loadError })
          } finally {
            loadPromise = null
          }
        })
        return loadPromise
      },

      reload() {
        return enqueue(async () => {
          try {
            await readAndMerge()
          } catch {
            // Releitura de fundo: mantém o que está na tela.
          }
        })
      },

      create(input) {
        return enqueue(async (): Promise<CreateResult> => {
          const base = normalizeAssetName(input.name)
          if (!base) return { ok: false, reason: 'invalid-name' }
          const name = uniqueAssetName(base, takenNames(get().assets))
          if (!name) return { ok: false, reason: 'invalid-name' }
          const asset = createAsset(input, name)
          try {
            await persistence.save(asset)
          } catch (error) {
            return {
              ok: false,
              reason: isStorageBudgetError(error) ? 'storage-budget' : 'save-failed',
            }
          }
          set({ assets: upsertSorted(get().assets, asset) })
          return { ok: true, asset }
        })
      },

      createFromTemplate(input) {
        return enqueue(async (): Promise<CreateResult> => {
          const template = findTemplate(input.templateId)
          if (!template) return { ok: false, reason: 'unknown-template' }
          const base = normalizeAssetName(input.name)
          if (!base) return { ok: false, reason: 'invalid-name' }
          const name = uniqueAssetName(base, takenNames(get().assets))
          if (!name) return { ok: false, reason: 'invalid-name' }
          const stamp = now()
          const asset: MoldaAsset = {
            ...template.build(),
            name,
            createdAt: stamp,
            updatedAt: stamp,
          }
          try {
            await persistence.save(asset)
          } catch (error) {
            return {
              ok: false,
              reason: isStorageBudgetError(error) ? 'storage-budget' : 'save-failed',
            }
          }
          set({ assets: upsertSorted(get().assets, asset) })
          return { ok: true, asset }
        })
      },

      rename(id, rawName) {
        return enqueue(async (): Promise<RenameResult> => {
          const current = get().assets.find((asset) => asset.id === id)
          if (!current) return 'missing'
          if (isMoldaAssetOpen(id)) return 'open'
          const name = normalizeAssetName(rawName)
          if (!name) return 'invalid'
          if (name === current.name) return 'ok'
          if (takenNames(get().assets).has(name)) return 'taken'
          if (current.formatVersion === 2) {
            if (!scene) return 'missing'
            if (!(await scene.rename(id, name))) {
              await readAndMerge()
              return 'changed'
            }
            set({ assets: upsertSummary(get().assets, { ...current, name, updatedAt: now() }) })
            return 'ok'
          }
          try {
            const source = await persistence.load(id)
            if (!source) return 'missing'
            if (isMoldaAssetOpen(id)) return 'open'
            const renamed: MoldaAsset = {
              ...source,
              name,
              updatedAt: Math.max(now(), source.updatedAt + 1),
            }
            if (!(await persistence.saveIfUnchanged(renamed, source.updatedAt))) {
              await readAndMerge()
              return 'changed'
            }
            set({ assets: upsertSorted(get().assets, renamed) })
          } catch (error) {
            return isStorageBudgetError(error) ? 'storage-budget' : 'save-failed'
          }
          return 'ok'
        })
      },

      duplicate(id) {
        return enqueue(async () => {
          const summary = get().assets.find((asset) => asset.id === id)
          if (summary?.formatVersion === 2) {
            if (!scene) return null
            const name = uniqueAssetName(summary.name, takenNames(get().assets))
            if (!name) return null
            const copy = await scene.duplicate(id, name)
            if (copy) set({ assets: upsertSummary(get().assets, copy) })
            return copy
          }
          try {
            const source = await persistence.load(id)
            if (!source) return null
            const name = uniqueAssetName(source.name, takenNames(get().assets))
            if (!name) return null
            const copy = cloneWithNewIds(source, name, now())
            await persistence.save(copy)
            set({ assets: upsertSorted(get().assets, copy) })
            return copy
          } catch {
            return null
          }
        })
      },

      remove(id) {
        return enqueue(async (): Promise<RemoveResult> => {
          if (get().assets.find((asset) => asset.id === id)?.formatVersion === 2) {
            if (!scene || !(await scene.remove(id))) return { ok: false, reason: 'save-failed' }
            set({ assets: get().assets.filter((asset) => asset.id !== id) })
            return { ok: true }
          }
          try {
            await persistence.remove(id)
          } catch (error) {
            return {
              ok: false,
              reason: isStorageBudgetError(error) ? 'storage-budget' : 'save-failed',
            }
          }
          set({ assets: get().assets.filter((asset) => asset.id !== id) })
          return { ok: true }
        })
      },

      absorb(asset) {
        set({ assets: upsertSorted(get().assets, asset) })
      },

      importAssets(incoming) {
        return enqueue(async (): Promise<ImportResult> => {
          if (incoming.length === 0) return { imported: 0 }
          const taken = takenNames(get().assets)
          const stamp = now()
          const clones: MoldaAsset[] = []
          for (const asset of incoming) {
            const name = uniqueAssetName(asset.name, taken)
            if (!name) continue
            taken.add(name)
            clones.push(cloneWithNewIds(asset, name, stamp))
          }
          if (clones.length === 0) return { imported: 0 }
          try {
            await persistence.saveMany(clones)
          } catch (error) {
            return {
              imported: 0,
              reason: isStorageBudgetError(error) ? 'storage-budget' : 'save-failed',
            }
          }
          let assets = get().assets
          for (const clone of clones) assets = upsertSorted(assets, clone)
          set({ assets })
          return { imported: clones.length }
        })
      },

      attachPersistence() {
        let timer: ReturnType<typeof setTimeout> | null = null
        // A oficina seguinte grava no próprio inventário: sem isto a galeria mostraria
        // o nome e a miniatura de antes de a criança sair da oficina.
        const detachScene = scene?.subscribe(() => {
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            timer = null
            void get().reload()
          }, CHANGED_RELOAD_DELAY_MS)
        })
        if (!persistence.subscribe)
          return () => {
            if (timer) clearTimeout(timer)
            detachScene?.()
          }
        const unsubscribe = persistence.subscribe((event) => {
          switch (event.type) {
            case 'sync-start':
              set({ syncing: true })
              break
            case 'sync-end':
              set({ syncing: false })
              void get().reload()
              break
            case 'changed':
              if (timer) clearTimeout(timer)
              timer = setTimeout(() => {
                timer = null
                void get().reload()
              }, CHANGED_RELOAD_DELAY_MS)
              break
          }
        })
        return () => {
          if (timer) clearTimeout(timer)
          detachScene?.()
          unsubscribe()
        }
      },

      getById(id) {
        return get().assets.find((asset) => asset.id === id)
      },
    }
  })
}
