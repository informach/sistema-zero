import { DomainError } from '@sistemazero/core/errors'

// Preserva a classe/código original. A prova é local ao processo e só nasce no
// catch que sabe que não houve efeito externo nem persistência financeira.
const rejectedBeforeCreation = new WeakSet<DomainError>()
export function markPaymentNotCreated(error: unknown): void {
  if (error instanceof DomainError) rejectedBeforeCreation.add(error)
}
export function paymentWasNotCreated(error: DomainError): boolean {
  return rejectedBeforeCreation.has(error)
}
