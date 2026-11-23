/**
 * Persistência LOCAL (IndexedDB via idb-keyval). Cada asset é independente;
 * mapas/peças/conjuntos têm autoridade versionada `pinta:local:document:<id>` e
 * espelho legado `pinta:asset:<id>`. Não há PNG achatado como documento autoral.
 * Mapas grandes usam chunks físicos de 32 casas na autoridade (protocolo 2),
 * reconstruídos pelo IO antes do domínio; o espelho legado continua completo.
 * RLE permanece no transporte portátil, não na representação física dos chunks.
 *
 * Namespace por PERFIL: o host chama `setPintaStorageNamespace(viewerId)`
 * ANTES de montar o <PintaApp> (mesmo contrato do studio) — um DB por criança,
 * para irmãos no mesmo navegador não compartilharem a galeria. Vazio = store
 * default `sistema-zero-pinta`.
 */
import {
  PintaClientOutdatedError,
  pintaCanWriteNativeSchema,
  pintaWriteFormatVersion,
} from '@sistemazero/core/creations'
import type { PintaCausalIntent, PintaCausalResult } from '@sistemazero/core/creations/pinta-causal'
import { createStore, getMany, keys } from 'idb-keyval'
import { pintaValuesEqual } from '../core/assetEquality'
import type { PintaMemoryAsset } from '../core/assetMemory'
import {
  type PintaResourceObservation,
  pintaLocalOriginOf,
  recordPintaLocalOrigin,
} from '../core/localAssetOrigin'
import { withMapResourceVersions } from '../core/mapResourceVersions'
import type { PaletteAccount } from '../core/paletteAccount'
import type { PaletteLibrary } from '../core/paletteLibrary'
import { perfSpan, perfSpanAsync } from '../core/perf'
import {
  type AnyTilesetAsset,
  isCompatibleMapTileset,
  isTilesetKind,
  PINTA_DEPENDENCY_ASSET_LIMIT,
  type PintaAsset,
  pintaAssetDependencyIds,
  pintaAssetSchema,
  sanitizePintaAsset,
  tilemapOfAsset,
  tilemapTilesetIds,
  withPintaSchemaStamp,
} from '../core/project'
import { sceneMapClosure } from '../core/sceneMapClosure'
import { assetFromJson, assetToJson } from '../export/assetJson'
import { GalleryBackupSizeCache, MAX_BACKUP_FILE_BYTES } from '../export/projectJson'
import {
  type AssetRecordSelection,
  withAssetTransaction,
  withPhysicalAssetUpdate,
} from './assetAuthorityDb'
import type { PintaEditorWriteContext } from './editorStore'
import {
  applyAssetTransitions,
  checkLocalBudget,
  type createLocalAssetAuthority,
  deleteLocalRecord,
  LOCAL_ASSET_PREFIX,
  type LocalAssetTransition,
  type LocalSnapshot,
  PintaLocalConflictError,
  PintaLocalStorageError,
  PintaStorageBudgetError,
  resolveLocalRecords,
  selectLocalAssetRecords,
  writeLocalRecords,
} from './localAssetAuthority'
import {
  acknowledgeLocalCausalDraft,
  discardLocalCausalCreation,
  freezeLocalCausalDraft,
  installLocalCausalPull,
  type LocalCausalState,
  localCausalBytes,
  localCausalPullImpact,
  localPreparedKey,
  localRemovalsReturnedByPull,
  ownsLocalCausalMember,
  PINTA_CAUSAL_BLOBS_KEY,
  PINTA_CAUSAL_OUTBOX_KEY,
  type PintaCandidateBytes,
  type PintaCausalLocalDraft,
  type PintaCausalLocalPull,
  type PintaCausalPending,
  PintaCausalPullDeferred,
  type PintaCausalSealed,
  type PintaLocalUnbasedDraft,
  type PintaPreparedPut,
  readLocalCausalPrepared,
  readLocalCausalRetained,
  readLocalCausalState,
  readLocalCausalUpload,
  rememberLocalCausalProtocol,
  renewLocalCausalUpload,
  sealLocalCausalDraft,
  stageLocalCausalDraft,
  stageLocalUnbasedDraft,
} from './localCausalOutbox'
import { PINTA_CAUSAL_PIN_BLOBS_KEY, readPinnedCandidate } from './localCausalPins'
import type { LocalStorageCodec } from './localChunkStorage'
import {
  createLocalPaletteAccount,
  PALETTE_ACCOUNT_KEY,
  PALETTE_LIBRARY_KEY,
} from './localPaletteAccount'
import type { LocalRegionAuthorSession } from './localRegionAuthorSession'
import type { RegionGalleryIndex } from './regionGalleryIndex'

export {
  PintaLocalConflictError,
  PintaLocalStorageError,
  PintaStorageBudgetError,
} from './localAssetAuthority'

const ASSET_KEY_PREFIX = 'pinta:asset:'
const assetKey = (id: string) => `${ASSET_KEY_PREFIX}${id}`
let storageNamespace = ''
type StoreHandle = ReturnType<typeof createStore>
const stores = new Map<string, StoreHandle>()

/**
 * Define o namespace do armazenamento local. Cada operação captura o store do
 * perfil no instante da chamada; trocar de perfil não redireciona operações já
 * enfileiradas.
 */
export function setPintaStorageNamespace(namespace: string): void {
  const next = namespace.trim()
  if (next === storageNamespace) return
  storageNamespace = next
}

/** Namespace normalizado que será capturado pela próxima operação. */
export function getPintaStorageNamespace(): string {
  return storageNamespace
}

export const dbNameFor = (namespace: string): string =>
  namespace ? `sistema-zero-pinta-${namespace}` : 'sistema-zero-pinta'
const dbNames = new WeakMap<StoreHandle, string>()
function getStoreHandle(explicit?: string): StoreHandle {
  const namespace = explicit ?? storageNamespace
  const cached = stores.get(namespace)
  if (cached) return cached
  const created = createStore(dbNameFor(namespace), 'kv')
  stores.set(namespace, created)
  dbNames.set(created, dbNameFor(namespace))
  return created
}

/** Select physical records in the same profile transaction without decoding other assets. */
export function readLocalPintaRecords<T>(
  namespace: string | undefined,
  select: AssetRecordSelection,
  read: (records: ReadonlyMap<string, unknown>) => T,
  inspectKeys?: (keys: readonly string[], allKeys: readonly IDBValidKey[]) => void,
): Promise<T> {
  return withAssetTransaction(getStoreHandle(namespace), read, select, null, inspectKeys)
}

// Uma cadeia FIFO por BANCO. Além de impedir interleaving entre save/rename/
// delete, permite gravar asset + mapas ligados numa única transação IndexedDB.
const writeChains = new WeakMap<StoreHandle, Promise<void>>()
const backupSizeCaches = new WeakMap<StoreHandle, GalleryBackupSizeCache>()

/**
 * Desenhos ABERTOS no editor nesta página (id → quantos editores). O host usa
 * `isPintaAssetOpen` para NÃO gravar por baixo de um desenho aberto (a descida da nuvem
 * "nuvem mais nova, local intocado" sobrescreveria o disco enquanto o editor segura a versão
 * antiga em memória — e o próximo autosave subiria por cima da versão do outro aparelho).
 * Mesma ideia do `isProjectOpenAnywhere` do Estúdio.
 */
