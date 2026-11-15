import {
  type GiftAudience,
  isGiftAudience,
  publicGiftSourceName,
  type ReferralGiftOfferView,
  type ReferralGiftView,
} from '@sistemazero/core/referrals'
import type { GatewayClient } from '../lib/gateway-client'

/**
 * Os slugs do curso Cadê Todo Mundo (Kids e adulto): o presente desses cursos usa a página
 * editorial rica de cada público. Outro curso usa a variante enxuta (`giftVariant`).
 */
export const CADE_COURSE_SLUGS: readonly string[] = ['cade-todo-mundo', 'cade-todo-mundo-adulto']

/**
 * Qual corpo a página do presente usa (15/11/2026):
 * - `cade`: a página editorial do Cadê Todo Mundo (também sem `gift`, a leitura antiga);
 * - `pais`: curso PARA PAIS (`learner: 'parents'`), variante enxuta para o pai ou a mãe;
 * - `curso`: outro curso, variante genérica com o nome e o prazo.
 */
export type GiftVariant = 'cade' | 'pais' | 'curso'
export function giftVariant(gift: ReferralGiftOfferView | undefined): GiftVariant {
  if (!gift) return 'cade'
  if (gift.courseSlug && CADE_COURSE_SLUGS.includes(gift.courseSlug)) return 'cade'
  return gift.learner === 'parents' ? 'pais' : 'curso'
}

const nullableString = (value: unknown) => value === null || typeof value === 'string'

/**
 * O `gift` da leitura pública (a oferta do presente). Ausente = leitura antiga (`undefined`);
 * presente mas torto = `null`, e a página falha fechada: mostrar o corpo de outro curso seria
 * prometer o que o cadastro não entrega.
 */
export function parseGiftOffer(raw: unknown): ReferralGiftOfferView | undefined | null {
  if (raw === undefined) return undefined
  if (!raw || typeof raw !== 'object') return null
  const gift = raw as Record<string, unknown>
  if (
    typeof gift.offerId !== 'string' ||
    !gift.offerId ||
    typeof gift.offerTitle !== 'string' ||
    !gift.offerTitle.trim() ||
    !nullableString(gift.courseSlug) ||
    !nullableString(gift.courseTitle) ||
    !(gift.learner === null || gift.learner === 'child' || gift.learner === 'parents') ||
    !(
      gift.accessDays === null ||
      (typeof gift.accessDays === 'number' &&
        Number.isInteger(gift.accessDays) &&
        gift.accessDays > 0)
    ) ||
    typeof gift.includesMural !== 'boolean'
  )
    return null
  const courseTitle = typeof gift.courseTitle === 'string' ? gift.courseTitle.trim() : ''
  return {
    offerId: gift.offerId,
    offerTitle: gift.offerTitle.trim(),
    courseSlug: (gift.courseSlug as string | null) || null,
    courseTitle: courseTitle || null,
    learner: gift.learner,
    accessDays: gift.accessDays,
    includesMural: gift.includesMural,
  }
}

/** O presente resolvido, com o público sempre preenchido (a página escolhe o corpo por ele). */
export type ResolvedGiftView = ReferralGiftView & { audience: GiftAudience }

export type ReferralGiftPage =
  | {
      kind: 'ready' | 'preparing' | 'scheduled' | 'paused' | 'ended'
      referrerName: string
      audience: GiftAudience
      gift: ResolvedGiftView
    }
  | { kind: 'not_found' | 'unavailable' }

/**
 * Never expose the claim form without an explicit availability confirmation.
 *
 * O público vem do código (20/10/2026): ausente = `kids` (respostas anteriores ao presente
 * adulto); um valor desconhecido falha fechado, porque abrir a página do público errado
 * mostraria o curso e o cadastro de outro produto.
 */
export async function resolveReferralGiftPage(
  gateway: Pick<GatewayClient, 'resolveReferralCode'>,
  code: string,
): Promise<ReferralGiftPage> {
  if (!/^[a-z0-9-]{4,32}$/.test(code)) return { kind: 'not_found' }

  const result = await gateway.resolveReferralCode(code)
  if (result.status === 404) return { kind: 'not_found' }
  if (result.status !== 200) return { kind: 'unavailable' }

  const body = legacyGiftView(result.body as Partial<ReferralGiftView> | null)
  const audience: unknown = body?.audience ?? 'kids'
  const offer = parseGiftOffer(body?.gift)
  if (
    offer === null ||
    !isGiftAudience(audience) ||
    body?.code !== code ||
    typeof body?.displayName !== 'string' ||
    !body.displayName.trim() ||
    typeof body.giftAvailable !== 'boolean' ||
    !body.source ||
    typeof body.source.name !== 'string' ||
    !body.source.name.trim() ||
    body.ownerKind !== body.source.kind ||
    !['ambassador', 'account', 'campaign'].includes(body.source.kind) ||
    !body.state ||
    !['active', 'scheduled', 'paused', 'ended'].includes(body.state) ||
    (body.source.kind === 'campaign' &&
      (typeof body.startsAt !== 'string' ||
        typeof body.endsAt !== 'string' ||
        !Number.isFinite(Date.parse(body.startsAt)) ||
        !Number.isFinite(Date.parse(body.endsAt)) ||
        Date.parse(body.endsAt) <= Date.parse(body.startsAt)))
  ) {
    return { kind: 'unavailable' }
  }
  const publicName = publicGiftSourceName(body.source)
  return {
    kind: body.state === 'active' ? (body.giftAvailable ? 'ready' : 'preparing') : body.state,
    referrerName: publicName,
    audience,
    gift: {
      ...(body as ReferralGiftView),
      displayName: publicName,
      source: { ...body.source, name: publicName },
      audience,
      ...(offer ? { gift: offer } : {}),
    },
  }
}

/**
 * O referrals anterior às campanhas responde só `code/ownerKind/displayName/giftAvailable`.
 * Enquanto o funil sobe antes dele, o convite de embaixador ou de conta vale como ativo, com o
 * nome de quem indicou como origem; campanha sem `source`/`state` continua falhando fechada.
 */
function legacyGiftView(body: Partial<ReferralGiftView> | null): Partial<ReferralGiftView> | null {
  if (!body || body.source || body.state) return body
  if (body.ownerKind !== 'ambassador' && body.ownerKind !== 'account') return body
  if (typeof body.displayName !== 'string') return body
  return {
    ...body,
    source: { kind: body.ownerKind, name: body.displayName },
    state: 'active',
    startsAt: null,
    endsAt: null,
  }
}
