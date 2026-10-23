'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { useEffect, useState } from 'react'
import { type ApiError, apiGet } from '@/lib/api'
import {
  isPensaFunnelPeriod,
  PENSA_FUNNEL_PERIODS,
  type PensaFunnelPeriod,
  type PensaFunnelView,
  pensaFunnelStages,
} from '@/lib/pensa-funnel'

const number = (value: number) => value.toLocaleString('pt-BR')
const share = (value: number | null) => (value === null ? '—' : `${value}%`)

/**
 * Conta os projetos desde a definição até a conferência final, uma vez por equipe.
 */
export function PensaFunnelCard() {
  const [days, setDays] = useState<PensaFunnelPeriod>(30)
  const [view, setView] = useState<PensaFunnelView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    apiGet<PensaFunnelView>(`/api/members/pensa-funnel?days=${days}`)
      .then((result) => {
        if (alive) setView(result)
      })
      .catch((cause) => {
        if (alive)
          setError((cause as ApiError)?.message ?? 'O funil do Pensa não carregou. Tente de novo.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [days])

  const stages = view ? pensaFunnelStages(view) : []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Pensa: onde as crianças param</CardTitle>
          <p className="mt-1 text-muted-foreground text-sm">
            Projetos criados nos últimos {days} dias. Cada projeto é contado uma vez, incluindo
            equipes.
          </p>
        </div>
        <select
          value={days}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (isPensaFunnelPeriod(next)) setDays(next)
          }}
          aria-label="Período do funil do Pensa"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {PENSA_FUNNEL_PERIODS.map((value) => (
            <option key={value} value={value}>
              Últimos {value} dias
            </option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm"
          >
            {error}
          </p>
        ) : null}
        {loading && !view ? <Spinner /> : null}
        {view && view.projects === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum jogo novo no Pensa neste período.</p>
        ) : null}
        {view && view.projects > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passo no Pensa</TableHead>
                  <TableHead className="text-right">Jogos</TableHead>
                  <TableHead className="text-right">Dos que começaram</TableHead>
                  <TableHead className="text-right">Pararam antes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((stage) => (
                  <TableRow key={stage.key}>
                    <TableCell className="font-medium">{stage.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{number(stage.count)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {share(stage.ofProjects)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {stage.key === 'projects' || stage.lost === 0 ? '—' : number(stage.lost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="space-y-2 text-sm">
              <p>
                {number(view.setupCompleted)} projetos prepararam extensões pelo Pensa. Essa
                preparação é dispensada no Pro.
              </p>
              <p>{number(view.pendingChoices)} projetos aguardam uma escolha da criança.</p>
              <p>
                {number(view.adaptationsAccepted)} projetos têm adaptações aceitas para os recursos
                disponíveis.
              </p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
