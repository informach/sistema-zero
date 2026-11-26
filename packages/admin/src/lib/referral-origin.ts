import type {
  AcquisitionKind,
  AcquisitionOriginKind,
  AcquisitionView,
  OriginDetail,
  OriginReport,
  OriginResults,
} from '@sistemazero/core/referrals'

/**
 * As réguas e os textos das telas de origem do Admin (Campanhas, Embaixadores, Origem das vendas
 * e a ficha da conta, 25/11/2026). Puro: os números vêm do referrals; aqui só nomes, períodos e
 * planilha.
 */

/** Centavos em string (bigint do referrals) para "R$ 970,00". */
export function moneyFromCents(cents: string | number | null | undefined): string {
  const n = typeof cents === 'number' ? cents : Number(cents ?? 0)
  return (Number.isFinite(n) ? n / 100 : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** O número grande dos cartões: "R$ 4.735", sem centavos. */
export function moneyRounded(cents: string | number | null | undefined): string {
  const n = typeof cents === 'number' ? cents : Number(cents ?? 0)
  return (Number.isFinite(n) ? Math.round(n / 100) : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

/** "6,3%" com uma casa; sem base, "0%". */
export function percent(part: number, whole: number): string {
  if (!whole) return '0%'
  return `${((part / whole) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

/** Os nomes de cada origem nas tabelas (plural) e nas linhas (singular). */
export const ORIGIN_LABELS: Record<AcquisitionOriginKind, string> = {
  ambassador: 'Link de embaixador',
  campaign: 'Campanhas',
  platform: 'Botões da plataforma',
  ads: 'Anúncios e redes',
  none: 'Sem indicação',
}
export const ORIGIN_SHORT_LABELS: Record<AcquisitionOriginKind, string> = {
  ambassador: 'Embaixador',
  campaign: 'Campanha',
  platform: 'Botão',
  ads: 'Anúncio',
  none: 'Sem indicação',
}
/** A legenda do gráfico (a mesma ordem das barras empilhadas). */
export const ORIGIN_CHART_LABELS: Record<AcquisitionOriginKind, string> = {
  ambassador: 'Embaixadores',
  campaign: 'Campanhas',
  platform: 'Botões da plataforma',
  ads: 'Anúncios e redes',
  none: 'Sem indicação',
}

export const ACQUISITION_KIND_LABELS: Record<AcquisitionKind, string> = {
  gift: 'Presente',
  one_time: 'Compra',
  subscription: 'Assinatura',
}

/**
 * O lugar de cada botão da plataforma (`place`, `COMMERCE_PLACES` do member-shell e os `?lugar=`
 * do Kids). Lugar novo sem nome aparece com a etiqueta crua.
 */
const PLACE_LABELS: Record<string, string> = {
  'pais-inicio': 'Área dos pais · cartão do Início',
  'pais-cursos': 'Área dos pais · cursos para pais',
  'pais-curso-fechado': 'Área dos pais · curso fechado',
  'crianca-curso-fechado': 'Kids · curso fechado',
  'crianca-produto-fechado': 'Kids · ferramenta fechada',
  inicio: 'Início',
  cursos: 'Cursos',
  'curso-fechado': 'Curso fechado',
  aula: 'Aula',
}
export function placeLabel(place: string | null | undefined): string {
  if (!place) return 'Botão da plataforma'
  return PLACE_LABELS[place] ?? place
}

export type OriginPeriod = '7d' | '30d' | '90d' | 'year'
export const ORIGIN_PERIOD_LABELS: Record<OriginPeriod, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  year: 'Último ano',
}
const DAY_MS = 86_400_000
/**
 * O período do relatório (`/referrals/admin/origins` aceita até 366 dias): "Último ano" é o teto
 * dele, no lugar do "Desde o início" do Canvas.
 */
export function originPeriodRange(period: OriginPeriod, now = new Date()) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
  return { from: new Date(now.getTime() - days * DAY_MS).toISOString(), to: now.toISOString() }
}
export function originPeriodQuery(period: OriginPeriod, now = new Date()): string {
  const { from, to } = originPeriodRange(period, now)
  return new URLSearchParams({ from, to }).toString()
}

/** O nome de uma oferta pelo slug (as linhas de origem só trazem o slug). */
export function offerName(slug: string | null, names: ReadonlyMap<string, string>): string {
  if (!slug) return 'Oferta'
  return names.get(slug) ?? slug
}

/** Uma aquisição em uma linha: "Presente · Cadê Todo Mundo? 7 dias". */
export function acquisitionLabel(
  item: Pick<AcquisitionView, 'kind' | 'offerSlug'>,
  names: ReadonlyMap<string, string>,
): string {
  return `${ACQUISITION_KIND_LABELS[item.kind]} · ${offerName(item.offerSlug, names)}`
}

/** De onde veio a aquisição, com o detalhe ("Black Friday do Desafio", "Rafael Souza"). */
export function acquisitionOrigin(item: AcquisitionView): { label: string; detail: string | null } {
  switch (item.originKind) {
    case 'campaign':
      return {
        label: ORIGIN_SHORT_LABELS.campaign,
        detail: item.campaignTitle
          ? `${item.campaignTitle}${item.ambassadorName ? ` · com ${item.ambassadorName}` : ''}`
          : null,
      }
    case 'ambassador':
      return { label: ORIGIN_SHORT_LABELS.ambassador, detail: item.ambassadorName ?? null }
    case 'platform':
      return { label: ORIGIN_SHORT_LABELS.platform, detail: placeLabel(item.place) }
    case 'ads':
      return { label: ORIGIN_SHORT_LABELS.ads, detail: item.utmSource }
    default:
      return { label: ORIGIN_SHORT_LABELS.none, detail: null }
  }
}

/**
 * "Veio por" de um bônus: a primeira aquisição ativa da pessoa com o embaixador do bônus (a que
 * ganhou o bônus, pela régua do referrals). Campanha mostra o nome dela; senão "Link pessoal".
 */
export function bonusCameBy(
  acquisitions: AcquisitionView[],
  ambassador: { id?: string | null; name: string | null },
  names: ReadonlyMap<string, string>,
): { label: string; detail: string } | null {
  // Pelo id do embaixador (dois embaixadores podem ter o mesmo nome); o nome só vale quando o
  // referrals ainda não manda o id.
  const sameAmbassador = (a: AcquisitionView) =>
    ambassador.id
      ? a.ambassadorId === ambassador.id
      : Boolean(a.ambassadorName) && a.ambassadorName === ambassador.name
  const entry = acquisitions
    .filter((a) => a.status === 'active' && sameAmbassador(a))
    .sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))[0]
  if (!entry) return null
  const what =
    entry.kind === 'gift' ? 'presente' : entry.kind === 'one_time' ? 'comprou' : 'assinou'
  return {
    label: entry.campaignTitle ?? 'Link pessoal',
    detail: `${what} ${offerName(entry.offerSlug, names)} em ${shortDate(entry.acquiredAt)}`,
  }
}

const SP_SHORT = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
})
const SP_DAY = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
})
/** "25/11" no horário de Brasília. */
export function shortDate(iso: string): string {
  return SP_SHORT.format(new Date(iso))
}
/** "25/11/2026" no horário de Brasília. */
export function dayDate(iso: string): string {
  return SP_DAY.format(new Date(iso))
}

/** Os cartões de resultado de uma origem; faturamento só quando o referrals manda (admin+). */
export function resultsRevenue(results: OriginResults | undefined): string | null {
  return results?.revenueCents == null ? null : results.revenueCents
}

/** Planilha CSV (separador `;`, como o Excel em português abre) com BOM. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value)
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return `﻿${rows.map((row) => row.map(cell).join(';')).join('\r\n')}`
}

/** Baixa a planilha no navegador. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** A resposta tem a forma do relatório? (Um serviço antigo ou um proxy de erro não quebram a tela.) */
export function isOriginReport(value: unknown): value is OriginReport {
  const v = value as Partial<OriginReport> | null
  return Boolean(
    v &&
      typeof v === 'object' &&
      v.totals &&
      Array.isArray(v.byOrigin) &&
      Array.isArray(v.weeks) &&
      Array.isArray(v.places) &&
      Array.isArray(v.paths) &&
      Array.isArray(v.ambassadors) &&
      Array.isArray(v.campaigns) &&
      Array.isArray(v.latest),
  )
}
/** A resposta tem a forma do detalhe de uma origem? */
export function isOriginDetail(value: unknown): value is OriginDetail {
  const v = value as Partial<OriginDetail> | null
  return Boolean(
    v && typeof v === 'object' && v.results && Array.isArray(v.byOffer) && Array.isArray(v.people),
  )
}

/** O que cada conversão é, em palavras (o bônus da tabela de pessoas e da ficha). */
export const CONVERSION_LABELS: Record<string, string> = {
  pending: 'Na garantia',
  eligible: 'Aguardando Pix',
  paid: 'Pago',
  canceled: 'Assinatura estornada',
  self_blocked: 'Autoindicação',
  unrewarded: 'Sem bônus',
  superseded: 'Substituída',
}

/** O bônus da assinatura de uma pessoa (a ficha; nunca a chave Pix do embaixador). */
export interface AccountBonusView {
  id: string
  audience: 'kids' | 'adult' | null
  offerSlug: string
  status: string
  bonusCents: number
  paidAt: string
  maturesAt: string
  paidMarkedAt: string | null
  ambassadorId: string | null
  ambassadorName: string | null
  campaignTitle: string | null
}

/** "Patrícia Ramos · R$ 80,00 · na garantia até 25/11/2026" (Canvas "admin-ficha"). */
export function bonusLine(b: AccountBonusView): string {
  const who = b.ambassadorName ?? 'Embaixador'
  const status =
    b.status === 'pending'
      ? `na garantia até ${dayDate(b.maturesAt)}`
      : b.status === 'paid' && b.paidMarkedAt
        ? `pago em ${dayDate(b.paidMarkedAt)}`
        : (CONVERSION_LABELS[b.status] ?? b.status).toLowerCase()
  return `${who} · ${moneyFromCents(b.bonusCents)} · ${status}`
}

/** O contador de cada oferta no painel das listas ("212 resgates pelos embaixadores"). */
export function ambassadorCountLabel(
  kind: 'gift' | 'referral',
  subscription: boolean,
  counts: { gifts: number; purchases: number; subscriptions: number } | undefined,
): string {
  const n =
    kind === 'gift'
      ? (counts?.gifts ?? 0)
      : subscription
        ? (counts?.subscriptions ?? 0)
        : (counts?.purchases ?? 0)
  const word =
    kind === 'gift'
      ? n === 1
        ? 'resgate'
        : 'resgates'
      : subscription
        ? n === 1
          ? 'assinatura'
          : 'assinaturas'
        : n === 1
          ? 'compra'
          : 'compras'
  return `${n.toLocaleString('pt-BR')} ${word} pelos embaixadores`
}
