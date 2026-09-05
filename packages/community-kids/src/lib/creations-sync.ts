/**
 * A DESCIDA do "Guardado na sua conta": compara o que está neste aparelho com o
 * índice da nuvem e decide item a item — o mesmo reconciliador para o Estúdio
 * Completo e o Pinta (quem sabe LER/GRAVAR cada formato são os adaptadores).
 *
 * Regras (as da Helena, 18/08/2026, com as correções da revisão do mesmo dia):
 * - só na nuvem → BAIXA (é o "voltou sozinho em outro computador");
 * - com o item nos dois lados, a MARCA da última sincronização decide quem mudou;
 *   se os dois mudaram (dois computadores no mesmo item), o local vira uma
 *   CÓPIA antes de ser substituído — nunca some. A cópia só é feita DEPOIS de a
 *   descida ter sido baixada e validada (uma descida que falha não deixa cópia);
 * - só o local mudou (ou só existe local) → SOBE;
 * - iguais → nada;
 * - LÁPIDE local: apagado neste aparelho não desce de volta. Só volta quando uma
 *   REVISÃO autoritativa prova que alguém editou depois; lápide legada sem revisão
 *   reenvia o DELETE em vez de comparar relógios de dispositivos diferentes.
 * - LÁPIDE remota: apaga a cópia local intacta; se ela também mudou, preserva essa
 *   edição com id novo antes de remover o original.
 *
 * "Última sincronia deste aparelho" = `SyncedMarks` (localStorage por perfil e
 * ferramenta): o `updatedAt` do item na última vez em que ele desceu ou SUBIU COM
 * COMMIT CONFIRMADO, e a REVISÃO da nuvem nessa hora (é a `baseRevision` que a próxima
 * reserva leva: a nuvem recusa quem está atrasado — ver `creations-cloud.ts`). Nunca é
 * gravada antes de subir: marca otimista fazia um conflito real passar por "intocado"
 * (e a nuvem sobrescrevia edição nunca enviada). A lápide também guarda a revisão:
 * "ninguém editou depois de eu apagar" é comparado por revisão (monotônica no servidor),
 * não por relógio de aparelhos diferentes.
 */
import type { CloudCreationSummary } from './creations-cloud'

export interface LocalCreation {
  id: string
  /** ms desde a época (relógio do editor). */
  updatedAt: number
}

/**
 * Lápide local: o item foi apagado neste aparelho em `at`; `sent` = o DELETE chegou à
 * nuvem; `revision` = a revisão da nuvem que este aparelho conhecia ao apagar (quando
 * havia): a nuvem só "editou depois" se a revisão dela for MAIOR.
 */
export interface Tombstone {
  at: number
  sent: boolean
  revision?: number | null
}

export interface SyncedMarks {
  /** `updatedAt` do item na última sincronia confirmada. */
  get(id: string): number | undefined
  /** Revisão da nuvem na última sincronia confirmada (a `baseRevision` da próxima reserva). */
  revision(id: string): number | undefined
  set(id: string, updatedAt: number, revision?: number): void
  delete(id: string): void
  tombstone(id: string): Tombstone | undefined
  setTombstone(id: string, tombstone: Tombstone): void
  clearTombstone(id: string): void
  /** Grava AGORA o que está pendente (as marcas em `localStorage` gravam em lote). */
  flush?(): void
}

/** Marcas em memória (testes / storage indisponível). */
export function createMemorySyncedMarks(): SyncedMarks {
  const map = new Map<string, number>()
  const revisions = new Map<string, number>()
  const tombstones = new Map<string, Tombstone>()
  return {
    get: (id) => map.get(id),
    revision: (id) => revisions.get(id),
    set: (id, at, revision) => {
      map.set(id, at)
      if (revision !== undefined) revisions.set(id, revision)
    },
    delete: (id) => {
      map.delete(id)
      revisions.delete(id)
    },
    tombstone: (id) => tombstones.get(id),
    setTombstone: (id, tombstone) => {
      tombstones.set(id, tombstone)
    },
    clearTombstone: (id) => {
      tombstones.delete(id)
    },
  }
}

