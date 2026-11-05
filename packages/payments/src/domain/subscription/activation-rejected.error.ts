/** A definitive provider validation refusal, distinct from a lost/ambiguous response. */
export class SubscriptionActivationRejectedError extends Error {
  constructor() {
    super('A operadora recusou os dados de ativação da assinatura')
    this.name = 'SubscriptionActivationRejectedError'
  }
}
