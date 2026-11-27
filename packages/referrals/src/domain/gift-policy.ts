import type { GiftAccessPolicy, GiftAudience } from '@sistemazero/core/referrals'
import { addUtcCalendarMonths } from '@sistemazero/core/time'
import type { GatewayResult } from './ports/gateway.port'
import type { GiftOffer } from './ports/gift-offer-catalog.port'

/**
 * Oferta padrão do presente de cada público (15/11/2026): é o que os códigos de embaixador
 * (e as campanhas antigas, ainda sem oferta escolhida) dão de presente. Fonte ÚNICA destes
 * slugs; o catálogo resolve cada um na hora do resgate. Substituem as antigas envs de curso
 * (`SCHOLARSHIP_COURSE_SLUG`/`SCHOLARSHIP_ADULT_COURSE_SLUG`) e o prazo fixo de sete dias:
 * curso, prazo e Mural agora vêm da própria oferta.
 */
export const DEFAULT_GIFT_OFFER_SLUGS: Readonly<Record<GiftAudience, string>> = {
  kids: 'cade-todo-mundo-7-dias',
  adult: 'cade-todo-mundo-adulto-7-dias',
}

/** A oferta que um código entrega: a da campanha, ou a padrão do público. */
export function giftOfferRef(
  campaign: { giftOfferId?: string | null } | null | undefined,
  audience: GiftAudience,
): string {
  return campaign?.giftOfferId ?? DEFAULT_GIFT_OFFER_SLUGS[audience]
}

const DAY_MS = 24 * 60 * 60 * 1000

export function scholarshipExpiresAt(createdAt: Date, durationDays: number | null): Date | null {
  return durationDays === null ? null : new Date(createdAt.getTime() + durationDays * DAY_MS)
}

/**
 * Dias do presente gravados no resgate (`access_duration_days`): o prazo fixo da oferta em dias;
 * vitalícia = null (sem prazo). Desde 27/11/2026 o presente aceita prazo em MESES (a oferta única
 * de 6 meses de cada curso também é o presente): os meses viram os dias do calendário contados de
 * `from` (o instante do resgate), a mesma conta do members (`addUtcCalendarMonths`), que concede
 * com a política gravada no resgate. O repositório usa o mesmo instante da aceitação para a conta.
 */
export function giftAccessDays(offer: GiftOffer, from: Date = new Date()): number | null {
  if (offer.accessMode !== 'fixed' || offer.accessDurationValue === null) return null
  return offer.accessDurationUnit === 'months'
    ? monthsSpanDays(from, offer.accessDurationValue)
    : offer.accessDurationValue
}

/** Os meses do presente quando a oferta é por meses (o que as pessoas leem: "6 meses"). */
export function giftAccessMonths(
  offer: Pick<GiftOffer, 'accessMode' | 'accessDurationValue' | 'accessDurationUnit'>,
): number | null {
  return offer.accessMode === 'fixed' && offer.accessDurationUnit === 'months'
    ? offer.accessDurationValue
    : null
}

/** Dias corridos entre `from` e o mesmo instante `months` meses-calendário depois (UTC). */
export function monthsSpanDays(from: Date, months: number): number {
  return Math.round((addUtcCalendarMonths(from, months).getTime() - from.getTime()) / DAY_MS)
}

/** Congela a unidade da oferta, sem inferir meses a partir de um prazo em dias. */
export function giftAccessPolicy(offer: GiftOffer): GiftAccessPolicy {
  if (offer.accessMode === 'lifetime')
    return { mode: 'lifetime', durationValue: null, durationUnit: null }
  if (offer.accessMode === 'fixed' && offer.accessDurationValue && offer.accessDurationUnit)
    return {
      mode: 'fixed',
      durationValue: offer.accessDurationValue,
      durationUnit: offer.accessDurationUnit,
    }
  throw new Error('Oferta de presente sem política de acesso válida')
}

/**
 * Dias que as pessoas VEEM (25/11/2026): o prazo divulgado da oferta quando ela tem um (os dias
 * a mais chegam de surpresa, avisados pelo members); senão, o prazo real. Nunca decide acesso.
 */
export function giftAdvertisedDays(
  offer: Pick<
    GiftOffer,
    'accessMode' | 'accessDurationValue' | 'accessDurationUnit' | 'advertisedAccessDays'
  >,
): number | null {
  if (offer.accessMode !== 'fixed') return null
  if (offer.accessDurationUnit === 'months' && offer.accessDurationValue !== null)
    return monthsSpanDays(new Date(), offer.accessDurationValue)
  return offer.advertisedAccessDays ?? offer.accessDurationValue
}

/**
 * Motivo para recusar a oferta como presente, ou null se serve. O presente concede sem cobrar,
 * então a oferta precisa ser de pagamento único (assinatura não vira presente), sem prazo ou com
 * prazo fixo (dias ou, desde 27/11/2026, meses: o resgate grava os dias do calendário), não arquivada (pausada
 * serve: a oferta pode existir só como presente) e do MESMO público da campanha (o público vem do
 * produto principal da oferta). As mensagens aparecem para quem edita a campanha no Admin.
 */
