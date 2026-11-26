'use client'

import {
  type CampaignDetailView,
  campaignCouponPromotion,
  type OriginDetail,
} from '@sistemazero/core/referrals'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { ShareCard } from '@sistemazero/ui/share-card'
import { useEffect, useRef, useState } from 'react'
import { copyToClipboard } from '@/app/admin/notas-fiscais/copy-to-clipboard'
import { useCommunityRequests } from '@/components/admin/community-page'
import { ByOfferTable, PeopleTable } from '@/components/admin/origin-parts'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import type { Platform } from '@/lib/platform'
import { isOriginDetail, moneyFromCents, moneyRounded, percent } from '@/lib/referral-origin'
import type { CatalogOffersState } from './ambassador-offer-catalog'
import { type GiftOffersState, giftOfferShareDescription } from './campaign-gift-offer'
import {
  AudienceBadge,
  audienceOf,
  cardDateLabel,
  dateLabel,
  GiftOfferSummary,
  KindBadge,
  kindOf,
  moneyLabel,
  previewUrl,
  STATE_LABELS,
} from './campaign-shared'

function Kpi({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <Card className="flex min-w-0 flex-[1_1_9rem] flex-col gap-1 p-4">
      <p className="text-muted-foreground text-sm">{title}</p>
      <p className="font-mono text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </Card>
  )
}

/**
 * O detalhe da campanha (25/11/2026, Canvas "admin-campanha-detalhe"): os números da campanha, do
 * cadastro à assinatura, o que foi vendido, o presente, o desconto e o embaixador, a divulgação,
 * as pessoas que entraram e o histórico. Os números vêm de `/campaigns/:id/results` (admin+);
 * para a equipe sem acesso, o detalhe mostra os contadores de cadastro de sempre.
 */
