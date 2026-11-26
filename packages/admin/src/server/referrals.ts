import 'server-only'
import type {
  AcquisitionView,
  AmbassadorOfferKind,
  AmbassadorOfferView,
  CampaignDetailView,
  CampaignView,
  OriginDetail,
  OriginReport,
} from '@sistemazero/core/referrals'
import type { AccountBonusView } from '@/lib/referral-origin'
import type {
  AmbassadorDetailView,
  AmbassadorListItemView,
  AmbassadorView,
  ConversionAdminView,
  ConversionStatus,
} from '@/lib/types'
import { type GatewayResponse, gatewayFetch } from './gateway'

export function listCampaigns(
  p: ListAmbassadorsParams,
): Promise<GatewayResponse<{ items: CampaignView[]; total: number }>> {
  return gatewayFetch('/referrals/admin/campaigns', {
    query: { audience: p.audience, q: p.q, limit: p.limit, offset: p.offset },
  })
}
export function getCampaign(
  id: string,
  audience?: string,
): Promise<GatewayResponse<CampaignDetailView>> {
  return gatewayFetch(`/referrals/admin/campaigns/${encodeURIComponent(id)}`, {
    query: { audience },
  })
}
export function saveCampaign(
  body: unknown,
  id?: string,
  duplicate = false,
): Promise<GatewayResponse<{ campaign: CampaignView }>> {
  const suffix = id ? `/${encodeURIComponent(id)}${duplicate ? '/duplicate' : ''}` : ''
  return gatewayFetch(`/referrals/admin/campaigns${suffix}`, {
    method: id && !duplicate ? 'PATCH' : 'POST',
    body,
  })
}

export interface ListAmbassadorsParams {
  audience?: string
  q?: string
  limit?: number
  offset?: number
}

/** Lista embaixadores: `GET /referrals/admin/ambassadors` (JWT + RBAC, staff+). */
export function listAmbassadors(
  p: ListAmbassadorsParams,
): Promise<GatewayResponse<{ items: AmbassadorListItemView[]; total: number }>> {
  return gatewayFetch('/referrals/admin/ambassadors', {
    query: { audience: p.audience, q: p.q, limit: p.limit, offset: p.offset },
  })
}

/**
 * Cria um embaixador (nome + e-mail): `POST /referrals/admin/ambassadors`. O
 * referrals gera código + página (capability-URL) e envia o e-mail do link;
 * `emailSent: false` = conta criada mas o e-mail falhou (a resposta traz o
 * `pageUrl` p/ copiar e mandar por qualquer canal).
 */
export function createAmbassador(
  body: unknown,
): Promise<GatewayResponse<{ ambassador: AmbassadorView; emailSent: boolean }>> {
  return gatewayFetch('/referrals/admin/ambassadors', { method: 'POST', body })
}

/** Detalhe + resgates do código: `GET /referrals/admin/ambassadors/:id`. */
export function getAmbassador(
  id: string,
  audience?: string,
): Promise<GatewayResponse<AmbassadorDetailView>> {
  return gatewayFetch(`/referrals/admin/ambassadors/${encodeURIComponent(id)}`, {
    query: { audience },
  })
}

/** Reenvia o e-mail do magic-link (não rotaciona o token). */
export function resendAmbassadorLink(id: string): Promise<GatewayResponse<{ sent: boolean }>> {
  return gatewayFetch(`/referrals/admin/ambassadors/${encodeURIComponent(id)}/resend-link`, {
    method: 'POST',
  })
}