const openAssets = new Map<string, number>()
export type PintaAssetOpenEvent = { type: 'opened' | 'closed'; id: string }
const openListeners = new Set<(event: PintaAssetOpenEvent) => void>()
function notifyOpen(event: PintaAssetOpenEvent): void {
  for (const listener of openListeners) {
    try {
      listener(event)
    } catch {
      // Um ouvinte com defeito não pode derrubar o editor.
    }
  }
}
export function markPintaAssetOpen(id: string): void {
  const count = openAssets.get(id) ?? 0
  openAssets.set(id, count + 1)
  if (count === 0) notifyOpen({ type: 'opened', id })
}
export function markPintaAssetClosed(id: string): void {
  const count = openAssets.get(id) ?? 0
  if (count <= 1) {
    openAssets.delete(id)
    if (count === 1) notifyOpen({ type: 'closed', id })
  } else {
    openAssets.set(id, count - 1)
  }
}
export function isPintaAssetOpen(id: string): boolean {
  return openAssets.has(id)
}
/**
 * Observa abrir/fechar de desenhos no editor (o host usa para, ao FECHAR um desenho que a
 * descida da nuvem pulou por estar aberto, trazer a versão da nuvem na hora — e não só na
 * próxima carga). Devolve o desligar.
 */
export function subscribePintaAssetOpenState(
  listener: (event: PintaAssetOpenEvent) => void,
): () => void {
  openListeners.add(listener)
  return () => {
    openListeners.delete(listener)
  }
}

/**
 * Avisos de um armazenamento que muda por fora da store. A persistência local
 * usa o evento da biblioteca entre instâncias/abas; o host de nuvem também usa
 * os eventos de sincronização e de galeria.
 */
export type PintaPersistenceEvent =
  | { type: 'sync-start' }
  | { type: 'changed' }
  | { type: 'palette-library-changed' }
  | { type: 'sync-end' }
  | { type: 'recovered'; names: string[] }
  | { type: 'account-removal-returned'; names: string[] }
  | { type: 'account-recovered'; names: string[] }

/**
 * Um desenho que existe na conta num formato mais novo que o deste código. Ele NÃO é carregado:
 * ler seria passar pelo `sanitizePintaAsset`, que descarta o que não conhece, e a versão cortada
 * acabaria salva por cima. A galeria avisa e pede para atualizar a página.
 */
export interface PintaReadIssue {
  id: string
  name: string
  status: 'unsupported'
  version: number
}

const persistenceListeners = new WeakMap<StoreHandle, Set<(event: PintaPersistenceEvent) => void>>()

function listenersFor(storeHandle: StoreHandle): Set<(event: PintaPersistenceEvent) => void> {
  const existing = persistenceListeners.get(storeHandle)
  if (existing) return existing
  const created = new Set<(event: PintaPersistenceEvent) => void>()
  persistenceListeners.set(storeHandle, created)
  return created
}

function emitPersistenceEvent(storeHandle: StoreHandle, event: PintaPersistenceEvent): void {
  for (const listener of listenersFor(storeHandle)) {
    try {
      listener(event)
    } catch {
      // Um observador com defeito não desfaz um write que o IndexedDB já confirmou.
    }
  }
}

/**
 * Outra ABA do mesmo perfil gravou/apagou (o Estúdio abre o Pinta em aba nova; a descida da
 * nuvem de outra instância): avisa para o inventário do orçamento desta aba ESQUECER esses
 * ids — são relidos (e medidos de novo) na próxima gravação. Sem isto o inventário guardava
 * os bytes VELHOS de um desenho atualizado lá (mesmo id), e o orçamento dos 32 MiB podia
 * deixar passar. Um canal por banco; o canal não recebe as próprias mensagens.
 */
const crossTabChannels = new WeakMap<StoreHandle, BroadcastChannel | null>()
function crossTabChannelFor(storeHandle: StoreHandle, dbName: string): BroadcastChannel | null {
  if (crossTabChannels.has(storeHandle)) return crossTabChannels.get(storeHandle) ?? null
  let channel: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(`pinta:assets:${dbName}`)
      channel.onmessage = (
        event: MessageEvent<{
          ids?: unknown
          paletteLibraryChanged?: unknown
          recoveredNames?: unknown
        }>,
      ) => {
        const ids = event.data?.ids
        if (Array.isArray(ids)) {
          const cache = backupSizeCaches.get(storeHandle)
          if (cache) for (const id of ids) if (typeof id === 'string') cache.remove(id)
          emitPersistenceEvent(storeHandle, { type: 'changed' })
        }
        const recovered = event.data?.recoveredNames
        if (Array.isArray(recovered) && recovered.every((name) => typeof name === 'string')) {
          emitPersistenceEvent(storeHandle, { type: 'recovered', names: recovered })
        }
        if (event.data?.paletteLibraryChanged === true) {
          emitPersistenceEvent(storeHandle, { type: 'palette-library-changed' })
        }
      }
    } catch {
      channel = null
    }
  }
  crossTabChannels.set(storeHandle, channel)
  return channel
}

function notifyPaletteLibraryChanged(storeHandle: StoreHandle, dbName: string): void {
  // `BroadcastChannel` não entrega ao próprio contexto; o hub cobre as outras
  // instâncias desta página e o canal cobre os demais contextos do navegador.
  emitPersistenceEvent(storeHandle, { type: 'palette-library-changed' })
  try {
    crossTabChannelFor(storeHandle, dbName)?.postMessage({ paletteLibraryChanged: true })
  } catch {
    // O save já está no IndexedDB; abrir o menu ainda relê o registro autoritativo.
  }
}
function notifyOtherTabs(storeHandle: StoreHandle, dbName: string, ids: readonly string[]): void {
  if (ids.length === 0) return
  try {
    crossTabChannelFor(storeHandle, dbName)?.postMessage({ ids })
  } catch {
    // Canal fechado/indisponível: o inventário da outra aba se alinha na próxima carga.
  }
}

/** Internal regional CAS. Publish changes only after the shared storage transaction commits. */
export function updateLocalPintaRecords<T>(
  namespace: string,
  id: string,
  select: AssetRecordSelection,
  write: (records: Map<string, unknown>) => { value: T; changed: boolean },
  inspectKeys: (keys: readonly string[], allKeys: readonly IDBValidKey[]) => void,
  signal?: AbortSignal,
): Promise<T> {
  const storeHandle = getStoreHandle(namespace)
  return runSerializedWrite(storeHandle, async () => {
    const { value, changed } = await withPhysicalAssetUpdate(
      storeHandle,
      write,
      select,
      inspectKeys,
      signal,
    )
    if (changed) {
      backupSizeCaches.get(storeHandle)?.invalidate([id])
      notifyOtherTabs(storeHandle, dbNameFor(namespace), [id])
    }
    return value
  })
}

function reportLocalRecovery<Asset extends PintaMemoryAsset>(
  storeHandle: StoreHandle,
  snapshot: LocalSnapshot<Asset>,
  legacyAssets?: readonly PintaAsset[],
): void {
  if (!snapshot.recovered.length) return
  const names = snapshot.recovered.map((a) => a.name)
  if (legacyAssets) backupSizeCaches.get(storeHandle)?.seed(legacyAssets)
  emitPersistenceEvent(storeHandle, { type: 'changed' })
  emitPersistenceEvent(storeHandle, { type: 'recovered', names })
  try {
    crossTabChannelFor(storeHandle, dbNames.get(storeHandle) ?? '')?.postMessage({
      ids: [...snapshot.assets.keys(), ...snapshot.documents.keys()],
      recoveredNames: names,
    })
  } catch {
    // All copies and the authority already committed; the next list still finds them.
  }
}

