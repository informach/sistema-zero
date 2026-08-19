/**
 * "Guardado na sua conta" para o ESTÚDIO COMPLETO: liga o espelho do pacote
 * (`setStudioCloudMirror`) à fila da nuvem e faz a DESCIDA em segundo plano.
 *
 * O que sobe: o `Project` relido do disco na hora de subir (`loadProjectSnapshotForCloud`
 * — com blocos e assets); assim renomear, duplicar e a troca de desenho pelo Pinta também
 * sobem, e a fila sempre manda o estado mais recente. Projeto COM assets sobe em PARTES
 * (19/08/2026): o blob principal é um MANIFESTO (`sz-studio-parts` v1: o programa — o
 * `Project` sem os assets — e a lista de hashes dos assets, na ordem) e cada asset é uma
 * parte endereçada por conteúdo (SHA-256 do JSON canônico do `ProjectAsset`); a fila
 * declara os hashes e só comprime/envia as partes que a nuvem NÃO tem — editar blocos por
 * um minuto sobe só manifestos de KB, trocar um desenho sobe uma parte. Sem assets, ou sem
 * `crypto.subtle`, sobe o `Project` inteiro como antes (o servidor solta as partes). O nome
 * é cortado no teto do índice (120): o Estúdio aceita até 200 e um 400 deixaria o jogo sem
 * subir para sempre.
 *
 * O que desce é resolvido primeiro (`resolveCloudProject`: manifesto → as partes que este
 * aparelho já tem do MESMO projeto, por hash, não são baixadas; as outras descem, com o
 * hash conferido; blob antigo passa direto) e CONFERIDO sem gravar
 * (`validateCloudProjectSnapshot`: id, tetos e o saneamento ESTRITO — blocos/programa que
 * esta versão não reconhece RECUSAM a descida em vez de gravar um jogo esvaziado) e só então
 * entra por `restoreProjectFromCloud` (id conferido e datas preservados, SUBSTITUINDO
 * blocos/capa antigos, SEM acordar o espelho). Conflito real → o local vira
 * "<nome> (deste computador)" por `importProjectSnapshot` (id novo), DEPOIS de a
 * descida ter sido baixada e validada, antes de a nuvem substituir.
 *
 * Marcas de sincronia avançam SÓ com o commit confirmado (`onUploaded`) ou com uma
 * descida gravada — e guardam a REVISÃO da nuvem, que vai como `baseRevision` na
 * próxima reserva. Base vencida (outro aparelho subiu antes) → `onStale`: a versão da
 * nuvem entra como "<nome> (de outro aparelho)" (id novo, sobe pelo espelho), a marca
 * avança para a revisão dela e o jogo daqui sobe de novo — os dois sobrevivem, e o
 * jogo ABERTO no editor continua sendo o jogo (o id fica com ele). Apagar grava LÁPIDE
 * local (ver `creations-sync.ts`).
 *
 * A descida (`pullMissing`) é single-flight: duas chamadas em voo (StrictMode, remontagem
 * rápida) usam a mesma reconciliação — senão um conflito virava duas cópias.
 *
 * O módulo do Estúdio é carregado dinamicamente pelo host (Monaco/Blockly não
 * rodam no SSR): as funções chegam por parâmetro, nunca por import estático.
 */
import {
  type CloudCreationSummary,
  type CloudDownload,
  type CloudPart,
  type CreationsCloud,
  canonicalJson,
  hashSupported,
  sha256Hex,
} from './creations-cloud'
import { createStoredSyncedMarks, reconcileCreations, type SyncedMarks } from './creations-sync'
import { perfSpanAsync } from './perf'