/** Estado COMPARTILHADO das marcas de uma chave (todas as instâncias da página veem o mesmo). */
interface StoredMarksState {
  marks: Map<string, number>
  revisions: Map<string, number>
  tombstones: Map<string, Tombstone>
  /** Ids alterados desde a última gravação bem-sucedida (por mapa): o que uma releitura não pode sobrescrever. */
  dirty: { marks: Set<string>; revisions: Set<string>; tombstones: Set<string> }
  timer: ReturnType<typeof setTimeout> | null
  store: Storage | null
  /** `setItem` falhou (quota/privado): segue servindo da memória e tenta gravar de novo depois. */
  degraded: boolean
}

const storedMarksRegistry = new Map<string, StoredMarksState>()
/** Espera entre a última mudança e a gravação (coalesce a rajada da reconciliação). */
const MARKS_FLUSH_DELAY_MS = 100

export function resetStoredSyncedMarksForTests(): void {
  for (const state of storedMarksRegistry.values()) {
    if (state.timer) clearTimeout(state.timer)
  }
  storedMarksRegistry.clear()
}

function isTombstone(value: unknown): value is Tombstone {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Tombstone).at === 'number' &&
    typeof (value as Tombstone).sent === 'boolean'
  )
}

function readStoredMap<T>(store: Storage | null, key: string): Record<string, T> {
  if (!store) return {}
  try {
    const raw = store.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, T>)
      : {}
  } catch {
    return {}
  }
}

/**
 * Marcas em `localStorage` (uma chave por perfil × ferramenta; as revisões em
 * `<chave>:revisoes` e as lápides em `<chave>:apagados`) — servidas da MEMÓRIA e
 * gravadas em LOTE (revisão de 19/08/2026): antes cada acessor relia e reparseava o
 * mapa inteiro e cada `set` gravava tudo de novo — O(N²) síncrono por carga (com 300
 * itens, ~24 MB de JSON parseados e ~8 MB gravados a cada reconciliação; com 2000, a
 * thread principal travava por segundos). Agora:
 * - os três mapas são lidos UMA vez por chave (estado compartilhado por todas as
 *   instâncias da página — duas instâncias nunca divergem);
 * - leituras são `Map.get`; escritas marcam "sujo" e agendam UMA gravação coalescida
 *   (`MARKS_FLUSH_DELAY_MS`), além de `flush()` explícito (o reconciliador chama no fim)
 *   e nos `pagehide`/`visibilitychange` da página;
 * - outra ABA que grave a mesma chave (evento `storage`) é relida por cima da memória,
 *   preservando só o que esta aba mudou e ainda não gravou;
 * - falha de `setItem` (quota/privado) não perde nada: a memória continua a verdade desta
 *   aba e a gravação é tentada de novo no próximo flush.
 * Uma marca não gravada (aba morta antes do flush) só faz o próximo reconcile recompará-la:
 * iguais → remarca; os dois mudaram → cópia (o lado seguro).
 */