export function giftOfferProblem(offer: GiftOffer, audience: GiftAudience): string | null {
  if (offer.status === 'archived')
    return 'A oferta do presente está arquivada no Catálogo. Escolha uma oferta ativa ou pausada.'
  if (offer.accessMode !== 'fixed' && offer.accessMode !== 'lifetime')
    return 'A oferta do presente precisa ser de pagamento único (prazo fixo ou sem prazo). Assinatura não vira presente.'
  if (offer.accessMode === 'fixed' && (!offer.accessDurationValue || !offer.accessDurationUnit))
    return 'A oferta de prazo fixo precisa ter a duração cadastrada no Catálogo.'
  if (offer.audience !== audience)
    return audience === 'adult'
      ? 'Escolha uma oferta do público adulto, o mesmo da campanha.'
      : 'Escolha uma oferta do público Kids, o mesmo da campanha.'
  return null
}

/**
 * Link do e-mail de boas-vindas: definir senha (conta nova) ou entrar (conta existente). Curso
 * PARA PAIS (`learner: 'parents'`) com conta existente abre direto a página do curso na área
 * dos pais; conta nova segue o primeiro acesso de sempre (definir a senha).
 */
export function giftWelcomeLink(
  audience: GiftAudience,
  appUrl: string,
  token: string | null,
  parentsCourseSlug?: string | null,
): string {
  const base = appUrl.replace(/\/$/, '')
  if (token) return `${base}/redefinir-senha?token=${encodeURIComponent(token)}`
  if (audience === 'kids' && parentsCourseSlug)
    return `${base}/pais/cursos/${encodeURIComponent(parentsCourseSlug)}`
  return audience === 'adult' ? `${base}/cursos` : `${base}/login/responsavel`
}

/**
 * A frase do Mural no e-mail de boas-vindas (o Messaging não tem condicional: o texto vai
 * pronto, ou vazio quando o presente não inclui o Mural).
 */
export function giftMuralText(input: {
  audience: GiftAudience
  /** Participação no Mural (`trial` histórico ou oferta que inclui o Mural completo). */
  participation: boolean
  /** Visita histórica (`visitor`): só ver e jogar. */
  visitorOnly?: boolean
  /** Presente com prazo: depois dele fica a visita ao Mural. */
  hasDeadline: boolean
}): string {
  const adult = input.audience === 'adult'
  if (input.participation) {
    if (adult)
      return input.hasDeadline
        ? 'Durante o presente, você também publica o jogo no Mural adulto e manda o link para quem quiser. Depois do prazo, a sua conta continua podendo ver e jogar no Mural.'
        : 'Você também publica o jogo no Mural adulto e manda o link para quem quiser.'
    return input.hasDeadline
      ? 'Durante o presente, seu filho também pode publicar o jogo, comentar e reagir no Mural dos Criadores. Depois do prazo, a conta continua podendo ver e jogar no Mural.'
      : 'Seu filho também pode publicar o jogo, comentar e reagir no Mural dos Criadores.'
  }
  if (input.visitorOnly)
    return adult
      ? 'Você também pode ver e jogar no Mural adulto enquanto a conta existir.'
      : 'Vocês também podem ver e jogar no Mural dos Criadores enquanto a conta existir.'
  return ''
}

/**
 * O próximo passo do e-mail Kids do presente (`orientacao`, 15/11/2026). Curso da criança: criar
 * o perfil e autorizar o computador (o texto de `DEVICE_SETUP` do Messaging, em texto puro porque
 * o Messaging escapa os valores), mais o aviso de que a autorização antiga vale para quem já tinha
 * conta. Curso PARA PAIS: abrir o curso na área dos pais, sem perfil de criança.
 */
export function giftGuidanceText(input: {
  parentsCourse: boolean
  existingAccount: boolean
}): string {
  if (input.parentsCourse)
    return 'Entre na área dos pais e abra o curso em Cursos para pais. O curso é para você assistir na sua conta, sem perfil de criança.'
  const setup =
    'Depois de entrar como responsável, clique em “Adicionar criança”. Se a criança já tem perfil, clique em “Acesso nos aparelhos” no cartão dela. Na página da criança, clique em “Autorizar aparelho” e prepare o computador em que seu filho vai usar a plataforma, pelo prazo que você escolher. Nesse computador, se aparecer “Quem vai entrar?”, ele clica em “Eu sou criador(a)” e entra no próprio perfil, sem a sua senha e sem o código do seu e-mail.'
  return input.existingAccount
    ? `${setup} Se você já autorizou o computador do seu filho, não precisa refazer: ele continua entrando pelo próprio perfil até o prazo que você escolheu terminar.`
    : setup
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
