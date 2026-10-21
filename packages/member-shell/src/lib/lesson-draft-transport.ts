/**
 * O rascunho do Estúdio e do Pinta DENTRO da aula, guardado na conta (10/10/2026). Implementa o
 * contrato `LessonDraftCloud` do member-shell com o mesmo transporte das criações livres
 * (`createCreationsCloud`): reserva no BFF → PUT direto no R2 → commit, um item por BLOCO.
 *
 * Duas filas (uma por ferramenta, `lesson-studio` e `lesson-pinta`) e as marcas de sempre em
 * `localStorage` (`sz:creations-synced:lesson-<ferramenta>:<perfil>`): o que este aparelho
 * confirmou com a conta, que vira a `baseRevision` da próxima subida.
 *
 * Conflito na subida (outro computador subiu antes, 409 `CREATION_STALE_BASE`): a versão da conta
 * vira a "outra versão" deste navegador (o bloco guarda), a revisão dela passa a ser a base e a
 * versão daqui sobe por cima. É a regra da dona: abre a mais nova, a outra fica guardada.
 * Exceções que o bloco decide: conteúdo igual só adota a revisão, e no PRIMEIRO contato (este
 * aparelho nunca teve marca do bloco: abriu sem conseguir perguntar à conta) a versão da conta
 * passa para cima, porque a daqui pode ser só o modelo inicial.
 *
 * O selo é de cada BLOCO (`getItemState`), não da fila da ferramenta: um bloco com erro não pinta
 * o selo do vizinho. Bloco cuja versão da conta veio de um editor mais novo que esta página
 * (`CREATION_CLIENT_OUTDATED`) para de subir até a página ser atualizada: cada nova tentativa só
 * baixaria a versão da conta de novo para falhar do mesmo jeito.
 */

import {
  type CloudItemState,
  type CloudPeek,
  type CreationsCloud,
  createCreationsCloud,
  type FetchLike,
} from './creations-cloud'
import { createStoredSyncedMarks, type SyncedMarks } from './creations-sync'
import {
  createLessonDraftCoordinator,
  LESSON_DRAFT_OUTDATED,
  type LessonDraftChannel,
  type LessonDraftCloud,
  type LessonDraftConflictOutcome,
  type LessonDraftRemote,
  type LessonDraftState,
  type LessonDraftUpload,
} from './lesson-draft-cloud'
import {
  buildStudioCloudSnapshot,
  resolveStudioCloudDocument,
  type StudioProjectLike,
} from './studio-cloud'

type Ferramenta = 'studio' | 'pinta'

const IDLE_MS: Readonly<Record<Ferramenta, number>> = { studio: 2000, pinta: 1500 }

function estado(state: CloudItemState): LessonDraftState {
  return {
    status: state.status,
    message: state.lastError,
    ...(state.code === LESSON_DRAFT_OUTDATED ? { outdated: true } : {}),
  }
}

function canal(
  cloud: CreationsCloud,
  marks: SyncedMarks,
  ferramenta: Ferramenta,
): LessonDraftChannel {
  const remoto = (espiada: CloudPeek): LessonDraftRemote => ({
    revision: espiada.summary.revision,
    syncedAt: espiada.summary.syncedAt,
    fingerprint: espiada.summary.contentFingerprint ?? null,
    serverNow: espiada.serverNow,
    async load(localAssets = []) {
      const baixado = await espiada.load()
      return ferramenta === 'studio'
        ? resolveStudioCloudDocument(baixado, localAssets)
        : (JSON.parse(baixado.json) as unknown)
    },
  })

  const marcar = (id: string, updatedAt: number, revision: number) => {
    marks.set(id, updatedAt, revision)
    marks.flush?.()
  }

  async function espiar(id: string, options?: { signal?: AbortSignal }) {
    const espiada = await cloud.peek(id, options)
    return espiada && !espiada.summary.deletedAt ? espiada : null
  }

  function enfileirar(
    id: string,
    produce: () => Promise<LessonDraftUpload | null>,
    onConflict?: (
      remote: LessonDraftRemote,
      context: { firstContact: boolean },
    ) => Promise<LessonDraftConflictOutcome | undefined>,
  ): void {
    // Esta página não lê a versão da conta (ou o servidor não aceita mais o formato dela): só a
    // página nova resolve. O rascunho continua guardado no disco deste computador.
    if (cloud.getItemState(id).code === LESSON_DRAFT_OUTDATED) return
    cloud.enqueueUpload(
      id,
      async () => {
        const subida = await produce()
        if (!subida) return null
        // Nada mudou desde a última conversa com a conta: zero HTTP.
        if (marks.get(id) === subida.updatedAt && marks.revision(id) !== undefined) return null
        const snapshot =
          ferramenta === 'studio'
            ? await buildStudioCloudSnapshot(subida.document as StudioProjectLike)
            : { json: JSON.stringify(subida.document) }
        return {
          ...snapshot,
          meta: {
            name: subida.name,
            kind: subida.kind,
            updatedAt: subida.updatedAt,
            baseRevision: marks.revision(id) ?? 0,
            fingerprint: subida.fingerprint,
            ...(subida.formatVersion !== undefined ? { formatVersion: subida.formatVersion } : {}),
          },
        }
      },
      ({ updatedAt, revision }) => marcar(id, updatedAt, revision),
      async ({ currentRevision }) => {
        // Outro computador subiu antes: a versão de lá vira a "outra", e a daqui sobe por cima.
        const firstContact = marks.revision(id) === undefined
        const espiada = await espiar(id)
        const revisao = espiada?.summary.revision ?? currentRevision ?? 0
        const desfecho =
          espiada && onConflict ? await onConflict(remoto(espiada), { firstContact }) : undefined
        if (desfecho?.adopted) {
          // O disco já tem o conteúdo da conta: só passa a conhecer a revisão, sem subir de novo.
          marcar(id, desfecho.adopted.updatedAt, revisao)
          return
        }
        marcar(id, marks.get(id) ?? 0, revisao)
        enfileirar(id, produce, onConflict)
      },
    )
  }

  return {
    supported: cloud.supported,
    mark(id) {
      const revision = marks.revision(id)
      const updatedAt = marks.get(id)
      return revision === undefined || updatedAt === undefined ? null : { revision, updatedAt }
    },
    setMark(id, mark) {
      marcar(id, mark.updatedAt, mark.revision)
    },
    async peek(id, options) {
      const espiada = await espiar(id, options)
      return espiada ? remoto(espiada) : null
    },
    enqueue: enfileirar,
    flush: (timeoutMs) => cloud.flush(timeoutMs === undefined ? undefined : { timeoutMs }),
    confirm: (blockId, timeoutMs) => cloud.confirm(blockId, { timeoutMs }),
    getState: (blockId) => estado(cloud.getItemState(blockId)),
    subscribe: (listener) => cloud.subscribeItems(listener),
  }
}