export function createStoredSyncedMarks(storageKey: string): SyncedMarks {
  const revisionKey = `${storageKey}:revisoes`
  const tombstoneKey = `${storageKey}:apagados`
  let state = storedMarksRegistry.get(storageKey)
  if (!state) {
    let store: Storage | null = null
    try {
      store = typeof localStorage !== 'undefined' ? localStorage : null
    } catch {
      store = null
    }
    const created: StoredMarksState = {
      marks: new Map(),
      revisions: new Map(),
      tombstones: new Map(),
      dirty: { marks: new Set(), revisions: new Set(), tombstones: new Set() },
      timer: null,
      store,
      degraded: false,
    }
    reloadFromStore(created, 'marks')
    reloadFromStore(created, 'revisions')
    reloadFromStore(created, 'tombstones')
    storedMarksRegistry.set(storageKey, created)
    state = created
    if (typeof window !== 'undefined') {
      // Outra aba gravou: relê por cima da memória (o que esta aba mudou e não gravou fica).
      window.addEventListener('storage', (event) => {
        if (event.key === storageKey) reloadFromStore(created, 'marks')
        else if (event.key === revisionKey) reloadFromStore(created, 'revisions')
        else if (event.key === tombstoneKey) reloadFromStore(created, 'tombstones')
      })
      const flushNow = () => flush()
      window.addEventListener('pagehide', flushNow)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) flushNow()
      })
    }
  }
  const shared = state

  function reloadFromStore(target: StoredMarksState, which: 'marks' | 'revisions' | 'tombstones') {
    const key = which === 'marks' ? storageKey : which === 'revisions' ? revisionKey : tombstoneKey
    const stored = readStoredMap<unknown>(target.store, key)
    const dirty = target.dirty[which]
    if (which === 'tombstones') {
      const next = new Map<string, Tombstone>()
      for (const [id, value] of Object.entries(stored)) if (isTombstone(value)) next.set(id, value)
      for (const id of dirty) {
        const mine = target.tombstones.get(id)
        if (mine) next.set(id, mine)
        else next.delete(id)
      }
      target.tombstones = next
      return
    }
    const next = new Map<string, number>()
    for (const [id, value] of Object.entries(stored))
      if (typeof value === 'number') next.set(id, value)
    const mineMap = which === 'marks' ? target.marks : target.revisions
    for (const id of dirty) {
      const mine = mineMap.get(id)
      if (mine !== undefined) next.set(id, mine)
      else next.delete(id)
    }
    if (which === 'marks') target.marks = next
    else target.revisions = next
  }

  function flush(): void {
    if (shared.timer) {
      clearTimeout(shared.timer)
      shared.timer = null
    }
    if (!shared.store) return
    const write = (which: 'marks' | 'revisions' | 'tombstones', key: string) => {
      const dirty = shared.dirty[which]
      if (dirty.size === 0) return
      // MESCLA antes de gravar: relê o que está no storage (outra aba pode ter gravado desde a
      // última leitura — o evento `storage` chega depois) e põe por cima só o que ESTA aba
      // mudou. Gravar o mapa inteiro da memória fazia "o último que grava vence" entre duas
      // abas do mesmo perfil (uma revisão/lápide da outra aba sumia).
      reloadFromStore(shared, which)
      const map =
        which === 'marks'
          ? shared.marks
          : which === 'revisions'
            ? shared.revisions
            : shared.tombstones
      try {
        shared.store?.setItem(key, JSON.stringify(Object.fromEntries(map)))
        dirty.clear()
        shared.degraded = false
      } catch {
        // Quota/privado: a memória continua a verdade; tenta de novo no próximo flush.
        shared.degraded = true
      }
    }
    write('marks', storageKey)
    write('revisions', revisionKey)
    write('tombstones', tombstoneKey)
  }

  function scheduleFlush(): void {
    if (!shared.store || shared.timer) return
    shared.timer = setTimeout(() => {
      shared.timer = null
      flush()
    }, MARKS_FLUSH_DELAY_MS)
  }

  return {
    get: (id) => shared.marks.get(id),
    revision: (id) => shared.revisions.get(id),
    set: (id, at, revision) => {
      shared.marks.set(id, at)
      shared.dirty.marks.add(id)
      if (revision !== undefined) {
        shared.revisions.set(id, revision)
        shared.dirty.revisions.add(id)
      }
      scheduleFlush()
    },
    delete: (id) => {
      shared.marks.delete(id)
      shared.revisions.delete(id)
      shared.dirty.marks.add(id)
      shared.dirty.revisions.add(id)
      scheduleFlush()
    },
    tombstone: (id) => shared.tombstones.get(id),
    setTombstone: (id, tombstone) => {
      shared.tombstones.set(id, tombstone)
      shared.dirty.tombstones.add(id)
      scheduleFlush()
    },
    clearTombstone: (id) => {
      if (!shared.tombstones.has(id)) return
      shared.tombstones.delete(id)
      shared.dirty.tombstones.add(id)
      scheduleFlush()
    },
    flush,
  }
}