function backupSizeCacheFor(storeHandle: StoreHandle): GalleryBackupSizeCache {
  const cached = backupSizeCaches.get(storeHandle)
  if (cached) return cached
  const created = new GalleryBackupSizeCache()
  backupSizeCaches.set(storeHandle, created)
  return created
}

/**
 * Mede os bytes pendentes do inventário em fatias de tempo ocioso (só no navegador). Sem
 * `requestIdleCallback` (Safari/iPad) cai em fatias curtas por `setTimeout` — senão a medição
 * inteira caía no primeiro traço da criança justamente no tablet.
 */
const WARMUP_FALLBACK_SLICE_MS = 6
function scheduleWarmUp(cache: GalleryBackupSizeCache): void {
  if (typeof window === 'undefined' || cache.pendingCount === 0) return
  const ric = (
    globalThis as {
      requestIdleCallback?: (cb: (deadline: { timeRemaining(): number }) => void) => number
    }
  ).requestIdleCallback
  if (typeof ric === 'function') {
    ric(function slice(deadline) {
      perfSpan('pinta:backup:warmup', () => {
        const done = cache.warmUp(Math.max(4, deadline.timeRemaining()))
        if (!done) ric(slice)
      })
    })
    return
  }
  setTimeout(function slice() {
    perfSpan('pinta:backup:warmup', () => {
      const done = cache.warmUp(WARMUP_FALLBACK_SLICE_MS)
      if (!done) setTimeout(slice, 0)
    })
  }, 0)
}

export function runSerializedWrite<Result>(
  storeHandle: StoreHandle,
  task: () => Promise<Result>,
): Promise<Result> {
  const prev = writeChains.get(storeHandle)
  const next = prev ? prev.then(task, task) : task()
  const settled = next.then(
    () => {
      if (writeChains.get(storeHandle) === settled) writeChains.delete(storeHandle)
    },
    () => {
      if (writeChains.get(storeHandle) === settled) writeChains.delete(storeHandle)
    },
  )
  writeChains.set(storeHandle, settled)
  return next
}

/**
 * Avisos de um armazenamento que muda POR FORA da galeria (o host que sincroniza com a nuvem,
 * por exemplo): `sync-start`/`sync-end` delimitam uma sincronia em andamento (a galeria mostra
 * "buscando…" e quem espera um desenho que ainda não chegou aguarda), `changed` diz que a lista
 * do disco mudou (a galeria relê, coalescido).
 */
export interface PintaPersistence<Asset extends PintaMemoryAsset = PintaAsset> {
  readonly workshopReader?: true
  persistAsset(asset: Asset, context?: PintaEditorWriteContext): Promise<void>
  persistAssets(assets: readonly Asset[], context?: PintaEditorWriteContext): Promise<void>
  persistRevision?(
    previous: Asset,
    asset: Asset,
    resources: readonly PintaResourceObservation[],
  ): Promise<void>
  openRegionSession?(id: string, signal?: AbortSignal): Promise<LocalRegionAuthorSession | null>
  listGalleryIndex?(): Promise<RegionGalleryIndex | null>
  deleteAsset(id: string, base?: Asset): Promise<void>
  loadAssetById(id: string): Promise<Asset | null>
  listAllAssets(): Promise<Asset[]>
  /** Account host holds the shared read lease until this editor closes. */
  holdOpen?(id: string): Promise<() => void>
  observesReferences?: true
  needsRetainedRecovery?(): boolean
  loadRetainedRecoveryFiles?(): Promise<ReadonlyMap<string, Blob>>
  prepareTileRemap?(source: Asset): Promise<readonly Asset[]>
  /**
   * OPCIONAL: observar mudanças feitas por fora (ver `PintaPersistenceEvent`). O IndexedDB do
   * perfil emite mudanças da biblioteca entre stores/abas; o wrapper da nuvem do host acrescenta
   * os eventos da galeria — é o que permite abrir com o LOCAL e receber o que desce depois.
   */
  subscribe?(listener: (event: PintaPersistenceEvent) => void): () => void
  /**
   * OPCIONAL: desenhos que o armazenamento conhece mas este código não sabe ler (formato mais
   * novo, vindo de outro aparelho). Síncrono e barato; a galeria relê a cada aviso do `subscribe`.
   */
  getReadIssues?(): PintaReadIssue[]
  /**
   * OPCIONAIS: a biblioteca "Minhas paletas" do perfil (registro único, fora
   * da galeria/backup/orçamento). Armazenamento sem os métodos = a UI esconde
   * a biblioteca e só a paleta EMBUTIDA no asset funciona (o bloco de aula usa
   * isso de propósito — o desenho da aula é isolado da galeria pessoal).
   */
  loadPaletteLibrary?(): Promise<PaletteLibrary | null>
  /** CAS da biblioteca e da sua base confirmada dentro do mesmo IndexedDB do perfil. */
  paletteAccount?: PaletteAccount
  /** Devolve o valor autoritativo gravado depois do merge transacional. */
  savePaletteLibrary?(
    library: PaletteLibrary,
    ready?: () => boolean,
    observed?: PaletteLibrary,
  ): Promise<PaletteLibrary>
}

/**
 * `sanitizePintaAsset` NÃO deve lançar (descarta com `null`), mas o LOAD blinda
 * por registro mesmo assim: uma regressão futura que faça o sanitize lançar num
 * ÚNICO registro corrompido NÃO pode derrubar a galeria inteira (paridade com o
 * caminho de import `.pinta.json`, que já é try/catch por registro).
 */
function safeSanitize(raw: unknown): PintaAsset | null {
  try {
    return sanitizePintaAsset(raw)
  } catch {
    return null
  }
}

async function listAssetsForStore(storeHandle: StoreHandle): Promise<PintaAsset[]> {
  const allKeys = await keys(storeHandle)
  const assetKeys = allKeys.filter(
    (key): key is string => typeof key === 'string' && key.startsWith(ASSET_KEY_PREFIX),
  )
  if (assetKeys.length === 0) return []
  const values = await getMany<unknown>(assetKeys, storeHandle)
  return values
    .map((value) => safeSanitize(value))
    .filter((asset): asset is PintaAsset => asset !== null)
}

/** Erro específico para a UI explicar por que a mutação não foi persistida. */
export function isPintaStorageBudgetError(error: unknown): error is PintaStorageBudgetError {
  return error instanceof PintaStorageBudgetError
}

/**
 * Cliente ligado ao banco do perfil ATUAL neste instante. Stores com fila
 * própria guardam este objeto, então uma troca global posterior não redireciona
 * mutações que ainda aguardam sua vez.
 *
 * ⭐ `namespace` EXPLÍCITO ignora o global e abre um banco próprio. É o que o bloco de aula usa
 * para guardar o rascunho por BLOCO + PERFIL: sem isso, o desenho da aula cairia na galeria
 * pessoal da criança, e o `setPintaStorageNamespace` global seria uma variável compartilhada
 * entre a página do Pinta solto e a aula — o tipo de acoplamento que só aparece quando as duas
 * abrem juntas.
 */
export function createPintaPersistence(options: { namespace?: string } = {}): PintaPersistence {
  return createLocalPintaPersistence(options, legacyPersistenceFormat)
}