/** O pedaço do módulo `@sistemazero/studio` que este adaptador usa. */
export interface StudioCloudModule {
  setStudioCloudMirror(
    mirror: { onChanged(id: string): void; onDeleted(id: string): void } | null,
  ): void
  loadProjectSnapshotForCloud(
    id: string,
    opts?: { namespace?: string },
  ): Promise<StudioProjectLike | null>
  restoreProjectFromCloud(
    raw: unknown,
    opts?: { expectedId?: string; namespace?: string },
  ): Promise<{ project: StudioProjectLike; warnings: string[] }>
  /** O mesmo saneamento do restauro, SEM gravar (a descida confere antes de tocar no disco). */
  validateCloudProjectSnapshot(
    raw: unknown,
    opts?: { expectedId?: string },
  ): { project: StudioProjectLike; warnings: string[] }
  importProjectSnapshot(
    raw: unknown,
    opts?: { name?: string; namespace?: string; silent?: boolean },
  ): Promise<{ project: StudioProjectLike; warnings: string[] }>
  discardImportedProjectSnapshot(id: string, opts?: { namespace?: string }): Promise<void>
  createLocalPersistenceAdapter(opts?: { namespace?: string }): {
    list?: () => Promise<Array<{ id: string; name: string; updatedAt: number }>>
  }
  /**
   * Opcional: SÓ a partição de assets de um projeto do perfil (sem meta/blocos). A descida
   * de um projeto em partes reaproveita o que já está neste aparelho (mesmo hash).
   */
  loadProjectAssetsSnapshotForCloud?(id: string, opts?: { namespace?: string }): Promise<unknown[]>
  /** Opcional: a lista LEVE (sem capas) do perfil — a descida só compara ids e datas. */
  listProjectSummariesLightForCloud?(opts?: {
    namespace?: string
  }): Promise<Array<{ id: string; name: string; updatedAt: number }>>
  /** Opcional: o resumo (meta) de UM projeto do perfil; `null` = não existe. */
  loadProjectSummaryForCloud?(
    id: string,
    opts?: { namespace?: string },
  ): Promise<{ id: string; name: string; updatedAt: number } | null>
  /**
   * Opcional: o projeto está ABERTO em algum editor da página? A descida nem copia nem
   * restaura um projeto aberto (o restauro seria recusado pela guarda — e a cópia de conflito
   * ficaria órfã a cada passe); fica para a próxima carga, ou a subida cai em base vencida.
   */
  isProjectOpenAnywhere?(id: string): boolean
}

/** O mínimo do `Project` que a nuvem precisa ler. */
export interface StudioProjectLike {
  id: string
  name: string
  kind?: string
  updatedAt: number
  /** Os assets embutidos (desenhos/sons): viram PARTES na subida. */
  assets?: unknown[]
}

/** O blob principal de um projeto guardado em partes. */
export const STUDIO_PARTS_FORMAT = 'sz-studio-parts'
export const STUDIO_PARTS_VERSION = 1

export interface StudioPartsManifest {
  format: typeof STUDIO_PARTS_FORMAT
  version: typeof STUDIO_PARTS_VERSION
  /** O `Project` SEM os assets (`assets: []`). */
  program: Record<string, unknown>
  /** Hashes das partes NA ORDEM dos assets (o saneamento dedupa/orça "primeiro que chega"). */
  assets: string[]
}

export function isStudioPartsManifest(raw: unknown): raw is StudioPartsManifest {
  if (!raw || typeof raw !== 'object') return false
  const value = raw as Record<string, unknown>
  return (
    value.format === STUDIO_PARTS_FORMAT &&
    value.version === STUDIO_PARTS_VERSION &&
    !!value.program &&
    typeof value.program === 'object' &&
    Array.isArray(value.assets) &&
    value.assets.every((hash) => typeof hash === 'string')
  )
}

/** Descidas de partes em paralelo (briga com banda e com o compasso da fila). */
const PART_FETCH_CONCURRENCY = 3

/**
 * Monta o que sobe: com assets (e SHA-256 disponível), o manifesto + uma parte por asset;
 * senão, o `Project` inteiro (fio simples). `text()` recalcula o JSON canônico só quando a
 * parte precisa subir — o produtor não segura uma cópia de cada asset em memória.
 */
export async function buildStudioCloudSnapshot(
  project: StudioProjectLike,
): Promise<{ json: string; parts?: CloudPart[] }> {
  const assets = Array.isArray(project.assets) ? project.assets : []
  if (assets.length === 0 || !hashSupported()) return { json: JSON.stringify(project) }
  // Um asset por vez: o pico de memória é UM JSON canônico (um cenário pode ter MB), não
  // todos de uma vez — e o digest já roda fora da main thread.
  const hashes = await perfSpanAsync(
    'kids:studio:hash',
    async () => {
      const out: string[] = []
      for (const asset of assets) out.push(await sha256Hex(canonicalJson(asset)))
      return out
    },
    { assets: assets.length },
  )
  const manifest: StudioPartsManifest = {
    format: STUDIO_PARTS_FORMAT,
    version: STUDIO_PARTS_VERSION,
    program: { ...(project as unknown as Record<string, unknown>), assets: [] },
    assets: hashes,
  }
  return {
    json: JSON.stringify(manifest),
    parts: assets.map((asset, index) => ({
      hash: hashes[index] as string,
      text: () => canonicalJson(asset),
    })),
  }
}

