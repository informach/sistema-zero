/**
 * "Guardado na sua conta" — os casos de uso do ÍNDICE das criações (Estúdio
 * Completo e Pinta). O blob nunca passa por aqui: o BFF assina PUT/GET no R2 UGC
 * a partir da revisão/chave que estes serviços devolvem.
 *
 * Fluxo de um salvamento: `reserve` (quota + posse → revisão nova, tudo em
 * `pending_*`) → o navegador PUTa no R2 (chave da revisão) → `commit` (promove a
 * reserva: só então nome, `item_updated_at`, bytes e `storage_ref` mudam). Um
 * `commit` fora da reserva vigente é recusado: dois navegadores no mesmo item
 * disputam de forma honesta (o mais novo reserva; o velho perde o commit e reenvia)
 * — e nunca dividem a mesma chave no R2 (contador monotônico de revisões).
 */
import {
  CREATION_ACCESS_REF,
  CREATION_LIMITS,
  type CreationPartRef,
  type CreationSummary,
  type CreationTool,
  creationPartStorageKey,
  creationStorageKey,
  isCreationPartHash,
  toCreationSummary,
} from '../../domain/creations/creation'
import {
  CreationNotFoundError,
  CreationPartMissingError,
  CreationPartsNeedBytesError,
  CreationQuotaExceededError,
  CreationRevisionMismatchError,
  CreationStaleBaseError,
} from '../../domain/creations/creation.errors'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { CreationsRepository } from '../../domain/ports/creations-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { AccessCheckService } from '../access-check/access-check.service'
import { rememberToolOwned, toolOwnershipCached } from './tool-ownership-cache'

export { invalidateToolOwnership, resetToolOwnershipCacheForTests } from './tool-ownership-cache'

/** Uma parte a assinar/baixar: hash, bytes e a chave dela no R2. */
export interface CreationPartTicket extends CreationPartRef {
  storageKey: string
}

/** O que o `reserve` devolve ao BFF: a revisão, a chave que ele vai assinar e as partes FALTANTES. */
export interface CreationUploadTicket {
  revision: number
  storageKey: string
  /** Eco dos tetos, para o BFF assinar `Content-Length` = bytes e negar o resto. */
  bytes: number
  /** Só as partes que o item ainda não tem (cada uma ganha um PUT assinado). */
  parts: CreationPartTicket[]
}

/**
 * O que o `commit` devolve: o resumo público + o que a revisão nova SOLTOU no R2 (o blob
 * principal anterior e as partes que ela não referencia mais) — o BFF apaga, best-effort.
 * `previousStorageKey` continua (BFF antigo no meio do deploy); `releasedStorageKeys` é o
 * conjunto completo.
 */
export interface CreationCommitOutcome {
  item: CreationSummary
  /** Chave da revisão ANTERIOR no R2 (`null` = primeira revisão, ou retry idempotente). */
  previousStorageKey: string | null
  releasedStorageKeys: string[]
}

export interface CreationDownloadTicket {
  storageKey: string
  revision: number
  bytes: number
  summary: CreationSummary
  /** As partes da revisão corrente, na ordem da linha (o BFF assina um GET para cada). */
  parts: CreationPartTicket[]
}

/**
 * Posse da FERRAMENTA pela CONTA (mesma leitura da rota `/members/access` e do gate
 * de produto do Pensa: grants OU communities; a chave-mestra de cursos NÃO conta).
 * Equipe interna pula. Só nas ESCRITAS que criam conteúdo (a reserva): listar, baixar
 * e apagar o que é seu não exige assinatura ativa — a criança sempre consegue trazer
 * de volta o que já guardou.
 */
async function assertToolOwned(
  accessCheck: AccessCheckService,
  accountId: string,
  tool: CreationTool,
  privileged: boolean,
  now: number = Date.now(),
): Promise<void> {
  if (privileged) return
  // Cache curto da posse (ver `tool-ownership-cache.ts`): quem rebaixa matrícula invalida.
  if (toolOwnershipCached(accountId, tool, now)) return
  const ref = CREATION_ACCESS_REF[tool]
  const result = await accessCheck.execute(accountId, [ref])
  if (!result.grants.includes(ref) && !result.communities.includes(ref)) {
    throw new AccessDeniedError(
      tool === 'studio'
        ? 'Você não tem acesso ao Estúdio Completo'
        : 'Você não tem acesso ao Pinta',
    )
  }
  rememberToolOwned(accountId, tool, now)
}

export class ListCreationsService {
  constructor(private readonly creations: CreationsRepository) {}

  async execute(userId: string, tool: CreationTool): Promise<CreationSummary[]> {
    return this.creations.list(userId, tool)
  }
}