export interface ReconcileReport {
  downloaded: number
  uploaded: number
  conflicts: number
  /** Não coube no orçamento de tempo desta carga (entra na próxima). */
  deferred: number
  failed: number
  /**
   * Ficaram de fora por decisão do adaptador: `canAccept` (teto próprio), `isBusy` (o item está
   * ABERTO no editor) ou mudou localmente entre o começo da reconciliação e a gravação
   * (`localUpdatedAt`). Nada é gravado nem copiado; a marca não avança — a subida seguinte do
   * item (se houver) cai em base vencida e os dois lados sobrevivem como cópia.
   */
  skipped: number
  /** Lápides honradas, locais ou vindas de outro aparelho. */
  tombstoned: number
}

/**
 * Cópia de conflito já persistida, mas ainda não confirmada. O reconciliador só a confirma
 * depois de substituir o original com sucesso; se a substituição falhar, remove exatamente
 * essa cópia para que uma nova tentativa não acumule órfãs.
 */
export interface StagedConflictCopy {
  commit: () => void
  rollback: () => Promise<void>
}

export interface ReconcileOptions<T extends LocalCreation, P> {
  local: readonly T[]
  cloud: readonly CloudCreationSummary[]
  /** Baixa e VALIDA (parse + sanitize) sem gravar. `null` = não deu (corrompido/recusado). */
  fetch: (summary: CloudCreationSummary, signal: AbortSignal) => Promise<P | null>
  /** Grava LOCALMENTE o que `fetch` devolveu, preservando o id. `false` = não gravou. */
  apply: (summary: CloudCreationSummary, payload: P) => Promise<boolean>
  /** Persiste uma CÓPIA provisória do local antes de a nuvem substituir o original. */
  keepLocalCopy: (item: T) => Promise<StagedConflictCopy>
  /** Enfileira a subida do item local (a fila do `creations-cloud` sobe o mais recente). */
  push: (item: T) => void
  /** Reenvia o DELETE de uma lápide que ainda não chegou à nuvem. */
  remove?: (itemId: string) => void
  /** Apaga DIRETO do armazenamento local, sem acordar o espelho da nuvem. */
  deleteLocal: (itemId: string) => Promise<boolean>
  marks: SyncedMarks
  /** O adaptador ainda tem lugar para mais um item da nuvem? */
  canAccept?: (summary: CloudCreationSummary) => boolean
  /**
   * O item está ABERTO no editor agora? Conferido antes de baixar: gravar por baixo de um editor
   * com o item em memória faria o próximo autosave sobrescrever a versão que desceu (e subir por
   * cima da do outro aparelho). Pulado = `skipped`, sem cópia, marca parada.
   */
  isBusy?: (itemId: string) => boolean
  /**
   * Relê o `updatedAt` LOCAL do item na hora de gravar (`null` = não existe mais). A decisão
   * foi tomada com o retrato do início da reconciliação; uma edição persistida no meio
   * (renomear, autosave) seria sobrescrita pelo `apply` — e a subida seguinte viraria nada
   * (marca = `updatedAt` do disco). Mudou → pulado (`skipped`), sem cópia, marca parada.
   */
  localUpdatedAt?: (itemId: string) => Promise<number | null | undefined>
  /** Ordem das descidas (ex.: peças antes dos mapas que apontam para elas). */
  order?: (a: CloudCreationSummary, b: CloudCreationSummary) => number
  /** Descidas em paralelo (default 3). */
  concurrency?: number
  /** Teto de tempo das descidas nesta carga (default 6 s); o resto fica para a próxima. */
  budgetMs?: number
  /** Cancela a reconciliação inteira (troca de perfil/desmontagem do host). */
  signal?: AbortSignal
  now?: () => number
}

