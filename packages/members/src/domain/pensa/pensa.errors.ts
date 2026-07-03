import { DomainError } from '../shared/errors'
import type { PensaWorkStage } from './pensa'

/**
 * Projeto/ciclo/task/item inexistente OU de outro dono. → 404.
 * ⚠️ Ownership mismatch usa ESTE erro (nunca 403) — não vazar a existência
 * de recursos de outros usuários (mesma régua do contrato).
 */
export class PensaNotFoundError extends DomainError {
  readonly code = 'PENSA_NOT_FOUND'
  constructor(message = 'Recurso do Pensa não encontrado') {
    super(message)
  }
}

/** Estourou uma cota (projetos ativos/ciclos/tasks/checklist). → 409. */
export class PensaQuotaExceededError extends DomainError {
  readonly code = 'PENSA_QUOTA_EXCEEDED'
  constructor(message = 'Limite atingido') {
    super(message)
  }
}

/** Criar ciclo n+1 sem o anterior `done`. → 409. */
export class PensaCycleNotDoneError extends DomainError {
  readonly code = 'PENSA_CYCLE_NOT_DONE'
  constructor(message = 'Conclua o ciclo atual antes de começar o próximo') {
    super(message)
  }
}

/**
 * Advance reprovado no gate da etapa. → 409 com `details.gate` + `details.missing`
 * estruturados (o error-handler os expõe — a UI mostra o que falta).
 */
export class PensaGateNotReadyError extends DomainError {
  readonly code = 'PENSA_GATE_NOT_READY'
  constructor(
    readonly gate: PensaWorkStage,
    readonly missing: string[],
    message = 'Ainda falta completar esta etapa antes de avançar',
  ) {
    super(message)
  }
}

/** Advance com `from` ≠ stage atual do ciclo (cliente desatualizado). → 409. */
export class PensaStageMismatchError extends DomainError {
  readonly code = 'PENSA_STAGE_MISMATCH'
  constructor(message = 'A etapa informada não é a etapa atual do ciclo') {
    super(message)
  }
}
