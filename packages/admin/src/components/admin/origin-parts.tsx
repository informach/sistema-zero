'use client'

import type { AcquisitionView, OriginDetail, OriginPersonView } from '@sistemazero/core/referrals'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Select } from '@sistemazero/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { useEffect, useMemo, useState } from 'react'
import { useCommunityRequests } from '@/components/admin/community-page'
import { loadAllPages } from '@/lib/load-all-pages'
import type { Platform } from '@/lib/platform'
import {
  ACQUISITION_KIND_LABELS,
  acquisitionOrigin,
  dayDate,
  downloadCsv,
  moneyFromCents,
  offerName,
  shortDate,
} from '@/lib/referral-origin'
import type { OfferListItem, Paginated } from '@/lib/types'

/**
 * Peças das telas de origem (25/11/2026): os nomes das ofertas pelo slug, a tabela "O que foi
 * vendido" e a de "Pessoas que entraram", que a campanha e o embaixador dividem.
 */

/** slug → nome das ofertas da comunidade (as linhas de origem só trazem o slug). */
export function useOfferNames(audience: Platform): ReadonlyMap<string, string> {
  const { get } = useCommunityRequests(audience)
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map())
  useEffect(() => {
    let alive = true
    loadAllPages((offset, limit) =>
      get<Paginated<OfferListItem>>(
        `/api/catalog/offers?${new URLSearchParams({ limit: String(limit), offset: String(offset) })}`,
      ),
    )
      .then((offers) => {
        if (alive) setNames(new Map(offers.map((o) => [o.slug, o.name])))
      })
      // Sem os nomes (catálogo fora, página fechada), as tabelas mostram o slug: nada quebra.
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [get])
  return names
}