export interface PintaCausalLocalPort<Asset extends PintaMemoryAsset = PintaAsset> {
  captureCandidate(asset: Asset): Asset
  encodeCandidates(assets: readonly Asset[], signal: AbortSignal): Promise<PintaCandidateBytes>
  decodeCandidate(json: string): Asset | null
  capture(ids: readonly string[]): Promise<readonly Omit<LocalAssetTransition<Asset>, 'after'>[]>
  inspect(): Promise<LocalCausalState>
  rememberProtocol(): Promise<void>
  pullImpact(
    pull: PintaCausalLocalPull<Asset>,
  ): Promise<{ ids: string[]; blocked: boolean; needsArchive?: true }>
  applyPull(pull: PintaCausalLocalPull<Asset>, ready: () => boolean): Promise<boolean>
  stageUnbased(draft: PintaLocalUnbasedDraft<Asset>): Promise<void>
  discardUnpublished(change: LocalAssetTransition<Asset>): Promise<boolean>
  stage(draft: PintaCausalLocalDraft<Asset>): Promise<PintaCausalPending>
  prepare(opId: string): Promise<{ pending: PintaCausalPending; assets: Asset[] } | null>
  freeze(
    opId: string,
    preparation: string,
    puts: readonly PintaPreparedPut[],
    blobs: ReadonlyMap<string, Blob>,
  ): Promise<boolean>
  prepared(opId: string): Promise<ReturnType<typeof readLocalCausalPrepared>>
  retained(opId: string): Promise<ReturnType<typeof readLocalCausalRetained>>
  retainedArchive(): Promise<ReadonlyMap<string, PintaCandidateBytes & { manifest: string }>>
  pinned(opId: string): Promise<PintaCandidateBytes | null>
  seal(
    preparation: string,
    intent: PintaCausalIntent,
    intentHash: string,
    blobs: ReadonlyMap<string, Blob>,
  ): Promise<boolean>
  inFlight(): Promise<{ sealed: PintaCausalSealed; blobs: ReadonlyMap<string, Blob> } | null>
  renew(
    previous: Pick<PintaCausalSealed, 'intentHash' | 'intent'>,
    next: PintaCausalIntent,
    intentHash: string,
    ready: () => boolean,
  ): Promise<boolean>
  acknowledge(receipt: PintaCausalResult, ready?: () => boolean): Promise<boolean>
}

/** Account host entry point. The local drawing format is the same as in the ordinary workshop. */
export function createPintaCausalPersistence(options: { namespace: string }): PintaPersistence & {
  causal: PintaCausalLocalPort
} {
  return createLocalPintaPersistence(
    { ...options, guardCausalWrites: true },
    legacyPersistenceFormat,
  )
}

/** Internal policy boundary. Public callers continue to select native 0–7 and physical 1/2. */
export interface LocalPersistenceFormat<Asset extends PintaMemoryAsset> {
  authority: Pick<
    ReturnType<typeof createLocalAssetAuthority<Asset>>,
    | 'resolveLocalRecords'
    | 'selectLocalAssetRecords'
    | 'writeLocalRecords'
    | 'deleteLocalRecord'
    | 'applyAssetTransitions'
    | 'checkLocalBudget'
  >
  stamp(asset: Asset): Asset
  encodeCandidate(asset: Asset): { json: string; formatVersion: number }
  decodeCandidate(json: string): Asset | null
  codec?: LocalStorageCodec
  /** Structured regional captures cannot omit incompatible or unavailable resources. */
  strictCapture?: true
  /** Only the legacy policy may use the sprite inventory/RLE incremental cache. */
  legacyAssets?(assets: readonly Asset[]): readonly PintaAsset[]
}

export function encodeLegacyLocalCandidate(asset: PintaAsset): {
  json: string
  formatVersion: number
} {
  const formatVersion = pintaWriteFormatVersion(asset.kind)
  if (!pintaCanWriteNativeSchema(pintaAssetSchema(asset), formatVersion))
    throw new PintaClientOutdatedError()
  return { json: assetToJson(asset), formatVersion }
}

export function decodeLegacyLocalCandidate(json: string): PintaAsset | null {
  const parsed = assetFromJson(json)
  return parsed.warnings.length ? null : parsed.asset
}

const legacyPersistenceFormat: LocalPersistenceFormat<PintaAsset> = {
  authority: {
    resolveLocalRecords,
    selectLocalAssetRecords,
    writeLocalRecords,
    deleteLocalRecord,
    applyAssetTransitions,
    checkLocalBudget,
  },
  stamp: withPintaSchemaStamp,
  encodeCandidate: encodeLegacyLocalCandidate,
  decodeCandidate: decodeLegacyLocalCandidate,
  legacyAssets: (assets) => assets,
}

