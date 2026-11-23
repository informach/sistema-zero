/**
 * Store da GALERIA por instância do <PintaApp> (factory, nunca singleton):
 * lista de assets do perfil + criação/renome/duplicar/apagar. Toda a
 * persistência passa por `state/persistence.ts` (IndexedDB local); erros viram
 * mensagem gentil no estado (a UI oferece retry) — nunca lançam.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  isPintaMemoryAsset,
  isWorkshopProjectedMap,
  type PintaMemoryAsset,
  type PintaWorkshopAsset,
} from '../core/assetMemory'
import { COPY } from '../core/copy'
import { type PintaResourceObservation, pintaLocalRevisionOf } from '../core/localAssetOrigin'
import { embeddedTilesetOf } from '../core/mapResourceVersions'
import { createAsset, type NewAssetInput } from '../core/newAsset'
import { perfSpanAsync } from '../core/perf'
import {
  assetStyle,
  isTilesetKind,
  normalizeAssetName,
  type PintaAsset,
  type PintaAssetStyle,
  type PintaProjectRef,
  pintaAssetDependencyIds,
  sanitizeProjectRef,
} from '../core/project'
import type { WorkshopProjectedMap } from '../core/projectedDocument'
import { observePintaReferences } from '../core/sceneMapClosure'
import { pintaWorkshopBody } from '../core/workshopAsset'
import { findTemplate } from '../templates/catalog'
import { isPintaAuthoredMap } from '../tiles/automapping/model'
import { cloneWithNewIds, planImport, uniqueName } from './importPlan'
import {
  createPintaPersistence,
  isPintaStorageBudgetError,
  type PintaPersistence,
  type PintaReadIssue,
} from './persistence'
import type { RegionalGalleryCard } from './regionGalleryIndex'

/** A fábrica e o input moram em `core/newAsset.ts` (puros); aqui só o que tem EFEITO. */
export type { NewAssetInput }

export interface PintaGalleryState {
  assets: PintaMemoryAsset[]
  regionCards: RegionalGalleryCard[]
  loaded: boolean
  loading: boolean
  /**
   * O armazenamento está sincronizando por fora (nuvem do host): a galeria já mostra o local e
   * avisa "buscando…"; quem procura um desenho que ainda não chegou (`?desenho=`) espera isto
   * cair antes de dizer "sumiu".
   */
  syncing: boolean
  /**
   * Desenhos da conta feitos num Pinta mais novo que este (`persistence.getReadIssues?`). Não
   * entram em `assets`: a galeria só avisa e oferece atualizar a página.
   */
  readIssues: PintaReadIssue[]
  /**
   * Mapas projetados (nativo 9) que este editor ainda não abre: ficam guardados, entram no backup
   * da galeria e protegem as folhas e desenhos que usam. Não viram cartão nem ganham ação.
   */
  projected: WorkshopProjectedMap[]
  needsRetainedRecovery: boolean
  /** Keep complete dependencies available while an integral map/tileset editor is open. */
  holdFullInventory(): () => void
  /**
   * Liga a escuta do armazenamento (`persistence.subscribe?`): `sync-start`/`changed`/`sync-end`.
   * Idempotente; devolve o desligar. Sem `subscribe` na persistência, não faz nada.
   */
  attachPersistence: () => () => void
  loadError: string | null
  /** Erro da última mutação (criar/renomear/duplicar/apagar) — copy amigável. */
  mutateError: string | null
  /** One-shot informational feedback after an atomic conflict recovery. */
  recoveryNotice: string | null
  acknowledgeRecovery: () => void
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
  /**
   * Guarda um desenho JÁ MONTADO por fora (a tela com molde do host), com a mesma cota do
   * `create`; nome já usado entra com sufixo, como no import. Devolve o asset guardado ou null.
   */
  createPrepared(asset: PintaAsset): Promise<PintaAsset | null>
  rename(id: string, name: string): Promise<boolean>
  duplicate(id: string): Promise<PintaMemoryAsset | null>
  remove(id: string): Promise<boolean>
  /** Absorve um asset atualizado pelo editor (autosave) sem reler o disco. */
  absorb(asset: PintaMemoryAsset): void
  /** Publica uma transação confirmada do editor em uma única atualização. */
  absorbMany(assets: readonly PintaMemoryAsset[]): void
  /**
   * Restaura assets de um backup `.pinta.json`: ids NOVOS + nome com sufixo em
   * colisão (import nunca sobrescreve o que existe); respeita o orçamento de bytes
   * (`MAX_BACKUP_FILE_BYTES`; quantidade não tem teto) — devolve quantos entraram e
   * quantos ficaram de fora.
   */
  importAssets(
    assets: readonly PintaWorkshopAsset[],
    options?: { atomic?: boolean },
  ): Promise<{ added: number; skipped: number }>
  clearMutateError(): void
}

