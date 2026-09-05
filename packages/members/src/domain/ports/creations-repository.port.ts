import type {
  CreationPartRef,
  CreationRecord,
  CreationSummary,
  CreationTool,
} from '../creations/creation'

/** Metadados que o cliente manda ao reservar um upload (o `updatedAt` é o do item). */
export interface CreationUploadInput {
  userId: string
  accountId: string
  tool: CreationTool
  itemId: string
  name: string
  kind: string
  itemUpdatedAt: Date
  /** Bytes COMPRIMIDOS do blob PRINCIPAL (manifesto ou blob único) — assinados na URL. */
  bytes: number
  thumb: string | null
  /**
   * PARTES que a revisão referencia (hash de conteúdo; `bytes` só precisa vir para as que o
   * item ainda não tem). Ausente/vazio = blob único (Pinta, clientes antigos).
   */
  parts?: ReadonlyArray<{ hash: string; bytes?: number }>
  /**
   * A revisão da nuvem que o APARELHO conhece para este item (0 = nunca viu / item novo).
   * Quando vem, a reserva só passa se for a revisão CORRENTE: um aparelho atrasado não
   * pode passar por cima do que outro subiu depois (perda silenciosa) — recebe
   * `stale-base` e resolve o conflito do lado dele. `undefined` = sem conferência.
   */
  baseRevision?: number
  now: Date
  /** Tetos conferidos DENTRO da mesma transação da reserva (atômico com o lock da linha). */
  limits: {
    /** Manifesto + partes por ITEM (o serviço já barra o blob principal sozinho). */
    maxItemBytes: number
    maxTotalBytes: number
    maxItemsPerTool: number
  }
}

/** O que a reserva devolve. */
export type CreationUploadReservation =
  /** A revisão nova (a chave do R2 é derivada dela) + as partes que FALTAM no R2 (a assinar). */
  | { ok: true; revision: number; missingParts: CreationPartRef[] }
  /** Partes faltantes vieram sem `bytes`: nada reservado; o cliente volta com eles. */
  | { ok: false; reason: 'parts-need-bytes'; hashes: string[] }
  /** Manifesto + partes passam do teto por item. */
  | { ok: false; reason: 'item-bytes' }
  /** Estourou o teto: de bytes do perfil, ou de itens vivos na ferramenta. */
  | { ok: false; reason: 'total-bytes' | 'items-per-tool' }
  /** Marcadores reservados da biblioteca vieram incompletos ou mudariam a identidade da linha. */
  | { ok: false; reason: 'palette-library-identity' }
  | { ok: false; reason: 'account-deleting' }
  /** A `baseRevision` do aparelho não é a corrente (outro aparelho subiu depois): 409. */
  | { ok: false; reason: 'stale-base'; currentRevision: number }

/** Uso do perfil, para a quota (só itens vivos JÁ CONFIRMADOS). */
export interface CreationUsage {
  totalBytes: number
  countByTool: Record<CreationTool, number>
}

export interface CreationListCursor {
  itemUpdatedAt: Date
  itemId: string
}

export interface CreationListPage {
  items: CreationSummary[]
  nextCursor: CreationListCursor | null
}

/** O que o commit devolve. */
export type CreationCommitResult =
  /**
   * Promoveu a revisão reservada. `previousStorageRef` = blob principal que ela substituiu;
   * `releasedPartRefs` = partes da revisão anterior que a nova NÃO referencia mais (o BFF
   * apaga tudo isso do R2, best-effort).
   */
  | {
      ok: true
      alreadyCommitted: false
      previousStorageRef: string | null
      releasedPartRefs: CreationPartRef[]
    }
  /** A revisão pedida JÁ é a corrente (retry de um 200 perdido): idempotente. */
  | { ok: true; alreadyCommitted: true; previousStorageRef: null; releasedPartRefs: [] }
  /** Não é a revisão reservada (upload velho, outro navegador reservou depois, nada reservado). */
  | {
      ok: false
      reason?: 'total-bytes' | 'items-per-tool' | 'palette-library-identity'
    }
  /** A reserva exigia partes que o cliente não confirmou ter enviado (a reserva fica viva). */
  | { ok: false; reason: 'parts-missing'; hashes: string[] }

export type CreationDeleteResult =
  | {
      ok: true
      deleted: boolean
      storageRef: string | null
      partRefs: CreationPartRef[]
      revision: number
    }
  | { ok: false; reason: 'stale-base'; currentRevision: number }

export interface CreationsRepository {
  /** Índice do perfil numa ferramenta — só itens VIVOS e já confirmados, mais novos primeiro. */
  list(userId: string, tool: CreationTool): Promise<CreationSummary[]>
  /** Página estável do índice; busca `limit + 1` para produzir o próximo cursor. */
  listPage(
    userId: string,
    tool: CreationTool,
    options: { limit: number; cursor?: CreationListCursor },
  ): Promise<CreationListPage>
  /** Remove em lote lápides anteriores à janela de retenção. */
  compactTombstones(cutoff: Date, limit: number): Promise<number>
  /** Uma linha (inclusive apagada — quem decide é o serviço). `null` = não existe. */
  get(userId: string, tool: CreationTool, itemId: string): Promise<CreationRecord | null>
  usage(userId: string): Promise<CreationUsage>
  /**
   * Reserva a PRÓXIMA revisão, sob lock da chave `(user, tool, item)`, conferindo a
   * quota dentro da mesma transação: cria a linha (revision 0, sem blob) se não existe,
   * ou grava a reserva em `pending_*`. A revisão é `last_reserved_revision + 1` — um
   * contador que NUNCA volta, para duas reservas nunca dividirem a mesma chave no R2.
   *
   * ⚠️ NÃO toca nas colunas que a lista mostra (nome, kind, `item_updated_at`, thumb,
   * `deleted_at`): tudo isso só muda no `commit`.
   */
  reserveUpload(input: CreationUploadInput): Promise<CreationUploadReservation>
  /**
   * Confirma a revisão reservada: promove `pending_*` para as colunas correntes
   * (`revision`, `storage_ref`, `bytes`, nome, kind, `item_updated_at`, thumb),
   * `deleted_at = null`, `synced_at`. Idempotente para a revisão já corrente.
   */
  commit(input: {
    userId: string
    tool: CreationTool
    itemId: string
    revision: number
    storageRef: string
    /** Hashes das partes que o cliente diz ter PUTado nesta reserva (as faltantes). */
    uploadedParts?: readonly string[]
    now: Date
    /** Revalidados no commit, depois do PUT, sob lock por perfil. */
    limits: CreationUploadInput['limits']
  }): Promise<CreationCommitResult>
  /**
   * Lixeira lógica: marca `deleted_at`, cancela a reserva em voo e SOLTA o blob (o
   * `storage_ref` corrente vai no retorno para o BFF apagar do R2 e é zerado na linha —
   * blob apagado não pode ficar fora da quota para sempre). A operação só passa quando
   * `baseRevision` é a revisão corrente; para uma linha inexistente, apenas a base 0 é
   * idempotente. A linha fica para propagar a lápide aos outros aparelhos.
   */
  softDelete(
    userId: string,
    tool: CreationTool,
    itemId: string,
    baseRevision: number,
    now: Date,
  ): Promise<CreationDeleteResult>
}