export class ReserveCreationUploadService {
  constructor(
    private readonly creations: CreationsRepository,
    private readonly accessCheck: AccessCheckService,
    private readonly clock: () => Date,
  ) {}

  async execute(input: {
    userId: string
    accountId: string
    privileged: boolean
    tool: CreationTool
    itemId: string
    name: string
    kind: string
    itemUpdatedAt: Date
    bytes: number
    thumb?: string | null
    /** A revisão que o aparelho conhece (0 = nova); ausente = sem conferência. */
    baseRevision?: number
    /** Partes referenciadas (hash de conteúdo; `bytes` só para as que o item não tem). */
    parts?: ReadonlyArray<{ hash: string; bytes?: number }>
  }): Promise<CreationUploadTicket> {
    await assertToolOwned(
      this.accessCheck,
      input.accountId,
      input.tool,
      input.privileged,
      this.clock().getTime(),
    )
    if (
      input.baseRevision !== undefined &&
      (!Number.isInteger(input.baseRevision) || input.baseRevision < 0)
    ) {
      throw new ValidationError('Revisão-base inválida')
    }
    if (!Number.isInteger(input.bytes) || input.bytes <= 0) {
      throw new ValidationError('Tamanho do arquivo inválido')
    }
    if (input.bytes > CREATION_LIMITS.maxItemBytes) {
      throw new CreationQuotaExceededError(
        'Esse jogo ou desenho é grande demais para ser guardado na conta',
      )
    }
    if (!Number.isFinite(input.itemUpdatedAt.getTime())) {
      throw new ValidationError('Data de atualização inválida')
    }
    const parts = input.parts ?? []
    if (parts.length > CREATION_LIMITS.maxPartsPerItem) {
      throw new ValidationError('Partes demais para um item')
    }
    const seenHashes = new Set<string>()
    for (const part of parts) {
      if (!isCreationPartHash(part.hash)) throw new ValidationError('Hash de parte inválido')
      if (seenHashes.has(part.hash)) throw new ValidationError('Hash de parte repetido')
      seenHashes.add(part.hash)
      if (
        part.bytes !== undefined &&
        (!Number.isInteger(part.bytes) ||
          part.bytes <= 0 ||
          part.bytes > CREATION_LIMITS.maxItemBytes)
      ) {
        throw new ValidationError('Tamanho de parte inválido')
      }
    }
    // Corte por caractere (emoji na borda não vira meio par substituto).
    const name = Array.from(input.name.trim()).slice(0, CREATION_LIMITS.maxNameChars).join('')
    const kind = Array.from(input.kind.trim()).slice(0, CREATION_LIMITS.maxKindChars).join('')
    if (!name || !kind) throw new ValidationError('Nome ou tipo da criação ausente')
    // Miniatura grande demais é DESCARTADA (é enfeite da lista), nunca recusa o salvamento.
    const thumb =
      typeof input.thumb === 'string' &&
      input.thumb.length > 0 &&
      input.thumb.length <= CREATION_LIMITS.maxThumbChars &&
      input.thumb.startsWith('data:image/')
        ? input.thumb
        : null

    // Quota e reserva na MESMA transação (o repositório tranca a chave do item).
    const reservation = await this.creations.reserveUpload({
      userId: input.userId,
      accountId: input.accountId,
      tool: input.tool,
      itemId: input.itemId,
      name,
      kind,
      itemUpdatedAt: input.itemUpdatedAt,
      bytes: input.bytes,
      thumb,
      ...(input.baseRevision !== undefined ? { baseRevision: input.baseRevision } : {}),
      ...(parts.length > 0 ? { parts } : {}),
      now: this.clock(),
      limits: {
        maxItemBytes: CREATION_LIMITS.maxItemBytes,
        maxTotalBytes: CREATION_LIMITS.maxTotalBytes,
        maxItemsPerTool: CREATION_LIMITS.maxItemsPerTool,
      },
    })
    if (!reservation.ok && reservation.reason === 'stale-base') {
      throw new CreationStaleBaseError(reservation.currentRevision)
    }
    if (!reservation.ok && reservation.reason === 'parts-need-bytes') {
      throw new CreationPartsNeedBytesError(reservation.hashes)
    }
    if (!reservation.ok && reservation.reason === 'item-bytes') {
      throw new CreationQuotaExceededError(
        'Esse jogo ou desenho é grande demais para ser guardado na conta',
      )
    }
    if (!reservation.ok && reservation.reason === 'account-deleting') {
      throw new AccessDeniedError('A conta está sendo excluída e não aceita novos envios')
    }
    if (!reservation.ok) {
      throw new CreationQuotaExceededError(
        reservation.reason === 'items-per-tool'
          ? 'Sua conta chegou ao limite de criações guardadas nesta ferramenta'
          : undefined,
      )
    }
    return {
      revision: reservation.revision,
      storageKey: creationStorageKey(input.userId, input.tool, input.itemId, reservation.revision),
      bytes: input.bytes,
      parts: reservation.missingParts.map((part) => ({
        ...part,
        storageKey: creationPartStorageKey(
          input.userId,
          input.tool,
          input.itemId,
          part.hash,
          part.rev,
        ),
      })),
    }
  }
}