export function createLocalPintaPersistence<Asset extends PintaMemoryAsset>(
  options: { namespace?: string; guardCausalWrites?: boolean },
  format: LocalPersistenceFormat<Asset>,
): PintaPersistence<Asset> & { causal: PintaCausalLocalPort<Asset> } {
  const {
    resolveLocalRecords,
    selectLocalAssetRecords,
    writeLocalRecords,
    deleteLocalRecord,
    applyAssetTransitions,
    checkLocalBudget,
  } = format.authority
  const storeHandle = getStoreHandle(options.namespace)
  const dbName = dbNames.get(storeHandle) ?? ''
  const backupSizeCache = backupSizeCacheFor(storeHandle)
  const observed = new Map<string, string | null>()
  let readIssues: PintaReadIssue[] = []
  const transaction = <T>(
    plan: (records: Map<string, unknown>) => T,
    select?: AssetRecordSelection,
    inspectKeys?: (keys: readonly string[]) => void,
  ) => withAssetTransaction(storeHandle, plan, select, format.codec, inspectKeys)
  const palettes = createLocalPaletteAccount(
    (plan) =>
      runSerializedWrite(storeHandle, () =>
        transaction(plan, () => [PALETTE_LIBRARY_KEY, PALETTE_ACCOUNT_KEY]),
      ),
    () => notifyPaletteLibraryChanged(storeHandle, dbName),
  )
  const accept = (
    snapshot: LocalSnapshot<Asset>,
    writtenIds?: readonly string[],
    readIds?: readonly string[],
  ) => {
    readIssues = readIds
      ? [
          ...new Map(
            [...readIssues.filter((issue) => !readIds.includes(issue.id)), ...snapshot.issues].map(
              (issue) => [issue.id, issue],
            ),
          ).values(),
        ]
      : snapshot.issues
    for (const [id, asset] of snapshot.assets) {
      recordPintaLocalOrigin(asset, dbName, snapshot.documents.get(id)?.revision ?? null)
      if (
        writtenIds
          ? writtenIds.includes(id)
          : (!readIds || readIds.includes(id)) && !observed.has(id)
      )
        observed.set(id, snapshot.documents.get(id)?.revision ?? null)
    }
    for (const [id, doc] of snapshot.documents)
      if (
        !doc.asset &&
        (writtenIds
          ? writtenIds.includes(id)
          : (!readIds || readIds.includes(id)) && !observed.has(id))
      )
        observed.set(id, doc.revision)
    const legacyAssets = format.legacyAssets?.([...snapshot.assets.values()])
    if (!readIds && legacyAssets) backupSizeCache.seed(legacyAssets)
    reportLocalRecovery(storeHandle, snapshot, legacyAssets)
  }
  const readSnapshot = async (ids?: readonly string[]) => {
    const snapshot = await transaction(
      resolveLocalRecords,
      ids ? selectLocalAssetRecords(ids) : undefined,
    )
    accept(snapshot, undefined, ids)
    return snapshot
  }
  const causalKeys = [PINTA_CAUSAL_OUTBOX_KEY]
  const candidateInventory =
    (
      pick: (state: LocalCausalState) => readonly string[],
      includeGallery = true,
    ): AssetRecordSelection =>
    (records) => {
      if (!records.has(PINTA_CAUSAL_OUTBOX_KEY)) return causalKeys
      const state = readLocalCausalState(records)
      const missing = [...pick(state), ...(state.pins ? [PINTA_CAUSAL_PIN_BLOBS_KEY] : [])].filter(
        (key) => !records.has(key),
      )
      return missing.length ? missing : includeGallery ? null : []
    }
  const allRetainedKeys = (state: LocalCausalState) => [
    ...(state.sealed ? [PINTA_CAUSAL_BLOBS_KEY] : []),
    ...[...(state.prepared?.keys() ?? []), ...(state.shadows?.keys() ?? [])].map(localPreparedKey),
  ]
  const shadowInventory = candidateInventory((state) =>
    [...(state.shadows?.keys() ?? [])].map(localPreparedKey),
  )
  const retainedCausalBytes = (records: ReadonlyMap<string, unknown>) => {
    if (!options.guardCausalWrites) return undefined
    const bytes = localCausalBytes(records)
    return { before: bytes, after: bytes }
  }
  const checkCombined = (
    records: ReadonlyMap<string, unknown>,
    snapshot: LocalSnapshot<Asset>,
    before: number,
  ): void =>
    checkLocalBudget(snapshot.baseline, [...snapshot.assets.values()], {
      before,
      after: localCausalBytes(records),
    })
  const withCausalState = (select?: AssetRecordSelection): AssetRecordSelection | undefined => {
    if (!options.guardCausalWrites) return select
    return (records) =>
      records.has(PINTA_CAUSAL_OUTBOX_KEY) ? (select?.(records) ?? null) : causalKeys
  }
  const checkUnowned = (records: ReadonlyMap<string, unknown>, ids: readonly string[]): void => {
    if (!options.guardCausalWrites) return
    const state = readLocalCausalState(records)
    if (ids.some((id) => ownsLocalCausalMember(state, id)))
      throw new PintaLocalStorageError(
        'Este desenho faz parte de mudanças que precisam ser guardadas juntas.',
      )
  }
  const causalMembers =
    (opId: string): AssetRecordSelection =>
    (records) => {
      if (!records.has(PINTA_CAUSAL_OUTBOX_KEY)) return causalKeys
      const unit = readLocalCausalState(records).pending.find((pending) => pending.opId === opId)
      return unit
        ? selectLocalAssetRecords(unit.members.map((member) => member.itemId))(records)
        : []
    }
  const causal: PintaCausalLocalPort<Asset> = {
    captureCandidate(asset) {
      const detached = structuredClone(asset)
      const origin = pintaLocalOriginOf(asset, dbName)
      if (origin) recordPintaLocalOrigin(detached, dbName, origin.revision)
      return detached
    },
    encodeCandidates: async (assets, signal) => {
      const blobs = new Map<string, Blob>()
      const puts: PintaPreparedPut[] = []
      let bytes = 0
      for (const asset of assets) {
        signal.throwIfAborted()
        const { json, formatVersion } = format.encodeCandidate(format.stamp(asset))
        const gzip = await new Response(
          new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')),
        ).blob()
        bytes += gzip.size
        if (bytes > MAX_BACKUP_FILE_BYTES) throw new PintaStorageBudgetError(bytes)
        const hash = await crypto.subtle.digest('SHA-256', await gzip.arrayBuffer())
        const sha256 = Array.from(new Uint8Array(hash), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('')
        blobs.set(asset.id, gzip)
        puts.push({
          itemId: asset.id,
          name: asset.name,
          kind: asset.kind,
          itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
          formatVersion,
          bytes: gzip.size,
          sha256,
        })
      }
      signal.throwIfAborted()
      return { puts, blobs }
    },
    decodeCandidate: format.decodeCandidate,
    capture: async (ids) => {
      const snapshot = await readSnapshot(ids)
      if (snapshot.issues.some(({ id }) => ids.includes(id)))
        throw new PintaLocalStorageError('Não consegui conferir todos os desenhos desta mudança.')
      return ids.map((id) => ({
        id,
        before: snapshot.assets.get(id) ?? null,
        beforeRevision: snapshot.documents.get(id)?.revision ?? null,
      }))
    },
    inspect: () => transaction(readLocalCausalState, () => causalKeys),
    rememberProtocol: () =>
      transaction(
        (records) => {
          if (readLocalCausalState(records).protocolKnown) return
          const before = localCausalBytes(records)
          rememberLocalCausalProtocol(records)
          checkCombined(records, resolveLocalRecords(records, false), before)
        },
        candidateInventory(() => []),
      ),
    pullImpact: (pull) =>
      transaction((records) =>
        localCausalPullImpact(
          pull,
          readLocalCausalState(records),
          resolveLocalRecords(records, false),
        ),
      ),
    applyPull: (pull, ready) =>
      runSerializedWrite(storeHandle, async () => {
        const installed = await transaction(
          (records) => {
            if (!ready()) return null
            const before = localCausalBytes(records)
            const returned = localRemovalsReturnedByPull(readLocalCausalState(records), pull)
            const applied = installLocalCausalPull(records, pull, (authorize) =>
              applyAssetTransitions(records, pull.transitions, false, authorize),
            )
            if (applied) checkCombined(records, applied, before)
            if (!applied) return null
            const knownCopies = readLocalCausalState(records).recovered
            return {
              snapshot: applied,
              returned,
              copies: applied.recovered
                .filter(({ id }) => knownCopies?.has(id))
                .map(({ name }) => name),
            }
          },
          pull.recoverUnit
            ? candidateInventory((state) => [
                PINTA_CAUSAL_BLOBS_KEY,
                ...[...(state.prepared?.keys() ?? []), ...(state.shadows?.keys() ?? [])].map(
                  localPreparedKey,
                ),
              ])
            : shadowInventory,
        ).catch((error) => {
          if (error instanceof PintaCausalPullDeferred) return null
          throw error
        })
        if (!installed) return false
        const { snapshot, returned, copies } = installed
        const ids = [
          ...new Set([
            ...(pull.coveredIds ?? pull.transitions.map(({ id }) => id)),
            ...snapshot.recovered.map(({ id }) => id),
          ]),
        ]
        backupSizeCache.invalidate(ids)
        accept(snapshot, ids)
        if (copies.length)
          emitPersistenceEvent(storeHandle, { type: 'account-recovered', names: copies })
        if (returned.length)
          emitPersistenceEvent(storeHandle, {
            type: 'account-removal-returned',
            names: returned.map(({ name }) => name),
          })
        if (ids.length) notifyOtherTabs(storeHandle, dbName, ids)
        return true
      }),
    discardUnpublished: (change) =>
      runSerializedWrite(storeHandle, async () => {
        if (!change.before || change.after) return false
        const snapshot = await transaction((records) => {
          const bytes = localCausalBytes(records)
          const written = discardLocalCausalCreation<Asset>(records, change.id, (authorize) =>
            applyAssetTransitions(records, [change], true, authorize),
          )
          if (written) checkCombined(records, written, bytes)
          return written
        }, shadowInventory)
        if (!snapshot) return false
        backupSizeCache.invalidate([change.id])
        accept(snapshot, [change.id])
        notifyOtherTabs(storeHandle, dbName, [change.id])
        return true
      }),
    stageUnbased: (draft) =>
      runSerializedWrite(storeHandle, async () => {
        const snapshot = await transaction((records) => {
          const before = localCausalBytes(records)
          const written = stageLocalUnbasedDraft(records, draft, () =>
            applyAssetTransitions(records, draft.transitions, draft.requireKnownInventory === true),
          )
          checkCombined(records, written, before)
          return written
        }, shadowInventory)
        const ids = draft.transitions.map(({ id }) => id)
        backupSizeCache.invalidate(ids)
        for (const { id, after } of draft.transitions) {
          if (!after) continue
          const revision = snapshot.documents.get(id)?.revision ?? null
          recordPintaLocalOrigin(after, dbName, revision)
          const author = draft.authors?.get(id)
          if (author)
            recordPintaLocalOrigin(author, dbName, revision, pintaValuesEqual(author, after))
        }
        accept(snapshot, ids)
        notifyOtherTabs(storeHandle, dbName, ids)
      }),
    stage: (draft) =>
      runSerializedWrite(storeHandle, async () => {
        const { snapshot, pending } = await transaction((records) => {
          const before = localCausalBytes(records)
          const staged = stageLocalCausalDraft(records, draft, () =>
            applyAssetTransitions(records, draft.transitions, draft.requireKnownInventory === true),
          )
          checkCombined(records, staged.snapshot, before)
          return staged
        }, shadowInventory)
        const ids = pending.members.map((member) => member.itemId)
        backupSizeCache.invalidate(ids)
        for (const { id, after } of draft.transitions) {
          if (!after) continue
          const revision = snapshot.documents.get(id)?.revision ?? null
          recordPintaLocalOrigin(after, dbName, revision)
          const author = draft.authors?.get(id)
          if (author)
            recordPintaLocalOrigin(author, dbName, revision, pintaValuesEqual(author, after))
        }
        accept(snapshot, ids)
        notifyOtherTabs(storeHandle, dbName, ids)
        return pending
      }),
    prepare: (opId) =>
      transaction((records) => {
        const pending = readLocalCausalState(records).pending.find((unit) => unit.opId === opId)
        if (!pending) return null
        const snapshot = resolveLocalRecords(records, false)
        const assets: Asset[] = []
        for (const member of pending.members) {
          const doc = snapshot.documents.get(member.itemId)
          if (!doc || doc.revision !== member.localRevision) return null
          if (member.action === 'put') {
            if (!doc.asset) return null
            assets.push(doc.asset)
          } else if (doc.asset) return null
        }
        return { pending, assets }
      }, causalMembers(opId)),
    freeze: (opId, preparation, puts, blobs) =>
      transaction(
        (records) => {
          const before = localCausalBytes(records)
          const snapshot = resolveLocalRecords(records, false)
          const frozen = freezeLocalCausalDraft(
            records,
            opId,
            preparation,
            puts,
            blobs,
            (member) => snapshot.documents.get(member.itemId)?.revision === member.localRevision,
          )
          if (frozen) checkCombined(records, snapshot, before)
          return frozen
        },
        candidateInventory(() => [localPreparedKey(opId)]),
      ),
    prepared: (opId) =>
      transaction(
        (records) => readLocalCausalPrepared(records, opId),
        () => [PINTA_CAUSAL_OUTBOX_KEY, localPreparedKey(opId)],
      ),
    retained: (opId) =>
      transaction(
        (records) => readLocalCausalRetained(records, opId),
        () => [PINTA_CAUSAL_OUTBOX_KEY, localPreparedKey(opId)],
      ),
    pinned: (opId) =>
      transaction(
        (records) => readPinnedCandidate(records, readLocalCausalState(records).pins?.get(opId)),
        () => [PINTA_CAUSAL_OUTBOX_KEY, PINTA_CAUSAL_PIN_BLOBS_KEY],
      ),
    retainedArchive: () =>
      transaction(
        (records) => {
          const state = readLocalCausalState(records)
          const candidates = new Map<string, PintaCandidateBytes & { manifest: string }>()
          const append = (opId: string, path: string, candidate: PintaCandidateBytes) => {
            const operation =
              state.sealed?.local.opId === opId
                ? state.sealed
                : (state.pending.find((unit) => unit.opId === opId) ?? state.unbased)
            candidates.set(path, {
              ...candidate,
              manifest: JSON.stringify(
                {
                  format: 'pinta-causal-recovery',
                  version: 1,
                  recordVersion: state.version,
                  epoch: state.epoch,
                  operation,
                  observedResources: state.pins?.get(opId) ?? [],
                  puts: candidate.puts,
                },
                null,
                2,
              ),
            })
          }
          const saved = readLocalCausalUpload(records)
          if (saved)
            append(saved.sealed.local.opId, saved.sealed.local.opId, {
              puts: saved.sealed.intent.members.filter((member) => member.action === 'put'),
              blobs: saved.blobs,
            })
          for (const opId of [
            ...(state.prepared?.keys() ?? []),
            ...(state.shadows?.keys() ?? []),
          ]) {
            const candidate = readLocalCausalRetained(records, opId)
            if (candidate) append(opId, opId, candidate)
          }
          for (const [opId, pins] of state.pins ?? []) {
            const candidate = readPinnedCandidate(records, pins)
            if (candidate?.puts.length) append(opId, `${opId}/pecas-relacionadas`, candidate)
          }
          return candidates
        },
        candidateInventory(allRetainedKeys, false),
      ),
    seal: (preparation, intent, intentHash, blobs) =>
      transaction(
        (records) => {
          const before = localCausalBytes(records)
          const snapshot = resolveLocalRecords(records, false)
          const sealed = sealLocalCausalDraft(
            records,
            preparation,
            intent,
            intentHash,
            blobs,
            (member) => snapshot.documents.get(member.itemId)?.revision === member.localRevision,
          )
          if (sealed) checkCombined(records, snapshot, before)
          return sealed
        },
        candidateInventory(() => [localPreparedKey(intent.opId)]),
      ),
    inFlight: () =>
      transaction(readLocalCausalUpload, () => [PINTA_CAUSAL_OUTBOX_KEY, PINTA_CAUSAL_BLOBS_KEY]),
    renew: (previous, next, intentHash, ready) =>
      transaction(
        (records) => {
          if (!ready()) return false
          const before = localCausalBytes(records)
          const renewed = renewLocalCausalUpload(records, previous, next, intentHash)
          if (renewed) checkCombined(records, resolveLocalRecords(records, false), before)
          return renewed
        },
        candidateInventory(() => []),
      ),
    acknowledge: (receipt, ready) =>
      transaction(
        (records) => {
          if (ready?.() === false) return false
          const before = localCausalBytes(records)
          const acknowledged = acknowledgeLocalCausalDraft(records, receipt)
          if (acknowledged) checkCombined(records, resolveLocalRecords(records, false), before)
          return acknowledged
        },
        candidateInventory(() => [PINTA_CAUSAL_BLOBS_KEY]),
      ),
  }
  const finishProtectedWrite = (
    snapshot: LocalSnapshot<Asset> & { forks: Map<string, Asset> },
    assets: readonly Asset[],
    changed: readonly Asset[],
  ) => {
    // A fork may leave the submitted ID unchanged; seed from committed authority,
    // never from the speculative measurement of the attempted edit.
    backupSizeCache.invalidate(changed.map((asset) => asset.id))
    if (!snapshot.forks.size)
      for (const asset of assets)
        recordPintaLocalOrigin(asset, dbName, snapshot.documents.get(asset.id)?.revision ?? null)
    accept(
      snapshot,
      snapshot.forks.size ? snapshot.recovered.map((a) => a.id) : changed.map((a) => a.id),
    )
    notifyOtherTabs(
      storeHandle,
      dbName,
      [...changed, ...snapshot.recovered].map((a) => a.id),
    )
    if (snapshot.forks.size) throw new PintaLocalConflictError(snapshot.forks)
  }
  const persistAssetsForStore = async (assets: readonly Asset[]): Promise<void> => {
    if (assets.length === 0) return
    // O carimbo `schema` é recalculado a cada gravação. O editor muda o mapa em memória sem
    // mexer nele, e é o carimbo NO DISCO que faz outra aba com código mais antigo recusar o
    // registro em vez de abrir, cortar o que não conhece e salvar por cima.
    const unique = new Map(assets.map((asset) => [asset.id, format.stamp(asset)]))
    const pairs = [...unique.values()].map(
      (asset) => [assetKey(asset.id), asset] as [string, Asset],
    )
    const changed = [...unique.values()]
    const changedIds = [...unique.keys()]
    const legacyChanged = format.legacyAssets?.(changed)
    // A mixed gallery budgets canonical maps, not legacy mirrors. The incremental
    // sprite-only path is retained only in galleries without protected documents.
    if (
      !legacyChanged ||
      changed.some(
        (a) =>
          a.kind === 'tilemap' ||
          a.kind === 'map-set' ||
          a.kind === 'tileset' ||
          a.kind === 'vector-tileset',
      ) ||
      (await keys(storeHandle)).some(
        (key) => typeof key === 'string' && key.startsWith(LOCAL_ASSET_PREFIX),
      )
    ) {
      await runSerializedWrite(storeHandle, async () => {
        const snapshot = await transaction((records) => {
          checkUnowned(records, changedIds)
          return writeLocalRecords(records, changed, observed, dbName, retainedCausalBytes(records))
        }, withCausalState())
        finishProtectedWrite(snapshot, assets, changed)
      })
      return
    }
    await perfSpanAsync('pinta:persist', () =>
      runSerializedWrite(storeHandle, async () => {
        // O orçamento é projetado pelo INVENTÁRIO (total corrente − tocados + novos), sem
        // reler a galeria inteira a cada autosave. Sem inventário (primeira gravação sem a
        // galeria ter sido carregada — importar, galeria legada semeada direto no disco):
        // semeia uma vez. Com inventário: só a lista de CHAVES (barata) para alinhar ids
        // gravados/apagados por outra aba ou outra instância.
        await perfSpanAsync('pinta:persist:read', async () => {
          if (!backupSizeCache.seeded) {
            backupSizeCache.seed(await listAssetsForStore(storeHandle))
            return
          }
          const allKeys = await keys(storeHandle)
          const ids = allKeys
            .filter(
              (key): key is string => typeof key === 'string' && key.startsWith(ASSET_KEY_PREFIX),
            )
            .map((key) => key.slice(ASSET_KEY_PREFIX.length))
          await backupSizeCache.syncIds(ids, async (missing) => {
            const values = await getMany<unknown>(
              missing.map((id) => assetKey(id)),
              storeHandle,
            )
            return values
              .map((value) => safeSanitize(value))
              .filter((asset): asset is PintaAsset => asset !== null)
          })
        })
        const { currentBytes, projectedBytes } = perfSpan('pinta:persist:budget', () => ({
          currentBytes: backupSizeCache.totalBytes(),
          projectedBytes: backupSizeCache.projectedBytes(legacyChanged),
        }))
        if (projectedBytes > MAX_BACKUP_FILE_BYTES) {
          // Legado acima do teto continua editável quando a mutação REDUZ o
          // backup. Em galeria saudável, qualquer projeção acima é recusada.
          if (projectedBytes >= currentBytes) {
            // A medição da versão RECUSADA não fica no cache (mesmo `{id, updatedAt}` pode voltar
            // com outro conteúdo): como antes.
            backupSizeCache.invalidate(changed.map((asset) => asset.id))
            throw new PintaStorageBudgetError(projectedBytes)
          }
        }
        let needsAuthority = false
        const protectedSnapshot = await perfSpanAsync('pinta:persist:write', () =>
          transaction(
            (records) => {
              checkUnowned(records, changedIds)
              const usage = retainedCausalBytes(records)
              if (needsAuthority)
                return writeLocalRecords(records, changed, observed, dbName, usage)
              const combined = projectedBytes + (usage?.after ?? 0)
              if (
                combined > MAX_BACKUP_FILE_BYTES &&
                combined >= currentBytes + (usage?.before ?? 0)
              )
                throw new PintaStorageBudgetError(combined)
              for (const [key, asset] of pairs) records.set(key, asset)
              return null
            },
            withCausalState(() => (needsAuthority ? null : pairs.map(([key]) => key))),
            (allKeys) => {
              // Same readwrite transaction as the eventual put: another tab cannot
              // introduce an opaque map after this classification and before the write.
              needsAuthority = allKeys.some(
                (key) =>
                  key.startsWith(LOCAL_ASSET_PREFIX) ||
                  (key.startsWith(ASSET_KEY_PREFIX) &&
                    !backupSizeCache.has(key.slice(ASSET_KEY_PREFIX.length))),
              )
            },
          ),
        ).catch((error) => {
          // A failed transaction never authenticates the candidate's measured bytes,
          // even when a caller reused the confirmed timestamp.
          backupSizeCache.invalidate(changed.map((asset) => asset.id))
          throw error
        })
        if (protectedSnapshot) {
          finishProtectedWrite(protectedSnapshot, assets, changed)
          return
        }
        // Só depois do write resolver: uma transação recusada deixa o disco e o inventário como
        // estavam.
        backupSizeCache.commit(legacyChanged)
        notifyOtherTabs(
          storeHandle,
          dbNames.get(storeHandle) ?? '',
          changed.map((asset) => asset.id),
        )
      }),
    )
  }
  // Liga o canal entre abas deste banco (recebe os ids que outra aba gravou/apagou).
  crossTabChannelFor(storeHandle, dbName)
  return {
    causal,
    persistAsset: (asset) => persistAssetsForStore([asset]),
    persistAssets: persistAssetsForStore,
    deleteAsset: (id, base) =>
      runSerializedWrite(storeHandle, async () => {
        const snapshot = await transaction((records) => {
          checkUnowned(records, [id])
          return deleteLocalRecord(
            records,
            id,
            observed,
            dbName,
            base,
            retainedCausalBytes(records),
          )
        }, withCausalState())
        accept(snapshot, [id])
        backupSizeCache.remove(id)
        notifyOtherTabs(storeHandle, dbNames.get(storeHandle) ?? '', [id])
      }),
    async loadAssetById(id) {
      return (await readSnapshot([id])).assets.get(id) ?? null
    },
    async listAllAssets() {
      const assets = [...(await readSnapshot()).assets.values()]
      assets.sort((a, b) => b.updatedAt - a.updatedAt)
      // A carga da galeria SEMEIA o inventário do orçamento (é a mesma leitura) e mede os
      // bytes em fatias ociosas: o custo de codificar a galeria inteira (RLE+JSON) sai do
      // primeiro traço da criança. Sem `requestIdleCallback` (SSR/testes) fica para a
      // primeira gravação, determinístico.
      const legacyAssets = format.legacyAssets?.(assets)
      if (legacyAssets) {
        backupSizeCache.seed(legacyAssets)
        scheduleWarmUp(backupSizeCache)
      }
      return assets
    },
    subscribe(listener) {
      const listeners = listenersFor(storeHandle)
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getReadIssues: () => readIssues,
    paletteAccount: palettes.account,
    loadPaletteLibrary: palettes.load,
    savePaletteLibrary: palettes.save,
  }
}

const defaultClients = new Map<string, PintaPersistence>()
function defaultPersistence(): PintaPersistence {
  const namespace = getPintaStorageNamespace()
  let client = defaultClients.get(namespace)
  if (!client) {
    client = createPintaPersistence({ namespace })
    defaultClients.set(namespace, client)
  }
  return client
}
export function persistAsset(asset: PintaAsset): Promise<void> {
  return defaultPersistence().persistAsset(asset)
}

/** Grava um conjunto relacionado atomicamente no IndexedDB do perfil atual. */
export function persistAssets(assets: readonly PintaAsset[]): Promise<void> {
  return defaultPersistence().persistAssets(assets)
}

export async function deleteAsset(id: string, base?: PintaAsset): Promise<void> {
  const client = defaultPersistence()
  // The historical standalone API explicitly deletes by ID. Capture its base now;
  // gallery/editor callers supply the snapshot they actually displayed instead.
  return client.deleteAsset(id, base ?? (await client.loadAssetById(id)) ?? undefined)
}

export function loadAssetById(id: string): Promise<PintaAsset | null> {
  return defaultPersistence().loadAssetById(id)
}

/**
 * A map and EVERY tileset it uses must come from one authority transaction in the captured
 * profile. `tileset` is the map's default (the flat `tilemap` image and the legacy single
 * dependency); `tilesets` lists the default first and then the other layers' tilesets in
 * `tilemapTilesetIds` order, keeping only the ones present and compatible (the same rule as
 * `resolveMapTilesets`: a layer whose pieces are missing or incompatible is never drawn).
 */
export type PintaAssetCapture<Asset extends PintaMemoryAsset = PintaAsset> =
  | {
      ok: true
      source: Asset
      tileset: AnyTilesetAsset | null
      tilesets: AnyTilesetAsset[]
      assets?: Asset[]
    }
  | { ok: false; reason: 'not-found' | 'needs-tileset' }

export type PintaCaptureOptions = {
  namespace?: string
  signal?: AbortSignal
  includeSceneMaps?: boolean
}

export function capturePintaAssetForImage(
  id: string,
  options: PintaCaptureOptions = {},
): Promise<PintaAssetCapture> {
  // Preserve the historical public API's explicit-namespace normalization.
  return captureLocalPintaAssetForImage(
    id,
    { ...options, namespace: options.namespace?.trim() },
    legacyPersistenceFormat,
  )
}

/** Complete snapshot from the same format policy/transaction used by persistence. */
export async function captureLocalPintaAssetForImage<Asset extends PintaMemoryAsset>(
  id: string,
  options: PintaCaptureOptions,
  format: LocalPersistenceFormat<Asset>,
  readScoped?: (id: string, options: PintaCaptureOptions) => Promise<LocalSnapshot<Asset> | null>,
): Promise<PintaAssetCapture<Asset>> {
  const namespace = options.namespace ?? storageNamespace
  const store = getStoreHandle(namespace)
  const { resolveLocalRecords, selectLocalAssetRecords } = format.authority
  options.signal?.throwIfAborted()
  const scoped = readScoped && (await readScoped(id, { ...options, namespace }))
  const snapshot =
    scoped ??
    (await withAssetTransaction(
      store,
      (records) => {
        const snapshot = resolveLocalRecords(records)
        if (format.strictCapture && snapshot.issues.length)
          throw new PintaLocalStorageError(
            'Atualize a página antes de levar este cenário completo. Há lugares em um formato mais novo.',
          )
        return snapshot
      },
      selectLocalAssetRecords([id], options.signal, options.includeSceneMaps),
      format.codec,
    ))
  options.signal?.throwIfAborted()
  reportLocalRecovery(store, snapshot, format.legacyAssets?.([...snapshot.assets.values()]))
  for (const [assetId, asset] of snapshot.assets)
    recordPintaLocalOrigin(
      asset,
      dbNames.get(store) ?? '',
      snapshot.documents.get(assetId)?.revision ?? null,
    )
  const source = snapshot.assets.get(id)
  if (!source) return { ok: false, reason: 'not-found' }
  const discovered = new Map<string, Asset>([[id, source]])
  const pending: Asset[] = [source]
  while (pending.length) {
    const next = pending.pop()
    if (!next) break
    for (const ref of pintaAssetDependencyIds(next)) {
      if (discovered.has(ref)) continue
      if (discovered.size >= PINTA_DEPENDENCY_ASSET_LIMIT)
        return { ok: false, reason: 'needs-tileset' }
      const linked = snapshot.assets.get(ref)
      if (!linked) {
        // Existing flat-map exports deliberately skip unavailable optional layer sheets.
        if (
          !format.strictCapture &&
          next.kind === 'tilemap' &&
          ref !== next.tilesetId &&
          tilemapTilesetIds(next).includes(ref)
        )
          continue
        return { ok: false, reason: 'needs-tileset' }
      }
      discovered.set(ref, linked)
      pending.push(linked)
    }
  }
  const world =
    options.includeSceneMaps && (source.kind === 'tilemap' || format.strictCapture)
      ? sceneMapClosure<Asset>(source, [...snapshot.assets.values()])
      : null
  if (world) for (const asset of world.assets) discovered.set(asset.id, asset)
  const assets = [...discovered.values()].filter((a) => a.id !== id)
  const map = tilemapOfAsset(source)
  const find = map
    ? withMapResourceVersions(map, (ref) => snapshot.assets.get(ref) ?? null)
    : (ref: string) => snapshot.assets.get(ref) ?? null
  const base = map ? find(map.tilesetId) : null
  if (map && (!base || !isTilesetKind(base))) return { ok: false, reason: 'needs-tileset' }
  const tilesets =
    map && base && isTilesetKind(base)
      ? tilemapTilesetIds(map).flatMap((ref) => {
          const asset = find(ref)
          return asset && isTilesetKind(asset) && isCompatibleMapTileset(base, asset) ? [asset] : []
        })
      : []
  const hasExtraDependencies = [...discovered.values()].some((asset) =>
    pintaAssetDependencyIds(asset).some(
      (ref) =>
        asset.id !== id || source.kind !== 'tilemap' || !tilemapTilesetIds(source).includes(ref),
    ),
  )
  return {
    ok: true,
    source,
    ...(world || hasExtraDependencies ? { assets } : {}),
    tileset: tilesets[0] ?? null,
    tilesets,
  }
}

/** Carrega todos os assets saneados do perfil atual, do mais novo ao mais antigo. */
export function listAllAssets(): Promise<PintaAsset[]> {
  return defaultPersistence().listAllAssets()
}
