/**
 * Persistência LOCAL (IndexedDB via idb-keyval) — cada asset é um registro
 * independente (`pinta:asset:<id>`); não há documento de projeto. `Uint8Array`
 * passa no structured clone, então o modelo é gravado DIRETO (sem codec — o
 * RLE só existe no `.pinta.json` de export).
 *
 * Namespace por PERFIL: o host chama `setPintaStorageNamespace(viewerId)`
 * ANTES de montar o <PintaApp> (mesmo contrato do studio) — um DB por criança,
 * para irmãos no mesmo navegador não compartilharem a galeria. Vazio = store
 * default `sistema-zero-pinta`.
 */
import { createStore, del, get, getMany, keys, setMany, update } from 'idb-keyval'
import type { PaletteLibrary } from '../core/paletteLibrary'
import { mergePaletteLibraries, sanitizePaletteLibrary } from '../core/paletteLibrary'
import { perfSpan, perfSpanAsync } from '../core/perf'
import { type PintaAsset, sanitizePintaAsset } from '../core/project'
import { GalleryBackupSizeCache, MAX_BACKUP_FILE_BYTES } from '../export/projectJson'

const ASSET_KEY_PREFIX = 'pinta:asset:'
const assetKey = (id: string) => `${ASSET_KEY_PREFIX}${id}`
/**
 * Registro ÚNICO da biblioteca "Minhas paletas". FORA do prefixo `pinta:asset:`
 * DE PROPÓSITO: assim ele nunca entra em `listAllAssets`, no backup
 * (`galeria.pinta.json`) nem no orçamento de 32 MiB — travado por teste.
 */
const PALETTE_LIBRARY_KEY = 'pinta:palettes'

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

const dbNameFor = (namespace: string): string =>
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

