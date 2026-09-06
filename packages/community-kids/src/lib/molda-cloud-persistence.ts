/**
 * "Guardado na sua conta" para o MOLDA: embrulha a `MoldaPersistence` local (o IndexedDB
 * do perfil) num espelho que SOBE cada criação depois que o autosave confirma e DESCE o
 * que falta na primeira carga da galeria. Molde do `pinta-cloud-persistence.ts`, sem a
 * biblioteca de paletas (o Molda não tem item especial) e com a superfície do pacote do
 * Molda (`loadAll/load/save/saveMany/remove/removeMany/subscribe`). O pacote não muda: a
 * galeria e o editor usam a MESMA persistência do contexto, então embrulhar aqui alcança
 * tudo (autosave, criar, renomear, duplicar, apagar, trazer de volta).
 *
 * O que sobe: o JSON de UMA criação (`assetToJson`, que preserva id e nome e leva as peles
 * em base64) com `{name, kind, updatedAt, thumb}`. A miniatura viaja só no MODELO (que a
 * guarda no próprio asset, feita no palco WebGL) e só até o teto do members (12 000 chars):
 * é enfeite da lista da nuvem, nunca recusa o salvamento. O que desce entra por
 * `assetFromJson` (= `sanitizeMoldaAsset`, nunca lança) e é gravado no local DIRETO, id
 * preservado (não pelo `galleryStore.importAssets`, que cria ids novos). A galeria exige
 * nome ÚNICO: um nome já usado por OUTRA criação local ganha sufixo (`casa-2`).
 *
 * Marcas de sincronia, base vencida (`-copia`), lápides e reconciliação single-flight
 * seguem as MESMAS regras do Pinta (ver o cabeçalho de lá). Uma diferença de API: o
 * registro de "aberto no editor" do Molda (`subscribeMoldaAssetOpenState`) avisa SEM dizer
 * qual id mudou — o wrapper confere `isAssetOpen` nos ids que a última descida pulou.
 *
 * ⚠️ Descidas gravadas por aqui NÃO passam pelo `saveMany` embrulhado (senão o que acabou
 * de descer subiria de novo).
 */

import type { MoldaAsset } from '@sistemazero/molda/assets'
import { assetFromJson, assetToJson, MOLDA_LIMITS } from '@sistemazero/molda/assets'
import { conflictCopyName, uniqueCreationName } from './creation-names'
import type { CloudCreationSummary, CreationsCloud } from './creations-cloud'
import { createStoredSyncedMarks, reconcileCreations, type SyncedMarks } from './creations-sync'
import { perfSpanAsync } from './perf'

/** O que o wrapper avisa ao pacote (espelho estrutural de `MoldaPersistenceEvent`). */
export type MoldaCloudPersistenceEvent =
  | { type: 'sync-start' }
  | { type: 'changed'; ids?: string[] }
  | { type: 'sync-end' }

/** A superfície da `MoldaPersistence` do pacote (espelhada aqui para não importar o barril React). */
export interface MoldaPersistenceLike {
  loadAll(): Promise<MoldaAsset[]>
  load(id: string): Promise<MoldaAsset | null>
  save(asset: MoldaAsset): Promise<void>
  saveMany(assets: readonly MoldaAsset[]): Promise<void>
  remove(id: string): Promise<void>
  removeMany(ids: readonly string[]): Promise<void>
  subscribe?(listener: (event: MoldaCloudPersistenceEvent) => void): () => void
  /** Desliga o que o wrapper escuta por fora (abrir/fechar do editor). O host chama ao trocar. */
  dispose?(): void
}

const MAX_NAME = MOLDA_LIMITS.maxNameChars
/** Teto da miniatura que viaja na reserva (= `CREATION_LIMITS.maxThumbChars` do members). */
const MAX_THUMB_CHARS = 12_000
/** Cada passe da descida trabalha até aqui; o resto volta em passes seguidos. */
const FIRST_LOAD_BUDGET_MS = 6000
/** Coalesce os avisos `changed` ao pacote (cada criação que desce avisaria um). */
const CHANGED_DEBOUNCE_MS = 300
/** O que não coube (`deferred`) volta em passes seguidos, com esta folga, até este teto. */
const DEFERRED_PASS_DELAY_MS = 2000
const MAX_DEFERRED_PASSES = 5
/** Espera pelo índice da nuvem antes de ficar só com o local. */
const LIST_TIMEOUT_MS = 4000
/** Intervalo mínimo entre reconciliações de uma mesma instância (ver o Pinta: senão vira laço). */
const RECONCILE_MIN_INTERVAL_MS = 60_000
/** Teto da espera pela fila antes de uma reconciliação (um DELETE em voo sobe primeiro; igual ao Estúdio). */
const FLUSH_BEFORE_PULL_MS = 3_000

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

