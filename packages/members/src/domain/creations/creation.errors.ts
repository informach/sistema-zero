import { DomainError } from '../shared/errors'

/** Item inexistente OU de outro dono (nunca vaza existência). → 404. */
export class CreationNotFoundError extends DomainError {
  readonly code = 'CREATION_NOT_FOUND'
  constructor(message = 'Criação não encontrada') {
    super(message)
  }
}

/** Passou do teto por item, do total do perfil ou do número de itens. → 409. */
export class CreationQuotaExceededError extends DomainError {
  readonly code = 'CREATION_QUOTA_EXCEEDED'
  constructor(message = 'Sua conta chegou ao limite de espaço para guardar criações') {
    super(message)
  }
}

/**
 * A reserva veio com uma `baseRevision` que não é mais a corrente: outro aparelho subiu
 * este item depois da última vez que este viu a nuvem. → 409. O cliente resolve o
 * conflito do lado dele (guarda a versão da nuvem como cópia e sobe de novo com a base
 * certa) — nunca sobrescreve às cegas.
 */
export class CreationStaleBaseError extends DomainError {
  readonly code = 'CREATION_STALE_BASE'
  constructor(
    readonly currentRevision: number,
    message = 'Esse item mudou em outro aparelho; sincronize antes de guardar',
  ) {
    super(message)
  }
}

/**
 * A reserva veio com partes que o item ainda NÃO tem e SEM os bytes delas (o cliente
 * comprime só o que falta e reserva de novo). → 409, com `hashes` no corpo. Nada é
 * reservado até a segunda volta.
 */
export class CreationPartsNeedBytesError extends DomainError {
  readonly code = 'CREATION_PARTS_NEED_BYTES'
  constructor(
    readonly hashes: readonly string[],
    message = 'Faltam os bytes de partes novas; reserve de novo com eles',
  ) {
    super(message)
  }
}

/**
 * O `commit` chegou sem confirmar o envio de partes que a reserva exigia (ou o BFF não as
 * achou no R2). → 409, com `hashes`. A reserva NÃO morre: um retry honesto pode passar; o
 * cliente de qualquer modo reserva de novo.
 */
export class CreationPartMissingError extends DomainError {
  readonly code = 'CREATION_PART_MISSING'
  constructor(
    readonly hashes: readonly string[],
    message = 'Partes da revisão não foram enviadas; envie de novo',
  ) {
    super(message)
  }
}

/**
 * O `commit` chegou para uma revisão que não é a reservada (upload velho, dois
 * navegadores disputando, ou nada reservado). → 409. O cliente refaz o upload.
 */
export class CreationRevisionMismatchError extends DomainError {
  readonly code = 'CREATION_REVISION_MISMATCH'
  constructor(message = 'Essa versão já foi substituída; envie de novo') {
    super(message)
  }
}
