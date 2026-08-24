/**
 * Seletor GLOBAL de plataforma do painel (Kids × Adultos) — regras PURAS.
 * O estado vive num cookie de PREFERÊNCIA (`sz_admin_platform`): o layout lê no
 * server (SSR sem flash) e o client grava via `document.cookie` — NÃO é cookie
 * de sessão, então fica FORA de `lib/cookies.ts` (aquele arquivo é dos `__Host-*`
 * HttpOnly). Kids é o padrão: é a plataforma principal do negócio.
 */
export const PLATFORMS = ['kids', 'adult'] as const
export type Platform = (typeof PLATFORMS)[number]

export const DEFAULT_PLATFORM: Platform = 'kids'
export const PLATFORM_COOKIE = 'sz_admin_platform'

/** Rótulos do alternador (plataformas, não audiência de curso — "Adultos" no plural). */
export const PLATFORM_LABELS: Record<Platform, string> = {
  kids: 'Kids',
  adult: 'Adultos',
}

function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value)
}

/** Cookie ausente/lixo → default kids (nunca lança — o valor vem do browser). */
export function parsePlatform(value: unknown): Platform {
  return isPlatform(value) ? value : DEFAULT_PLATFORM
}

/**
 * String p/ `document.cookie` (escrita CLIENT-side): 1 ano, SameSite=Lax,
 * `Secure` só em https (localhost é http). Sem HttpOnly de propósito — o client
 * é quem escreve a preferência.
 */
export function platformCookieString(platform: Platform, secure: boolean): string {
  const base = `${PLATFORM_COOKIE}=${platform}; Path=/; Max-Age=31536000; SameSite=Lax`
  return secure ? `${base}; Secure` : base
}
