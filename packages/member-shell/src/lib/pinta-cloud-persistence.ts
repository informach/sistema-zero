/**
 * "Guardado na sua conta" para o PINTA: embrulha o `PintaPersistence` local (o
 * IndexedDB do perfil) num espelho que SOBE cada desenho depois que o autosave
 * confirma e DESCE o que falta na primeira carga da galeria. O pacote não muda:
 * a galeria e o editor já usam o MESMO `PintaPersistence` do contexto, então
 * embrulhar aqui alcança tudo (autosave, criar, renomear, duplicar, apagar,
 * importar, trazer uma foto).
 *
 * O que sobe: o `.pinta.json` de UM desenho (`assetToJson`, que PRESERVA id e
 * nome — o contrato do bloco de aula) com `{name, kind, updatedAt}`. O que
 * desce entra por `assetFromJson` + `sanitizePintaAsset` e é gravado no local
 * DIRETO (não pelo `galleryStore.importAssets`, que cria ids novos): o id é o
 * vínculo com a nuvem, e o `tilesetId` do mapa continua válido porque as peças
 * descem antes (`order`). A galeria exige nome ÚNICO (não há teto de quantidade —
 * decisão dela, 18/08): um nome já usado por OUTRO desenho local ganha sufixo (`nave-2`).
 *
 * Marcas de sincronia: avançam SÓ quando o commit confirma (`onUploaded`) ou quando
 * uma descida grava — e guardam a REVISÃO da nuvem, a `baseRevision` da próxima reserva.
 * Base vencida (outro aparelho subiu antes) → `onStale`: a versão da nuvem entra como
 * cópia ("<nome>-copia", id novo, sobe como desenho novo), a marca avança para a
 * revisão dela e o desenho daqui sobe de novo — os dois sobrevivem. Apagar grava uma
 * LÁPIDE local (o item não volta da nuvem só por estar lá; se o DELETE não chegou, é
 * reenviado na próxima carga).
 *
 * A reconciliação é single-flight: `listAllAssets` chamado duas vezes em voo (StrictMode,
 * remontagem rápida) usa a MESMA reconciliação — senão um conflito virava duas cópias
 * com o mesmo nome (o `takenNames` era por chamada).
 *
 * ⚠️ Descidas gravadas por aqui NÃO passam pelo `persistAssets` embrulhado (senão
 * o que acabou de descer subiria de novo).
 *
 * ⚠️⚠️ Formato mais novo que este código (`pintaCanReadFormatVersion`): o item NÃO desce, não
 * vira cópia e não é restaurado. Ler um desenho é passar pelo `sanitizePintaAsset`, que
 * reconstrói o registro e descarta o que não conhece; gravar esse resultado no aparelho e depois
 * subi-lo cortaria o desenho de verdade. São TRÊS os caminhos que baixam e leem (a reconciliação,
 * a base vencida na subida e o DELETE recusado) e os três param antes de ler. O item entra em
 * `getReadIssues` para a galeria pedir que a página seja atualizada.
 *
 * ⚠️⚠️ Registro local CORTADO por código mais antigo (18/11/2026, `PintaFormatMemory`): outra aba
 * deste aparelho, ainda com o Pinta antigo carregado, pode abrir um mapa do IndexedDB, reconstruir
 * o registro sem o que não conhece e salvar por cima com `updatedAt` novo. A subida DELA a nuvem
 * recusa, mas este código veria "local mudou" e subiria o registro cortado declarando a versão
 * atual. Por isso, ao lado da marca de sincronia, fica lembrado o carimbo `schema` que o desenho
 * tinha na última sincronia e qual gravação saiu DESTE código. Carimbo menor que o lembrado numa
 * gravação que não é nossa = corte: não sobe. A versão da nuvem volta no mesmo id e a daqui
 * fica como `-copia` (`resolveLostFormat`). Baixar o carimbo por aqui (a criança apagou o último
 * objeto com forma) é gravação nossa e sobe normalmente.
 */

import {
  PINTA_MAX_READ_FORMAT_VERSION,
  PINTA_PALETTE_LIBRARY_ITEM_ID,
  PINTA_PALETTE_LIBRARY_KIND,
  PINTA_PALETTE_LIBRARY_TOOL,
  PintaClientOutdatedError,
  pintaCanReadFormatVersion,
  pintaCanWriteNativeSchema,
  pintaWriteFormatVersion,
} from '@sistemazero/core/creations'
import type { PintaCausalLocalPort, PintaEditorWriteContext } from '@sistemazero/pinta'
import type { PaletteLibrary, PintaAsset } from '@sistemazero/pinta/assets'
import {
  assetFromJson,
  assetToJson,
  emptyPaletteLibrary,
  inheritPintaLocalOrigin,
  mergePaletteLibraries,
  PINTA_LIMITS,
  PINTA_MAX_SCHEMA,
  PintaLocalConflictError,
  paletteLibraryContentKey,
  pintaAssetSchema,
  pintaLocalRevisionOf,
  sanitizePaletteLibrary,
  sanitizePintaAsset,
} from '@sistemazero/pinta/assets'
import { conflictCopyName, uniqueCreationName } from './creation-names'
import type { CloudCreationSummary, CloudDownload, CreationsCloud } from './creations-cloud'
import { createStoredSyncedMarks, reconcileCreations, type SyncedMarks } from './creations-sync'
import { perfSpanAsync } from './perf'
import {
  type PintaCausalRemapBase,
  type PintaQueuedSlots,
  preparePintaCausalRemap,
  stagePintaCausalWrite,
} from './pinta-causal-authoring'
import { PintaCausalRequestError } from './pinta-causal-cloud'
import { discoverPintaCausalSnapshot, readPintaCausalJson } from './pinta-causal-pull'
import { flushPintaCausalOutbox } from './pinta-causal-queue'
import { syncPintaCausalAccount } from './pinta-causal-sync'

/** O que o wrapper avisa ao pacote (espelho estrutural de `PintaPersistenceEvent`). */
export type PintaCloudPersistenceEvent =
  | { type: 'sync-start' }
  | { type: 'changed' }
  | { type: 'palette-library-changed' }
  | { type: 'sync-end' }
  | { type: 'recovered'; names: string[] }

/**
 * Um desenho guardado na conta num formato mais novo que o deste navegador. Ele fica intocado na
 * nuvem; a galeria mostra o aviso e o botão de atualizar a página (espelho estrutural de
 * `PintaReadIssue` do pacote).
 */
export interface PintaCloudReadIssue {
  id: string
  name: string
  status: 'unsupported'
  version: number
}

/**
 * O que fica lembrado por desenho, ao lado da marca de sincronia, para perceber um registro local
 * que perdeu recursos (ver o cabeçalho). Só existe para desenho que já sincronizou COM carimbo.
 */
export interface PintaFormatMemoryEntry {
  /** Native revision whose bytes were actually synchronized; independent of wall clocks. */
  localRevision?: string
  /** O carimbo `schema` do desenho na última sincronia confirmada (subida ou descida). */
  schema: number
  /** Revisão confirmada à qual o floor pertence; não acompanha marcas de outra instância. */
  revision?: number
  /** Assinatura deste gravador: `writtenAt` antigo, sozinho, não autentica um documento. */
  signature?: { at: number; schema: number; revision: number; maxSchema: number; writerId: string }
  /** Campo legado mantido para leitores anteriores; sozinho não autentica a gravação. */
  writtenAt?: number
  /** Já foi visto cortado e ainda não foi resolvido: continua valendo mesmo se editarem por cima. */
  cut?: true
}

export interface PintaFormatMemory {
  get(id: string): PintaFormatMemoryEntry | undefined
  set(id: string, entry: PintaFormatMemoryEntry): void
  delete(id: string): void
}

/** Memória de formato só em memória (testes, storage indisponível). */
export function createMemoryPintaFormatMemory(): PintaFormatMemory {
  const entries = new Map<string, PintaFormatMemoryEntry>()
  return {
    get: (id) => entries.get(id),
    set: (id, entry) => {
      entries.set(id, entry)
    },
    delete: (id) => {
      entries.delete(id)
    },
  }
}

function isFormatMemoryEntry(value: unknown): value is PintaFormatMemoryEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.schema === 'number' &&
    Number.isFinite(entry.schema) &&
    (entry.localRevision === undefined ||
      (typeof entry.localRevision === 'string' && entry.localRevision.length > 0)) &&
    (entry.revision === undefined ||
      (Number.isInteger(entry.revision) && Number(entry.revision) >= 0)) &&
    (entry.signature === undefined || isFormatSignature(entry.signature)) &&
    (entry.writtenAt === undefined || typeof entry.writtenAt === 'number') &&
    (entry.cut === undefined || entry.cut === true)
  )
}

