import { randomBytes } from 'node:crypto'
import type { FunnelRepo, Lead } from '../db/repo'
import type { GatewayClient, RegisterBuyerInput } from '../lib/gateway-client'

/**
 * Pós-pagamento: garante o lead PAGO como comprador (usuário) no IdP
 * (@sistemazero/auth) via gateway (`ensure-buyer`, S2S). Mantido puro (tudo via
 * `deps`): sem `crypto`/`Date`/IO escondidos — a factory `makeFulfill` injeta os reais.
 *
 * `ensure-buyer` SEMPRE devolve um `userId` (novo OU recorrente) → a concessão de
 * acesso na área de membros roda inclusive para o comprador recorrente. A senha
 * "dummy" gerada só é usada quando o usuário é CRIADO (a real vem pelo magic-link);
 * NUNCA é persistida no funil.
 */
export interface FulfillmentDeps {
  repo: FunnelRepo
  gateway: GatewayClient
  /** Gera a senha temporária do comprador (injetável p/ testes). */
  genTempPassword: () => string
  now: () => Date
  log?: (msg: string, meta?: Record<string, unknown>) => void
}

/** Falha transitória no registro → o chamador (webhook) deve permitir retry. */
export class FulfillmentRetryError extends Error {
  constructor(readonly httpStatus: number) {
    super(`registro do comprador falhou (status ${httpStatus})`)
    this.name = 'FulfillmentRetryError'
  }
}

/**
 * Garante o comprador no IdP (idempotente). Pré-condições: lead pago, ainda não
 * registrado e com e-mail. Resultado:
 *  - 200/201 → grava `buyer_user_id` (sempre presente) + `buyer_is_new` (`created`)
 *    + `buyer_registered_at`. 201 = criado (novo); 200 = reaproveitado (recorrente).
 *  - qualquer outro status (ou resposta sem `userId`) → lança `FulfillmentRetryError`
 *    (deixa retryável: o webhook não marca a entrega como processada e o gateway
 *    re-entrega). `ensure-buyer` é idempotente, então reprocessar é seguro.
 */
export async function fulfillPaidLead(lead: Lead, deps: FulfillmentDeps): Promise<void> {
  if (!lead.paidAt) return
  if (lead.buyerRegisteredAt) return
  if (!lead.email) return

  const { firstName, lastName } = splitName(lead.nome)
  const input: RegisterBuyerInput = {
    email: lead.email,
    password: deps.genTempPassword(),
    firstName,
    lastName,
    source: 'funnel',
  }
  const phone = normalizePhone(lead.telefone)
  if (phone) input.phone = phone

  const { status, body } = await deps.gateway.ensureBuyer(input)
  const userId = readUserId(body)

  if ((status === 200 || status === 201) && userId) {
    const created = readCreated(body)
    await deps.repo.setBuyerRegistration(lead.id, userId, created, deps.now())
    deps.log?.('fulfill.ensured', { leadId: lead.id, userId, created })
    return
  }
  deps.log?.('fulfill.ensure_failed', { leadId: lead.id, status })
  throw new FulfillmentRetryError(status)
}

/**
 * Divide o nome completo (campo único do lead) em first/last name. O auth exige
 * ambos com ≥1 char (máx 100). Nome único → lastName placeholder; vazio → fallback.
 */
export function splitName(nome: string | null): { firstName: string; lastName: string } {
  const parts = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: 'Cliente', lastName: '—' }
  if (parts.length === 1) return { firstName: parts[0]!.slice(0, 100), lastName: '—' }
  return {
    firstName: parts[0]!.slice(0, 100),
    lastName: parts.slice(1).join(' ').slice(0, 100),
  }
}

/** Só dígitos do telefone, ≤20 chars (limite do auth). Vazio → undefined. */
export function normalizePhone(tel: string | null): string | undefined {
  const digits = (tel ?? '').replace(/\D/g, '').slice(0, 20)
  return digits.length > 0 ? digits : undefined
}

/** Lê `userId` da resposta de `ensure-buyer` (`{ userId, created }`). */
function readUserId(body: unknown): string | null {
  if (body && typeof body === 'object' && 'userId' in body) {
    const id = (body as { userId?: unknown }).userId
    if (typeof id === 'string' && id.length > 0) return id
  }
  return null
}

/** Lê `created` (comprador novo) da resposta de `ensure-buyer`. */
function readCreated(body: unknown): boolean {
  return Boolean(
    body && typeof body === 'object' && (body as { created?: unknown }).created === true,
  )
}

/** Senha temporária forte: ~24 chars base64url (>10, <200, sem espaços). */
function generateTempPassword(): string {
  return randomBytes(18).toString('base64url')
}

export interface FulfillFactoryDeps {
  repo: FunnelRepo
  gateway: GatewayClient
  log?: (msg: string, meta?: Record<string, unknown>) => void
}

/**
 * Constrói a função `fulfill(lead)` real (injeta `crypto`/`Date`) para as rotas
 * finas, mantendo os handlers de checkout/webhook puros.
 */
export function makeFulfill(deps: FulfillFactoryDeps): (lead: Lead) => Promise<void> {
  return (lead: Lead) =>
    fulfillPaidLead(lead, {
      repo: deps.repo,
      gateway: deps.gateway,
      genTempPassword: generateTempPassword,
      now: () => new Date(),
      log: deps.log,
    })
}
