import type { PaymentAggregate } from '../payment/payment.aggregate'

/**
 * Port (driven) de LEITURA self-service do COMPRADOR ("minhas compras", app
 * community). Separado do `PaymentRepository` (escrita) e do admin-read
 * (cross-consumer): aqui TODA consulta é escopada pelo e-mail do comprador
 * (`customer->>'email'`) — nunca devolve compra de outro e-mail (anti-IDOR).
 */

export interface MyPaymentsFilter {
  /** E-mail do comprador (das claims do JWT, injetado pelo gateway). */
  email: string
  limit: number
  offset: number
}

export interface PaymentMyReadRepository {
  listByEmail(filter: MyPaymentsFilter): Promise<{ items: PaymentAggregate[]; total: number }>
  /** Detalhe escopado: `null` se o id não existe OU pertence a outro e-mail. */
  findByEmailAndId(email: string, id: string): Promise<PaymentAggregate | null>
}