function isFormatSignature(
  value: unknown,
): value is NonNullable<PintaFormatMemoryEntry['signature']> {
  if (!value || typeof value !== 'object') return false
  const signature = value as Record<string, unknown>
  return (
    typeof signature.at === 'number' &&
    Number.isFinite(signature.at) &&
    typeof signature.writerId === 'string' &&
    signature.writerId.length > 0 &&
    [signature.schema, signature.revision, signature.maxSchema].every(
      (n) => Number.isInteger(n) && Number(n) >= 0,
    )
  )
}

/**
 * Memória de formato em `localStorage`, por perfil. Lê do storage a cada consulta (o registro é
 * pequeno: só desenhos com carimbo) para enxergar o que outra aba gravou. Storage indisponível
 * ou cheio = fica só em memória. Após reiniciar sem essa memória, o espelho confere o remoto
 * antes da primeira subida de um desenho cuja revisão já era conhecida.
 */
export function createStoredPintaFormatMemory(storageKey: string): PintaFormatMemory {
  let store: Storage | null = null
  try {
    store = typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    store = null
  }
  let fallback = new Map<string, PintaFormatMemoryEntry>()
  const read = (): Map<string, PintaFormatMemoryEntry> => {
    if (!store) return fallback
    try {
      const raw = store.getItem(storageKey)
      const parsed: unknown = raw ? JSON.parse(raw) : {}
      const next = new Map<string, PintaFormatMemoryEntry>()
      if (parsed && typeof parsed === 'object')
        for (const [id, value] of Object.entries(parsed as Record<string, unknown>))
          if (isFormatMemoryEntry(value)) next.set(id, value)
      fallback = next
      return next
    } catch {
      return fallback
    }
  }
  const write = (entries: Map<string, PintaFormatMemoryEntry>): void => {
    fallback = entries
    if (!store) return
    try {
      if (entries.size === 0) store.removeItem(storageKey)
      else store.setItem(storageKey, JSON.stringify(Object.fromEntries(entries)))
    } catch {
      // Não releia o valor antigo depois de uma escrita que falhou: ele apagaria a
      // proteção que acabamos de guardar. Esta instância segue só em memória.
      store = null
    }
  }
  return {
    get: (id) => read().get(id),
    set: (id, entry) => {
      const entries = read()
      entries.set(id, entry)
      write(entries)
    },
    delete: (id) => {
      const entries = read()
      if (entries.delete(id)) write(entries)
    },
  }
}

/**
 * O carimbo necessário ao conteúdo, sem confiar num campo `schema` antigo mantido pelo editor.
 * Zero = sem carimbo. A gravação nativa usa o mesmo contrato.
 */
function schemaStampOf(asset: PintaAsset): number {
  return pintaAssetSchema(asset)
}

/** A superfície do `PintaPersistence` do pacote (espelhada aqui para não importar o barril React). */
export interface PintaPersistenceLike {
  persistAsset(asset: PintaAsset, context?: PintaEditorWriteContext): Promise<void>
  persistAssets(assets: readonly PintaAsset[], context?: PintaEditorWriteContext): Promise<void>
  deleteAsset(id: string, base?: PintaAsset): Promise<void>
  loadAssetById(id: string): Promise<PintaAsset | null>
  listAllAssets(): Promise<PintaAsset[]>
  observesReferences?: true
  holdOpen?(id: string): Promise<() => void>
  prepareTileRemap?(source: PintaAsset): Promise<readonly PintaAsset[]>
  accountConfirmation?: Pick<CreationsCloud, 'confirm' | 'download'>
  subscribe?(listener: (event: PintaCloudPersistenceEvent) => void): () => void
  /** Biblioteca "Minhas paletas" (registro único; ver o pacote). O wrapper a espelha na nuvem. */
  loadPaletteLibrary?(): Promise<PaletteLibrary | null>
  savePaletteLibrary?(library: PaletteLibrary): Promise<PaletteLibrary>
  /** Reconcilia apenas o item de paletas, sem baixar a galeria inteira. */
  syncPaletteLibrary?(): Promise<void>
  /** Desenhos da conta que este código não sabe ler (ver `PintaCloudReadIssue`). */
  getReadIssues?(): PintaCloudReadIssue[]
  /** Desliga o que o wrapper escuta por fora (abrir/fechar do editor). O host chama ao trocar. */
  dispose?(): void
}

/**
 * A biblioteca viaja como UM item ESPECIAL no MESMO canal das creations (zero
 * migration/rota nova): itemId fixo, kind próprio. O members só o vê como mais
 * um item; quem o distingue é (a) a reconciliação daqui, que o tira da lista de
 * ASSETS antes do `reconcileCreations`, e (b) o `creationsUsageByUsers` do
 * admin, que filtra a identidade exata para não contar a biblioteca como "+1 desenho".
 */
export const PALETTE_LIBRARY_TOOL = PINTA_PALETTE_LIBRARY_TOOL
export const PALETTE_LIBRARY_ITEM_ID = PINTA_PALETTE_LIBRARY_ITEM_ID
export const PALETTE_LIBRARY_KIND = PINTA_PALETTE_LIBRARY_KIND

const TILESET_KINDS = new Set(['tileset', 'vector-tileset'])
/** Cada passe da descida trabalha até aqui; o resto volta em passes seguidos. */
const FIRST_LOAD_BUDGET_MS = 6000
/** Coalesce os avisos `changed` ao pacote (cada desenho que desce avisaria um). */
const CHANGED_DEBOUNCE_MS = 300
/** O que não coube (`deferred`) volta em passes seguidos, com esta folga, até este teto. */
const DEFERRED_PASS_DELAY_MS = 2000
const MAX_DEFERRED_PASSES = 5
/** Espera pelo índice da nuvem antes de mostrar só o local. */
const LIST_TIMEOUT_MS = 4000
/**
 * Intervalo mínimo entre reconciliações de uma mesma instância. A galeria RELÊ o local a cada
 * `changed`/`sync-end` (chamando `listAllAssets()` de novo): sem isto, o fim de uma
 * reconciliação disparava a seguinte — em laço, um `GET` da lista por volta. Uma por carga
 * cobre o que a reconciliação cobria antes; depois disso, só se a galeria pedir de novo bem
 * mais tarde (volta à aba depois de um tempo).
 */
const RECONCILE_MIN_INTERVAL_MS = 60_000
/** Teto da espera pela fila antes de uma reconciliação (um DELETE em voo sobe primeiro; igual ao Estúdio). */
const FLUSH_BEFORE_PULL_MS = 3_000
const MAX_NAME = PINTA_LIMITS.maxNameChars

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
    )
  })
}

/**
 * Nome único por sufixo numérico, SEMPRE dentro do teto do pacote (48): um nome acima
 * do teto seria descartado pelo sanitize na próxima leitura — a cópia sumiria da galeria.
 * (A régua vive em `creation-names.ts`, compartilhada com o Molda.)
 */
export function uniqueAssetName(base: string, taken: Set<string>): string {
  return uniqueCreationName(base, taken, MAX_NAME)
}

/** Nome da CÓPIA de conflito: `nave` → `nave-copia`, `nave-copia-2`… (kebab, como o pacote exige). */
export function copyName(name: string, taken: Set<string>): string {
  return conflictCopyName(name, taken, MAX_NAME)
}

