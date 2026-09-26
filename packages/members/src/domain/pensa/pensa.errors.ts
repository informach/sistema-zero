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

/** Estourou uma cota (projetos ativos, ciclos ou tarefas). → 409. */
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

export class PensaTaskLockedError extends DomainError {
  readonly code = 'PENSA_TASK_LOCKED'
  constructor(message = 'Uma tarefa iniciada não pode ser apagada nem substituída') {
    super(message)
  }
}

export class PensaTaskTransitionError extends DomainError {
  readonly code = 'PENSA_TASK_TRANSITION_INVALID'
  constructor(message = 'Esta mudança de progresso não é permitida') {
    super(message)
  }
}

export class PensaTaskDependencyError extends DomainError {
  readonly code = 'PENSA_TASK_DEPENDENCY_PENDING'
  constructor(message = 'Conclua as tarefas anteriores antes de começar esta') {
    super(message)
  }
}

/** Ação reservada ao DONO do plano pedida por um membro da equipe. → 403. */
export class PensaNotOwnerError extends DomainError {
  readonly code = 'PENSA_NOT_OWNER'
  constructor(message = 'Só quem criou o plano pode fazer isso.') {
    super(message)
  }
}

/** Código de plano que não abre nada (inválido, desligado, plano arquivado). → 404. */
export class PensaInviteInvalidError extends DomainError {
  readonly code = 'PENSA_INVITE_INVALID'
  constructor(message = 'Esse código não abriu nenhum plano. Confira com quem te chamou.') {
    super(message)
  }
}

/** Já está na equipe (ou é o dono). → 409. */
export class PensaAlreadyMemberError extends DomainError {
  readonly code = 'PENSA_ALREADY_MEMBER'
  constructor(message = 'Você já está nessa equipe.') {
    super(message)
  }
}

/** A equipe já tem o máximo de convidados. → 409. */
export class PensaTeamFullError extends DomainError {
  readonly code = 'PENSA_TEAM_FULL'
  constructor(message = 'Essa equipe já está cheia.') {
    super(message)
  }
}

/** O perfil já entrou em equipes demais. → 409. */
export class PensaJoinLimitError extends DomainError {
  readonly code = 'PENSA_JOIN_LIMIT'
  constructor(message = 'Você já entrou em muitas equipes. Saia de uma para entrar em outra.') {
    super(message)
  }
}

/** O dono não sai da própria equipe (apaga o plano ou desliga o código). → 409. */
export class PensaOwnerCannotLeaveError extends DomainError {
  readonly code = 'PENSA_OWNER_CANNOT_LEAVE'
  constructor(
    message = 'Quem criou o plano não sai da equipe. Apague o plano ou desligue o código.',
  ) {
    super(message)
  }
}

export class PensaTaskProgressConflictError extends DomainError {
  readonly code = 'PENSA_TASK_PROGRESS_CONFLICT'
  constructor(message = 'A tarefa mudou em outro aparelho. Recarregue o guia e tente novamente.') {
    super(message)
  }
}