const FIRST_LOAD_BUDGET_MS = 6000
const LIST_TIMEOUT_MS = 4000
/** O que não coube no orçamento (`deferred`) volta em passes seguidos, com esta folga, até este teto. */
const DEFERRED_PASS_DELAY_MS = 2000
const MAX_DEFERRED_PASSES = 5
/** Teto do nome no índice (`CREATION_LIMITS.maxNameChars`); o BFF também corta. */
const MAX_CLOUD_NAME = 120

type StudioMirror = Parameters<StudioCloudModule['setStudioCloudMirror']>[0]
/** Mirror vigente por módulo carregado. Um cleanup antigo não pode apagar o sucessor. */
const activeMirrors = new WeakMap<StudioCloudModule, Exclude<StudioMirror, null>>()

function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: T | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      resolve(value)
    }
    const abort = () => finish(null)
    const timer = setTimeout(() => finish(null), ms)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
    promise.then(
      (value) => finish(value),
      () => finish(null),
    )
  })
}

export function createStudioCloudSync(options: {
  studio: StudioCloudModule
  cloud: CreationsCloud
  viewerId: string
  marks?: SyncedMarks
  now?: () => number
  /** Avisos de saneamento das descidas (partes descartadas). Default: `console.warn`. */
  onWarnings?: (itemId: string, warnings: string[]) => void
}): {
  /** Liga o espelho (subidas automáticas). Devolve o desligar. */
  attach(): () => void
  /** A descida: compara local × nuvem e traz o que falta/está mais novo. */
  pullMissing(): Promise<void>
  /** Cancela imediatamente a descida desta instância (troca de perfil/desmontagem). */
  cancelPull(): void
  /**
   * Baixa UM projeto da nuvem já resolvido (manifesto + partes → `Project`; blob antigo passa
   * direto), SEM validar nem gravar. `null` = a nuvem não tem.
   */
  downloadProject(id: string): Promise<{ raw: unknown; summary: CloudCreationSummary } | null>
  /**
   * Baixa E RESTAURA um projeto da nuvem (para o host recuperar um projeto que a descida da
   * carga não alcançou — o do Pensa "recriar neste aparelho"), avançando a marca de sincronia
   * só depois de gravar: sem a marca, a primeira edição subiria com base 0 e viraria uma cópia
   * "(de outro aparelho)" espúria. `false` = a nuvem não tem.
   */
  restoreProject(id: string): Promise<boolean>
} {
  const { studio, cloud } = options
  const now = options.now ?? (() => Date.now())
  const marks =
    options.marks ?? createStoredSyncedMarks(`sz:creations-synced:studio:${options.viewerId}`)
  const onWarnings =
    options.onWarnings ??
    ((itemId: string, warnings: string[]) => {
      console.warn('[estudio-nuvem] descida com partes descartadas', { itemId, warnings })
    })

  /**
   * Resolve o que desceu num `Project` completo: manifesto → monta `program + assets` (as
   * partes que este aparelho já tem do MESMO projeto não são baixadas; as outras descem com
   * o hash conferido); blob antigo (o `Project` inteiro) passa direto.
   */
  async function resolveCloudProject(downloaded: CloudDownload, itemId: string): Promise<unknown> {
    const raw = JSON.parse(downloaded.json) as unknown
    if (!isStudioPartsManifest(raw)) return raw
    const local = new Map<string, unknown>()
    if (hashSupported() && studio.loadProjectAssetsSnapshotForCloud) {
      const mine = await studio
        .loadProjectAssetsSnapshotForCloud(itemId, { namespace: options.viewerId })
        .catch(() => [] as unknown[])
      await Promise.all(
        mine.map(async (asset) => {
          local.set(await sha256Hex(canonicalJson(asset)), asset)
        }),
      )
    }
    const missing = [...new Set(raw.assets)].filter((hash) => !local.has(hash))
    const fetched = new Map<string, unknown>()
    await perfSpanAsync(
      'kids:studio:parts',
      async () => {
        let cursor = 0
        const worker = async () => {
          while (cursor < missing.length) {
            const hash = missing[cursor] as string
            cursor += 1
            fetched.set(hash, JSON.parse(await downloaded.fetchPart(hash)) as unknown)
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(PART_FETCH_CONCURRENCY, missing.length) }, worker),
        )
      },
      { total: raw.assets.length, fetched: missing.length },
    )
    return {
      ...raw.program,
      assets: raw.assets.map((hash) => local.get(hash) ?? fetched.get(hash)),
    }
  }

  function enqueue(id: string): void {
    cloud.enqueueUpload(
      id,
      async () => {
        const project = await studio.loadProjectSnapshotForCloud(id, {
          namespace: options.viewerId,
        })
        if (!project) return null
        // Nada mudou desde a última sincronia confirmada (a marca JÁ é o `updatedAt` deste
        // disco): não sobe de novo — zero HTTP. Só pula quando a marca é igual; uma edição
        // nunca enviada tem `updatedAt` diferente da marca e sobe.
        if (marks.get(id) === project.updatedAt) return null
        return {
          ...(await buildStudioCloudSnapshot(project)),
          meta: {
            name: Array.from(project.name).slice(0, MAX_CLOUD_NAME).join(''),
            kind: project.kind === 'pro' ? 'pro' : 'classic',
            updatedAt: project.updatedAt,
            // A revisão que ESTE aparelho conhece (0 = nunca viu): a nuvem recusa base vencida.
            baseRevision: marks.revision(id) ?? 0,
          },
        }
      },
      ({ itemId, updatedAt, revision }) => {
        marks.set(itemId, updatedAt, revision)
        marks.clearTombstone(itemId)
      },
      ({ itemId }) => resolveStale(itemId),
    )
  }

  /**
   * Base vencida: outro aparelho subiu este jogo depois da última vez que este viu a
   * nuvem. A versão da nuvem vira um jogo NOVO ("(de outro aparelho)"), a marca passa a
   * conhecer a revisão dela e o jogo daqui sobe de novo — nada se perde, e o jogo aberto
   * no editor continua com o id dele. Nuvem sem o item (apagado lá) → sobe direto (a
   * reserva aceita qualquer base numa linha apagada).
   */
  async function resolveStale(id: string): Promise<void> {
    const downloaded = await cloud.download(id)
    if (downloaded) {
      const raw = await resolveCloudProject(downloaded, id)
      const name =
        raw && typeof raw === 'object' && typeof (raw as { name?: unknown }).name === 'string'
          ? (raw as { name: string }).name
          : id
      // Cópia = jogo NOVO (id novo) — o import minta ulid, sanitiza e sobe pelo espelho.
      await studio.importProjectSnapshot(raw, {
        name: Array.from(`${name} (de outro aparelho)`).slice(0, MAX_CLOUD_NAME).join(''),
        namespace: options.viewerId,
      })
      marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
    }
    enqueue(id)
  }

  function enqueueRemove(id: string): void {
    const at = now()
    const revision = marks.revision(id) ?? null
    marks.setTombstone(id, { at, sent: false, revision })
    cloud.enqueueRemove(id, ({ revision: confirmedRevision }) =>
      marks.setTombstone(id, { at, sent: true, revision: confirmedRevision }),
    )
  }

  let pullInFlight: Promise<void> | null = null
  const pullAbort = new AbortController()

  return {
    attach() {
      const mirror: Exclude<StudioMirror, null> = {
        onChanged: (id) => enqueue(id),
        onDeleted: (id) => {
          marks.delete(id)
          enqueueRemove(id)
        },
      }
      activeMirrors.set(studio, mirror)
      studio.setStudioCloudMirror(mirror)
      return () => {
        if (activeMirrors.get(studio) !== mirror) return
        activeMirrors.delete(studio)
        studio.setStudioCloudMirror(null)
      }
    },
    pullMissing() {
      if (pullAbort.signal.aborted) return Promise.resolve()
      if (!pullInFlight) {
        pullInFlight = perfSpanAsync('kids:studio:pull', () => pullMissingOnce()).finally(() => {
          pullInFlight = null
        })
      }
      return pullInFlight
    },
    cancelPull() {
      pullAbort.abort()
    },
    async downloadProject(id) {
      const downloaded = await cloud.download(id)
      if (!downloaded) return null
      return { raw: await resolveCloudProject(downloaded, id), summary: downloaded.summary }
    },
    async restoreProject(id) {
      const downloaded = await cloud.download(id)
      if (!downloaded) return false
      const raw = await resolveCloudProject(downloaded, id)
      const restored = await studio.restoreProjectFromCloud(raw, {
        expectedId: id,
        namespace: options.viewerId,
      })
      if (restored.project.id !== id) return false
      marks.set(id, downloaded.summary.itemUpdatedAt, downloaded.summary.revision)
      marks.clearTombstone(id)
      return true
    },
  }

  async function pullMissingOnce(): Promise<void> {
    // O que não coube no orçamento desta carga (`deferred`) NÃO fica para o próximo F5: volta
    // em passes seguidos, com folga, até esvaziar (ou até o teto) — antes um aparelho novo com
    // 300 jogos precisava de vários recarregamentos, sem nenhuma pista.
    for (let pass = 0; pass < MAX_DEFERRED_PASSES; pass += 1) {
      if (pullAbort.signal.aborted) return
      const deferred = await pullPass()
      if (deferred === 0 || pullAbort.signal.aborted) return
      // Folga entre passes, cortada pelo `cancelPull` (troca de perfil não espera 2 s).
      await new Promise<void>((resolve) => {
        const timer = setTimeout(done, DEFERRED_PASS_DELAY_MS)
        function done() {
          clearTimeout(timer)
          pullAbort.signal.removeEventListener('abort', done)
          resolve()
        }
        pullAbort.signal.addEventListener('abort', done, { once: true })
      })
    }
  }

  /** Um passe da descida; devolve quantos itens ficaram de fora por tempo. */
  async function pullPass(): Promise<number> {
    {
      if (!cloud.supported) return 0
      // A lista LEVE quando o pacote tem (a descida só compara ids e datas; a lista com capas
      // custa 1,5–12 MB por passe); senão a do adapter local.
      const list = studio.listProjectSummariesLightForCloud
        ? () => studio.listProjectSummariesLightForCloud?.({ namespace: options.viewerId }) ?? []
        : studio.createLocalPersistenceAdapter({ namespace: options.viewerId }).list
      if (!list) return 0
      const [local, remote] = await Promise.all([
        list(),
        withTimeout(cloud.list({ signal: pullAbort.signal }), LIST_TIMEOUT_MS, pullAbort.signal),
      ])
      if (!remote) return 0
      const report = await reconcileCreations<
        { id: string; name: string; updatedAt: number },
        unknown
      >({
        local,
        cloud: remote,
        marks,
        signal: pullAbort.signal,
        now,
        budgetMs: FIRST_LOAD_BUDGET_MS,
        // Aberto num editor: nem cópia nem restauro (o restauro seria recusado; a cópia de
        // conflito ficaria órfã a cada passe).
        isBusy: (itemId) => studio.isProjectOpenAnywhere?.(itemId) ?? false,
        // Mudou no disco depois do retrato (renomear/autosave no meio)? Não restaura por cima.
        localUpdatedAt: studio.loadProjectSummaryForCloud
          ? async (itemId) =>
              (await studio.loadProjectSummaryForCloud?.(itemId, { namespace: options.viewerId }))
                ?.updatedAt ?? null
          : undefined,
        fetch: async (summary: CloudCreationSummary, signal: AbortSignal) => {
          const downloaded = await cloud.download(summary.itemId, { signal })
          if (!downloaded) return null
          try {
            const raw = await resolveCloudProject(downloaded, summary.itemId)
            // TODA a validação aqui, sem gravar (id, tetos, saneamento estrito): uma descida
            // recusada não pode deixar uma cópia "(deste computador)" órfã a cada carga.
            const { project, warnings } = studio.validateCloudProjectSnapshot(raw, {
              expectedId: summary.itemId,
            })
            if (warnings.length > 0) onWarnings(summary.itemId, warnings)
            return project
          } catch (error) {
            console.warn('[estudio-nuvem] descida recusada', { itemId: summary.itemId, error })
            return null
          }
        },
        apply: async (summary, project) => {
          // Já conferido no `fetch`; o restauro sanea de novo (idempotente) e grava.
          const restored = await studio.restoreProjectFromCloud(project, {
            expectedId: summary.itemId,
            namespace: options.viewerId,
          })
          return restored.project.id === summary.itemId
        },
        keepLocalCopy: async (item) => {
          const project = await studio.loadProjectSnapshotForCloud(item.id, {
            namespace: options.viewerId,
          })
          if (!project) {
            throw new Error('Projeto local sumiu antes de preservar o conflito.')
          }
          // Cópia = projeto NOVO (id novo) — o import já minta ulid e sobe pelo espelho.
          const imported = await studio.importProjectSnapshot(project, {
            name: Array.from(`${project.name} (deste computador)`)
              .slice(0, MAX_CLOUD_NAME)
              .join(''),
            namespace: options.viewerId,
            silent: true,
          })
          return {
            commit: () => enqueue(imported.project.id),
            rollback: () =>
              studio.discardImportedProjectSnapshot(imported.project.id, {
                namespace: options.viewerId,
              }),
          }
        },
        push: (item) => enqueue(item.id),
        remove: (itemId) =>
          cloud.enqueueRemove(itemId, ({ revision }) => {
            const tombstone = marks.tombstone(itemId)
            if (tombstone) marks.setTombstone(itemId, { ...tombstone, sent: true, revision })
          }),
      })
      return report.deferred
    }
  }
}
