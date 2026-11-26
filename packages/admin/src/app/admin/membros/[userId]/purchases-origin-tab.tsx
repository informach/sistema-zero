'use client'

import type { AcquisitionView } from '@sistemazero/core/referrals'
import { Card } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { type ReactNode, useEffect, useState } from 'react'
import { useOfferNames } from '@/components/admin/origin-parts'
import { type ApiError, apiGet } from '@/lib/api'
import type { Platform } from '@/lib/platform'
import {
  ACQUISITION_KIND_LABELS,
  type AccountBonusView,
  acquisitionOrigin,
  bonusLine,
  dayDate,
  moneyFromCents,
  offerName,
} from '@/lib/referral-origin'

/** "Como chegou": a primeira aquisição da pessoa (`firstEntry`; sem a marca, a mais antiga). */
export function firstAcquisition(items: AcquisitionView[]): AcquisitionView | null {
  const sorted = [...items].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))
  return sorted.find((a) => a.firstEntry) ?? sorted[0] ?? null
}

/** A frase do "Como chegou" (Canvas "admin-ficha"). */
export function arrivalText(entry: AcquisitionView, names: ReadonlyMap<string, string>): string {
  const what =
    entry.kind === 'gift'
      ? `Ganhou ${offerName(entry.offerSlug, names)} de presente.`
      : entry.kind === 'one_time'
        ? `Comprou ${offerName(entry.offerSlug, names)}.`
        : `Assinou ${offerName(entry.offerSlug, names)}.`
  const ambassador =
    entry.originKind === 'campaign' && entry.ambassadorName
      ? ` A campanha tem o embaixador ${entry.ambassadorName}.`
      : ''
  return `${what}${ambassador}`
}

function arrivalTitle(entry: AcquisitionView): string {
  const origin = acquisitionOrigin(entry)
  const where =
    entry.originKind === 'campaign'
      ? `Pela campanha ${entry.campaignTitle ?? ''}`.trim()
      : entry.originKind === 'ambassador'
        ? `Pelo link de ${entry.ambassadorName ?? 'um embaixador'}`
        : entry.originKind === 'platform'
          ? `Por um botão da plataforma (${origin.detail})`
          : entry.originKind === 'ads'
            ? `Por anúncio ou rede${origin.detail ? ` (${origin.detail})` : ''}`
            : 'Sem indicação'
  return `${where}, em ${dayDate(entry.acquiredAt)}`
}

/**
 * Ficha da conta › Compras e origem (25/11/2026, Canvas "admin-ficha"): como a pessoa chegou, tudo
 * o que ela recebeu ou comprou com a origem de cada um e, embaixo, os pagamentos com o e-mail (a
 * aba Pagamentos de antes). A origem é leitura admin+: para a equipe, só os pagamentos.
 */
export function PurchasesOriginTab({
  email,
  platform,
  canReadOrigin,
  payments,
}: {
  email: string | null
  platform: Platform
  canReadOrigin: boolean
  payments: ReactNode
}) {
  const names = useOfferNames(platform)
  const [items, setItems] = useState<AcquisitionView[] | null>(null)
  const [bonuses, setBonuses] = useState<AccountBonusView[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!email || !canReadOrigin) return
    let alive = true
    setItems(null)
    setError(null)
    apiGet<{ items: AcquisitionView[]; bonuses?: AccountBonusView[] }>(
      `/api/admin/referrals/acquisitions?${new URLSearchParams({ email })}`,
    )
      .then((result) => {
        if (!alive) return
        setItems(result.items)
        setBonuses(result.bonuses ?? [])
      })
      .catch((err) => {
        if (alive) setError((err as ApiError).message ?? 'Não conseguimos carregar a origem.')
      })
    return () => {
      alive = false
    }
  }, [email, canReadOrigin])
  const entry = items ? firstAcquisition(items) : null
  const sorted = items ? [...items].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt)) : []
  return (
    <div className="space-y-4">
      {canReadOrigin && email ? (
        items === null && !error ? (
          <Card className="py-10 text-center text-muted-foreground">
            <Spinner className="mx-auto" />
          </Card>
        ) : error ? (
          <Card className="py-6 text-center text-destructive text-sm">{error}</Card>
        ) : (
          <>
            <Card className="space-y-1 p-4">
              <p className="text-muted-foreground text-xs">Como chegou</p>
              {entry ? (
                <>
                  <p className="font-semibold">{arrivalTitle(entry)}</p>
                  <p className="text-muted-foreground text-sm">{arrivalText(entry, names)}</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Nenhum presente nem compra com este e-mail desde que a origem passou a ser
                  guardada.
                </p>
              )}
            </Card>
            {bonuses.length ? (
              <Card className="space-y-2 p-4">
                <p className="text-muted-foreground text-xs">Bônus da assinatura</p>
                {bonuses.map((b) => (
                  <div key={b.id}>
                    <p className="font-semibold">{bonusLine(b)}</p>
                    <p className="text-muted-foreground text-sm">
                      {offerName(b.offerSlug, names)}
                      {b.campaignTitle ? ` · pela campanha ${b.campaignTitle}` : ''} · assinou em{' '}
                      {dayDate(b.paidAt)}
                    </p>
                  </div>
                ))}
              </Card>
            ) : null}
            {sorted.length ? (
              <Card className="overflow-hidden p-0">
                <div className="border-border border-b p-3">
                  <h2 className="font-semibold text-sm">Tudo o que recebeu ou comprou</h2>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>O que</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((a) => {
                      const origin = acquisitionOrigin(a)
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-muted-foreground">
                            {dayDate(a.acquiredAt)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{offerName(a.offerSlug, names)}</div>
                            <div className="text-muted-foreground text-xs">
                              {ACQUISITION_KIND_LABELS[a.kind].toLowerCase()}
                              {a.audience === 'kids' ? ' · Kids' : ' · Adultos'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {moneyFromCents(a.amountCents)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{origin.label}</div>
                            <div className="text-muted-foreground text-xs">
                              {[origin.detail, a.firstEntry ? 'primeira entrada' : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {a.status === 'refunded'
                              ? 'Estornado'
                              : a.kind === 'gift'
                                ? 'Concluído'
                                : 'Pago'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            ) : null}
          </>
        )
      ) : null}
      {payments}
    </div>
  )
}