/** "O que foi vendido": quantidade e faturamento por oferta. */
export function ByOfferTable({
  detail,
  names,
  showRevenue,
}: {
  detail: OriginDetail
  names: ReadonlyMap<string, string>
  showRevenue: boolean
}) {
  if (detail.byOffer.length === 0)
    return <p className="text-sm text-muted-foreground">Ainda não houve vendas por aqui.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Oferta</TableHead>
          <TableHead className="text-right">Qtd.</TableHead>
          {showRevenue ? <TableHead className="text-right">Faturamento</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {detail.byOffer.map((row) => (
          <TableRow key={`${row.kind}:${row.offerSlug}`}>
            <TableCell>
              <div className="font-medium">{offerName(row.offerSlug, names)}</div>
              <div className="text-xs text-muted-foreground">
                {ACQUISITION_KIND_LABELS[row.kind]}
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">{row.count}</TableCell>
            {showRevenue ? (
              <TableCell className="text-right tabular-nums">
                {moneyFromCents(row.revenueCents)}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

const CONVERSION_LABELS: Record<string, string> = {
  pending: 'Na garantia',
  eligible: 'Aguardando Pix',
  paid: 'Pago',
  canceled: 'Assinatura estornada',
  self_blocked: 'Autoindicação',
  unrewarded: 'Sem bônus',
  superseded: 'Substituída',
}

export type PeopleFilter = 'all' | 'subscribed' | 'bought' | 'gift'
const subscribed = (p: OriginPersonView) =>
  p.entry.kind === 'subscription' || p.later.some((a) => a.kind === 'subscription')
const bought = (p: OriginPersonView) =>
  p.entry.kind === 'one_time' || p.later.some((a) => a.kind === 'one_time')
/** O recorte do filtro "Pessoas que entraram" (na página carregada). */
export function filterPeople(people: OriginPersonView[], filter: PeopleFilter) {
  if (filter === 'subscribed') return people.filter(subscribed)
  if (filter === 'bought') return people.filter(bought)
  if (filter === 'gift') return people.filter((p) => !subscribed(p) && !bought(p))
  return people
}

function laterLine(a: AcquisitionView, names: ReadonlyMap<string, string>) {
  const verb = a.kind === 'subscription' ? 'Assinou' : a.kind === 'one_time' ? 'Comprou' : 'Ganhou'
  const refunded = a.status === 'refunded' ? ' (estornado)' : ''
  return `${verb} ${offerName(a.offerSlug, names)} em ${shortDate(a.acquiredAt)} · ${moneyFromCents(a.amountCents)}${refunded}`
}

/**
 * "Pessoas que entraram": quem entrou por esta origem, como, o que fez depois e o bônus. A página
 * vem do referrals (25 por vez); o filtro e a planilha valem para a página aberta.
 */
export function PeopleTable({
  detail,
  names,
  offset,
  onOffset,
  personLabel,
  filename,
}: {
  detail: OriginDetail
  names: ReadonlyMap<string, string>
  offset: number
  onOffset: (next: number) => void
  personLabel: string
  filename: string
}) {
  const [filter, setFilter] = useState<PeopleFilter>('all')
  const shown = useMemo(() => filterPeople(detail.people, filter), [detail.people, filter])
  const counts = useMemo(
    () => ({
      all: detail.people.length,
      subscribed: filterPeople(detail.people, 'subscribed').length,
      bought: filterPeople(detail.people, 'bought').length,
      gift: filterPeople(detail.people, 'gift').length,
    }),
    [detail.people],
  )
  const end = Math.min(offset + detail.people.length, detail.peopleTotal)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filtrar pessoas"
          value={filter}
          onChange={(e) => setFilter(e.target.value as PeopleFilter)}
          className="w-auto"
        >
          <option value="all">Todas ({counts.all})</option>
          <option value="subscribed">Assinaram ({counts.subscribed})</option>
          <option value="bought">Compraram ({counts.bought})</option>
          <option value="gift">Só o presente ({counts.gift})</option>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={shown.length === 0}
          onClick={() =>
            downloadCsv(filename, [
              ['E-mail', 'Entrou em', 'Como entrou', 'O que fez depois', 'Bônus'],
              ...shown.map((p) => [
                p.email,
                dayDate(p.entry.acquiredAt),
                `${ACQUISITION_KIND_LABELS[p.entry.kind]} · ${offerName(p.entry.offerSlug, names)}`,
                p.later.map((a) => laterLine(a, names)).join(' | '),
                p.conversion
                  ? `${CONVERSION_LABELS[p.conversion.status] ?? p.conversion.status} · ${moneyFromCents(p.conversion.bonusCents)}`
                  : '',
              ]),
            ])
          }
        >
          Baixar planilha
        </Button>
      </div>
      <Card className="overflow-hidden rounded-2xl p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{personLabel}</TableHead>
              <TableHead>Entrou em</TableHead>
              <TableHead>Como entrou</TableHead>
              <TableHead>O que fez depois</TableHead>
              <TableHead>Bônus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((p) => {
              const origin = acquisitionOrigin(p.entry)
              return (
                <TableRow key={p.entry.id}>
                  <TableCell className="break-all">{p.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dayDate(p.entry.acquiredAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{ACQUISITION_KIND_LABELS[p.entry.kind]}</div>
                    <div className="text-xs text-muted-foreground">
                      {offerName(p.entry.offerSlug, names)}
                      {origin.detail && p.entry.originKind !== 'campaign'
                        ? ` · ${origin.detail}`
                        : ''}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.later.length === 0 ? (
                      <span className="text-muted-foreground">
                        {p.entry.kind === 'gift' ? 'Ainda não comprou' : 'Ainda não assinou'}
                      </span>
                    ) : (
                      p.later.map((a) => <div key={a.id}>{laterLine(a, names)}</div>)
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.conversion ? (
                      <>
                        <div>{CONVERSION_LABELS[p.conversion.status] ?? p.conversion.status}</div>
                        <div className="text-xs text-muted-foreground">
                          {moneyFromCents(p.conversion.bonusCents)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Sem bônus</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {detail.peopleTotal === 0
                    ? 'Ninguém entrou por aqui ainda.'
                    : 'Ninguém neste filtro nesta página.'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
      {detail.peopleTotal > 0 ? (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span>
            {offset + 1}–{end} de {detail.peopleTotal}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Página anterior"
            disabled={offset === 0}
            onClick={() => onOffset(Math.max(0, offset - 25))}
          >
            ‹
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Próxima página"
            disabled={end >= detail.peopleTotal}
            onClick={() => onOffset(offset + 25)}
          >
            ›
          </Button>
        </div>
      ) : null}
    </div>
  )
}
