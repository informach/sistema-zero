import type { GiftAudience } from '@sistemazero/core/referrals'
import type { GatewayResult } from './ports/gateway.port'

/** Política registrada em cada novo resgate, sem alterar bolsas históricas. */
export const SCHOLARSHIP_ACCESS_DURATION_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function scholarshipExpiresAt(createdAt: Date, durationDays: number | null): Date | null {
  return durationDays === null ? null : new Date(createdAt.getTime() + durationDays * DAY_MS)
}

/** Curso adulto padrão do presente (clone adulto publicado pela dona no Admin). */
export const DEFAULT_ADULT_GIFT_COURSE_SLUG = 'cade-todo-mundo-adulto'

/**
 * O que cada público entrega. `appUrl` nulo = o app daquele público não está configurado
 * (`COMMUNITY_URL` ausente): o presente fica indisponível, sem derrubar o outro público.
 */
export interface GiftTarget {
  courseSlug: string
  appUrl: string | null
}

export type GiftTargets = Record<GiftAudience, GiftTarget>

/** Link do e-mail de boas-vindas: definir senha (conta nova) ou entrar (conta existente). */
export function giftWelcomeLink(
  audience: GiftAudience,
  appUrl: string,
  token: string | null,
): string {
  const base = appUrl.replace(/\/$/, '')
  if (token) return `${base}/redefinir-senha?token=${encodeURIComponent(token)}`
  return audience === 'adult' ? `${base}/cursos` : `${base}/login/responsavel`
}

/**
 * O lote entrega DOIS direitos, nos dois públicos: participação temporária no Mural (Kids ou
 * adulto) e a visita permanente que mantém o jogo publicado visível depois do prazo.
 */
export function isMuralTrialGranted(result: GatewayResult): boolean {
  const body = result.body
  return (
    result.status === 200 &&
    body !== null &&
    typeof body === 'object' &&
    'ok' in body &&
    body.ok === true &&
    (('granted' in body && body.granted === 2) || ('deduped' in body && body.deduped === true))
  )
}

/**
 * Público de uma oferta de assinatura pelo slug do catálogo (`…-adulto-mensal|anual` é a
 * Comunidade adulta). Usado só para escolher, entre os resgates do e-mail, o do mesmo público.
 */
export function offerGiftAudience(offerSlug: string): GiftAudience {
  return /(^|-)adulto(-|$)/.test(offerSlug) ? 'adult' : 'kids'
}
