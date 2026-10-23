import { DomainError } from '@sistemazero/core/errors'

export class SectionLockedError extends DomainError {
  readonly code = 'SECTION_LOCKED'
  constructor() {
    super('Conclua a seção anterior para continuar.')
  }
}
export class SectionGateError extends DomainError {
  readonly code = 'SECTION_GATE_INCOMPLETE'
  constructor() {
    super('Conclua todas as seções da aula para continuar.')
  }
}

export class LearningConflictError extends DomainError {
  readonly code = 'LEARNING_CONFLICT'
  constructor() {
    super('Esta atividade foi atualizada. Recarregue a aula para continuar.')
  }
}
/** O projeto chegou com o código da Ponte mais novo que os blocos (o Estúdio ainda está lendo). */
export class StudioProjectSyncingError extends DomainError {
  readonly code = 'STUDIO_PROJECT_SYNCING'
  constructor() {
    super('O Estúdio ainda está organizando o seu código em blocos. Tente de novo em um instante.')
  }
}
/**
 * O executor que roda o jogo não respondeu (fora do ar, demorou, não está configurado). Nunca
 * aprova por falha e nada é guardado: a criança só tenta de novo.
 */
export class ProjectCheckUnavailableError extends DomainError {
  readonly code = 'PROJECT_CHECK_UNAVAILABLE'
  constructor() {
    super('Não consegui testar o seu jogo agora. Tente de novo.')
  }
}
/**
 * O executor RECUSOU o pedido (regra que não vale neste projeto, projeto grande demais). Para a
 * criança é a mesma frase de "não consegui testar" (o motivo é de autoria, não dela); o "Testar
 * agora" da equipe mostra o `reason`.
 */
export class ProjectCheckRejectedError extends ProjectCheckUnavailableError {
  constructor(readonly reason: string) {
    super()
    // Tentar de novo não resolve: a criança precisa saber que é para pedir ajuda.
    this.message = 'Não consegui testar este projeto. Peça ajuda à equipe.'
  }
}
/** Muitos testes seguidos da mesma pessoa: o executor pede uma pausa. */
export class ProjectCheckBusyError extends DomainError {
  readonly code = 'PROJECT_CHECK_BUSY'
  constructor() {
    super('Calma: espere alguns segundos e teste de novo.')
  }
}
export class LearningGateError extends DomainError {
  readonly code = 'LEARNING_GATE_INCOMPLETE'
  constructor() {
    super('Conclua as atividades essenciais indicadas nesta aula.')
  }
}
