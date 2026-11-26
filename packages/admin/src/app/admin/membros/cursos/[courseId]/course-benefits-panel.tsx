'use client'

import type { CourseBenefitReport, CourseBenefitSummary } from '@sistemazero/core/referrals'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
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
    <section className="space-y-4" aria-label="Benefícios permanentes do curso">
      <div>
        <h2 className="text-lg font-semibold">Benefícios do curso</h2>
        <p className="text-sm text-muted-foreground">
          Disponíveis enquanto a pessoa tem acesso ao curso. O período abaixo filtra os resultados.
        </p>
        <a href="/admin/origem-das-vendas" className="text-sm underline">
          Comparar com resgates de campanhas e embaixadores em Origem das vendas
        </a>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {items === null ? (
        <p>Consultando benefícios…</p>
      ) : items.length === 0 ? (
        <Card>Nenhum benefício permanente cadastrado neste curso.</Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Resgates a partir de" htmlFor={`${fieldsId}-from`}>
              <Input
                id={`${fieldsId}-from`}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="Resgates até" htmlFor={`${fieldsId}-to`}>
              <Input
                id={`${fieldsId}-to`}
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>
          {items.map((b) => (
            <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{b.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {b.results.gifts} resgates no total ·{' '}
                  {b.status === 'active' ? 'Ativo' : 'Desativado'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => void load(b.id)}
              >
                Ver resgates no período
              </Button>
            </Card>
          ))}
        </>
      )}
      {report ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">
                {report.benefit.name}: {report.results.gifts} resgates
              </h3>
              <p className="text-sm text-muted-foreground">
                {report.period.from ? `Desde ${dayDate(report.period.from)}` : 'Desde o início'}
                {report.period.to ? ` · antes de ${dayDate(report.period.to)}` : ' · até agora'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
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
              Baixar esta página de resgates
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-2">Pessoa</th>
                  <th className="p-2">Resgatou em</th>
                  <th className="p-2">Origem do resgate</th>
                  <th className="p-2">Origem do acesso ao curso</th>
                </tr>
              </thead>
              <tbody>
                {report.detail.people.map((p) => (
                  <tr key={p.entry.id} className="border-t border-border">
                    <td className="p-2">
                      <div>{p.email}</div>
                      {p.accountUserId ? (
                        <a
                          className="underline"
                          href={`/admin/membros/${encodeURIComponent(p.accountUserId)}`}
                        >
                          Ver ficha
                        </a>
                      ) : null}
                    </td>
                    <td className="p-2">{dayDate(p.entry.acquiredAt)}</td>
                    <td className="p-2">
                      {acquisitionOrigin(p.entry).label}
                      <div className="text-muted-foreground">
                        {p.entry.courseBenefit?.benefitName}
                      </div>
                    </td>
                    <td className="p-2">{courseAccessOrigin(p.entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.detail.people.length === 0 ? <p>Nenhum resgate neste período.</p> : null}
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
        </Card>
      ) : null}
    </section>
  )
}
