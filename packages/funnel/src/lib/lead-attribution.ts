export interface LeadAttributionV1 {
  version: 1
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  eventCode: string | null
  initialCouponCode: string | null
  landingPath: string
}

const TOKEN = /^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/
const CODE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/
const PATH = /^\/[a-zA-Z0-9/_-]*$/

function cleanToken(value: unknown, max = 100): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().slice(0, max)
  return cleaned && TOKEN.test(cleaned) ? cleaned : null
}

function cleanCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().slice(0, 64)
  return cleaned && CODE.test(cleaned) ? cleaned : null
}

export function sanitizeEventCode(value: unknown): string | null {
  return cleanCode(value)
}

function cleanPath(value: unknown): string {
  if (typeof value !== 'string') return '/'
  const path = value.trim().split(/[?#]/, 1)[0]?.slice(0, 200) ?? '/'
  const hasControlCharacter = [...path].some((char) => {
    const code = char.charCodeAt(0)
    return code < 32 || code === 127
  })
  return path.startsWith('/') && PATH.test(path) && !hasControlCharacter ? path : '/'
}

/** Sanitiza apenas identificadores técnicos curtos; PII e valores livres não entram. */
export function sanitizeLeadAttribution(value: unknown): LeadAttributionV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const result: LeadAttributionV1 = {
    version: 1,
    utmSource: cleanToken(raw.utmSource),
    utmMedium: cleanToken(raw.utmMedium),
    utmCampaign: cleanToken(raw.utmCampaign),
    utmContent: cleanToken(raw.utmContent),
    eventCode: cleanCode(raw.eventCode),
    initialCouponCode: cleanCode(raw.initialCouponCode)?.toUpperCase() ?? null,
    landingPath: cleanPath(raw.landingPath),
  }
  return Object.values(result).some((entry) => entry !== null && entry !== 1 && entry !== '/')
    ? result
    : null
}

/** Snapshot da URL de entrada enviado pelas ilhas ao criar/reaproveitar o lead. */
export function leadAttributionFromLocation(location: Pick<Location, 'pathname' | 'search'>) {
  const params = new URLSearchParams(location.search)
  return sanitizeLeadAttribution({
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmContent: params.get('utm_content'),
    eventCode: params.get('event_code') ?? params.get('event'),
    initialCouponCode: params.get('coupon') ?? params.get('cupom'),
    landingPath: location.pathname,
  })
}
