'use client'

import type { CourseBenefitReport, CourseBenefitSummary } from '@sistemazero/core/referrals'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { ArrowUpRight, Download } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { apiGet } from '@/lib/api'
import { acquisitionOrigin, courseAccessOrigin, dayDate, downloadCsv } from '@/lib/referral-origin'

export function CourseBenefitsPanel({
  courseSlug,
  audience,
}: {
  courseSlug: string
  audience: 'kids' | 'adult'
}) {
  const fieldsId = useId()
  const [items, setItems] = useState<CourseBenefitSummary[] | null>(null)
  const [report, setReport] = useState<CourseBenefitReport | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setItems(null)
    setReport(null)
    setError('')
    const query = new URLSearchParams({ audience, courseSlug })
    apiGet<{ items: CourseBenefitSummary[] }>(`/api/admin/referrals/course-benefits?${query}`, {
      signal: controller.signal,
    })
      .then((r) => setItems(r.items))
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Não foi possível consultar os benefícios do curso.')
      })
    return () => controller.abort()
  }, [audience, courseSlug])

  async function load(id: string, nextOffset = 0, keepPeriod = false) {
    if (loading) return
    setLoading(true)
    setError('')
    const query = new URLSearchParams({ audience, offset: String(nextOffset) })
    if (keepPeriod && report) {
      if (report.period.from) query.set('from', report.period.from)
      if (report.period.to) query.set('to', report.period.to)
    } else {
      if (from) query.set('from', new Date(`${from}T00:00:00-03:00`).toISOString())
      if (to) {
        const end = new Date(`${to}T00:00:00-03:00`)
        end.setUTCDate(end.getUTCDate() + 1)
        query.set('to', end.toISOString())
      }
    }
    try {
      const r = await apiGet<CourseBenefitReport>(
        `/api/admin/referrals/course-benefits/${encodeURIComponent(id)}/results?${query}`,
      )
      setReport(r)
      setOffset(nextOffset)
    } catch {
      setError('Não foi possível consultar os resgates. Confira o período e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="space-y-6"
      aria-label="Benefícios permanentes do curso"
      aria-busy={loading || (items === null && !error)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Benefícios do curso</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Acompanhe quem resgatou os presentes oferecidos dentro deste curso.
          </p>
        </div>
        <a
          href="/admin/origem-das-vendas"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Comparar origens
          <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {items === null ? (
        error ? null : (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground sm:p-6" role="status">
              Consultando benefícios…
            </CardContent>
          </Card>
        )
      ) : items.length === 0 ? (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle>Nenhum benefício cadastrado</CardTitle>
            <CardDescription>Os presentes vinculados a este curso aparecerão aqui.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle>Período dos resgates</CardTitle>
              <CardDescription>
                O período filtra os resultados. Os benefícios continuam disponíveis enquanto a
                pessoa tem acesso ao curso.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-0 sm:flex sm:flex-wrap sm:items-end sm:p-6 sm:pt-0">
              <Field label="De" htmlFor={`${fieldsId}-from`} className="sm:w-48">
                <Input
                  id={`${fieldsId}-from`}
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field label="Até" htmlFor={`${fieldsId}-to`} className="sm:w-48">
                <Input
                  id={`${fieldsId}-to`}
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
          {items.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold leading-snug">{b.name}</h3>
                    <Badge variant={b.status === 'active' ? 'success' : 'muted'}>
                      {b.status === 'active' ? 'Ativo' : 'Desativado'}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight tabular-nums">
                      {b.results.gifts}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {b.results.gifts === 1 ? 'resgate no total' : 'resgates no total'}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full shrink-0 sm:w-auto"
                  disabled={loading}
                  onClick={() => void load(b.id)}
                >
                  Ver resgates no período
                </Button>
              </CardContent>
            </Card>
          ))}
        </>
      )}
      {report ? (
        <Card>
          <CardHeader className="gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div className="min-w-0 space-y-1.5">
              <CardTitle className="leading-snug">Resgates de {report.benefit.name}</CardTitle>
              <CardDescription>
                {report.results.gifts}{' '}
                {report.results.gifts === 1 ? 'resgate no período' : 'resgates no período'}.{' '}
                {report.period.from ? `Desde ${dayDate(report.period.from)}` : 'Desde o início'}
                {report.period.to ? ` · antes de ${dayDate(report.period.to)}` : ' · até agora'}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              disabled={loading || report.detail.people.length === 0}
              onClick={() =>
                downloadCsv(`resgates-beneficio-${report.benefit.code}.csv`, [
                  ['Período inicial', report.period.from ?? 'Desde o início'],
                  ['Período final exclusivo', report.period.to ?? 'Até agora'],
                  [],
                  [
                    'Pessoa',
                    'Resgatou em',
                    'Origem do resgate',
                    'Benefício',
                    'Origem do acesso ao curso',
                  ],
                  ...report.detail.people.map((p) => [
                    p.email,
                    p.entry.acquiredAt,
                    acquisitionOrigin(p.entry).label,
                    p.entry.courseBenefit?.benefitName,
                    courseAccessOrigin(p.entry),
                  ]),
                ])
              }
            >
              <Download className="size-4" aria-hidden />
              Baixar esta página
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[680px] text-left text-sm">
                <caption className="sr-only">
                  Pessoas que resgataram o benefício e a origem de cada acesso
                </caption>
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Pessoa
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Resgatou em
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Origem do resgate
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Origem do acesso ao curso
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.detail.people.map((p) => (
                    <tr key={p.entry.id} className="border-t border-border">
                      <td className="px-4 py-3 align-top">
                        <div className="max-w-64 break-all font-medium">{p.email}</div>
                        {p.accountUserId ? (
                          <a
                            className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                            href={`/admin/membros/${encodeURIComponent(p.accountUserId)}`}
                          >
                            Ver ficha
                          </a>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        {dayDate(p.entry.acquiredAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {acquisitionOrigin(p.entry).label}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {p.entry.courseBenefit?.benefitName}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">{courseAccessOrigin(p.entry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.detail.people.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum resgate neste período.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                {report.detail.peopleTotal === 0
                  ? 'Nenhum resultado'
                  : `${offset + 1} a ${offset + report.detail.people.length} de ${report.detail.peopleTotal}`}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || offset === 0}
                  onClick={() => void load(report.benefit.id, Math.max(0, offset - 25), true)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    loading || offset + report.detail.people.length >= report.detail.peopleTotal
                  }
                  onClick={() => void load(report.benefit.id, offset + 25, true)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
