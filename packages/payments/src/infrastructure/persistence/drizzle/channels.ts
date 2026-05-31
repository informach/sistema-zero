/**
 * Canais `LISTEN/NOTIFY` do Postgres. Servem para acordar os workers na hora em
 * que há trabalho novo (latência ~ms), em vez de esperar o próximo ciclo de poll.
 * O poll continua existindo como **rede de segurança** (cobre notificações
 * perdidas por queda da conexão de listen, réplica recém-subida, etc.).
 */
export const PG_CHANNELS = {
  /** Novo evento gravado no outbox → acorda o OutboxPoller. */
  outbox: 'payments_outbox',
  /** Nova entrega enfileirada → acorda o WebhookDeliveryWorker. */
  webhookDeliveries: 'payments_webhook_deliveries',
} as const

export type PgChannel = (typeof PG_CHANNELS)[keyof typeof PG_CHANNELS]