export type PintaGalleryStore = StoreApi<PintaGalleryState>

/** The gallery lists what its editors open; projected maps are kept aside, whole. */
function partitionProjected(listed: readonly PintaWorkshopAsset[]) {
  return {
    assets: listed.filter(isPintaMemoryAsset),
    projected: listed.filter(isWorkshopProjectedMap),
    cards: [] as RegionalGalleryCard[],
  }
}
/** The rulebook travels beside the copied map; a projected map keeps it in its own field. */
function copiedBook(asset: PintaWorkshopAsset) {
  if (isWorkshopProjectedMap(asset)) return asset.automapping
  return isPintaAuthoredMap(asset) ? asset.automapping : undefined
}
const workshopBody = (asset: PintaWorkshopAsset): PintaWorkshopAsset =>
  isPintaMemoryAsset(asset) ? pintaWorkshopBody(asset) : asset

function upsertSorted(assets: PintaMemoryAsset[], asset: PintaMemoryAsset): PintaMemoryAsset[] {
  const next = assets.filter((a) => a.id !== asset.id)
  next.unshift(asset)
  next.sort((a, b) => b.updatedAt - a.updatedAt)
  return next
}

function persistenceErrorMessage(error: unknown): string {
  return isPintaStorageBudgetError(error) ? COPY.gallery.storageBudget : COPY.editor.saveError
}

/**
 * `persistence` injetável: o Pinta solto usa o IndexedDB do perfil, e o bloco de aula passa o
 * armazenamento dele (ver `state/memoryPersistence.ts`). A store não sabe a diferença — toda
 * gravação já passava por este único objeto.
 */
/** Coalesce as releituras pedidas por `changed` (cada desenho que desce avisa uma vez). */
const CHANGED_RELOAD_DELAY_MS = 250

