import { z } from 'zod'
import type { GatewayClient } from '../lib/gateway-client'
import { json, jsonError, safeJson } from '../lib/http'

/**
 * Handlers puros das landings de indicação (/bolsa e /embaixador): o funil é só
 * a BORDA pública — valida o input, repassa ao @sistemazero/referrals via
 * gateway (HMAC de borda) e traduz o resultado. Nenhum estado local: bolsa,
 * convites e contagens vivem no referrals.
 */
export interface ReferralsDeps {
  gateway: Pick<
    GatewayClient,
    'redeemScholarship' | 'createAmbassadorInvite' | 'updateAmbassadorPix'
  >
  log?: (msg: string, meta?: Record<string, unknown>) => void
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
/** Shape do page_token do referrals (43 chars base64url hoje; margem 16..64). */
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/

// Campos em PT (mesma língua dos forms do funil); o telefone é OPCIONAL — não
// reusar o ContactSchema, que o exige.
const RedeemBody = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{4,32}$/),
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE).max(254),
  telefone: z.string().trim().max(20).optional(),
})

const InviteBody = z.object({
  token: z.string().regex(TOKEN_RE),
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().regex(EMAIL_RE).max(254),
})

const PixBody = z.object({
  token: z.string().regex(TOKEN_RE),
  pixKey: z.string().trim().min(5).max(140),
})

/** Repassa o envelope de erro do referrals quando reconhecido; senão 502. */
function passthrough(
  res: { status: number; body: unknown },
  known: number[],
  log?: ReferralsDeps['log'],
  context?: string,
): Response {
  if (known.includes(res.status)) return json(res.body, res.status)
  log?.(`referrals.${context}_gateway_error`, { status: res.status })
  return jsonError(
    'Não foi possível concluir agora. Tente de novo em instantes.',
    502,
    'GATEWAY_ERROR',
  )
}

/** POST /api/bolsa/resgatar — resgate da Bolsa do Primeiro Jogo. */
export async function postRedeemScholarship(
  request: Request,
  deps: ReferralsDeps,
): Promise<Response> {
  const parsed = RedeemBody.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Confira os dados e tente novamente.', 400, 'BAD_REQUEST')

  const { code, nome, email, telefone } = parsed.data
  const res = await deps.gateway.redeemScholarship({
    code,
    name: nome,
    email,
    ...(telefone ? { phone: telefone } : {}),
  })
  // 201 completed · 202 processing · 404 código · 409 já-resgatada/terminal ·
  // 429 teto do gateway. Sucesso e erro conhecido passam pelo MESMO cano.
  return passthrough(res, [201, 202, 404, 409, 429], deps.log, 'redeem')
}

/** POST /api/embaixador/convites — convite de bolsa enviado pela plataforma. */
export async function postAmbassadorInvite(
  request: Request,
  deps: ReferralsDeps,
): Promise<Response> {
  const parsed = InviteBody.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Confira os dados e tente novamente.', 400, 'BAD_REQUEST')

  const { token, nome, email } = parsed.data
  const res = await deps.gateway.createAmbassadorInvite(token, { name: nome, email })
  if (res.status === 202) return json({ ok: true }, 202)
  // 404 token · 409 já-convidado/já-resgatou · 429 cap diário/teto do gateway.
  return passthrough(res, [404, 409, 429], deps.log, 'invite')
}

/** POST /api/embaixador/pix — chave Pix do bônus (o embaixador cadastra na própria página). */
export async function postAmbassadorPix(request: Request, deps: ReferralsDeps): Promise<Response> {
  const parsed = PixBody.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Confira a chave e tente novamente.', 400, 'BAD_REQUEST')

  const res = await deps.gateway.updateAmbassadorPix(parsed.data.token, parsed.data.pixKey)
  return passthrough(res, [200, 404, 429], deps.log, 'pix')
}
