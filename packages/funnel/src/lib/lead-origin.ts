import { sanitizeOriginPlace, sanitizeReferralCode } from '@sistemazero/core/referrals'

/**
 * De onde veio ESTA compra (25/11/2026): o link de indicação (`/i/<código>`) ou o botão da
 * plataforma (`?lugar=`). Diferente da atribuição de mídia (`leads.attribution`, só o primeiro
 * toque), a origem acompanha o ÚLTIMO link ou botão. "Por onde a pessoa entrou" é calculado no
 * referrals, pela primeira aquisição dela.
 */
export interface LeadOriginV1 {
  version: 1
  code: string | null
  place: string | null
}

/** Cookie da origem: vive 30 dias, como o do lead, e é trocado a cada link ou botão. */
export const ORIGIN_COOKIE = 'funil_origem'
const MAX_AGE = 60 * 60 * 24 * 30

export function originFromCode(code: unknown): LeadOriginV1 | null {
  const clean = sanitizeReferralCode(code)
  return clean ? { version: 1, code: clean, place: null } : null
}

export function originFromPlace(place: unknown): LeadOriginV1 | null {
  const clean = sanitizeOriginPlace(place)
  return clean ? { version: 1, code: null, place: clean } : null
}

/** Valor do cookie: `c:<código>` ou `p:<lugar>` (já saneados). */
export function originCookieValue(origin: LeadOriginV1): string {
  return origin.code ? `c:${origin.code}` : `p:${origin.place ?? ''}`
}

export function originCookie(origin: LeadOriginV1, secure: boolean): string {
  const base = `${ORIGIN_COOKIE}=${encodeURIComponent(originCookieValue(origin))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`
  return secure ? `${base}; Secure` : base
}

export function originFromRequest(request: Request): LeadOriginV1 | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0 || part.slice(0, eq).trim() !== ORIGIN_COOKIE) continue
    let value: string
    try {
      value = decodeURIComponent(part.slice(eq + 1).trim())
    } catch {
      return null
    }
    if (value.startsWith('c:')) return originFromCode(value.slice(2))
    if (value.startsWith('p:')) return originFromPlace(value.slice(2))
    return null
  }
  return null
}

/** Saneia o que veio do banco (jsonb) antes de usar. */
export function sanitizeLeadOrigin(value: unknown): LeadOriginV1 | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  return originFromCode(raw.code) ?? originFromPlace(raw.place)
}

export function sameOrigin(a: LeadOriginV1 | null, b: LeadOriginV1 | null): boolean {
  return (a?.code ?? null) === (b?.code ?? null) && (a?.place ?? null) === (b?.place ?? null)
}

/**
 * A origem que a própria URL traz: `?indicacao=<código>` (a página que o link `/i/` abriu, também
 * quando copiada e aberta em outro navegador) ou `?lugar=` (botão da plataforma). O código vence.
 * Devolve o Set-Cookie, ou `null` sem nada válido.
 */
export function originCookieFor(url: URL, secure: boolean): string | null {
  const origin =
    originFromCode(url.searchParams.get('indicacao')) ??
    originFromPlace(url.searchParams.get('lugar'))
  return origin ? originCookie(origin, secure) : null
}