export function createGalleryStore(
  persistence: PintaPersistence<PintaWorkshopAsset> = createPintaPersistence(),
  options: { focalGallery?: boolean } = {},
): PintaGalleryStore {
  let fullInventoryHolders = 0
  function names(except?: string): Set<string> {
    const { assets, regionCards, projected } = store.getState()
    return new Set(
      [...assets, ...regionCards, ...projected]
        .filter(({ id }) => id !== except)
        .map(({ name }) => name),
    )
  }
  async function displayedAsset(id: string): Promise<PintaMemoryAsset | null> {
    const { assets, regionCards } = store.getState()
    const loaded = assets.find((asset) => asset.id === id)
    if (loaded) return loaded
    const card = regionCards.find((card) => card.id === id)
    if (!card) return null
    const actual = await persistence.loadAssetById(id)
    if (!actual || !isPintaMemoryAsset(actual) || pintaLocalRevisionOf(actual) !== card.revision)
      throw Error(COPY.editor.saveError)
    return actual
  }
  function contextFor(assets: readonly PintaWorkshopAsset[]) {
    const catalog = [...store.getState().assets, ...assets]
    const resources = new Map<string, PintaResourceObservation>()
    for (const asset of assets)
      for (const observed of observePintaReferences(asset, catalog))
        resources.set(observed.id, observed)
    return { resources: [...resources.values()] }
  }
  const persistOne = (asset: PintaWorkshopAsset) =>
    persistence.observesReferences
      ? persistence.persistAsset(asset, contextFor([asset]))
      : persistence.persistAsset(asset)
  const persistMany = (assets: readonly PintaWorkshopAsset[]) =>
    persistence.observesReferences
      ? persistence.persistAssets(assets, contextFor(assets))
      : persistence.persistAssets(assets)
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
    regionCards: [],
    loaded: false,
    loading: false,
    syncing: false,
    readIssues: [],
    projected: [],
    needsRetainedRecovery: persistence.needsRetainedRecovery?.() ?? false,
    holdFullInventory() {
      fullInventoryHolders++
      let held = true
      return () => {
        if (!held) return
        held = false
        fullInventoryHolders--
      }
    },
    attachPersistence: () => () => {},
    loadError: null,
    mutateError: null,
    recoveryNotice: null,
    acknowledgeRecovery: () => set({ recoveryNotice: null }),
    lastStyle: 'pixel',

    async load() {
      set({ loading: true, loadError: null })
      try {
        const { assets, cards, projected } = await perfSpanAsync('pinta:gallery:load', async () => {
          const index =
            options.focalGallery && !fullInventoryHolders
              ? await persistence.listGalleryIndex?.()
              : null
          return index && !fullInventoryHolders
            ? { ...index, projected: [] }
            : partitionProjected(await persistence.listAllAssets())
        })
        // O estilo do asset mais recente vira o default do "Criar novo".
        const recentStyle = assets
          .map((a) => assetStyle(a.kind))
          .find((style): style is PintaAssetStyle => style !== null)
        set((state) => ({
          assets,
          regionCards: cards,
          projected,
          loaded: true,
          loading: false,
          lastStyle: recentStyle ?? state.lastStyle,
        }))
      } catch {
        set({ loading: false, loadError: COPY.gallery.loadError })
      }
    },

    async create(input) {
      const name = normalizeAssetName(input.name)
      if (!name) {
        set({ mutateError: COPY.newAsset.nameInvalid })
        return null
      }
      if (names().has(name)) {
        set({ mutateError: COPY.newAsset.nameTaken })
        return null
      }
      const asset = createAsset(input, name)
      try {
        await persistOne(asset)
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

    async createPrepared(prepared) {
      const base = normalizeAssetName(prepared.name)
      // Nome já usado por outro desenho: entra com sufixo (`molde-geladeira-2`), como o import.
      const name = base ? uniqueName(base, names()) : null
      if (!name) {
        set({ mutateError: base ? COPY.newAsset.nameTaken : COPY.newAsset.nameInvalid })
        return null
      }
      const asset = { ...prepared, name }
      try {
        await persistOne(asset)
        set((state) => ({ assets: upsertSorted(state.assets, asset), mutateError: null }))
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
      const chosen = normalizeAssetName(input.name)
      if (!chosen) {
        set({ mutateError: COPY.newAsset.nameInvalid })
        return null
      }
      const projectRef = sanitizeProjectRef(input.projectRef)
      const taken = names()
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
        await persistMany(prepared)
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
      if (names(id).has(normalized)) {
        set({ mutateError: COPY.newAsset.nameTaken })
        return false
      }
      try {
        const asset = await displayedAsset(id)
        if (!asset) return false
        if (normalized === asset.name) return true
        const renamed = { ...asset, name: normalized, updatedAt: Date.now() }
        await persistOne(renamed)
        set((state) => ({
          assets: upsertSorted(state.assets, renamed),
          regionCards: state.regionCards.filter((card) => card.id !== id),
          mutateError: null,
        }))
        return true
      } catch (error) {
        set({ mutateError: persistenceErrorMessage(error) })
        return false
      }
    },

    async duplicate(id) {
      const { assets } = get()
      try {
        const asset = await displayedAsset(id)
        if (!asset) return null
        const name = uniqueName(asset.name, names())
        if (!name) {
          set({ mutateError: COPY.newAsset.nameTaken })
          return null
        }
        let copy: PintaMemoryAsset = cloneWithNewIds(pintaWorkshopBody(asset), name)
        if (isPintaAuthoredMap(asset)) {
          const { rebindCopiedAutomapBook } = await import('../tiles/automapping/native')
          const { attachWorkshopBook } = await import('../export/workshopDocument')
          if (copy.kind !== 'tilemap') throw Error(COPY.editor.saveError)
          const book = await rebindCopiedAutomapBook(
            pintaWorkshopBody(asset),
            copy,
            asset.automapping,
            assets,
            [...assets, copy],
          )
          const bound = book && attachWorkshopBook(copy, book)
          if (!bound) throw Error(COPY.editor.saveError)
          copy = bound
        }
        await persistOne(copy)
        set((state) => ({ assets: upsertSorted(state.assets, copy), mutateError: null }))
        return copy
      } catch (error) {
        set({ mutateError: persistenceErrorMessage(error) })
        return null
      }
    },

    async remove(id) {
      try {
        const asset = await displayedAsset(id)
        if (!asset) return false
        if (
          get().assets.some((item) => pintaAssetDependencyIds(item).includes(id)) ||
          get().regionCards.some((card) => card.dependencies.includes(id))
        ) {
          set({
            mutateError: isTilesetKind(asset)
              ? COPY.gallery.tilesetInUse
              : COPY.gallery.drawingInUse,
          })
          return false
        }
        await persistence.deleteAsset(id, asset)
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== id),
          regionCards: state.regionCards.filter((card) => card.id !== id),
          mutateError: null,
        }))
        return true
      } catch {
        set({ mutateError: COPY.editor.saveError })
        return false
      }
    },

    absorb(asset) {
      set((state) => ({
        assets: upsertSorted(state.assets, asset),
        regionCards: state.regionCards.filter((card) => card.id !== asset.id),
      }))
    },

    absorbMany(assets) {
      const ids = new Set(assets.map(({ id }) => id))
      set((state) => ({
        assets: assets.reduce(upsertSorted, state.assets),
        regionCards: state.regionCards.filter((card) => !ids.has(card.id)),
      }))
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
      const eligible: PintaWorkshopAsset[] = []
      for (const asset of ordered) {
        if (
          asset.kind === 'tilemap' &&
          !currentTilesetIds.has(asset.tilesetId) &&
          !incomingTilesetIds.has(asset.tilesetId) &&
          !embeddedTilesetOf(asset)
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

      // Mapa id-antigo → id-novo p/ religar tilemaps aos SEUS tilesets do backup
      // (as peças padrão E as de cada camada; peça de camada que não veio no
      // arquivo segue apontando para o id de antes: a camada volta sem aparência,
      // o mapa não se perde).
      const plan = planImport(eligible.map(workshopBody), incomingTilesetIds, names())
      const idMap = plan.idMap
      skipped += plan.skipped
      importError ??= plan.error
      if (options.atomic && plan.pairs.length !== incoming.length) {
        set({ mutateError: importError ?? COPY.editor.saveError })
        return { added: 0, skipped: incoming.length }
      }

      const restoredPairs = plan.pairs
      const restored = restoredPairs.map(({ restored: asset }) => asset)
      const booked = eligible.filter((asset) => copiedBook(asset) !== undefined)
      if (booked.length) {
        try {
          const { rebindCopiedAutomapBook } = await import('../tiles/automapping/native')
          const { attachWorkshopBook } = await import('../export/workshopDocument')
          if (skipped) throw Error(COPY.editor.saveError)
          const byId = new Map(restored.map((asset, i) => [asset.id, i]))
          for (const asset of booked) {
            const id = idMap.get(asset.id),
              i = id === undefined ? undefined : byId.get(id)
            const copy = i === undefined ? undefined : restored[i]
            const original = workshopBody(asset)
            const book = copiedBook(asset)
            if (i === undefined || !book || copy?.kind !== 'tilemap' || original.kind !== 'tilemap')
              throw Error(COPY.editor.saveError)
            const rebound = await rebindCopiedAutomapBook(
              original,
              copy,
              book,
              [...current, ...eligible],
              [...current, ...restored],
            )
            if (!rebound) throw Error(COPY.editor.saveError)
            if (isWorkshopProjectedMap(copy)) restored[i] = { ...copy, automapping: rebound }
            else {
              const bound = attachWorkshopBook(copy, rebound)
              if (!bound) throw Error(COPY.editor.saveError)
              restored[i] = bound
            }
          }
        } catch {
          set({ mutateError: COPY.editor.saveError })
          return { added: 0, skipped: incoming.length }
        }
      }
      if (options.atomic || booked.length) {
        try {
          await persistMany(restored)
          set((state) => ({
            assets: restored.filter(isPintaMemoryAsset).reduce(upsertSorted, state.assets),
            projected: [...state.projected, ...restored.filter(isWorkshopProjectedMap)],
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
          await persistOne(restoredAsset)
          persistedIds.add(restoredAsset.id)
          set((state) =>
            isPintaMemoryAsset(restoredAsset)
              ? { assets: upsertSorted(state.assets, restoredAsset) }
              : { projected: [...state.projected, restoredAsset] },
          )
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
  // Só troca o estado quando a lista muda de fato: o aviso chega a cada desenho que desce.
  const refreshReadIssues = () => {
    const next = persistence.getReadIssues?.() ?? []
    const state = store.getState()
    const current = state.readIssues
    const needsRetainedRecovery = persistence.needsRetainedRecovery?.() ?? false
    if (
      needsRetainedRecovery === state.needsRetainedRecovery &&
      next.length === current.length &&
      next.every((issue, i) => issue.id === current[i]?.id && issue.version === current[i]?.version)
    )
      return
    store.setState({ readIssues: next, needsRetainedRecovery })
  }
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
        refreshReadIssues()
        if (event.type === 'sync-start') {
          syncGeneration += 1
          store.setState({ syncing: true })
        } else if (event.type === 'changed') {
          reloadSoon()
        } else if (event.type === 'recovered') {
          store.setState({ recoveryNotice: COPY.gallery.recoveredLocal })
          reloadSoon()
        } else if (event.type === 'account-removal-returned') {
          store.setState({ recoveryNotice: COPY.gallery.accountRemovalReturned })
          reloadSoon()
        } else if (event.type === 'account-recovered') {
          store.setState({ recoveryNotice: COPY.gallery.accountRecovered })
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
      // O que o armazenamento já sabe ao ligar (uma reconciliação que terminou antes da galeria).
      refreshReadIssues()
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