class ReconcileDeadlineError extends Error {
  constructor() {
    super('Orçamento da reconciliação esgotado')
    this.name = 'ReconcileDeadlineError'
  }
}

class ReconcileCancelledError extends Error {
  constructor() {
    super('Reconciliação cancelada')
    this.name = 'ReconcileCancelledError'
  }
}

function fetchWithinBudget<P>(
  fetchPayload: (signal: AbortSignal) => Promise<P | null>,
  remainingMs: number,
  parentSignal?: AbortSignal,
): Promise<P | null> {
  const controller = new AbortController()
  let rejectCancellation: ((reason: ReconcileCancelledError) => void) | null = null
  const cancellation = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject
  })
  const abortFromParent = () => {
    controller.abort(parentSignal?.reason)
    rejectCancellation?.(new ReconcileCancelledError())
  }
  if (parentSignal?.aborted) abortFromParent()
  else parentSignal?.addEventListener('abort', abortFromParent, { once: true })

  let timer: ReturnType<typeof setTimeout> | null = null
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => {
        controller.abort(new ReconcileDeadlineError())
        reject(new ReconcileDeadlineError())
      },
      Math.max(0, remainingMs),
    )
  })

  return Promise.race([fetchPayload(controller.signal), deadline, cancellation]).finally(() => {
    if (timer) clearTimeout(timer)
    parentSignal?.removeEventListener('abort', abortFromParent)
  })
}