/** Nome único dentro do teto do pacote (48). */
export function uniqueAssetName(base: string, taken: Set<string>): string {
  return uniqueCreationName(base, taken, MAX_NAME)
}

/** Nome da CÓPIA de conflito: `casa` → `casa-copia`, `casa-copia-2`… */
export function copyName(name: string, taken: Set<string>): string {
  return conflictCopyName(name, taken, MAX_NAME)
}

/** A miniatura que vai na reserva: só o modelo a tem, só PNG/JPEG data URL, só até o teto. */
export function cloudThumbOf(asset: MoldaAsset): string | null {
  const thumb = asset.kind === 'model' ? asset.thumb : undefined
  return typeof thumb === 'string' &&
    thumb.length > 0 &&
    thumb.length <= MAX_THUMB_CHARS &&
    thumb.startsWith('data:image/')
    ? thumb
    : null
}

/** O JSON que sobe (as peles em base64, id e nome preservados). */
export function assetToCloudJson(asset: MoldaAsset): string {
  return JSON.stringify(assetToJson(asset))
}

/** O que desce: parse + sanitize; `null` = ilegível ou de OUTRO item (id ≠ o pedido). */
export function assetFromCloudJson(json: string, expectedId: string): MoldaAsset | null {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  const asset = assetFromJson(raw)
  return asset && asset.id === expectedId ? asset : null
}

