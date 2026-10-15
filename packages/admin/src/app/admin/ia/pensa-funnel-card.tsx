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
  pensaFunnelAnswers,
  pensaFunnelStages,
} from '@/lib/pensa-funnel'

const number = (value: number) => value.toLocaleString('pt-BR')
const share = (value: number | null) => (value === null ? '—' : `${value}%`)

/**
 * Onde as crianças param no Pensa: da ideia à versão pronta, e como responderam às perguntas do
 * Zappy. Conta só a primeira versão dos jogos criados no período (a equipe entra junto).
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
          setError((cause as ApiError)?.message ?? 'Não foi possível carregar o funil do Pensa.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [days])

  const stages = view ? pensaFunnelStages(view) : []
  const answers = view ? pensaFunnelAnswers(view) : null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Pensa: onde as crianças param</CardTitle>
          <p className="mt-1 text-muted-foreground text-sm">
            Primeira versão dos jogos criados nos últimos {days} dias. Inclui as contas da equipe.
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
        {view && view.games === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum jogo novo no Pensa neste período.</p>
        ) : null}
        {view && view.games > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
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
                      {share(stage.ofGames)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {stage.key === 'games' || stage.lost === 0 ? '—' : number(stage.lost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {answers ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Perguntas do Zappy</h3>
                <p className="text-muted-foreground text-sm">
                  {answers.questions === 0
                    ? 'O Zappy não fez nenhuma pergunta neste período.'
                    : `${number(answers.questions)} ${answers.questions === 1 ? 'pergunta' : 'perguntas'} em ${number(view.asked)} ${view.asked === 1 ? 'jogo' : 'jogos'} (${share(answers.askedOfTold)} dos que contaram a ideia).`}
                </p>
                {answers.questions > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Como responderam</TableHead>
                        <TableHead className="text-right">Perguntas</TableHead>
                        <TableHead className="text-right">Parte</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {answers.rows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {number(row.count)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {share(row.ofQuestions)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