export async function reconcileCreations<T extends LocalCreation, P>(
  options: ReconcileOptions<T, P>,
): Promise<ReconcileReport> {
  const now = options.now ?? (() => Date.now())
  const startedAt = now()
  const budgetMs = options.budgetMs ?? 6000
  const concurrency = Math.max(1, options.concurrency ?? 3)
  const report: ReconcileReport = {
    downloaded: 0,
    uploaded: 0,
    conflicts: 0,
    deferred: 0,
    failed: 0,
    skipped: 0,
    tombstoned: 0,
  }

  const localById = new Map(options.local.map((item) => [item.id, item]))
  const remoteTombstones = options.cloud.filter(
    (item): item is CloudCreationSummary & { deletedAt: number } =>
      typeof item.deletedAt === 'number' && Number.isFinite(item.deletedAt),
  )
  const remoteDeletedIds = new Set(remoteTombstones.map((item) => item.itemId))
  const aliveCloud = options.cloud.filter((item) => !remoteDeletedIds.has(item.itemId))
  const cloudById = new Map(aliveCloud.map((item) => [item.itemId, item]))

  // 1) Lápides de OUTRO aparelho vencem antes de decidir qualquer upload. Se este
  //    aparelho também editou o item, a edição vira uma criação nova e sobrevive.
  for (let tombstoneIndex = 0; tombstoneIndex < remoteTombstones.length; tombstoneIndex += 1) {
    if (options.signal?.aborted || now() - startedAt >= budgetMs) {
      report.deferred += remoteTombstones.length - tombstoneIndex
      break
    }
    const remote = remoteTombstones[tombstoneIndex]
    if (!remote) continue
    const local = localById.get(remote.itemId)
    if (local && options.isBusy?.(remote.itemId)) {
      report.skipped += 1
      continue
    }
    if (local && options.localUpdatedAt) {
      const freshUpdatedAt = await options.localUpdatedAt(remote.itemId)
      if (freshUpdatedAt === null) {
        localById.delete(remote.itemId)
      } else if (typeof freshUpdatedAt === 'number' && freshUpdatedAt !== local.updatedAt) {
        report.skipped += 1
        continue
      }
    }

    const current = localById.get(remote.itemId)
    let stagedCopy: StagedConflictCopy | undefined
    let rollbackAttempted = false
    let deleted = false
    try {
      const lastSynced = current ? options.marks.get(current.id) : undefined
      const localChanged = current !== undefined && current.updatedAt !== lastSynced
      if (current && localChanged) stagedCopy = await options.keepLocalCopy(current)
      if (current && options.isBusy?.(remote.itemId)) {
        rollbackAttempted = true
        await stagedCopy?.rollback()
        report.skipped += 1
        continue
      }
      if (current && !(await options.deleteLocal(remote.itemId))) {
        rollbackAttempted = true
        await stagedCopy?.rollback()
        report.failed += 1
        continue
      }
      deleted = current !== undefined
      stagedCopy?.commit()
      if (stagedCopy) report.conflicts += 1
      localById.delete(remote.itemId)
      options.marks.delete(remote.itemId)
      options.marks.setTombstone(remote.itemId, {
        at: remote.deletedAt,
        sent: true,
        revision: remote.revision,
      })
      report.tombstoned += 1
    } catch (error) {
      if (stagedCopy && !deleted && !rollbackAttempted) {
        try {
          await stagedCopy.rollback()
        } catch (rollbackError) {
          console.warn('[criacoes-nuvem] rollback da cópia após exclusão remota falhou', {
            itemId: remote.itemId,
            error: rollbackError,
          })
        }
      }
      console.warn('[criacoes-nuvem] exclusão remota falhou', {
        itemId: remote.itemId,
        error,
      })
      report.failed += 1
    }
  }

  // 2) Só local → sobe. Quando existe dos dois lados, a MARCA confirmada decide
  //    quem mudou; relógios de aparelhos diferentes não são ordenáveis.
  for (const item of localById.values()) {
    // Uma lápide remota pulada/recusada fica para o próximo passe e nunca vira upload.
    if (remoteDeletedIds.has(item.id)) continue
    // Um item local com lápide é um id que voltou (recriado): a lápide não vale mais.
    if (options.marks.tombstone(item.id)) options.marks.clearTombstone(item.id)
    const remote = cloudById.get(item.id)
    if (!remote) {
      options.push(item)
      report.uploaded += 1
      continue
    }
    if (item.updatedAt === remote.itemUpdatedAt) {
      options.marks.set(item.id, item.updatedAt, remote.revision)
      continue
    }
    const lastSynced = options.marks.get(item.id)
    const localChanged = lastSynced === undefined || item.updatedAt !== lastSynced
    const remoteChanged = lastSynced === undefined || remote.itemUpdatedAt !== lastSynced
    if (localChanged && !remoteChanged) {
      options.push(item)
      report.uploaded += 1
    }
  }

  // 3) Só na nuvem, só a nuvem mudou, ou os DOIS lados mudaram → desce. No
  //    último caso preserva o local como cópia, independentemente do timestamp.
  const pulls: Array<{ remote: CloudCreationSummary; preserveLocal: boolean }> = []
  for (const remote of aliveCloud) {
    const local = localById.get(remote.itemId)
    if (local) {
      if (remote.itemUpdatedAt === local.updatedAt) continue
      const lastSynced = options.marks.get(local.id)
      const localChanged = lastSynced === undefined || local.updatedAt !== lastSynced
      const remoteChanged = lastSynced === undefined || remote.itemUpdatedAt !== lastSynced
      if (!remoteChanged) continue
      if (options.isBusy?.(remote.itemId)) {
        // Aberto no editor: nem cópia, nem gravação — fica para a próxima reconciliação; se a
        // criança editar antes, a subida cai em base vencida e vira cópia (nada se perde).
        report.skipped += 1
        continue
      }
      pulls.push({ remote, preserveLocal: localChanged })
      continue
    } else {
      const tombstone = options.marks.tombstone(remote.itemId)
      // Só uma revisão monotônica do servidor pode provar que alguém editou DEPOIS
      // do DELETE. Lápide antiga/sem revisão fica autoritativa e reenvia a remoção;
      // relógios de dois aparelhos nunca são comparados.
      const editedAfterDelete =
        tombstone !== undefined &&
        typeof tombstone.revision === 'number' &&
        remote.revision > tombstone.revision
      if (tombstone && !editedAfterDelete) {
        // Apagado aqui e ninguém editou depois: não volta. Se o DELETE nunca chegou,
        // ou se a lápide ainda não conhece revisão, reenvia para obter a versão
        // autoritativa do servidor.
        report.tombstoned += 1
        if (!tombstone.sent || typeof tombstone.revision !== 'number') {
          options.remove?.(remote.itemId)
        }
        continue
      }
      if (tombstone) options.marks.clearTombstone(remote.itemId)
      if (options.canAccept && !options.canAccept(remote)) {
        report.skipped += 1
        continue
      }
    }
    pulls.push({ remote, preserveLocal: false })
  }
  pulls.sort((a, b) => (options.order ?? (() => 0))(a.remote, b.remote))

  let index = 0
  let deadlineReached = false
  async function worker(): Promise<void> {
    while (!deadlineReached && index < pulls.length) {
      if (options.signal?.aborted || now() - startedAt >= budgetMs) {
        deadlineReached = true
        report.deferred += pulls.length - index
        index = pulls.length
        return
      }
      const pull = pulls[index]
      index += 1
      if (!pull) continue
      const { remote, preserveLocal } = pull
      const local = localById.get(remote.itemId)
      let stagedCopy: StagedConflictCopy | undefined
      let rollbackAttempted = false
      let applied = false
      try {
        // Baixa e valida PRIMEIRO: uma descida que falha não deixa cópia órfã.
        const remainingMs = Math.max(0, budgetMs - (now() - startedAt))
        const payload = await fetchWithinBudget(
          (signal) => options.fetch(remote, signal),
          remainingMs,
          options.signal,
        )
        if (payload === null) {
          console.warn('[criacoes-nuvem] descida recusada (conteúdo inválido ou indisponível)', {
            itemId: remote.itemId,
          })
          report.failed += 1
          continue
        }
        // O local mudou DEPOIS do retrato (ou abriu no editor enquanto baixava)? Não grava por
        // cima: a subida dessa edição resolve (base vencida → cópia da nuvem + local sobe).
        if (local && options.localUpdatedAt) {
          const freshUpdatedAt = await options.localUpdatedAt(remote.itemId)
          if (
            freshUpdatedAt === null ||
            (typeof freshUpdatedAt === 'number' && freshUpdatedAt !== local.updatedAt)
          ) {
            report.skipped += 1
            continue
          }
        }
        if (options.isBusy?.(remote.itemId)) {
          report.skipped += 1
          continue
        }
        if (local && preserveLocal) {
          stagedCopy = await options.keepLocalCopy(local)
        }
        const ok = await options.apply(remote, payload)
        if (ok) {
          applied = true
          stagedCopy?.commit()
          if (stagedCopy) report.conflicts += 1
          options.marks.set(remote.itemId, remote.itemUpdatedAt, remote.revision)
          report.downloaded += 1
        } else {
          if (stagedCopy) {
            rollbackAttempted = true
            await stagedCopy.rollback()
          }
          report.failed += 1
        }
      } catch (error) {
        if (stagedCopy && !applied && !rollbackAttempted) {
          rollbackAttempted = true
          try {
            await stagedCopy.rollback()
          } catch (rollbackError) {
            console.warn('[criacoes-nuvem] rollback da cópia de conflito falhou', {
              itemId: remote.itemId,
              error: rollbackError,
            })
          }
        }
        if (
          error instanceof ReconcileDeadlineError ||
          error instanceof ReconcileCancelledError ||
          options.signal?.aborted
        ) {
          report.deferred += 1
          if (!deadlineReached) {
            deadlineReached = true
            report.deferred += pulls.length - index
            index = pulls.length
          }
          return
        }
        // Sem silêncio: um item que nunca passa aparece no console (o selo não tem onde dizer).
        console.warn('[criacoes-nuvem] descida falhou', { itemId: remote.itemId, error })
        report.failed += 1
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pulls.length) }, () => worker()))
  options.marks.flush?.()
  return report
}