export function createCloudMirroredMoldaPersistence(options: {
  local: MoldaPersistenceLike
  cloud: CreationsCloud
  /** Perfil (namespace) — as marcas de sincronia são por perfil. */
  viewerId: string
  marks?: SyncedMarks
  now?: () => number
  /**
   * A criação está ABERTA no editor agora? (`isMoldaAssetOpen` do pacote.) A descida NÃO
   * grava por baixo de uma criação aberta: o editor segura a versão antiga em memória e o
   * próximo autosave sobrescreveria o que desceu (e subiria por cima da versão do outro
   * aparelho). Pulada fica para a próxima reconciliação; se a criança editar antes, a
   * subida cai em base vencida e vira `-copia` (os dois sobrevivem).
   */
  isAssetOpen?: (id: string) => boolean
  /**
   * Observa abrir/fechar do editor (`subscribeMoldaAssetOpenState` do pacote, que avisa SEM
   * o id): ao FECHAR uma criação que a última reconciliação PULOU por estar aberta,
   * reconcilia de novo na hora (a versão da nuvem entra sem esperar a próxima carga).
   */
  subscribeAssetOpenState?: (listener: () => void) => () => void
  /** Só para testes: orçamento de cada passe, folga entre passes e intervalo entre reconciliações. */
  budgetMs?: number
  passDelayMs?: number
  reconcileMinIntervalMs?: number
}): MoldaPersistenceLike {
  const { local, cloud } = options
  const now = options.now ?? (() => Date.now())
  const reconcileMinIntervalMs = options.reconcileMinIntervalMs ?? RECONCILE_MIN_INTERVAL_MS
  const budgetMs = options.budgetMs ?? FIRST_LOAD_BUDGET_MS
  const passDelayMs = options.passDelayMs ?? DEFERRED_PASS_DELAY_MS
  const marks =
    options.marks ?? createStoredSyncedMarks(`sz:creations-synced:molda:${options.viewerId}`)
  /**
   * Quando o envio de cada criação COMEÇOU (o produtor foi ler o disco), por id. A confirmação do
   * commit compara esse instante com o `at` da lápide: uma exclusão que nasceu DEPOIS de o envio
   * começar não pode ser desfeita pela confirmação de um upload que já estava em voo.
   */
  const sendingAt = new Map<string, number>()

  function enqueue(asset: MoldaAsset): void {
    cloud.enqueueUpload(
      asset.id,
      async () => {
        // O instante em que ESTE envio começa, ANTES de ler o disco: uma exclusão feita durante
        // a leitura (ou durante o upload) é posterior a ele e vence a confirmação.
        sendingAt.set(asset.id, now())
        // Sempre o estado MAIS RECENTE do disco (a fila pode rodar depois de mais edições).
        const current = await local.load(asset.id)
        if (!current) {
          sendingAt.delete(asset.id)
          return null
        }
        // Nada mudou desde a última sincronia confirmada (a marca JÁ é este `updatedAt`):
        // não sobe — zero HTTP.
        if (marks.get(asset.id) === current.updatedAt) {
          sendingAt.delete(asset.id)
          return null
        }
        return {
          json: assetToCloudJson(current),
          meta: {
            name: current.name,
            kind: current.kind,
            updatedAt: current.updatedAt,
            thumb: cloudThumbOf(current),
            // A revisão que ESTE aparelho conhece (0 = nunca viu): a nuvem recusa base vencida.
            baseRevision: marks.revision(asset.id) ?? 0,
          },
        }
      },
      // A marca avança SÓ com o commit confirmado, com o `updatedAt` do que subiu.
      ({ itemId, updatedAt, revision }) => {
        const startedAt = sendingAt.get(itemId) ?? Number.POSITIVE_INFINITY
        sendingAt.delete(itemId)
        marks.set(itemId, updatedAt, revision)
        // A criança apagou a criação com este upload EM VOO (a lápide nasceu depois de o envio
        // começar)? Então a exclusão manda: a lápide FICA e passa a conhecer a revisão que o
        // commit acabou de confirmar, a base que o DELETE precisa levar. Limpar a lápide aqui
        // deixava o DELETE pendente sem ela e a próxima reconciliação trazia a criação de volta;
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
   * Base vencida: outro aparelho subiu esta criação depois da última vez que este viu a
   * nuvem. A versão da nuvem entra como CÓPIA (id novo, "<nome>-copia"), a marca passa a
   * conhecer a revisão dela e a criação daqui sobe de novo — nada se perde. Nuvem sem o
   * item (apagado lá) → sobe direto (a reserva aceita qualquer base numa linha apagada).
   */
  async function resolveStale(id: string): Promise<void> {
    const downloaded = await cloud.download(id)
    if (downloaded) {
      const remote = assetFromCloudJson(downloaded.json, id)
      const mine = await local.load(id)
      // A versão da nuvem É a deste aparelho (mesmo `updatedAt`: outra aba deste perfil subiu
      // antes de as marcas se encontrarem): só avança a marca — cópia aqui seria duplicata.
      if (remote && mine && remote.updatedAt === mine.updatedAt) {
        marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
        return
      }
      if (remote) {
        const taken = new Set((await local.loadAll()).map((a) => a.name))
        const copy: MoldaAsset = {
          ...remote,
          id: crypto.randomUUID(),
          name: copyName(remote.name, taken),
          updatedAt: now(),
        }
        await local.saveMany([copy])
        emitChangedSoon([copy.id])
        enqueue(copy)
      }
      marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
    }
    const current = await local.load(id)
    if (current) enqueue(current)
  }

  /**
   * A nuvem recusou o DELETE (409: a base enviada não é a revisão corrente). Decidido por
   * REVISÃO, nunca por relógio (a régua do reconcile em `creations-sync.ts`): alguém EDITOU
   * depois (revisão corrente MAIOR que a conhecida pela lápide) → uma exclusão velha não vence
   * uma edição remota, a revisão corrente volta no mesmo id e a lápide só sai DEPOIS de gravar;
   * senão a exclusão é NOSSA e só a base estava errada → reenvia UMA vez com a revisão
   * autoritativa. ⚠️ Antes de 06/09 todo DELETE saía com base 0, caía aqui e a criação
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
    // ABERTA no editor agora? Não grava por baixo: o editor segura a versão antiga em memória e
    // o próximo autosave sobrescreveria o restauro. A lápide fica como está e a próxima
    // reconciliação, já com a criação fechada, decide de novo.
    if (options.isAssetOpen?.(id)) return
    const remote = assetFromCloudJson(downloaded.json, id)
    if (!remote) return
    const taken = new Set(
      (await local.loadAll()).filter((asset) => asset.id !== id).map((asset) => asset.name),
    )
    const restored = taken.has(remote.name)
      ? { ...remote, name: uniqueAssetName(remote.name, taken) }
      : remote
    await local.saveMany([restored])
    marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
    marks.clearTombstone(id)
    emitChangedSoon([id])
    console.warn('[molda-nuvem] exclusão desfeita: a criação mudou em outro aparelho', {
      itemId: id,
    })
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

  let reconcileInFlight: Promise<MoldaAsset[]> | null = null
  /** Pedido pontual feito enquanto o single-flight atual ainda estava terminando. */
  let pendingReconcileAssets: MoldaAsset[] | null = null
  let disposed = false
  /** Quando a última reconciliação terminou (`-Infinity` = nunca). */
  let lastReconcileEndedAt = Number.NEGATIVE_INFINITY
  /** Ids que a última reconciliação PULOU por estarem abertos no editor. */
  const skippedOpen = new Set<string>()
  const listeners = new Set<(event: MoldaCloudPersistenceEvent) => void>()
  const emit = (event: MoldaCloudPersistenceEvent) => {
    if (disposed) return
    for (const listener of listeners) listener(event)
  }
  // `changed` coalescido: cada criação que desce avisaria uma vez; a galeria relê em lote.
  let changedTimer: ReturnType<typeof setTimeout> | null = null
  let changedIds: string[] = []
  const emitChangedSoon = (ids: string[]) => {
    if (disposed) return
    changedIds.push(...ids)
    if (changedTimer) return
    changedTimer = setTimeout(() => {
      changedTimer = null
      flushChanged()
    }, CHANGED_DEBOUNCE_MS)
  }
  const flushChanged = () => {
    if (changedTimer) {
      clearTimeout(changedTimer)
      changedTimer = null
    }
    if (changedIds.length === 0) return
    const ids = changedIds
    changedIds = []
    emit({ type: 'changed', ids })
  }

  async function reconcile(localAssets: MoldaAsset[]): Promise<MoldaAsset[]> {
    if (!cloud.supported) return localAssets
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
      current = await local.loadAll()
    }
    return local.loadAll()
  }

  /** Um passe da reconciliação; devolve quantos itens ficaram de fora por tempo. */
  async function reconcilePass(localAssets: MoldaAsset[]): Promise<number> {
    const remote = await withTimeout(cloud.list(), LIST_TIMEOUT_MS)
    if (!remote) return 0
    skippedOpen.clear()
    const takenNames = new Set(localAssets.map((a) => a.name))
    const nameOwner = new Map(localAssets.map((a) => [a.name, a.id]))
    const report = await reconcileCreations<MoldaAsset, MoldaAsset>({
      local: localAssets,
      cloud: remote,
      marks,
      now,
      budgetMs,
      // Aberta no editor: nem cópia nem gravação (ver `isAssetOpen`); anota para trazer ao fechar.
      isBusy: (itemId) => {
        const busy = options.isAssetOpen?.(itemId) ?? false
        if (busy) skippedOpen.add(itemId)
        return busy
      },
      // Mudou no disco depois do retrato desta reconciliação (autosave/renomear no meio)?
      // Não grava por cima: a subida dessa edição resolve (base vencida → cópia).
      localUpdatedAt: async (itemId) => (await local.load(itemId))?.updatedAt ?? null,
      fetch: async (summary: CloudCreationSummary, signal: AbortSignal) => {
        const downloaded = await cloud.download(summary.itemId, { signal })
        if (!downloaded) return null
        return assetFromCloudJson(downloaded.json, summary.itemId)
      },
      apply: async (_summary, asset) => {
        // Nome já usado por OUTRA criação local: sufixo (a galeria exige nome único).
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
        await local.saveMany([named])
        emitChangedSoon([named.id])
        return true
      },
      keepLocalCopy: async (item) => {
        const copy: MoldaAsset = {
          ...item,
          id: crypto.randomUUID(),
          name: copyName(item.name, takenNames),
          updatedAt: now(),
        }
        takenNames.add(copy.name)
        nameOwner.set(copy.name, copy.id)
        await local.saveMany([copy])
        emitChangedSoon([copy.id])
        return {
          // A cópia só entra na fila quando a substituição do original foi confirmada.
          commit: () => enqueue(copy),
          rollback: async () => {
            await local.remove(copy.id)
            if (nameOwner.get(copy.name) === copy.id) {
              nameOwner.delete(copy.name)
              takenNames.delete(copy.name)
            }
            emitChangedSoon([copy.id])
          },
        }
      },
      deleteLocal: async (itemId) => {
        const item = localAssets.find((asset) => asset.id === itemId)
        await local.remove(itemId)
        if (item && nameOwner.get(item.name) === itemId) {
          nameOwner.delete(item.name)
          takenNames.delete(item.name)
        }
        emitChangedSoon([itemId])
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
  function startReconcile(localAssets: MoldaAsset[], queueIfBusy = false): void {
    if (!cloud.supported || disposed) return
    if (reconcileInFlight) {
      if (queueIfBusy) pendingReconcileAssets = localAssets
      return
    }
    emit({ type: 'sync-start' })
    reconcileInFlight = perfSpanAsync('kids:molda:reconcile', () => reconcile(localAssets))
      .catch(() => localAssets) // nuvem fora do ar: fica com o que há aqui, como sempre
      .finally(() => {
        lastReconcileEndedAt = now()
        reconcileInFlight = null
        flushChanged()
        emit({ type: 'sync-end' })
        const pending = pendingReconcileAssets
        pendingReconcileAssets = null
        if (pending) startReconcile(pending)
      })
  }

  // Fechou uma criação que a descida PULOU por estar aberta: traz a versão da nuvem agora
  // (fora do intervalo mínimo — é um pedido pontual, não uma releitura em laço). O registro
  // do pacote avisa sem o id: confere quais das puladas já não estão abertas.
  let unsubscribeOpenState: (() => void) | null =
    options.subscribeAssetOpenState?.(() => {
      if (skippedOpen.size === 0) return
      let closedSome = false
      for (const id of [...skippedOpen]) {
        if (options.isAssetOpen?.(id) ?? false) continue
        skippedOpen.delete(id)
        closedSome = true
      }
      if (!closedSome) return
      void local.loadAll().then((localAssets) => startReconcile(localAssets, true))
    }) ?? null

  return {
    async loadAll() {
      const localAssets = await local.loadAll()
      // A galeria abre AGORA com o que há neste aparelho; a reconciliação com a nuvem corre
      // em segundo plano (single-flight) e avisa o pacote: `sync-start` → a galeria mostra
      // "buscando…", `changed` a cada lote que desce (a galeria relê), `sync-end` no fim.
      // Uma reconciliação por carga (e nunca em laço): as releituras que a própria
      // reconciliação provoca passam aqui de novo e NÃO podem abrir outra.
      if (now() - lastReconcileEndedAt >= reconcileMinIntervalMs) startReconcile(localAssets)
      return localAssets
    },
    load: (id) => local.load(id),
    async save(asset) {
      await local.save(asset)
      enqueue(asset)
    },
    async saveMany(assets) {
      await local.saveMany(assets)
      for (const asset of assets) enqueue(asset)
    },
    async remove(id) {
      await local.remove(id)
      // A lápide (com a revisão conhecida) ANTES de apagar a marca.
      enqueueRemove(id)
      marks.delete(id)
    },
    async removeMany(ids) {
      await local.removeMany(ids)
      for (const id of ids) {
        enqueueRemove(id)
        marks.delete(id)
      }
    },
    subscribe(listener) {
      if (disposed) return () => undefined
      listeners.add(listener)
      // Os avisos do próprio local (outra aba gravando no IndexedDB) continuam chegando.
      const unsubscribeLocal = local.subscribe?.(listener)
      return () => {
        listeners.delete(listener)
        unsubscribeLocal?.()
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      pendingReconcileAssets = null
      unsubscribeOpenState?.()
      unsubscribeOpenState = null
      if (changedTimer) clearTimeout(changedTimer)
      changedTimer = null
      changedIds = []
      listeners.clear()
      local.dispose?.()
    },
  }
}