export class CommitCreationUploadService {
  constructor(
    private readonly creations: CreationsRepository,
    private readonly clock: () => Date,
  ) {}

  /**
   * Promove a revisão reservada. Os bytes e os metadados vêm da RESERVA (o que foi
   * conferido na quota e assinado no PUT), nunca do corpo do commit.
   */
  async execute(input: {
    userId: string
    tool: CreationTool
    itemId: string
    revision: number
    /** Hashes das partes que o cliente PUTou nesta reserva (as faltantes). */
    uploadedParts?: readonly string[]
  }): Promise<CreationCommitOutcome> {
    if (!Number.isInteger(input.revision) || input.revision <= 0) {
      throw new ValidationError('Revisão inválida')
    }
    const uploadedParts = input.uploadedParts ?? []
    if (uploadedParts.length > CREATION_LIMITS.maxPartsPerItem) {
      throw new ValidationError('Partes demais para um item')
    }
    for (const hash of uploadedParts) {
      if (!isCreationPartHash(hash)) throw new ValidationError('Hash de parte inválido')
    }
    const result = await this.creations.commit({
      userId: input.userId,
      tool: input.tool,
      itemId: input.itemId,
      revision: input.revision,
      storageRef: creationStorageKey(input.userId, input.tool, input.itemId, input.revision),
      ...(uploadedParts.length > 0 ? { uploadedParts } : {}),
      now: this.clock(),
      limits: {
        maxItemBytes: CREATION_LIMITS.maxItemBytes,
        maxTotalBytes: CREATION_LIMITS.maxTotalBytes,
        maxItemsPerTool: CREATION_LIMITS.maxItemsPerTool,
      },
    })
    if (!result.ok) {
      if (result.reason === 'parts-missing') throw new CreationPartMissingError(result.hashes)
      if (result.reason) {
        throw new CreationQuotaExceededError(
          result.reason === 'items-per-tool'
            ? 'Sua conta chegou ao limite de criações guardadas nesta ferramenta'
            : undefined,
        )
      }
      throw new CreationRevisionMismatchError()
    }
    const record = await this.creations.get(input.userId, input.tool, input.itemId)
    if (!record) throw new CreationNotFoundError()
    const releasedStorageKeys = [
      ...(result.previousStorageRef ? [result.previousStorageRef] : []),
      ...result.releasedPartRefs.map((part) =>
        creationPartStorageKey(input.userId, input.tool, input.itemId, part.hash, part.rev),
      ),
    ]
    return {
      item: toCreationSummary(record),
      previousStorageKey: result.previousStorageRef,
      releasedStorageKeys,
    }
  }
}

export class GetCreationDownloadService {
  constructor(private readonly creations: CreationsRepository) {}

  async execute(
    userId: string,
    tool: CreationTool,
    itemId: string,
  ): Promise<CreationDownloadTicket> {
    const record = await this.creations.get(userId, tool, itemId)
    if (!record || record.deletedAt !== null || !record.storageRef) {
      throw new CreationNotFoundError()
    }
    return {
      storageKey: record.storageRef,
      revision: record.revision,
      bytes: record.bytes,
      summary: toCreationSummary(record),
      parts: record.parts.map((part) => ({
        ...part,
        storageKey: creationPartStorageKey(userId, tool, itemId, part.hash, part.rev),
      })),
    }
  }
}

export class DeleteCreationService {
  constructor(
    private readonly creations: CreationsRepository,
    private readonly clock: () => Date,
  ) {}

  /**
   * Idempotente: apagar o que não existe (ou já foi apagado) devolve `deleted: false`.
   * `storageKey` = o blob que a lixeira soltou (o BFF apaga do R2; nunca chega ao navegador).
   */
  async execute(
    userId: string,
    tool: CreationTool,
    itemId: string,
  ): Promise<{
    deleted: boolean
    storageKey: string | null
    /** Tudo o que a lixeira soltou no R2 (blob principal + partes). */
    storageKeys: string[]
    revision: number
  }> {
    const result = await this.creations.softDelete(userId, tool, itemId, this.clock())
    return {
      deleted: result.deleted,
      storageKey: result.storageRef,
      storageKeys: [
        ...(result.storageRef ? [result.storageRef] : []),
        ...result.partRefs.map((part) =>
          creationPartStorageKey(userId, tool, itemId, part.hash, part.rev),
        ),
      ],
      revision: result.revision,
    }
  }
}
