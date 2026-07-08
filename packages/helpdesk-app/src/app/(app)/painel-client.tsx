'use client'

import { Card, CardContent } from '@sistemazero/ui/card'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { TicketStatsView } from '@/lib/types'
import { VolumeChart } from './volume-chart'

interface CardDef {
  key: string
  label: string
  value: (s: TicketStatsView) => number
}

// Fila de trabalho + fechamentos + trabalho da IA (a ordem dos cards no painel).
const CARDS: CardDef[] = [
  { key: 'new', label: 'Novos', value: (s) => s.counts.new },
  { key: 'open', label: 'Abertos', value: (s) => s.counts.open },
  { key: 'waiting', label: 'Aguardando', value: (s) => s.counts.waiting },
  { key: 'resolvedToday', label: 'Resolvidos hoje', value: (s) => s.resolvedToday },
  { key: 'resolved7d', label: 'Resolvidos (7 dias)', value: (s) => s.resolved7d },
  { key: 'autoReplied7d', label: 'Auto-respondidos (7 dias)', value: (s) => s.autoReplied7d },
]

/**
 * Painel: contagens + gráfico de volume, agregados no backend
 * (`GET /helpdesk/tickets/stats`) numa consulta só — somar páginas de listagem
 * subcontaria acima de 100 tickets. Client component (fetch via BFF) de
 * propósito: `gatewayFetch` faz refresh-on-401 e SÓ pode escrever cookies em
 * Route Handlers — buscar aqui garante a rotação correta (padrão do marketing-app).
 */
export function PainelClient() {
  const [stats, setStats] = useState<TicketStatsView | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const data = await apiGet<TicketStatsView>('/api/helpdesk/tickets/stats')
        if (alive) setStats(data)
      } catch {
        // Erro NÃO vira "0" (indistinguível de caixa vazia): fica o traço + aviso.
        if (alive) setFailed(true)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-6">
      {failed ? (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar o painel. Recarregue a página.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CARDS.map((card) => (
          <Card key={card.key}>
            <CardContent className="space-y-1 p-4">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold tabular-nums">
                {stats === null ? '—' : card.value(stats)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <p className="text-sm font-medium">Volume de tickets</p>
            <p className="text-xs text-muted-foreground">
              Recebidos por dia e quantos a IA respondeu sozinha, nos últimos 14 dias.
            </p>
          </div>
          {stats === null ? (
            <div className="h-[280px] animate-pulse rounded-xl bg-muted/40" aria-hidden />
          ) : (
            <VolumeChart data={stats.volume} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
