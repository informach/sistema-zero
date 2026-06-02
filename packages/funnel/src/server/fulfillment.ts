import { randomBytes } from 'node:crypto'
import type { FunnelRepo, Lead } from '../db/repo'
import type { GatewayClient, RegisterBuyerInput } from '../lib/gateway-client'

/**
 * Pós-pagamento: registra o lead PAGO como comprador (usuário) no IdP
 * (@sistemazero/auth) através do gateway. Mantido puro (tudo via `deps`): sem
 * `crypto`/`Date`/IO escondidos — a factory `makeFulfill` injeta os reais.
 *
 * Entrega das credenciais (senha temporária / link de acesso) é follow-up: a
 * senha é gerada e enviada ao auth, mas NÃO é entregue ao comprador aqui, e
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

const EMAIL_EXISTS_CODE = 'EMAIL_ALREADY_IN_USE'

/**
 * Registra o comprador (idempotente). Pré-condições: lead pago, ainda não
 * registrado e com e-mail. Resultado:
 *  - 201 → grava `buyer_user_id` + `buyer_registered_at`.
 *  - 409 (e-mail já existe) → sucesso de negócio: reaproveita o usuário existente
 *    e fecha o registro (sem `buyer_user_id`).
 *  - qualquer outro status → lança `FulfillmentRetryError` (deixa retryável: o
 *    webhook não marca a entrega como processada e o gateway re-entrega).
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

  const { status, body } = await deps.gateway.registerBuyer(input)

  if (status === 201) {
    const userId = readUserId(body)
    await deps.repo.setBuyerRegistration(lead.id, userId, deps.now())
    deps.log?.('fulfill.registered', { leadId: lead.id, userId })
    return
  }
  if (status === 409 || readErrorCode(body) === EMAIL_EXISTS_CODE) {
    await deps.repo.setBuyerRegistration(lead.id, null, deps.now())
    deps.log?.('fulfill.already_registered', { leadId: lead.id })
    return
  }
  deps.log?.('fulfill.register_failed', { leadId: lead.id, status })
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

function readUserId(body: unknown): string | null {
  if (body && typeof body === 'object' && 'user' in body) {
    const user = (body as { user?: unknown }).user
    if (user && typeof user === 'object' && 'id' in user) {
      const id = (user as { id?: unknown }).id
      if (typeof id === 'string') return id
    }
  }
  return null
}

function readErrorCode(body: unknown): string | null {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error?: unknown }).error
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code?: unknown }).code
      if (typeof code === 'string') return code
    }
  }
  return null
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
