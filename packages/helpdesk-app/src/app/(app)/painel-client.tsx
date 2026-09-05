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

// Exceções primeiro: o painel aponta para o que a equipe precisa destravar agora.
const CARDS: CardDef[] = [
  { key: 'slaBreached', label: 'SLA estourado', value: (s) => s.sla.breached },
  { key: 'slaAtRisk', label: 'Em risco', value: (s) => s.sla.atRisk },
  { key: 'slaUnassigned', label: 'Sem responsável', value: (s) => s.sla.unassigned },
  { key: 'new', label: 'Novos', value: (s) => s.counts.new },
  { key: 'open', label: 'Abertos', value: (s) => s.counts.open },
  { key: 'resolved7d', label: 'Resolvidos (7 dias)', value: (s) => s.resolved7d },
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

      <section aria-labelledby="attention-title" className="space-y-3">
        <div>
          <h2 id="attention-title" className="text-sm font-medium">
            Atenção da equipe
          </h2>
          <p className="text-xs text-muted-foreground">
            Metas internas de primeira resposta, nunca exibidas como promessa ao cliente.
          </p>
        </div>
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
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <p className="text-sm font-medium">Volume de tickets</p>
            <p className="text-xs text-muted-foreground">Recebidos por dia, nos últimos 14 dias.</p>
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
