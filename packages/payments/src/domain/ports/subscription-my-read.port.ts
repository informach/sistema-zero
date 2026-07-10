import type { SubscriptionAggregate } from '../subscription/subscription.aggregate'

/**
 * Port (driven) de LEITURA self-service do ASSINANTE ("minhas assinaturas", apps
 * community/kids). Separado do `SubscriptionRepository` (escrita) e do admin-read
 * (cross-consumer): aqui TODA consulta é escopada pelo e-mail do comprador
 * (`customer->>'email'`) — nunca devolve assinatura de outro e-mail (anti-IDOR).
 */
export interface SubscriptionMyReadRepository {
  /** Assinaturas do e-mail (mais novas primeiro; teto interno — poucas por comprador). */
  listByEmail(email: string): Promise<SubscriptionAggregate[]>
  /** Detalhe escopado: `null` se o id não existe OU pertence a outro e-mail. */
  findByEmailAndId(email: string, id: string): Promise<SubscriptionAggregate | null>
}
