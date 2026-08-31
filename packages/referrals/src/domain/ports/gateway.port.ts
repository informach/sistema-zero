/**
 * Porta do api-gateway (BFF S2S). Todas as integrações do referrals passam pelo
 * gateway com HMAC de borda (consumer `referrals`) — nunca direto no serviço
 * destino. Resultados por STATUS (nunca lança por rede/timeout — o client de
 * infra converte em 502/504), no padrão do gateway-client do funil.
 */
export interface GatewayResult<T = unknown> {
  status: number
  body: T
}

/** Corpo de `POST /auth/internal/ensure-buyer` (gateway → auth). */
export interface EnsureBuyerInput {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  source?: string
}

/** Corpo de `POST /members/webhooks/grant-manual` (gateway → members, resign). */
export interface GrantManualOfferInput {
  userId: string
  offerRef: string
  /** Procedência auditável (ex.: `scholarship:<redemptionId>`). */
  sourceId: string
  /** `null` = vitalício (a bolsa é vitalícia como a compra). */
  expiresAt: string | null
  /** Dedupe do members (`x-delivery-id`) — ESTÁVEL por operação. */
  deliveryId: string
}

/** Corpo de `POST /messaging/send` (gateway → messaging). */
export interface SendEmailInput {
  templateKey: string
  recipient: { name: string; email: string }
  variables: Record<string, string>
}

export interface ReferralsGateway {
  ensureBuyer(input: EnsureBuyerInput): Promise<GatewayResult>
  /** `POST /auth/internal/password-tokens` — token de definir senha (TTL 14d). */
  createPasswordToken(email: string): Promise<GatewayResult>
  grantManualOffer(input: GrantManualOfferInput): Promise<GatewayResult>
  /** Enfileira e-mail transacional (202). Idempotente por consumer+chave. */
  sendEmail(input: SendEmailInput, idempotencyKey: string): Promise<GatewayResult>
}
