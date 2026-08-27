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
 */

import {
  PINTA_PALETTE_LIBRARY_ITEM_ID,
  PINTA_PALETTE_LIBRARY_KIND,
  PINTA_PALETTE_LIBRARY_TOOL,
} from '@sistemazero/core/creations'
import type { PaletteLibrary, PintaAsset } from '@sistemazero/pinta/assets'
import {
  assetFromJson,
  assetToJson,
  emptyPaletteLibrary,
  mergePaletteLibraries,
  PINTA_LIMITS,
  paletteLibraryContentKey,
  sanitizePaletteLibrary,
  sanitizePintaAsset,
} from '@sistemazero/pinta/assets'
import type { CloudCreationSummary, CreationsCloud } from './creations-cloud'
import { createStoredSyncedMarks, reconcileCreations, type SyncedMarks } from './creations-sync'
import { perfSpanAsync } from './perf'

/** O que o wrapper avisa ao pacote (espelho estrutural de `PintaPersistenceEvent`). */
export type PintaCloudPersistenceEvent =
  | { type: 'sync-start' }
  | { type: 'changed' }
  | { type: 'palette-library-changed' }
  | { type: 'sync-end' }

/** A superfície do `PintaPersistence` do pacote (espelhada aqui para não importar o barril React). */
export interface PintaPersistenceLike {
  persistAsset(asset: PintaAsset): Promise<void>
  persistAssets(assets: readonly PintaAsset[]): Promise<void>
  deleteAsset(id: string): Promise<void>
  loadAssetById(id: string): Promise<PintaAsset | null>
  listAllAssets(): Promise<PintaAsset[]>
  subscribe?(listener: (event: PintaCloudPersistenceEvent) => void): () => void
  /** Biblioteca "Minhas paletas" (registro único; ver o pacote). O wrapper a espelha na nuvem. */
  loadPaletteLibrary?(): Promise<PaletteLibrary | null>
  savePaletteLibrary?(library: PaletteLibrary): Promise<PaletteLibrary>
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
 */
export function uniqueAssetName(base: string, taken: Set<string>): string {
  // Cortar no teto pode deixar um hífen na borda, que o `normalizeAssetName` da galeria
  // apararia na próxima leitura (e a cópia voltaria a ter o nome do original): apara aqui.
  const trimHyphen = (s: string) => s.replace(/-+$/, '')
  const root = trimHyphen(base.slice(0, MAX_NAME))
  if (!taken.has(root)) return root
  for (let n = 2; n < 1000; n += 1) {
    const suffix = `-${n}`
    const candidate = `${trimHyphen(root.slice(0, MAX_NAME - suffix.length))}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  const stamp = `-${Date.now().toString(36)}`
  return `${trimHyphen(root.slice(0, MAX_NAME - stamp.length))}${stamp}`
}

/** Nome da CÓPIA de conflito: `nave` → `nave-copia`, `nave-copia-2`… (kebab, como o pacote exige). */
export function copyName(name: string, taken: Set<string>): string {
  return uniqueAssetName(`${name}-copia`, taken)
}

export function createCloudMirroredPintaPersistence(options: {
  local: PintaPersistenceLike
  cloud: CreationsCloud
  /** Perfil (namespace) — as marcas de sincronia são por perfil. */
  viewerId: string
  marks?: SyncedMarks
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
  const now = options.now ?? (() => Date.now())
  const loadLibrary = local.loadPaletteLibrary?.bind(local)
  const saveLibrary = local.savePaletteLibrary?.bind(local)
  const reconcileMinIntervalMs = options.reconcileMinIntervalMs ?? RECONCILE_MIN_INTERVAL_MS
  const budgetMs = options.budgetMs ?? FIRST_LOAD_BUDGET_MS
  const passDelayMs = options.passDelayMs ?? DEFERRED_PASS_DELAY_MS
  const marks =
    options.marks ?? createStoredSyncedMarks(`sz:creations-synced:pinta:${options.viewerId}`)

  function enqueue(asset: PintaAsset): void {
    cloud.enqueueUpload(
      asset.id,
      async () => {
        // Sempre o estado MAIS RECENTE do disco (a fila pode rodar depois de mais edições).
        const current = await local.loadAssetById(asset.id)
        if (!current) return null
        // Nada mudou desde a última sincronia confirmada (a marca JÁ é este `updatedAt`): não
        // sobe — zero HTTP. É o que segura o editor, que persiste `[salvo, ...ligados]` e
        // reenfileirava peças/mapas intocados a cada autosave.
        if (marks.get(asset.id) === current.updatedAt) return null
        return {
          json: assetToJson(current),
          meta: {
            name: current.name,
            kind: current.kind,
            updatedAt: current.updatedAt,
            // A revisão que ESTE aparelho conhece (0 = nunca viu): a nuvem recusa base vencida.
            baseRevision: marks.revision(asset.id) ?? 0,
          },
        }
      },
      // A marca avança SÓ com o commit confirmado, com o `updatedAt` do que subiu.
      ({ itemId, updatedAt, revision }) => {
        marks.set(itemId, updatedAt, revision)
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
    if (downloaded) {
      const parsed = assetFromJson(downloaded.json)
      const remote = parsed.asset ? sanitizePintaAsset(parsed.asset) : null
      const mine = await local.loadAssetById(id)
      // A versão da nuvem É a deste aparelho (mesmo `updatedAt`: outra aba deste perfil subiu
      // antes de as marcas se encontrarem): só avança a marca — cópia aqui seria uma duplicata.
      if (remote && mine && remote.updatedAt === mine.updatedAt) {
        marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
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
      }
      marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
    }
    const current = await local.loadAssetById(id)
    if (current) enqueue(current)
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
    const revision = marks.revision(id) ?? null
    marks.setTombstone(id, { at, sent: false, revision })
    cloud.enqueueRemove(id, ({ revision: confirmedRevision }) =>
      marks.setTombstone(id, { at, sent: true, revision: confirmedRevision }),
    )
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
    if (paletteSummary) {
      // Revisão que esta marca não conhece → desce e funde (best-effort).
      if (marks.revision(PALETTE_LIBRARY_ITEM_ID) !== paletteSummary.revision) {
        try {
          await resolvePaletteConflict()
        } catch {
          // Best-effort: falha da biblioteca não bloqueia a galeria de desenhos.
        }
      }
    } else if (loadLibrary) {
      // Nuvem ainda sem a biblioteca: se há uma local com conteúdo, sobe.
      void loadLibrary()
        .then((library) => {
          if (library && library.palettes.length > 0) enqueuePaletteUpload()
        })
        .catch(() => {})
    }
    const takenNames = new Set(localAssets.map((a) => a.name))
    const nameOwner = new Map(localAssets.map((a) => [a.name, a.id]))
    const report = await reconcileCreations<PintaAsset, PintaAsset>({
      local: localAssets,
      cloud: assetSummaries,
      marks,
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
        if (!downloaded) return null
        const parsed = assetFromJson(downloaded.json)
        const asset = parsed.asset ? sanitizePintaAsset(parsed.asset) : null
        if (!asset || asset.id !== summary.itemId) return null
        return asset
      },
      apply: async (_summary, asset) => {
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
        await local.persistAssets([named])
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
      push: (item) => enqueue(item),
      remove: (itemId) =>
        cloud.enqueueRemove(itemId, ({ revision }) => {
          const tombstone = marks.tombstone(itemId)
          if (tombstone) marks.setTombstone(itemId, { ...tombstone, sent: true, revision })
        }),
    })
    return report.deferred
  }

  /** Dispara uma reconciliação (single-flight) e avisa o pacote do começo e do fim. */
  function startReconcile(localAssets: PintaAsset[]): void {
    if (!cloud.supported || reconcileInFlight) return
    emit({ type: 'sync-start' })
    reconcileInFlight = perfSpanAsync('kids:pinta:reconcile', () => reconcile(localAssets))
      .catch(() => localAssets) // nuvem fora do ar: fica com o que há aqui, como sempre
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
      if (event.type !== 'closed' || !skippedOpen.has(event.id)) return
      skippedOpen.delete(event.id)
      void local.listAllAssets().then((localAssets) => startReconcile(localAssets))
    }) ?? null

  return {
    async persistAsset(asset) {
      await local.persistAsset(asset)
      enqueue(asset)
    },
    async persistAssets(assets) {
      await local.persistAssets(assets)
      for (const asset of assets) enqueue(asset)
    },
    async deleteAsset(id) {
      await local.deleteAsset(id)
      marks.delete(id)
      enqueueRemove(id)
    },
    loadAssetById: (id) => local.loadAssetById(id),
    async listAllAssets() {
      const localAssets = await local.listAllAssets()
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
      unsubscribeOpenState?.()
      unsubscribeOpenState = null
    },
  }
}