export function CampaignDetailDialog({
  detail,
  audience,
  canWrite,
  giftOffers,
  catalog,
  offerNames,
  onClose,
  onEdit,
  onDuplicate,
}: {
  detail: CampaignDetailView
  audience: Platform
  canWrite: boolean
  giftOffers: GiftOffersState
  catalog: CatalogOffersState
  offerNames: ReadonlyMap<string, string>
  onClose: () => void
  onEdit: () => void
  onDuplicate: () => void
}) {
  const { get } = useCommunityRequests(audience)
  const campaign = detail.campaign
  const kind = kindOf(campaign)
  const [results, setResults] = useState<OriginDetail | null>(null)
  const [resultsState, setResultsState] = useState<'loading' | 'ready' | 'denied' | 'error'>(
    canWrite ? 'loading' : 'denied',
  )
  const [offset, setOffset] = useState(0)
  const sequence = useRef(0)
  useEffect(() => {
    if (!canWrite) return
    const current = ++sequence.current
    setResultsState('loading')
    get<OriginDetail>(`/api/admin/referrals/campaigns/${campaign.id}/results?offset=${offset}`)
      .then((next) => {
        if (current !== sequence.current) return
        if (!isOriginDetail(next)) {
          setResultsState('error')
          return
        }
        setResults(next)
        setResultsState('ready')
      })
      .catch((err) => {
        if (isCanceledCommunityRequest(err) || current !== sequence.current) return
        setResultsState('error')
      })
  }, [get, campaign.id, offset, canWrite])
  const numbers = results?.results ?? campaign.results
  const showRevenue = numbers?.revenueCents != null
  const subscriptions = results?.byOffer.filter((r) => r.kind === 'subscription') ?? []
  const saleOffer = campaign.saleOfferId ? catalog.byId.get(campaign.saleOfferId) : undefined
  const bought = results
    ? results.people.filter(
        (p) => p.entry.kind === 'one_time' || p.later.some((a) => a.kind === 'one_time'),
      ).length
    : null
  const bonus = results?.people.reduce(
    (acc, p) => {
      if (!p.conversion) return acc
      if (p.conversion.status === 'paid') acc.paid += p.conversion.bonusCents
      else if (p.conversion.status === 'pending') acc.pending += p.conversion.bonusCents
      else if (p.conversion.status === 'eligible') acc.toPay += p.conversion.bonusCents
      return acc
    },
    { paid: 0, pending: 0, toPay: 0 },
  )
  const unresolved = detail.redemptions.filter((r) => r.status !== 'completed')
  const coupon = campaign.couponView
  return (
    <Dialog open onClose={onClose} title={campaign.name} className="max-w-5xl">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={kind} />
          <span className="rounded-md bg-muted px-3 py-1 text-sm">
            {STATE_LABELS[campaign.state]}
          </span>
          <AudienceBadge audience={audienceOf(campaign)} />
          <span className="font-mono text-muted-foreground text-xs">{campaign.code}</span>
          {canWrite ? (
            <span className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" onClick={onEdit}>
                Editar campanha
              </Button>
              <Button variant="outline" onClick={onDuplicate}>
                Duplicar como nova edição
              </Button>
            </span>
          ) : null}
        </div>

        {numbers ? (
          <div className="flex flex-wrap gap-3">
            <Kpi
              title="Cadastros"
              value={numbers.people}
              hint={
                kind === 'gift'
                  ? `${numbers.gifts} pelo presente`
                  : 'pessoas que compraram pelo link'
              }
            />
            <Kpi title="Compras" value={numbers.purchases} hint="fora a assinatura" />
            <Kpi
              title="Assinaturas"
              value={numbers.subscriptions}
              hint={
                subscriptions.length
                  ? subscriptions
                      .map((s) => `${s.count} ${offerNames.get(s.offerSlug ?? '') ?? s.offerSlug}`)
                      .join(' · ')
                  : undefined
              }
            />
            {showRevenue ? (
              <Kpi
                title="Faturamento"
                value={moneyRounded(numbers.revenueCents)}
                hint={`${moneyFromCents(numbers.revenueCents)} pagos, sem estornos`}
              />
            ) : null}
            {bonus && campaign.ambassadorId && bonus.paid + bonus.pending + bonus.toPay > 0 ? (
              <Kpi
                title="Bônus do embaixador"
                value={moneyRounded(bonus.paid + bonus.pending + bonus.toPay)}
                hint={`${moneyLabel(bonus.paid)} pagos · ${moneyLabel(bonus.pending)} na garantia · nesta página`}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Kpi title="Cadastros concluídos" value={campaign.stats.redemptions} />
            <Kpi title="Em andamento" value={campaign.stats.pending} />
            <Kpi title="Com falha" value={campaign.stats.failed} />
            <Kpi title="Assinaturas" value={campaign.stats.conversions} />
          </div>
        )}

        {results && numbers ? (
          <section aria-labelledby="caminho" className="space-y-2">
            <h3 id="caminho" className="font-display font-bold">
              Do cadastro à assinatura
            </h3>
            <ol
              className={`grid gap-2 ${kind === 'gift' && results.giftStarted !== undefined ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}
            >
              <li className="rounded-xl border p-3">
                <p className="text-muted-foreground text-xs">
                  {kind === 'gift' ? 'Entraram pelo presente' : 'Entraram pelo link'}
                </p>
                <p className="font-mono text-xl font-bold">{numbers.people}</p>
              </li>
              {kind === 'gift' && results.giftStarted !== undefined ? (
                <li className="rounded-xl border p-3">
                  <p className="text-muted-foreground text-xs">Começaram o curso do presente</p>
                  {results.giftStarted ? (
                    <p className="font-mono text-xl font-bold">
                      {results.giftStarted.started}
                      {results.giftStarted.people ? (
                        <span className="ml-1 font-normal text-muted-foreground text-sm">
                          · {percent(results.giftStarted.started, results.giftStarted.people)}
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Não deu para conferir agora. Abra a campanha de novo daqui a pouco.
                    </p>
                  )}
                </li>
              ) : null}
              <li className="rounded-xl border p-3">
                <p className="text-muted-foreground text-xs">Compraram alguma oferta</p>
                <p className="font-mono text-xl font-bold">
                  {numbers.purchases}
                  {bought !== null && numbers.people ? (
                    <span className="ml-1 font-normal text-muted-foreground text-sm">
                      · {percent(Math.min(numbers.purchases, numbers.people), numbers.people)}
                    </span>
                  ) : null}
                </p>
              </li>
              <li className="rounded-xl border p-3">
                <p className="text-muted-foreground text-xs">Assinaram a Comunidade</p>
                <p className="font-mono text-xl font-bold">
                  {numbers.subscriptions}
                  {numbers.people ? (
                    <span className="ml-1 font-normal text-muted-foreground text-sm">
                      · {percent(numbers.subscriptions, numbers.people)}
                    </span>
                  ) : null}
                </p>
              </li>
            </ol>
          </section>
        ) : null}

        {results ? (
          <section aria-labelledby="vendido" className="space-y-2">
            <h3 id="vendido" className="font-display font-bold">
              O que foi vendido
            </h3>
            <ByOfferTable detail={results} names={offerNames} showRevenue={showRevenue} />
          </section>
        ) : null}
        {resultsState === 'loading' ? (
          <p role="status" className="text-muted-foreground text-sm">
            Carregando os resultados…
          </p>
        ) : null}
        {resultsState === 'error' ? (
          <p role="alert" className="text-destructive text-sm">
            Os resultados não carregaram agora. Os contadores de cadastro acima seguem valendo.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3 text-sm">
            <p className="font-bold">{kind === 'gift' ? 'O presente' : 'A oferta à venda'}</p>
            {kind === 'gift' ? (
              <p>
                <GiftOfferSummary campaign={campaign} offers={giftOffers} inline />
              </p>
            ) : (
              <p>
                {saleOffer ? `${saleOffer.name} · ${saleOffer.summary}.` : 'Oferta do Catálogo.'}{' '}
                {campaign.linkTarget === 'checkout'
                  ? 'O link vai direto ao pagamento.'
                  : 'O link abre a página de venda.'}
              </p>
            )}
            <p className="mt-1 text-muted-foreground text-xs">
              Cadastros de {cardDateLabel(campaign.startsAt)} a{' '}
              {cardDateLabel(new Date(Date.parse(campaign.endsAt) - 1).toISOString())} (Brasília).
            </p>
            {campaign.redirectPath && campaign.redirectUntil ? (
              <p className="mt-1 text-muted-foreground text-xs">
                Recebe o endereço antigo {campaign.redirectPath} até{' '}
                {cardDateLabel(campaign.redirectUntil)}.
              </p>
            ) : null}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            <p className="font-bold">Desconto</p>
            {coupon ? (
              <>
                <p>{campaignCouponPromotion(coupon, campaign.audience).title}</p>
                <p className="text-muted-foreground text-xs">
                  {campaignCouponPromotion(coupon, campaign.audience).notice}
                </p>
              </>
            ) : campaign.coupon ? (
              <p className="text-muted-foreground">
                Há um cupom vinculado, mas os termos não puderam ser conferidos agora.
              </p>
            ) : (
              <p className="text-muted-foreground">Sem desconto.</p>
            )}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            <p className="font-bold">Embaixador</p>
            <p>{campaign.ambassadorName ?? 'Sem vínculo'}</p>
            <p className="text-muted-foreground text-xs">
              {campaign.commissionEnabled
                ? `${moneyLabel(campaign.commissionAmountCents ?? 0)} no mensal ou ${moneyLabel(campaign.commissionAnnualAmountCents ?? campaign.commissionAmountCents ?? 0)} no anual pela primeira assinatura paga em até ${campaign.commissionWindowDays} dias do cadastro.`
                : 'Sem bônus. Edições valem para novos cadastros.'}
            </p>
          </div>
        </div>

        <section aria-labelledby="divulgacao" className="space-y-3">
          <h3 id="divulgacao" className="font-display font-bold">
            Divulgação
          </h3>
          <Input
            id="campaign-link"
            aria-label="Link público para divulgar"
            readOnly
            value={campaign.shareUrl}
            onFocus={(event) => event.target.select()}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copyToClipboard(campaign.shareUrl, 'Link público')}
            >
              Copiar link
            </Button>
            <a
              className="text-sm underline"
              href={`/api/admin/referrals/campaigns/${campaign.id}/qr`}
            >
              Baixar QR Code
            </a>
            {kind === 'gift' ? (
              <a
                className="text-sm underline"
                href={previewUrl(campaign)}
                target="_blank"
                rel="noreferrer"
              >
                Prévia sem cadastro
              </a>
            ) : null}
            <a
              className="text-sm underline"
              href={campaign.shareUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir link público
            </a>
            <ShareCard
              url={campaign.shareUrl}
              title={campaign.publicTitle}
              subtitle={
                kind === 'sale'
                  ? campaign.audience === 'adult'
                    ? 'Uma oferta para adultos'
                    : 'Uma oferta para famílias · Kids'
                  : campaign.audience === 'adult'
                    ? 'Um presente para adultos'
                    : 'Um presente para famílias · Kids'
              }
              description={
                kind === 'sale'
                  ? (saleOffer?.name ?? campaign.publicTitle)
                  : giftOfferShareDescription(
                      campaign.giftOfferId
                        ? (giftOffers.byId.get(campaign.giftOfferId) ?? null)
                        : null,
                      !campaign.giftOfferId,
                    )
              }
              notice={`${['draft', 'paused', 'ended'].includes(campaign.state) ? `${STATE_LABELS[campaign.state]}: sem novos cadastros. ` : ''}Válido de ${cardDateLabel(campaign.startsAt)} até ${cardDateLabel(new Date(Date.parse(campaign.endsAt) - 1).toISOString())} (Brasília). ${campaign.audience === 'adult' ? 'Cadastro para pessoas de 18 anos ou mais.' : 'Para crianças de 5 a 17 anos. Cadastro pelo responsável.'}`}
            />
            {coupon && ['active', 'scheduled'].includes(coupon.state) ? (
              <ShareCard
                {...campaignCouponPromotion(coupon, campaign.audience)}
                label="Cartão do cupom"
              />
            ) : null}
          </div>
          {campaign.state === 'draft' ? (
            <p className="text-muted-foreground text-sm">
              Rascunho: o link público ainda não aceita cadastros. Use a prévia para conferir a
              página.
            </p>
          ) : campaign.state === 'ended' ? (
            <p className="text-muted-foreground text-sm">
              A campanha terminou: o link mostra que os cadastros foram encerrados, e quem começou o
              cadastro antes ainda pode concluir.
            </p>
          ) : null}
        </section>

        {results ? (
          <section aria-labelledby="pessoas" className="space-y-2">
            <h3 id="pessoas" className="font-display font-bold">
              Pessoas que entraram pela campanha
            </h3>
            <PeopleTable
              detail={results}
              names={offerNames}
              offset={offset}
              onOffset={setOffset}
              personLabel={audienceOf(campaign) === 'adult' ? 'Pessoa' : 'Responsável'}
              filename={`campanha-${campaign.code}-pessoas.csv`}
            />
          </section>
        ) : null}

        {unresolved.length > 0 ? (
          <details className="rounded-xl border p-3 text-sm">
            <summary className="cursor-pointer font-bold">
              Cadastros em andamento ou com falha ({unresolved.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {unresolved.map((row) => (
                <li key={row.id}>
                  {row.name} · {row.email} ·{' '}
                  {row.status === 'pending' ? 'Em andamento' : 'Não deu certo'}
                  {row.lastError ? (
                    <span className="block text-destructive text-xs">{row.lastError}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <details className="rounded-xl border p-3 text-sm">
          <summary className="cursor-pointer font-bold">
            Histórico de alterações ({detail.history.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {detail.history.map((entry) => (
              <li key={entry.id}>
                {dateLabel(entry.createdAt)} · {entry.actor} ·{' '}
                {entry.action === 'created'
                  ? 'Criada'
                  : entry.action === 'duplicated'
                    ? 'Nova edição criada'
                    : 'Atualizada'}
                <details>
                  <summary className="cursor-pointer text-muted-foreground text-xs">
                    Ver valores registrados
                  </summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(entry.changes, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Dialog>
  )
}