export interface KidsLessonDraftCloud extends LessonDraftCloud {
  /** Sobe o pendente (com teto) e desliga as filas: troca de perfil ou saída da aula. */
  dispose(): Promise<void>
}

export function createLessonDraftCloud(options: {
  viewerId: string
  audience?: 'adult' | 'kids'
  fetch?: FetchLike
  /** Marcas em memória nos testes. */
  marks?: Partial<Record<Ferramenta, SyncedMarks>>
}): KidsLessonDraftCloud {
  const nuvem = (ferramenta: Ferramenta) =>
    createCreationsCloud({
      tool: ferramenta === 'studio' ? 'lesson-studio' : 'lesson-pinta',
      viewerId: options.viewerId,
      idleMs: IDLE_MS[ferramenta],
      ...(options.fetch ? { fetch: options.fetch } : {}),
    })
  const marcas = (ferramenta: Ferramenta) =>
    options.marks?.[ferramenta] ??
    createStoredSyncedMarks(
      `sz:creations-synced:lesson-${ferramenta}:${options.audience === 'adult' ? 'adult:' : ''}${options.viewerId}`,
    )
  const studioCloud = nuvem('studio')
  const pintaCloud = nuvem('pinta')
  const studio = canal(studioCloud, marcas('studio'), 'studio')
  const pinta = canal(pintaCloud, marcas('pinta'), 'pinta')
  return {
    studio,
    pinta,
    ...createLessonDraftCoordinator({ studio, pinta }),
    async flushAll(timeoutMs) {
      await Promise.all([studio.flush(timeoutMs), pinta.flush(timeoutMs)])
    },
    async dispose() {
      await Promise.all([studio.flush(5000), pinta.flush(5000)]).catch(() => {})
      studioCloud.dispose()
      pintaCloud.dispose()
    },
  }
}

/**
 * Uma nuvem por PERFIL e por aba, guardada fora do React: a aula pode trocar (nova página do
 * player) e o StrictMode monta duas vezes, mas a fila, as marcas e o que está pendente são os
 * mesmos. Trocar de perfil é outra chave, e a fila do perfil anterior é descartada (ela só
 * receberia `VIEWER_MISMATCH` e continuaria ouvindo `pagehide`/`online` à toa).
 */
export function lessonDraftCloudFor(
  viewerId: string,
  audience: 'adult' | 'kids' = 'kids',
): KidsLessonDraftCloud {
  const NUVENS = Symbol.for(`sz.${audience}.lesson-drafts`)
  const store = globalThis as unknown as Record<symbol, Map<string, KidsLessonDraftCloud>>
  store[NUVENS] ??= new Map()
  const nuvens = store[NUVENS]
  for (const [outro, antiga] of nuvens) {
    if (outro === viewerId) continue
    nuvens.delete(outro)
    void antiga.dispose()
  }
  let nuvem = nuvens.get(viewerId)
  if (!nuvem) {
    nuvem = createLessonDraftCloud({ viewerId, audience })
    nuvens.set(viewerId, nuvem)
  }
  return nuvem
}