export function createCloudMirroredPintaPersistence(options: {
  local: PintaPersistenceLike
  cloud: CreationsCloud
  causal?: {
    local: PintaCausalLocalPort
    holdOpen(id: string): Promise<() => void>
    withClosed(ids: readonly string[], apply: () => Promise<boolean>): Promise<boolean>
  }
  /** Perfil (namespace) — as marcas de sincronia são por perfil. */
  viewerId: string
  localNamespace?: string
  marks?: SyncedMarks
  /** O carimbo lembrado por desenho (ver `PintaFormatMemory`). Padrão: `localStorage` do perfil. */
  formatMemory?: PintaFormatMemory
  now?: () => number
  /**
   * O desenho está ABERTO no editor agora? (`isPintaAssetOpen` do pacote.) A descida NÃO
   * grava por baixo de um desenho aberto: o editor segura a versão antiga em memória e o
   * próximo autosave sobrescreveria o que desceu (e subiria por cima da versão do outro
   * aparelho). Pulado fica para a próxima reconciliação; se a criança editar antes, a subida
   * cai em base vencida e vira `-copia` (os dois sobrevivem).
   */
  isAssetOpen?: (id: string) => boolean
  /**
   * Observa abrir/fechar do editor (`subscribePintaAssetOpenState` do pacote): ao FECHAR um
   * desenho que a última reconciliação PULOU por estar aberto, reconcilia de novo na hora
   * (a versão da nuvem entra sem esperar a próxima carga).
   */
  subscribeAssetOpenState?: (
    listener: (event: { type: 'opened' | 'closed'; id: string }) => void,
  ) => () => void
  /** Só para testes: orçamento de cada passe, folga entre passes e intervalo entre reconciliações. */
  budgetMs?: number
  passDelayMs?: number
  reconcileMinIntervalMs?: number
}): PintaPersistenceLike {
  const { local, cloud } = options
  const causalLocal = options.causal?.local
  const causalCloud = cloud.pintaCausal
  const causalSession = new AbortController()
  let lastRemap: PintaCausalRemapBase | undefined
  let queuedSlots: PintaQueuedSlots | undefined
  let knownLegacy = false
  let causalTimer: ReturnType<typeof setTimeout> | null = null
  async function reportCausalQueue(error?: unknown): Promise<void> {
    if (!causalLocal || !cloud.reportPintaQueue || causalSession.signal.aborted) return
    const { sealed, pending } = await causalLocal.inspect()
    if (causalSession.signal.aborted) return
    const ids = new Set(pending.flatMap((unit) => unit.members.map((member) => member.itemId)))
    for (const member of sealed?.local.members ?? []) ids.add(member.itemId)
    if (!ids.size) cloud.reportPintaQueue([], 'saved')
    else if (typeof navigator !== 'undefined' && !navigator.onLine)
      cloud.reportPintaQueue([...ids], 'offline')
    else if (error)
      cloud.reportPintaQueue(
        [...ids],
        'error',
        error instanceof PintaCausalRequestError &&
          ['operation-expired', 'operation-aborted', 'not-found'].includes(error.reason)
          ? 'Seus desenhos estão neste aparelho. Uma nova versão da conta precisa ser conferida.'
          : 'Seus desenhos estão neste aparelho. Não consegui guardá-los na conta agora.',
      )
    else cloud.reportPintaQueue([...ids], 'saving')
  }
  async function probeCausal() {
    if (!causalLocal || !causalCloud) return null
    const snapshot = await discoverPintaCausalSnapshot({
      local: causalLocal,
      cloud: causalCloud,
      signal: causalSession.signal,
    })
    knownLegacy = snapshot === null
    return snapshot
  }
  async function prepareTileRemap(source: PintaAsset): Promise<readonly PintaAsset[]> {
    if (!causalLocal || !causalCloud) return local.listAllAssets()
    const state = await causalLocal.inspect()
    if (
      lastRemap?.source.id === source.id &&
      (state.pending.some((unit) => unit.opId === queuedSlots?.opId) ||
        (lastRemap.snapshot.epoch === (state.writeEpoch ?? state.epoch) &&
          pintaLocalRevisionOf(lastRemap.source) === pintaLocalRevisionOf(source)))
    )
      return lastRemap.assets
    const snapshot = await probeCausal()
    const catalog = await local.listAllAssets()
    if (!snapshot) {
      if (await cloud.peek(source.id))
        throw Error('Ainda não consegui conferir a conta para mudar a ordem das peças.')
      return catalog
    }
    lastRemap = await preparePintaCausalRemap({
      source,
      snapshot,
      local: catalog,
      localState: await causalLocal.inspect(),
      cloud: causalCloud,
      signal: causalSession.signal,
    })
    return lastRemap.assets
  }
  function wakeCausal(): void {
    if (!causalLocal || !causalCloud || causalSession.signal.aborted || causalTimer) return
    causalTimer = setTimeout(() => {
      causalTimer = null
      if (reconcileInFlight) {
        wakeCausal()
        return
      }
      void local
        .listAllAssets()
        .then(startReconcile)
        .catch(() => {})
    }, 1_500)
  }
  async function stageCausal(
    assets: readonly PintaAsset[],
    context?: PintaEditorWriteContext,
    deletion?: { id: string; before?: PintaAsset },
  ): Promise<boolean> {
    if (!causalLocal || !causalCloud) return false
    const state = await causalLocal.inspect()
    if (!state.protocolKnown && (knownLegacy || !(await probeCausal()))) return false
    const root = assets[0]
    const remap =
      root &&
      lastRemap?.source.id === root.id &&
      context?.layout &&
      (lastRemap.snapshot.epoch === (state.writeEpoch ?? state.epoch) ||
        state.pending.some((unit) => unit.opId === queuedSlots?.opId))
        ? lastRemap
        : undefined
    const sentId = root && state.confirmed.get(root.id)?.opId
    const undo =
      queuedSlots &&
      sentId === queuedSlots.opId &&
      context?.slotLineage?.before === queuedSlots.after &&
      context.slotLineage.after === queuedSlots.before
        ? sentId
        : undefined
    const staged = await stagePintaCausalWrite({
      local: causalLocal,
      catalog: await local.listAllAssets(),
      assets,
      context,
      deletion,
      remapBase: undo ? undefined : remap,
      queuedSlots,
      inverseOf: undo,
    })
    if (staged.slots) queuedSlots = staged.slots
    await reportCausalQueue().catch(() => {})
    wakeCausal()
    return true
  }
  const now = options.now ?? (() => Date.now())
  const loadLibrary = local.loadPaletteLibrary?.bind(local)
  const saveLibrary = local.savePaletteLibrary?.bind(local)
  const reconcileMinIntervalMs = options.reconcileMinIntervalMs ?? RECONCILE_MIN_INTERVAL_MS
  const budgetMs = options.budgetMs ?? FIRST_LOAD_BUDGET_MS
  const passDelayMs = options.passDelayMs ?? DEFERRED_PASS_DELAY_MS
  const marks =
    options.marks ??
    createStoredSyncedMarks(
      `sz:creations-synced:pinta:${options.localNamespace ?? options.viewerId}`,
    )
  const formatMemory =
    options.formatMemory ??
    createStoredPintaFormatMemory(
      `sz:creations-synced:pinta:${options.localNamespace ?? options.viewerId}:formato`,
    )

  /** Só mapas, peças e conjuntos levam carimbo; os outros tipos nem entram na memória. */
  const hasFormat = (kind: string): boolean => pintaWriteFormatVersion(kind) > 1
  const writerId = crypto.randomUUID()

  // A assinatura de um autosave não prova que o cache que a criança abriu estava inteiro.
  // Guarda a base observada antes dela enquanto falta o floor confirmado pela conta.
  const unverifiedBases = new Map<string, number>()
  const observedRevisions = new Map<string, number>()
  const verifiedLegacy = new Map<string, number>()
  const formatChecks = new Map<string, Promise<CloudDownload | undefined>>()

  function knownFormatFloor(id: string): boolean {
    const revision = marks.revision(id)
    const entry = formatMemory.get(id)
    if (entry && revision !== undefined && entry.revision === revision) {
      verifiedLegacy.delete(id)
      return true
    }
    return revision !== undefined && verifiedLegacy.get(id) === revision
  }

  function needsFormatBaseline(asset: PintaAsset): boolean {
    return (
      hasFormat(asset.kind) && (marks.revision(asset.id) ?? 0) > 0 && !knownFormatFloor(asset.id)
    )
  }

  function observeUnverifiedBase(asset: PintaAsset): void {
    if (hasFormat(asset.kind) && !observedRevisions.has(asset.id))
      observedRevisions.set(
        asset.id,
        formatMemory.get(asset.id)?.revision ?? marks.revision(asset.id) ?? 0,
      )
    if (!unverifiedBases.has(asset.id) && needsFormatBaseline(asset))
      unverifiedBases.set(asset.id, schemaStampOf(asset))
  }

  async function observeBeforeWrite(asset: PintaAsset): Promise<void> {
    if (!hasFormat(asset.kind)) return
    const entry = formatMemory.get(asset.id)
    const inspect = needsFormatBaseline(asset) || (entry && schemaStampOf(asset) < entry.schema)
    if (!inspect || unverifiedBases.has(asset.id)) return
    // Só lê o disco: a rede nunca entra no caminho do autosave. Se a base local não puder ser
    // lida, ela continua desconhecida; salvar a edição não pode autenticá-la como íntegra.
    const before = await local.loadAssetById(asset.id).catch(() => null)
    if (before) lostFormat(before) // Marca o cache cortado ANTES de autenticar a nova edição.
    if (!observedRevisions.has(asset.id))
      observedRevisions.set(asset.id, entry?.revision ?? marks.revision(asset.id) ?? 0)
    if (!needsFormatBaseline(asset) || unverifiedBases.has(asset.id)) return
    unverifiedBases.set(asset.id, before ? schemaStampOf(before) : 0)
  }

  async function verifyFormatBaseline(
    id: string,
    baseRevision: number,
  ): Promise<CloudDownload | undefined> {
    const existing = formatChecks.get(id)
    if (existing) return existing
    const check = (async () => {
      const downloaded = await cloud.download(id)
      if (downloaded && downloaded.summary.itemId !== id)
        throw new Error('Não foi possível conferir o desenho guardado na conta.')
      if (downloaded && noteUnreadable(downloaded.summary)) return undefined
      const remote =
        downloaded && !downloaded.summary.deletedAt
          ? sanitizePintaAsset(assetFromJson(downloaded.json).asset)
          : null
      if (downloaded && !downloaded.summary.deletedAt && (!remote || remote.id !== id))
        throw new Error('Não foi possível conferir o desenho guardado na conta.')
      const schema = remote ? schemaStampOf(remote) : 0
      const revision = downloaded?.summary.revision ?? baseRevision
      const entry = formatMemory.get(id)
      if (entry?.revision !== undefined && entry.revision > revision)
        throw new Error('O desenho mudou durante a conferência. Tente de novo.')
      const cut = remote && (entry?.cut || schema > (unverifiedBases.get(id) ?? 0))
      formatMemory.set(id, {
        schema,
        revision,
        ...(entry?.signature ? { signature: entry.signature } : {}),
        ...(entry?.localRevision ? { localRevision: entry.localRevision } : {}),
        writtenAt: entry?.writtenAt ?? remote?.updatedAt ?? marks.get(id),
        ...(cut ? { cut: true as const } : {}),
      })
      if (schema === 0) verifiedLegacy.set(id, revision)
      else verifiedLegacy.delete(id)
      unverifiedBases.delete(id)
      return remote && downloaded ? downloaded : undefined
    })()
    formatChecks.set(id, check)
    try {
      return await check
    } finally {
      if (formatChecks.get(id) === check) formatChecks.delete(id)
    }
  }

  /** A descida foi preservada: no próprio id ou na cópia de um conflito já resolvido. */
  function rememberDownloaded(asset: PintaAsset, revision: number, localVersion = asset): void {
    const schema = schemaStampOf(asset)
    unverifiedBases.delete(asset.id)
    observedRevisions.set(asset.id, revision)
    if (schema === 0 && hasFormat(asset.kind)) verifiedLegacy.set(asset.id, revision)
    else verifiedLegacy.delete(asset.id)
    const localRevision =
      assetToJson(asset) === assetToJson(localVersion)
        ? pintaLocalRevisionOf(localVersion)
        : undefined
    if (schema > 0 || localRevision)
      formatMemory.set(asset.id, {
        schema,
        revision,
        ...(localRevision ? { localRevision } : {}),
        writtenAt: localVersion.updatedAt,
        signature: {
          at: localVersion.updatedAt,
          schema: schemaStampOf(localVersion),
          revision,
          maxSchema: PINTA_MAX_SCHEMA,
          writerId,
        },
      })
    else formatMemory.delete(asset.id)
  }

  /**
   * Uma SUBIDA confirmou este floor. Conserva o instante/conteúdo da última gravação e só
   * confirma sua revisão causal quando ela pertence a esta instância, derivada do envio.
   */
  function rememberUploaded(
    id: string,
    schema: number,
    updatedAt: number,
    revision: number,
    baseRevision: number,
    localRevision: string | undefined,
  ): void {
    if (observedRevisions.get(id) === baseRevision) observedRevisions.set(id, revision)
    if (schema === 0) verifiedLegacy.set(id, revision)
    else verifiedLegacy.delete(id)
    const entry = formatMemory.get(id)
    const signature = entry?.signature
    const acknowledged =
      signature && signature.writerId === writerId && signature.revision === baseRevision
        ? { ...signature, revision }
        : signature
    if (entry || schema > 0 || localRevision)
      formatMemory.set(id, {
        schema,
        revision,
        ...(localRevision ? { localRevision } : {}),
        writtenAt: entry?.writtenAt ?? updatedAt,
        ...(acknowledged ? { signature: acknowledged } : {}),
        ...(entry?.cut ? { cut: true } : {}),
      })
  }

  /**
   * Este código vai gravar o desenho no aparelho: assina conteúdo, capacidade e origem. Feito
   * ANTES de gravar, para nenhuma leitura ver o registro novo sem a assinatura; se a gravação
   * falhar, a assinatura de um `updatedAt` que não está no disco não combina com nada.
   */
  function noteWrittenHere(asset: PintaAsset): void {
    if (!hasFormat(asset.kind)) return
    const entry = formatMemory.get(asset.id) ?? { schema: 0 }
    formatMemory.set(asset.id, {
      ...entry,
      writtenAt: asset.updatedAt,
      signature: {
        at: asset.updatedAt,
        schema: schemaStampOf(asset),
        revision:
          observedRevisions.get(asset.id) ?? entry.revision ?? marks.revision(asset.id) ?? 0,
        maxSchema: PINTA_MAX_SCHEMA,
        writerId,
      },
    })
  }

  /**
   * Carimbo menor que o floor só é legítimo com assinatura capaz de ler esse floor e vinculada
   * à mesma revisão. Uma vez visto, o corte fica marcado até ser resolvido: assinar uma nova
   * edição por cima do cache cortado não o conserta.
   */
  function signedFor(asset: PintaAsset, schema: number, revision: number | undefined): boolean {
    const signature = formatMemory.get(asset.id)?.signature
    return (
      !!signature &&
      signature.at === asset.updatedAt &&
      signature.schema === schemaStampOf(asset) &&
      signature.revision === revision &&
      signature.maxSchema >= schema
    )
  }

  function lostFormat(asset: PintaAsset): boolean {
    if (!hasFormat(asset.kind)) return false
    const entry = formatMemory.get(asset.id)
    if (!entry) return false
    if (entry.cut) return true
    const schema = schemaStampOf(asset)
    if (schema >= entry.schema || signedFor(asset, entry.schema, entry.revision)) return false
    formatMemory.set(asset.id, { ...entry, cut: true })
    return true
  }

  /** Carimbo do que cada envio em voo leu do disco, para lembrar na confirmação. */
  const sendingSchema = new Map<string, number>()
  const sendingBase = new Map<string, number>()

  /**
   * Quando o envio de cada desenho COMEÇOU (o produtor foi ler o disco), por id. A confirmação do
   * commit compara esse instante com o `at` da lápide: uma exclusão que nasceu DEPOIS de o envio
   * começar não pode ser desfeita pela confirmação de um upload que já estava em voo.
   */
  const sendingAt = new Map<string, number>()
  const sendingLocalRevision = new Map<string, string | undefined>()

  function hasLocalChanges(asset: PintaAsset, syncedAt = marks.get(asset.id)): boolean {
    if (asset.updatedAt !== syncedAt) return true
    const revision = pintaLocalRevisionOf(asset)
    // A pre-authority sync mark has no causal native base. Preserve it conservatively
    // once; only a confirmed download/upload can establish that base.
    return revision !== undefined && revision !== formatMemory.get(asset.id)?.localRevision
  }

  function enqueue(asset: PintaAsset): void {
    cloud.enqueueUpload(
      asset.id,
      async () => {
        // Fixa a base causal antes de qualquer await; marcas compartilhadas podem avançar.
        const entry = formatMemory.get(asset.id)
        const floorRevision = entry?.revision ?? marks.revision(asset.id) ?? 0
        const baseRevision = Math.min(floorRevision, entry?.signature?.revision ?? floorRevision)
        // O instante em que ESTE envio começa, ANTES de ler o disco: uma exclusão feita durante
        // a leitura (ou durante o upload) é posterior a ele e vence a confirmação.
        sendingAt.set(asset.id, now())
        // Sempre o estado MAIS RECENTE do disco (a fila pode rodar depois de mais edições).
        let current = await local.loadAssetById(asset.id)
        if (!current) {
          sendingAt.delete(asset.id)
          return null
        }
        // Nada mudou desde a última sincronia confirmada (a marca JÁ é este `updatedAt`): não
        // sobe — zero HTTP. É o que segura o editor, que persiste `[salvo, ...ligados]` e
        // reenfileirava peças/mapas intocados a cada autosave.
        if (!hasLocalChanges(current)) {
          sendingAt.delete(asset.id)
          return null
        }
        if (
          !pintaCanWriteNativeSchema(schemaStampOf(current), pintaWriteFormatVersion(current.kind))
        ) {
          sendingAt.delete(asset.id)
          throw new PintaClientOutdatedError()
        }
        // A conta guarda este desenho num formato que este código não lê: a cópia daqui é mais
        // velha por definição e não sobe por cima.
        if (readIssues.has(asset.id)) {
          sendingAt.delete(asset.id)
          return null
        }
        observeUnverifiedBase(current)
        let checkedDownload: CloudDownload | undefined
        if (unverifiedBases.has(asset.id)) {
          try {
            checkedDownload = await verifyFormatBaseline(asset.id, baseRevision)
          } catch (error) {
            sendingAt.delete(asset.id)
            throw error // A fila existente faz retry; nenhuma edição local depende da rede.
          }
          // A criança pode ter salvo/apagado enquanto a conta era consultada.
          current = await local.loadAssetById(asset.id)
          if (!current || readIssues.has(asset.id)) {
            sendingAt.delete(asset.id)
            return null
          }
        }
        // O registro perdeu recursos por uma gravação de código mais antigo (outra aba): não
        // sobe. A versão da conta volta e a daqui fica como cópia.
        if (lostFormat(current)) {
          sendingAt.delete(asset.id)
          void resolveLostFormat(asset.id, checkedDownload).catch(() => undefined)
          return null
        }
        const checkedFloor = formatMemory.get(asset.id)?.revision ?? verifiedLegacy.get(asset.id)
        if (
          hasFormat(current.kind) &&
          baseRevision > 0 &&
          (checkedFloor === undefined || checkedFloor < baseRevision)
        )
          throw new Error('O desenho mudou durante a conferência. Tente de novo.')
        sendingSchema.set(asset.id, schemaStampOf(current))
        sendingBase.set(asset.id, baseRevision)
        sendingLocalRevision.set(asset.id, pintaLocalRevisionOf(current))
        return {
          json: assetToJson(current),
          meta: {
            name: current.name,
            kind: current.kind,
            updatedAt: current.updatedAt,
            // A revisão que ESTE aparelho conhece (0 = nunca viu): a nuvem recusa base vencida.
            baseRevision,
            // Por TIPO, nunca pelo conteúdo (ver `pinta-format.ts` no core). Versão 1 não vai no
            // corpo: é o padrão do servidor, e o pedido fica igual ao de antes.
            ...(pintaWriteFormatVersion(current.kind) > 1
              ? { formatVersion: pintaWriteFormatVersion(current.kind) }
              : {}),
          },
        }
      },
      // A marca avança SÓ com o commit confirmado, com o `updatedAt` do que subiu.
      ({ itemId, updatedAt, revision }) => {
        const startedAt = sendingAt.get(itemId) ?? Number.POSITIVE_INFINITY
        sendingAt.delete(itemId)
        marks.set(itemId, updatedAt, revision)
        const sentSchema = sendingSchema.get(itemId)
        sendingSchema.delete(itemId)
        const baseRevision = sendingBase.get(itemId) ?? 0
        sendingBase.delete(itemId)
        if (sentSchema !== undefined)
          rememberUploaded(
            itemId,
            sentSchema,
            updatedAt,
            revision,
            baseRevision,
            sendingLocalRevision.get(itemId),
          )
        sendingLocalRevision.delete(itemId)
        // A criança apagou o desenho com este upload EM VOO (a lápide nasceu depois de o envio
        // começar)? Então a exclusão manda: a lápide FICA e passa a conhecer a revisão que o
        // commit acabou de confirmar, a base que o DELETE precisa levar. Limpar a lápide aqui
        // deixava o DELETE pendente sem ela e a próxima reconciliação trazia o desenho de volta;
        // mantê-la com a revisão velha fazia a reconciliação ler a revisão nova como "editado em
        // outro aparelho" e restaurar o que a criança apagou. A fila costuma segurar esta
        // confirmação quando o DELETE chega em voo, mas o adaptador não depende disso.
        const tombstone = marks.tombstone(itemId)
        if (tombstone && !tombstone.sent && tombstone.at >= startedAt) {
          marks.setTombstone(itemId, { ...tombstone, revision })
          return
        }
        // Apagou e DEPOIS salvou de novo o mesmo id (o id voltou): a lápide não vale mais.
        marks.clearTombstone(itemId)
      },
      ({ itemId }) => resolveStale(itemId),
    )
  }

  /**
   * Base vencida: outro aparelho subiu este desenho depois da última vez que este viu a
   * nuvem. A versão da nuvem entra como CÓPIA (id novo, "<nome>-copia"), a marca passa a
   * conhecer a revisão dela e o desenho daqui sobe de novo — nada se perde. Nuvem sem o
   * item (apagado lá) → sobe direto (a reserva aceita qualquer base numa linha apagada).
   */
  async function resolveStale(id: string): Promise<void> {
    const downloaded = await cloud.download(id)
    // Outro aparelho subiu este desenho num formato que este código não lê. Não vira cópia (a
    // cópia seria o desenho cortado) e não sobe de novo: a nuvem recusaria, e é o certo.
    if (downloaded && noteUnreadable(downloaded.summary)) return
    if (downloaded) {
      const parsed = assetFromJson(downloaded.json)
      const remote = parsed.asset ? sanitizePintaAsset(parsed.asset) : null
      const mine = await local.loadAssetById(id)
      // A versão da nuvem É a deste aparelho (mesmo `updatedAt`: outra aba deste perfil subiu
      // antes de as marcas se encontrarem): só avança a marca — cópia aqui seria uma duplicata.
      if (
        remote &&
        mine &&
        remote.updatedAt === mine.updatedAt &&
        (!hasFormat(mine.kind) || assetToJson(remote) === assetToJson(mine))
      ) {
        marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
        rememberDownloaded(remote, downloaded.summary.revision)
        return
      }
      // O registro daqui foi cortado por código mais antigo: não é um conflito de duas edições
      // boas. A versão da conta volta no mesmo id (a daqui fica como cópia) e nada sobe por cima.
      if (
        remote &&
        mine &&
        (lostFormat(mine) ||
          (hasFormat(mine.kind) &&
            schemaStampOf(remote) > schemaStampOf(mine) &&
            !signedFor(mine, schemaStampOf(remote), downloaded.summary.revision)))
      ) {
        await resolveLostFormat(id, downloaded)
        return
      }
      if (remote) {
        const taken = new Set((await local.listAllAssets()).map((a) => a.name))
        const copy: PintaAsset = {
          ...remote,
          id: crypto.randomUUID(),
          name: copyName(remote.name, taken),
          updatedAt: now(),
        }
        await local.persistAssets([copy])
        emitChangedSoon()
        enqueue(copy)
        // Só rebaseia depois de guardar a edição remota. O formato dela foi conservado e
        // a próxima CAS pode usar essa revisão sem repetir o mesmo conflito indefinidamente.
        const current = await local.loadAssetById(id)
        if (
          current &&
          (schemaStampOf(current) >= schemaStampOf(remote) ||
            signedFor(current, schemaStampOf(remote), downloaded.summary.revision))
        )
          rememberDownloaded(remote, downloaded.summary.revision, current)
      }
      marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
    }
    const current = await local.loadAssetById(id)
    if (current) enqueue(current)
  }

  /**
   * O registro local perdeu recursos (`lostFormat`). Tratado como conflito em que a conta vence:
   * a versão da nuvem volta NO MESMO id e o registro daqui fica como `-copia` (id novo, sobe como
   * desenho novo), porque a outra aba pode ter pintado algo nele além de cortar. Nada sobe por
   * cima do item original.
   *
   * Não resolve agora, e tenta de novo na próxima subida ou reconciliação, quando: o desenho
   * está aberto no editor (não grava por baixo), a nuvem não respondeu com algo legível, ou a
   * conta guarda um formato que este código não lê. Nuvem SEM o item: não há versão inteira para
   * proteger; o que há aqui sobe.
   */
  async function resolveLostFormat(id: string, checkedDownload?: CloudDownload): Promise<void> {
    // Aberto no editor: nem baixa (cada autosave passaria por aqui). Fica para quando fechar.
    if (options.isAssetOpen?.(id)) {
      skippedOpen.add(id)
      return
    }
    const downloaded = checkedDownload ?? (await cloud.download(id))
    if (!downloaded || downloaded.summary.deletedAt) {
      formatMemory.delete(id)
      const current = await local.loadAssetById(id)
      if (current) enqueue(current)
      return
    }
    if (noteUnreadable(downloaded.summary)) return
    const parsed = assetFromJson(downloaded.json)
    const remote = parsed.asset ? sanitizePintaAsset(parsed.asset) : null
    if (!remote || remote.id !== id) return
    // Abriu o editor enquanto a nuvem respondia: não grava por baixo.
    if (options.isAssetOpen?.(id)) {
      skippedOpen.add(id)
      return
    }
    const mine = await local.loadAssetById(id)
    const others = (await local.listAllAssets()).filter((asset) => asset.id !== id)
    const taken = new Set(others.map((asset) => asset.name))
    const restored = taken.has(remote.name)
      ? { ...remote, name: uniqueAssetName(remote.name, taken) }
      : remote
    taken.add(restored.name)
    const copy: PintaAsset | null =
      mine && (mine.updatedAt !== remote.updatedAt || assetToJson(mine) !== assetToJson(remote))
        ? { ...mine, id: crypto.randomUUID(), name: copyName(mine.name, taken), updatedAt: now() }
        : null
    // Uma gravação só: ou entram a versão da conta e a cópia, ou nada muda.
    const replacement = inheritPintaLocalOrigin(restored, mine)
    await local.persistAssets(copy ? [replacement, copy] : [replacement])
    marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
    rememberDownloaded(replacement, downloaded.summary.revision)
    emitChangedSoon()
    if (copy) enqueue(copy)
    console.warn(
      '[pinta-nuvem] registro local cortado por código antigo: a versão da conta voltou',
      {
        itemId: id,
        copia: copy?.id ?? null,
      },
    )
  }

  /**
   * A nuvem recusou o DELETE (409: a base enviada não é a revisão corrente). Decidido por
   * REVISÃO, nunca por relógio (a régua do reconcile em `creations-sync.ts`): alguém EDITOU
   * depois (revisão corrente MAIOR que a conhecida pela lápide) → uma exclusão velha não vence
   * uma edição remota, a revisão corrente volta no mesmo id e a lápide só sai DEPOIS de gravar;
   * senão a exclusão é NOSSA e só a base estava errada → reenvia UMA vez com a revisão
   * autoritativa. ⚠️ Antes de 06/09 todo DELETE saía com base 0, caía aqui e o desenho
   * "voltava". Sem `currentRevision` (serviço antigo) a revisão vem do próprio download; nuvem
   * sem o item = lápide enviada.
   */
  async function resolveStaleRemove(
    id: string,
    info: { currentRevision?: number | undefined; retried?: boolean },
  ): Promise<void> {
    const tombstone = marks.tombstone(id)
    if (!tombstone) return
    let current = info.currentRevision
    let downloaded: Awaited<ReturnType<typeof cloud.download>> = null
    if (current === undefined) {
      downloaded = await cloud.download(id)
      if (!downloaded) {
        marks.setTombstone(id, { ...tombstone, sent: true })
        return
      }
      current = downloaded.summary.revision
    }
    const editedElsewhere = typeof tombstone.revision === 'number' && current > tombstone.revision
    if (!editedElsewhere && !info.retried) {
      marks.setTombstone(id, { ...tombstone, revision: current })
      cloud.enqueueRemove(
        id,
        current,
        ({ revision }) => marks.setTombstone(id, { at: tombstone.at, sent: true, revision }),
        ({ itemId, currentRevision }) =>
          resolveStaleRemove(itemId, { currentRevision, retried: true }),
      )
      return
    }
    downloaded ??= await cloud.download(id)
    if (!downloaded) {
      marks.setTombstone(id, { ...tombstone, sent: true })
      return
    }
    // Editado em outro aparelho num formato mais novo: restaurar aqui gravaria o desenho cortado.
    // A lápide fica; a exclusão não vence a edição e o desenho segue inteiro na conta.
    if (noteUnreadable(downloaded.summary)) return
    // ABERTO no editor agora? Não grava por baixo: o editor segura a versão antiga em memória e
    // o próximo autosave sobrescreveria o restauro. A lápide fica como está e a próxima
    // reconciliação, já com o desenho fechado, decide de novo.
    if (options.isAssetOpen?.(id)) return
    const parsed = assetFromJson(downloaded.json)
    const remote = parsed.asset ? sanitizePintaAsset(parsed.asset) : null
    if (!remote || remote.id !== id) return
    const taken = new Set(
      (await local.listAllAssets()).filter((asset) => asset.id !== id).map((asset) => asset.name),
    )
    const restored = taken.has(remote.name)
      ? { ...remote, name: uniqueAssetName(remote.name, taken) }
      : remote
    await local.persistAssets([restored])
    marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
    rememberDownloaded(restored, downloaded.summary.revision)
    marks.clearTombstone(id)
    emitChangedSoon()
    console.warn('[pinta-nuvem] exclusão desfeita: o desenho mudou em outro aparelho', {
      itemId: id,
    })
  }

  /** Sobe a biblioteca "Minhas paletas" (item especial) quando o registro local mudou. */
  function enqueuePaletteUpload(): void {
    if (!loadLibrary) return
    cloud.enqueueUpload(
      PALETTE_LIBRARY_ITEM_ID,
      async () => {
        const library = await loadLibrary()
        if (!library) return null
        if (marks.get(PALETTE_LIBRARY_ITEM_ID) === library.updatedAt) return null
        return {
          json: JSON.stringify(library),
          meta: {
            name: 'Minhas paletas',
            kind: PALETTE_LIBRARY_KIND,
            updatedAt: library.updatedAt,
            baseRevision: marks.revision(PALETTE_LIBRARY_ITEM_ID) ?? 0,
          },
        }
      },
      ({ itemId, updatedAt, revision }) => {
        marks.set(itemId, updatedAt, revision)
        marks.clearTombstone(itemId)
      },
      () => resolvePaletteConflict(),
    )
  }

  /**
   * Desce a biblioteca da nuvem e FUNDE com a local (paletas por id +
   * updatedAt, LÁPIDES por id + removedAt — `mergePaletteLibraries`, a regra
   * ÚNICA; é a lápide que faz uma EXCLUSÃO valer aqui em vez de a cópia local
   * ressuscitar). Grava o resultado e, quando o CONTEÚDO difere do remoto,
   * sobe de novo. Serve a reconciliação (revisão que esta marca não conhece)
   * E a base vencida na subida (outro aparelho subiu antes).
   *
   * ⚠️ A comparação usa `paletteLibraryContentKey` (insensível à ORDEM dos
   * arrays): comparar os arrays crus já fez aparelhos re-subirem conteúdo
   * equivalente em ordens diferentes.
   */
  async function resolvePaletteConflict(): Promise<void> {
    if (!saveLibrary) return
    const downloaded = await cloud.download(PALETTE_LIBRARY_ITEM_ID)
    if (downloaded) {
      let remote: PaletteLibrary | null = null
      try {
        remote = sanitizePaletteLibrary(JSON.parse(downloaded.json))
      } catch {
        remote = null
      }
      if (remote) {
        const base = (await loadLibrary?.()) ?? emptyPaletteLibrary()
        let merged = mergePaletteLibraries(base, remote)
        // A UI pode ter salvo ENTRE a leitura e a gravação (o registro é um
        // documento só): relê e re-funde para não sobrescrever a escrita dela.
        const latest = (await loadLibrary?.()) ?? emptyPaletteLibrary()
        if (latest.updatedAt !== base.updatedAt) {
          merged = mergePaletteLibraries(latest, remote)
        }
        const changedVsRemote =
          paletteLibraryContentKey(merged) !== paletteLibraryContentKey(remote)
        // Merge que difere do remoto é uma "edição" local: carimbo novo para o
        // produtor ver que há o que subir (a marca fica na revisão da nuvem).
        let saved = await saveLibrary(
          changedVsRemote
            ? { ...merged, updatedAt: Math.max(now(), merged.updatedAt + 1) }
            : merged,
        )
        // O save local ainda pode ter fundido uma escrita atômica de outra aba
        // depois da releitura acima. Decide a re-subida pelo valor realmente
        // gravado, e garante um carimbo posterior ao remoto se essa diferença
        // só apareceu dentro da transação.
        let savedDiffersFromRemote =
          paletteLibraryContentKey(saved) !== paletteLibraryContentKey(remote)
        if (
          savedDiffersFromRemote &&
          !changedVsRemote &&
          saved.updatedAt <= downloaded.summary.itemUpdatedAt
        ) {
          saved = await saveLibrary({
            ...saved,
            updatedAt: Math.max(now(), saved.updatedAt + 1, downloaded.summary.itemUpdatedAt + 1),
          })
          savedDiffersFromRemote =
            paletteLibraryContentKey(saved) !== paletteLibraryContentKey(remote)
        }
        emit({ type: 'palette-library-changed' })
        marks.set(
          PALETTE_LIBRARY_ITEM_ID,
          downloaded.summary.itemUpdatedAt,
          downloaded.summary.revision,
        )
        if (savedDiffersFromRemote) enqueuePaletteUpload()
        return
      }
      marks.set(
        PALETTE_LIBRARY_ITEM_ID,
        downloaded.summary.itemUpdatedAt,
        downloaded.summary.revision,
      )
    }
    // Nuvem sem o item (ou ilegível): o que há aqui sobe.
    enqueuePaletteUpload()
  }

  function enqueueRemove(id: string): void {
    const at = now()
    // A revisão que ESTE aparelho conhece é a base do DELETE (a nuvem recusa base vencida).
    // Lida ANTES de a marca ser apagada: era o defeito de 06/09 (base 0 → 409 → restauro).
    const revision = marks.revision(id) ?? null
    marks.setTombstone(id, { at, sent: false, revision })
    cloud.enqueueRemove(
      id,
      revision ?? 0,
      ({ revision: confirmedRevision }) =>
        marks.setTombstone(id, { at, sent: true, revision: confirmedRevision }),
      ({ itemId, currentRevision }) => resolveStaleRemove(itemId, { currentRevision }),
    )
  }

  /** Desenhos da conta em formato mais novo que este código, por id. */
  const readIssues = new Map<string, PintaCloudReadIssue>()
  /** Anota o item se ele não pode ser lido aqui. Verdadeiro = pare, não leia o conteúdo. */
  function noteUnreadable(summary: CloudCreationSummary): boolean {
    if (summary.deletedAt || pintaCanReadFormatVersion(summary.formatVersion)) return false
    const known = readIssues.get(summary.itemId)
    readIssues.set(summary.itemId, {
      id: summary.itemId,
      name: summary.name.slice(0, MAX_NAME),
      status: 'unsupported',
      version: summary.formatVersion ?? 1,
    })
    if (!known) emitChangedSoon()
    return true
  }

  let reconcileInFlight: Promise<PintaAsset[]> | null = null
  /** Quando a última reconciliação terminou (`-Infinity` = nunca). */
  let lastReconcileEndedAt = Number.NEGATIVE_INFINITY
  /** Ids que a última reconciliação PULOU por estarem abertos no editor. */
  const skippedOpen = new Set<string>()
  const listeners = new Set<(event: PintaCloudPersistenceEvent) => void>()
  const emit = (event: PintaCloudPersistenceEvent) => {
    for (const listener of listeners) listener(event)
  }
  const unsubscribeLocal = local.subscribe?.((event) => {
    if (event.type === 'recovered' || event.type === 'changed') emit(event)
  })
  // `changed` coalescido: cada desenho que desce avisaria uma vez; a galeria relê em lote.
  let changedTimer: ReturnType<typeof setTimeout> | null = null
  const emitChangedSoon = () => {
    if (changedTimer) return
    changedTimer = setTimeout(() => {
      changedTimer = null
      emit({ type: 'changed' })
    }, CHANGED_DEBOUNCE_MS)
  }
  const flushChanged = () => {
    if (changedTimer) {
      clearTimeout(changedTimer)
      changedTimer = null
      emit({ type: 'changed' })
    }
  }

  async function reconcile(localAssets: PintaAsset[]): Promise<PintaAsset[]> {
    if (!cloud.supported) return localAssets
    if (causalLocal && causalCloud && options.causal) {
      const started = now()
      const result = await syncPintaCausalAccount({
        local: causalLocal,
        cloud: causalCloud,
        reader: PINTA_MAX_READ_FORMAT_VERSION,
        signal: causalSession.signal,
        withClosed: options.causal.withClosed,
        isOpen: (id) => options.isAssetOpen?.(id) ?? false,
        canContinue: () => now() - started < budgetMs,
      })
      knownLegacy = result.mode === 'legacy'
      if (result.mode === 'causal') return local.listAllAssets()
    }
    // O que está na fila (um DELETE, o último autosave) sobe ANTES de a lista da nuvem ser lida:
    // senão a descida via o item apagado ainda vivo lá e reenviava a remoção à toa (ou, com a
    // revisão nova já confirmada, trazia o item de volta). Com teto, para a galeria não ficar
    // presa numa fila offline; a fila falhando não bloqueia a descida.
    await cloud.flush({ timeoutMs: FLUSH_BEFORE_PULL_MS }).catch(() => undefined)
    // O que não coube no orçamento (`deferred`) volta em passes seguidos, com folga.
    let current = localAssets
    for (let pass = 0; pass < MAX_DEFERRED_PASSES; pass += 1) {
      const deferred = await reconcilePass(current)
      if (deferred === 0) break
      await new Promise((resolve) => setTimeout(resolve, passDelayMs))
      current = await local.listAllAssets()
    }
    return local.listAllAssets()
  }

  async function reconcilePaletteSummary(
    paletteSummary: CloudCreationSummary | null,
  ): Promise<void> {
    if (paletteSummary) {
      if (marks.revision(PALETTE_LIBRARY_ITEM_ID) !== paletteSummary.revision) {
        try {
          await resolvePaletteConflict()
        } catch {
          // A falha da biblioteca não bloqueia a galeria.
        }
      }
    } else if (loadLibrary) {
      void loadLibrary()
        .then((library) => {
          if (library && library.palettes.length > 0) enqueuePaletteUpload()
        })
        .catch(() => {})
    }
  }

  /** Um passe da reconciliação; devolve quantos itens ficaram de fora por tempo. */
  async function reconcilePass(localAssets: PintaAsset[]): Promise<number> {
    const remote = await withTimeout(cloud.list(), LIST_TIMEOUT_MS)
    if (!remote) return 0
    skippedOpen.clear()
    // O item ESPECIAL da biblioteca sai da lista de ASSETS antes do reconcile
    // (o sanitize o descartaria e ele viraria "desenho corrompido" no relatório).
    const paletteSummary = remote.find((s) => s.itemId === PALETTE_LIBRARY_ITEM_ID) ?? null
    const assetSummaries = paletteSummary
      ? remote.filter((s) => s.itemId !== PALETTE_LIBRARY_ITEM_ID)
      : remote
    await reconcilePaletteSummary(paletteSummary)
    // Refeito a cada passe: um item que saiu da nuvem (ou uma página já atualizada) limpa o aviso.
    const before = readIssues.size
    readIssues.clear()
    for (const summary of assetSummaries) noteUnreadable(summary)
    if (before !== readIssues.size) emitChangedSoon()
    const takenNames = new Set(localAssets.map((a) => a.name))
    const nameOwner = new Map(localAssets.map((a) => [a.name, a.id]))
    const report = await reconcileCreations<PintaAsset, PintaAsset>({
      // Nenhum dos dois lados de um item ilegível entra na reconciliação por carimbo de tempo:
      // carimbos iguais não podem dar por sincronizado um desenho que este código não lê, e a
      // cópia local (se houver) não pode subir por cima dele.
      local: localAssets.filter((asset) => !readIssues.has(asset.id)),
      cloud: assetSummaries.filter((summary) => !readIssues.has(summary.itemId)),
      marks,
      hasLocalChanges: (asset, at) =>
        pintaLocalRevisionOf(asset) ? hasLocalChanges(asset, at) : undefined,
      now,
      budgetMs,
      // Peças ANTES dos mapas: o `tilesetId` do mapa aponta para elas.
      order: (a, b) => Number(TILESET_KINDS.has(b.kind)) - Number(TILESET_KINDS.has(a.kind)),
      // Aberto no editor: nem cópia nem gravação (ver `isAssetOpen`); anota para trazer ao fechar.
      isBusy: (itemId) => {
        const busy = options.isAssetOpen?.(itemId) ?? false
        if (busy) skippedOpen.add(itemId)
        return busy
      },
      // Mudou no disco depois do retrato desta reconciliação (autosave/renomear no meio)?
      // Não grava por cima: a subida dessa edição resolve (base vencida → cópia).
      localUpdatedAt: async (itemId) => (await local.loadAssetById(itemId))?.updatedAt ?? null,
      fetch: async (summary: CloudCreationSummary, signal: AbortSignal) => {
        const downloaded = await cloud.download(summary.itemId, { signal })
        // O arquivo pode ter mudado entre a listagem e o download.
        if (!downloaded || noteUnreadable(downloaded.summary)) return null
        if (downloaded.summary.revision !== summary.revision) return null
        const parsed = assetFromJson(downloaded.json)
        const asset = parsed.asset ? sanitizePintaAsset(parsed.asset) : null
        if (!asset || asset.id !== summary.itemId) return null
        return asset
      },
      apply: async (summary, asset) => {
        // Nome já usado por OUTRO desenho local: sufixo (a galeria exige nome único).
        const owner = nameOwner.get(asset.name)
        const named =
          owner && owner !== asset.id
            ? { ...asset, name: uniqueAssetName(asset.name, takenNames) }
            : asset
        // Reserva o nome ANTES do primeiro `await`: os workers da reconciliação rodam em
        // paralelo e dois assets homônimos não podem escolher o mesmo sufixo enquanto a
        // primeira persistência ainda está em voo.
        takenNames.add(named.name)
        nameOwner.set(named.name, named.id)
        // Grava DIRETO no local (id preservado), fora do embrulho: não é edição.
        const replacement = inheritPintaLocalOrigin(
          named,
          localAssets.find((a) => a.id === named.id),
        )
        await local.persistAssets([replacement])
        // O local ficou igual à conta: é este o carimbo a comparar daqui em diante.
        rememberDownloaded(replacement, summary.revision)
        emitChangedSoon()
        return true
      },
      keepLocalCopy: async (item) => {
        const copy: PintaAsset = {
          ...item,
          id: crypto.randomUUID(),
          name: copyName(item.name, takenNames),
          updatedAt: now(),
        }
        takenNames.add(copy.name)
        nameOwner.set(copy.name, copy.id)
        await local.persistAssets([copy])
        emitChangedSoon()
        return {
          // A cópia só entra na fila quando a substituição do original foi confirmada.
          commit: () => enqueue(copy),
          rollback: async () => {
            await local.deleteAsset(copy.id)
            if (nameOwner.get(copy.name) === copy.id) {
              nameOwner.delete(copy.name)
              takenNames.delete(copy.name)
            }
            emitChangedSoon()
          },
        }
      },
      deleteLocal: async (itemId) => {
        const item = localAssets.find((asset) => asset.id === itemId)
        await local.deleteAsset(itemId, item)
        formatMemory.delete(itemId)
        if (item && nameOwner.get(item.name) === itemId) {
          nameOwner.delete(item.name)
          takenNames.delete(item.name)
        }
        emitChangedSoon()
        return true
      },
      push: (item) => enqueue(item),
      remove: (itemId, cloudRevision) => {
        // A base é a revisão que a nuvem acabou de listar: a única que o servidor aceita.
        cloud.enqueueRemove(
          itemId,
          cloudRevision,
          ({ revision }) => {
            const tombstone = marks.tombstone(itemId)
            if (tombstone) marks.setTombstone(itemId, { ...tombstone, sent: true, revision })
          },
          ({ itemId: staleId, currentRevision }) =>
            resolveStaleRemove(staleId, { currentRevision }),
        )
      },
    })
    return report.deferred
  }

  /** Dispara uma reconciliação (single-flight) e avisa o pacote do começo e do fim. */
  function startReconcile(localAssets: PintaAsset[]): void {
    if (!cloud.supported || reconcileInFlight || causalSession.signal.aborted) return
    emit({ type: 'sync-start' })
    reconcileInFlight = perfSpanAsync('kids:pinta:reconcile', () => reconcile(localAssets))
      .then(async (assets) => {
        await reportCausalQueue().catch(() => {})
        return assets
      })
      .catch(async (error) => {
        await reportCausalQueue(error).catch(() => {})
        return localAssets
      })
      .finally(() => {
        lastReconcileEndedAt = now()
        reconcileInFlight = null
        flushChanged()
        emit({ type: 'sync-end' })
      })
  }

  // Fechou um desenho que a descida PULOU por estar aberto: traz a versão da nuvem agora
  // (fora do intervalo mínimo — é um pedido pontual, não uma releitura em laço).
  let unsubscribeOpenState: (() => void) | null =
    options.subscribeAssetOpenState?.((event) => {
      if (event.type !== 'closed') return
      if (lastRemap?.source.id === event.id) lastRemap = undefined
      if (causalLocal && causalCloud) wakeCausal()
      if (!skippedOpen.has(event.id)) return
      skippedOpen.delete(event.id)
      void local.listAllAssets().then((localAssets) => startReconcile(localAssets))
    }) ?? null

  if (causalLocal && causalCloud && typeof window !== 'undefined')
    window.addEventListener('online', wakeCausal)
  const accountConfirmation: PintaPersistenceLike['accountConfirmation'] =
    causalLocal && causalCloud
      ? {
          async confirm(id, options) {
            if (!(await causalLocal.inspect()).protocolKnown && !(await probeCausal()))
              return cloud.confirm(id, options)
            const signal = AbortSignal.any([
              causalSession.signal,
              AbortSignal.timeout(options?.timeoutMs ?? 15_000),
            ])
            await flushPintaCausalOutbox({
              local: causalLocal,
              cloud: causalCloud,
              reader: PINTA_MAX_READ_FORMAT_VERSION,
              signal,
            })
            const { pending, sealed, confirmed } = await causalLocal.inspect()
            if (
              !confirmed.get(id)?.sha256 ||
              pending.some((unit) => unit.members.some((member) => member.itemId === id)) ||
              sealed?.local.members.some((member) => member.itemId === id)
            )
              throw Error('A versão do desenho ainda não foi confirmada na conta')
          },
          async download(id) {
            if (!(await causalLocal.inspect()).protocolKnown) return cloud.download(id)
            const signal = causalSession.signal
            const snapshot = await probeCausal()
            const entry = snapshot?.entries.find((item) => item.itemId === id)
            if (!snapshot || !entry) return null
            const json = await readPintaCausalJson(
              await causalCloud.download(entry, snapshot.epoch, signal),
              signal,
            )
            await causalCloud.verifyEpoch(snapshot.epoch, signal)
            const updatedAt = Date.parse(entry.itemUpdatedAt)
            return {
              json,
              summary: { ...entry, itemUpdatedAt: updatedAt, syncedAt: updatedAt, thumb: null },
              parts: [],
              fetchPart: async () => {
                throw Error('O desenho não tem partes separadas.')
              },
            }
          },
        }
      : undefined
  return {
    ...(causalLocal && causalCloud && options.causal
      ? {
          observesReferences: true as const,
          prepareTileRemap,
          holdOpen: options.causal.holdOpen,
          accountConfirmation,
        }
      : {}),
    async persistAsset(asset, context) {
      if (await stageCausal([asset], context)) return
      await observeBeforeWrite(asset)
      noteWrittenHere(asset)
      try {
        await local.persistAsset(asset)
      } catch (error) {
        if (error instanceof PintaLocalConflictError)
          for (const copy of error.forks.values()) enqueue(copy)
        throw error
      }
      enqueue(asset)
    },
    async persistAssets(assets, context) {
      if (await stageCausal(assets, context)) return
      for (const asset of assets) await observeBeforeWrite(asset)
      for (const asset of assets) noteWrittenHere(asset)
      try {
        await local.persistAssets(assets)
      } catch (error) {
        if (error instanceof PintaLocalConflictError)
          for (const copy of error.forks.values()) enqueue(copy)
        throw error
      }
      for (const asset of assets) enqueue(asset)
    },
    async deleteAsset(id, base) {
      if (await stageCausal([], undefined, { id, before: base })) return
      await local.deleteAsset(id, base)
      // A lápide (com a revisão conhecida) ANTES de apagar a marca.
      enqueueRemove(id)
      marks.delete(id)
      formatMemory.delete(id)
      unverifiedBases.delete(id)
      observedRevisions.delete(id)
      verifiedLegacy.delete(id)
    },
    async loadAssetById(id) {
      const asset = await local.loadAssetById(id)
      // Marca o corte ANTES de o editor abrir e salvar por cima (a assinatura da gravação dele
      // esconderia o corte da subida).
      if (asset) {
        const entry = formatMemory.get(id),
          signature = entry?.signature
        if (
          signature &&
          signature.at === asset.updatedAt &&
          signature.schema === schemaStampOf(asset) &&
          signature.maxSchema >= (entry?.schema ?? 0)
        )
          observedRevisions.set(id, signature.revision)
        observeUnverifiedBase(asset)
        lostFormat(asset)
      }
      return asset
    },
    async listAllAssets() {
      const localAssets = await local.listAllAssets()
      for (const asset of localAssets) {
        observeUnverifiedBase(asset)
        lostFormat(asset)
      }
      // A galeria abre AGORA com o que há neste aparelho; a reconciliação com a nuvem corre
      // em segundo plano (single-flight) e avisa o pacote: `sync-start` → a galeria mostra
      // "buscando…", `changed` a cada lote que desce (a galeria relê), `sync-end` no fim.
      // Antes a galeria esperava a lista da nuvem (até 4 s) + a descida (6 s) a CADA carga.
      // Uma reconciliação por carga (e nunca em laço): as releituras que a própria
      // reconciliação provoca (`changed`/`sync-end` → a galeria relê) passam aqui de novo e
      // NÃO podem abrir outra — ver `RECONCILE_MIN_INTERVAL_MS`.
      if (now() - lastReconcileEndedAt >= reconcileMinIntervalMs) startReconcile(localAssets)
      return localAssets
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getReadIssues: () => [
      ...new Map(
        [...(local.getReadIssues?.() ?? []), ...readIssues.values()].map((issue) => [
          issue.id,
          issue,
        ]),
      ).values(),
    ],
    async syncPaletteLibrary() {
      if (!cloud.supported) return
      const remote = await withTimeout(cloud.list(), LIST_TIMEOUT_MS)
      if (!remote) return
      await reconcilePaletteSummary(
        remote.find((item) => item.itemId === PALETTE_LIBRARY_ITEM_ID) ?? null,
      )
    },
    // A biblioteca "Minhas paletas": leitura direta; salvar TAMBÉM enfileira a
    // subida do item especial. Os métodos só existem quando o local os tem
    // (armazenamento sem eles = biblioteca desligada, e o wrapper não inventa).
    ...(loadLibrary ? { loadPaletteLibrary: () => loadLibrary() } : {}),
    ...(saveLibrary
      ? {
          savePaletteLibrary: async (library: PaletteLibrary) => {
            const saved = await saveLibrary(library)
            enqueuePaletteUpload()
            return saved
          },
        }
      : {}),
    dispose() {
      causalSession.abort()
      if (causalTimer) clearTimeout(causalTimer)
      if (typeof window !== 'undefined') window.removeEventListener('online', wakeCausal)
      unsubscribeLocal?.()
      unsubscribeOpenState?.()
      unsubscribeOpenState = null
      unverifiedBases.clear()
      observedRevisions.clear()
      verifiedLegacy.clear()
    },
  }
}