// Uma cadeia FIFO por BANCO. Além de impedir interleaving entre save/rename/
// delete, permite gravar asset + mapas ligados numa única transação setMany.
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
        event: MessageEvent<{ ids?: unknown; paletteLibraryChanged?: unknown }>,
      ) => {
        const ids = event.data?.ids
        if (Array.isArray(ids)) {
          const cache = backupSizeCaches.get(storeHandle)
          if (cache) for (const id of ids) if (typeof id === 'string') cache.remove(id)
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

export function runSerializedWrite(
  storeHandle: StoreHandle,
  task: () => Promise<void>,
): Promise<void> {
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
export interface PintaPersistence {
  persistAsset(asset: PintaAsset): Promise<void>
  persistAssets(assets: readonly PintaAsset[]): Promise<void>
  deleteAsset(id: string): Promise<void>
  loadAssetById(id: string): Promise<PintaAsset | null>
  listAllAssets(): Promise<PintaAsset[]>
  /**
   * OPCIONAL: observar mudanças feitas por fora (ver `PintaPersistenceEvent`). O IndexedDB do
   * perfil emite mudanças da biblioteca entre stores/abas; o wrapper da nuvem do host acrescenta
   * os eventos da galeria — é o que permite abrir com o LOCAL e receber o que desce depois.
   */
  subscribe?(listener: (event: PintaPersistenceEvent) => void): () => void
  /**
   * OPCIONAIS: a biblioteca "Minhas paletas" do perfil (registro único, fora
   * da galeria/backup/orçamento). Armazenamento sem os métodos = a UI esconde
   * a biblioteca e só a paleta EMBUTIDA no asset funciona (o bloco de aula usa
   * isso de propósito — o desenho da aula é isolado da galeria pessoal).
   */
  loadPaletteLibrary?(): Promise<PaletteLibrary | null>
  /** Devolve o valor autoritativo gravado depois do merge transacional. */
  savePaletteLibrary?(library: PaletteLibrary): Promise<PaletteLibrary>
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
export class PintaStorageBudgetError extends Error {
  readonly projectedBytes: number

  constructor(projectedBytes: number) {
    super('A galeria ultrapassaria o limite portátil de 32 MiB.')
    this.name = 'PintaStorageBudgetError'
    this.projectedBytes = projectedBytes
  }
}

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
  const storeHandle = getStoreHandle(options.namespace)
  const dbName = dbNames.get(storeHandle) ?? ''
  const backupSizeCache = backupSizeCacheFor(storeHandle)
  const persistAssetsForStore = async (assets: readonly PintaAsset[]): Promise<void> => {
    if (assets.length === 0) return
    const unique = new Map(assets.map((asset) => [asset.id, asset]))
    const pairs = [...unique.values()].map(
      (asset) => [assetKey(asset.id), asset] as [IDBValidKey, PintaAsset],
    )
    const changed = [...unique.values()]
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
          projectedBytes: backupSizeCache.projectedBytes(changed),
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
        await perfSpanAsync('pinta:persist:write', () => setMany(pairs, storeHandle))
        // Só depois do write resolver: uma transação recusada deixa o disco e o inventário como
        // estavam.
        backupSizeCache.commit(changed)
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
    persistAsset: (asset) => persistAssetsForStore([asset]),
    persistAssets: persistAssetsForStore,
    deleteAsset: (id) =>
      runSerializedWrite(storeHandle, async () => {
        await del(assetKey(id), storeHandle)
        backupSizeCache.remove(id)
        notifyOtherTabs(storeHandle, dbNames.get(storeHandle) ?? '', [id])
      }),
    async loadAssetById(id) {
      const raw = await get<unknown>(assetKey(id), storeHandle)
      return safeSanitize(raw)
    },
    async listAllAssets() {
      const assets = await listAssetsForStore(storeHandle)
      assets.sort((a, b) => b.updatedAt - a.updatedAt)
      // A carga da galeria SEMEIA o inventário do orçamento (é a mesma leitura) e mede os
      // bytes em fatias ociosas: o custo de codificar a galeria inteira (RLE+JSON) sai do
      // primeiro traço da criança. Sem `requestIdleCallback` (SSR/testes) fica para a
      // primeira gravação, determinístico.
      backupSizeCache.seed(assets)
      scheduleWarmUp(backupSizeCache)
      return assets
    },
    subscribe(listener) {
      const listeners = listenersFor(storeHandle)
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async loadPaletteLibrary() {
      const raw = await get<unknown>(PALETTE_LIBRARY_KEY, storeHandle)
      return sanitizePaletteLibrary(raw)
    },
    async savePaletteLibrary(library) {
      // Ler-FUNDIR-gravar ATÔMICO: duas ABAS do mesmo perfil (o Estúdio abre o
      // Pinta em aba nova) escrevem o MESMO registro, e gravar cego era
      // last-write-wins — a paleta criada na outra aba sumia. ⚠️ O `update` do
      // idb-keyval faz get+put numa ÚNICA transação readwrite — e transação de
      // IndexedDB serializa ENTRE ABAS; um get e um set separados deixavam uma
      // janela de milissegundos em que a outra aba lia o valor velho (a FIFO do
      // runSerializedWrite só serializa DENTRO desta aba — full review 26/08).
      // O merge com lápides é a régua única da nuvem, então a exclusão continua
      // valendo (a lápide gravada aqui mata a cópia velha do disco).
      let saved: PaletteLibrary | undefined
      await runSerializedWrite(storeHandle, () =>
        update<unknown>(
          PALETTE_LIBRARY_KEY,
          (raw) => {
            const current = sanitizePaletteLibrary(raw)
            saved = current ? mergePaletteLibraries(current, library) : library
            return saved
          },
          storeHandle,
        ),
      )
      if (!saved) throw new Error('A transação não produziu uma biblioteca de paletas')
      notifyPaletteLibraryChanged(storeHandle, dbName)
      return saved
    },
  }
}

export function persistAsset(asset: PintaAsset): Promise<void> {
  return createPintaPersistence().persistAsset(asset)
}

/** Grava um conjunto relacionado atomicamente no IndexedDB do perfil atual. */
export function persistAssets(assets: readonly PintaAsset[]): Promise<void> {
  return createPintaPersistence().persistAssets(assets)
}

export function deleteAsset(id: string): Promise<void> {
  return createPintaPersistence().deleteAsset(id)
}

export function loadAssetById(id: string): Promise<PintaAsset | null> {
  return createPintaPersistence().loadAssetById(id)
}

/** Carrega todos os assets saneados do perfil atual, do mais novo ao mais antigo. */
export function listAllAssets(): Promise<PintaAsset[]> {
  return createPintaPersistence().listAllAssets()
}