/** Ativa/desativa (o código acompanha) e/ou rotaciona o token da página. */
export function patchAmbassador(
  id: string,
  body: unknown,
): Promise<GatewayResponse<{ ambassador: AmbassadorView }>> {
  return gatewayFetch(`/referrals/admin/ambassadors/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  })
}

export interface ListConversionsParams {
  audience?: string
  status?: ConversionStatus
  limit?: number
  offset?: number
}

/** Bônus (conversões bolsista → assinatura): `GET /referrals/admin/conversions`. */
export function listConversions(
  p: ListConversionsParams,
): Promise<GatewayResponse<{ items: ConversionAdminView[]; total: number }>> {
  return gatewayFetch('/referrals/admin/conversions', {
    query: { audience: p.audience, status: p.status, limit: p.limit, offset: p.offset },
  })
}

/** Marca o bônus como pago (Pix manual já feito). Só de `eligible`; repetição → 409. */
export function markConversionPaid(
  id: string,
  body: unknown,
): Promise<GatewayResponse<{ ok: true }>> {
  return gatewayFetch(`/referrals/admin/conversions/${encodeURIComponent(id)}/mark-paid`, {
    method: 'POST',
    body,
  })
}

/** Antecipa a garantia de uma conversão pendente (teste/exceção; o sweep promove em seguida). */
export function matureConversionNow(id: string): Promise<GatewayResponse<{ ok: true }>> {
  return gatewayFetch(`/referrals/admin/conversions/${encodeURIComponent(id)}/mature-now`, {
    method: 'POST',
  })
}

// ── Origem por aquisição (25/11/2026, Lote 7): leituras admin+ e as listas dos embaixadores ──

/** As listas de ofertas dos embaixadores do público (`gift` e `referral`), staff+. */
export function listAmbassadorOffers(
  audience?: string,
): Promise<GatewayResponse<Record<AmbassadorOfferKind, AmbassadorOfferView[]>>> {
  return gatewayFetch('/referrals/admin/ambassador-offers', { query: { audience } })
}

/** Troca UMA lista inteira (`{audience, kind, items}`), admin+. */
export function saveAmbassadorOffers(
  body: unknown,
): Promise<GatewayResponse<{ items: AmbassadorOfferView[] }>> {
  return gatewayFetch('/referrals/admin/ambassador-offers', { method: 'PUT', body })
}

/** "Origem das vendas" do período (`from`/`to` ISO, até 366 dias), admin+. */
export function getOriginReport(p: {
  audience?: string
  from?: string
  to?: string
  /** Ofertas separadas por vírgula (o filtro por produto). */
  offers?: string
}): Promise<GatewayResponse<OriginReport>> {
  return gatewayFetch('/referrals/admin/origins', {
    query: { audience: p.audience, from: p.from, to: p.to, offers: p.offers },
  })
}

/** Tudo o que um e-mail recebeu ou comprou, com a origem (ficha da conta), admin+. */
export function listAcquisitions(
  email: string,
): Promise<GatewayResponse<{ items: AcquisitionView[]; bonuses?: AccountBonusView[] }>> {
  return gatewayFetch('/referrals/admin/acquisitions', { query: { email } })
}

/** Contas por pedido ao members (o teto da rota `/members/admin/course-starts`). */
const COURSE_STARTS_BATCH = 500

/**
 * "Começaram o curso do presente" (25/11/2026): o referrals manda as contas que entraram por um
 * presente da origem, por curso; o members diz quais começaram. As contas nunca vão ao navegador:
 * o corpo sai com `giftStarted` (ou `null` se o members não respondeu) e sem `giftCourses`.
 */
export async function withGiftStarted(
  detail: GatewayResponse<OriginDetail>,
  ask: (courseSlug: string, userIds: string[]) => Promise<GatewayResponse<unknown>> = (
    courseSlug,
    userIds,
  ) =>
    gatewayFetch('/members/admin/course-starts', {
      method: 'POST',
      body: { courseSlug, userIds },
    }),
): Promise<GatewayResponse<OriginDetail>> {
  if (detail.status >= 400 || !detail.body) return detail
  const { giftCourses, ...body } = detail.body
  if (!giftCourses?.length) return { status: detail.status, body }
  let people = 0
  let started = 0
  try {
    for (const group of giftCourses) {
      people += group.people
      for (let at = 0; at < group.accountUserIds.length; at += COURSE_STARTS_BATCH) {
        const res = await ask(
          group.courseSlug,
          group.accountUserIds.slice(at, at + COURSE_STARTS_BATCH),
        )
        const list = (res.body as { started?: unknown } | null)?.started
        // Curso que não existe mais conta como ninguém começou; outra falha esconde o número.
        if (res.status === 404) continue
        if (res.status >= 400 || !Array.isArray(list))
          throw new Error(`course-starts ${res.status}`)
        started += list.length
      }
    }
  } catch {
    return { status: detail.status, body: { ...body, giftStarted: null } }
  }
  return { status: detail.status, body: { ...body, giftStarted: { people, started } } }
}

/** Resultado de uma campanha ou de um embaixador: números, vendas por oferta e pessoas. */
export function getOriginDetail(
  kind: 'campaigns' | 'ambassadors',
  id: string,
  offset?: number,
  /** A comunidade da lente: o embaixador tem código nos dois públicos. */
  audience?: string,
): Promise<GatewayResponse<OriginDetail>> {
  return gatewayFetch(`/referrals/admin/${kind}/${encodeURIComponent(id)}/results`, {
    query: { offset, audience },
  })
}
