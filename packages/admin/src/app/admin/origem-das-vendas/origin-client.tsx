'use client'

import {
  ACQUISITION_ORIGIN_KINDS,
  type AcquisitionOriginKind,
  type OriginReport,
} from '@sistemazero/core/referrals'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import Link from 'next/link'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { communityPage, useCommunityRequests } from '@/components/admin/community-page'
import { LoadError } from '@/components/admin/empty-state'
import { useOfferNames } from '@/components/admin/origin-parts'
import { OverviewCard } from '@/components/admin/overview-card'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import type { Platform } from '@/lib/platform'
import {
  ACQUISITION_KIND_LABELS,
  acquisitionOrigin,
  downloadCsv,
  isOriginReport,
  moneyFromCents,
  moneyRounded,
  ORIGIN_LABELS,
  ORIGIN_PERIOD_LABELS,
  type OriginPeriod,
  offerName,
  originPeriodQuery,
  percent,
  placeLabel,
} from '@/lib/referral-origin'
import { OriginChart } from './origin-chart'

const WRITE_ROLES = ['admin', 'superadmin']

/** A legenda de cada origem na tabela "Por origem". */
function originHint(origin: AcquisitionOriginKind, report: OriginReport): string | null {
  if (origin === 'ambassador') {
    const n = report.ambassadors.filter((a) => a.people > 0).length
    return `${n} ${n === 1 ? 'embaixador' : 'embaixadores'} com resultado`
  }
  if (origin === 'campaign') {
    const n = report.campaigns.filter((c) => c.people > 0).length
    return `${n} ${n === 1 ? 'campanha' : 'campanhas'}`
  }
  if (origin === 'platform') return 'quem já tinha conta'
  if (origin === 'ads') return 'Instagram, Meta e Google'
  return null
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="space-y-3 rounded-2xl p-5">
      <section className="space-y-3" aria-label={title}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {action}
        </div>
        {children}
      </section>
    </Card>
  )
}

export const OriginClient = communityPage<{ currentRole: string }>(OriginForCommunity)

/**
 * Origem das vendas (25/11/2026, Canvas "admin-origem"): de onde vêm as pessoas, os presentes, as
 * compras e as assinaturas, e quanto cada origem faturou. Leitura admin+ (traz e-mails e
 * faturamento): a equipe sem acesso vê o recado, sem pedir nada ao serviço.
 */
