import type { StudioSealedHead } from '@sistemazero/core/creations/studio-sealed-writer'
import { DomainError } from '../shared/errors'

export class StudioSealedWriteError extends DomainError {
  readonly code = 'STUDIO_SEALED_WRITE_CONFLICT'
  constructor(
    readonly reason: 'head-changed' | 'ticket-invalid' | 'protocol-required' | 'account-deleting',
    readonly head?: StudioSealedHead,
  ) {
    super('A revisão do Estúdio não pôde ser confirmada. Confira a versão guardada.')
  }
}
