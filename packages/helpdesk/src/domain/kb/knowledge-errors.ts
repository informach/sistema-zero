import { DomainError } from '@sistemazero/core/errors'

export class KnowledgeNotReadyError extends DomainError {
  readonly code = 'KNOWLEDGE_NOT_READY'
  constructor() {
    super('A revisão precisa estar indexada, ter responsável e validade futura para publicar')
  }
}
export class KnowledgeInvalidError extends DomainError {
  readonly code = 'KNOWLEDGE_INVALID'
  constructor(message = 'Conteúdo ou metadados inválidos') {
    super(message)
  }
}