function OriginForCommunity({
  currentRole,
  audience,
}: {
  currentRole: string
  audience: Platform
}) {
  const allowed = WRITE_ROLES.includes(currentRole)
  const { get } = useCommunityRequests(audience)
  const offerNames = useOfferNames(audience)
  const [period, setPeriod] = useState<OriginPeriod>('30d')
  // O relatório guarda o PERÍODO dele: trocar o período limpa a tela até o novo chegar, e a
  // planilha leva o nome do período que ela de fato contém.
  const [loaded, setLoaded] = useState<{ period: OriginPeriod; report: OriginReport } | null>(null)
  const report = loaded?.period === period ? loaded.report : null
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [query, setQuery] = useState('')
  const [originFilter, setOriginFilter] = useState<'all' | AcquisitionOriginKind>('all')
  const sequence = useRef(0)
  const load = useCallback(async () => {
    if (!allowed) return
    const current = ++sequence.current
    const requested = period
    setState('loading')
    try {
      const next = await get<OriginReport>(
        `/api/admin/referrals/origins?${originPeriodQuery(period)}`,
      )
      if (current !== sequence.current) return
      if (!isOriginReport(next)) {
        setState('error')
        return
      }
      setLoaded({ period: requested, report: next })
      setState('ready')
    } catch (err) {
      if (isCanceledCommunityRequest(err) || current !== sequence.current) return
      setState('error')
    }
  }, [get, period, allowed])
  useEffect(() => {
    void load()
  }, [load])
  const latest = useMemo(() => {
    if (!report) return []
    const term = query.trim().toLowerCase()
    return report.latest.filter(
      (a) =>
        (originFilter === 'all' || a.originKind === originFilter) &&
        (!term || a.email.toLowerCase().includes(term)),
    )
  }, [report, query, originFilter])

  const header = (
    <AdminHeader
      title="Origem das vendas"
      description="De onde vêm as pessoas, os presentes, as compras e as assinaturas, e quanto cada origem faturou. Cada aquisição guarda a própria origem."
      action={
        allowed && report ? (
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(`origem-das-vendas-${loaded?.period ?? period}.csv`, [
                ['Origem', 'Pessoas novas', 'Presentes', 'Compras', 'Assinaturas', 'Faturamento'],
                ...report.byOrigin.map((row) => [
                  ORIGIN_LABELS[row.origin],
                  row.newPeople,
                  row.gifts,
                  row.purchases,
                  row.subscriptions,
                  moneyFromCents(row.revenueCents),
                ]),
                [],
                ['Quando', 'E-mail', 'O que', 'Valor', 'Origem', 'Detalhe'],
                ...report.latest.map((a) => {
                  const origin = acquisitionOrigin(a)
                  return [
                    a.acquiredAt,
                    a.email,
                    `${ACQUISITION_KIND_LABELS[a.kind]} · ${offerName(a.offerSlug, offerNames)}`,
                    moneyFromCents(a.amountCents),
                    origin.label,
                    origin.detail ?? '',
                  ]
                }),
              ])
            }
          >
            Baixar planilha
          </Button>
        ) : undefined
      }
    />
  )
  if (!allowed)
    return (
      <div className="space-y-6">
        {header}
        <Card className="p-6 text-muted-foreground">
          A Origem das vendas tem e-mails e faturamento, então só a administração vê esta página.
        </Card>
      </div>
    )
  const totals = report?.totals
  return (
    <div className="space-y-6">
      {header}
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-sm font-semibold">
          <span className="block">Período</span>
          <Select
            value={period}
            className="w-auto"
            onChange={(e) => setPeriod(e.target.value as OriginPeriod)}
          >
            {(['30d', '7d', '90d', 'year'] as const).map((p) => (
              <option key={p} value={p}>
                {ORIGIN_PERIOD_LABELS[p]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {state === 'error' ? (
        <LoadError what="a origem das vendas" onRetry={() => void load()} />
      ) : null}
      {state === 'loading' && !report ? (
        <p role="status" className="text-muted-foreground">
          Carregando a origem das vendas…
        </p>
      ) : null}
      {report?.truncated ? (
        <p role="status" className="rounded-lg bg-warning-tint p-3 text-sm">
          O período tem aquisições demais para uma leitura só: os números cobrem as mais recentes.
          Escolha um período menor para ver tudo.
        </p>
      ) : null}
      {report && totals ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <OverviewCard
              title="Pessoas novas"
              value={totals.newPeople}
              description="primeira aquisição no período"
            />
            <OverviewCard title="Presentes" value={totals.gifts} description="resgatados" />
            <OverviewCard
              title="Compras"
              value={totals.purchases}
              description="fora a assinatura"
            />
            <OverviewCard
              title="Assinaturas"
              value={totals.subscriptions}
              description="primeiras assinaturas"
            />
            <OverviewCard
              title="Faturamento"
              value={moneyRounded(totals.revenueCents)}
              description="valor pago, sem estornos"
            />
            <OverviewCard
              title="Por indicação"
              value={`${Math.round(totals.referralShare * 100)}%`}
              description="do faturamento veio de embaixadores e campanhas"
            />
          </div>

          <Section title="Faturamento por semana e origem">
            {report.weeks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem vendas no período.</p>
            ) : (
              <OriginChart weeks={report.weeks} />
            )}
          </Section>

          <Section title="Por origem">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Pessoas novas</TableHead>
                  <TableHead className="text-right">Presentes</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                  <TableHead className="text-right">Assinaturas</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Parte do faturamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACQUISITION_ORIGIN_KINDS.map((origin) => {
                  const row = report.byOrigin.find((r) => r.origin === origin)
                  if (!row) return null
                  const hint = originHint(origin, report)
                  return (
                    <TableRow key={origin}>
                      <TableCell>
                        <div className="font-medium">{ORIGIN_LABELS[origin]}</div>
                        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {origin === 'platform' ? '—' : row.newPeople}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {origin === 'platform' ? '—' : row.gifts}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.purchases}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.subscriptions}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {moneyRounded(row.revenueCents)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {percent(Number(row.revenueCents), Number(totals.revenueCents))}
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {totals.newPeople}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {totals.gifts}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {totals.purchases}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {totals.subscriptions}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {moneyRounded(totals.revenueCents)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-muted-foreground text-xs">
              Uma aquisição de campanha com embaixador entra em Campanhas aqui e também aparece no
              resultado do embaixador. Nenhum valor é contado duas vezes no total.
            </p>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Botões da plataforma">
              <p className="text-muted-foreground text-sm">
                O que cada botão vendeu para quem já estava dentro.
              </p>
              {report.places.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma venda pelos botões ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lugar</TableHead>
                      <TableHead className="text-right">Compras</TableHead>
                      <TableHead className="text-right">Assin.</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.places.map((row) => (
                      <TableRow key={row.place}>
                        <TableCell>{placeLabel(row.place)}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.purchases}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.subscriptions}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {moneyRounded(row.revenueCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
            <Section title="Caminho até a assinatura">
              <p className="text-muted-foreground text-sm">
                Pela primeira entrada da pessoa, quantas assinaram em até 45 dias.
              </p>
              {report.paths.length === 0 ? (
                <p className="text-muted-foreground text-sm">Ninguém entrou no período ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Primeira entrada</TableHead>
                      <TableHead className="text-right">Pessoas</TableHead>
                      <TableHead className="text-right">Assinaram</TableHead>
                      <TableHead className="text-right">Em média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.paths.map((row) => (
                      <TableRow key={`${row.kind}:${row.offerSlug}`}>
                        <TableCell>
                          {ACQUISITION_KIND_LABELS[row.kind]} ·{' '}
                          {offerName(row.offerSlug, offerNames)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.people}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {percent(row.subscribed, row.people)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.averageDays == null ? '—' : `${Math.round(row.averageDays)} dias`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
            <Section
              title="Embaixadores que mais trouxeram"
              action={
                <Link href="/admin/embaixadores" className="text-primary text-sm hover:underline">
                  Ver todos
                </Link>
              }
            >
              <RankingTable rows={report.ambassadors} label="Embaixador" />
            </Section>
            <Section
              title="Campanhas que mais trouxeram"
              action={
                <Link href="/admin/embaixadores" className="text-primary text-sm hover:underline">
                  Ver todas
                </Link>
              }
            >
              <RankingTable rows={report.campaigns} label="Campanha" />
            </Section>
          </div>

          <Section title="Últimas aquisições">
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="E-mail"
                aria-label="Buscar aquisições por e-mail"
                className="w-full max-w-xs"
              />
              <Select
                aria-label="Origem"
                value={originFilter}
                className="w-auto"
                onChange={(e) => setOriginFilter(e.target.value as 'all' | AcquisitionOriginKind)}
              >
                <option value="all">Todas as origens</option>
                {ACQUISITION_ORIGIN_KINDS.map((origin) => (
                  <option key={origin} value={origin}>
                    {ORIGIN_LABELS[origin]}
                  </option>
                ))}
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>O que</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latest.map((a) => {
                  const origin = acquisitionOrigin(a)
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(a.acquiredAt).toLocaleString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="break-all">{a.email}</TableCell>
                      <TableCell>
                        {offerName(a.offerSlug, offerNames)}
                        <div className="text-xs text-muted-foreground">
                          {ACQUISITION_KIND_LABELS[a.kind]}
                          {a.status === 'refunded' ? ' · estornado' : ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {moneyFromCents(a.amountCents)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{origin.label}</div>
                        {origin.detail ? (
                          <div className="text-xs text-muted-foreground">{origin.detail}</div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {latest.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nenhuma aquisição com esse filtro.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Section>
        </>
      ) : null}
    </div>
  )
}

function RankingTable({ rows, label }: { rows: OriginReport['ambassadors']; label: string }) {
  const top = rows.slice(0, 5)
  if (top.length === 0) return <p className="text-muted-foreground text-sm">Ninguém no período.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{label}</TableHead>
          <TableHead className="text-right">Pessoas</TableHead>
          <TableHead className="text-right">Assin.</TableHead>
          <TableHead className="text-right">Faturamento</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {top.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">{row.people}</TableCell>
            <TableCell className="text-right tabular-nums">{row.subscriptions}</TableCell>
            <TableCell className="text-right tabular-nums">
              {row.revenueCents == null ? '—' : moneyRounded(row.revenueCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
