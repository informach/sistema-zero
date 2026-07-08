'use client'

import { Card, CardContent } from '@sistemazero/ui/card'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import type { HelpdeskPage, TicketStatus, TicketView } from '@/lib/types'

// Status exibidos no painel (a fila de trabalho; resolvidos/fechados ficam de fora).
const DISPLAY_STATUSES: readonly TicketStatus[] = ['new', 'open', 'waiting']

// Rótulos dos cards no PLURAL (contagens); os singulares dos badges ficam na
// lib/categories.ts.
const CARD_LABELS: Partial<Record<TicketStatus, string>> = {
  new: 'Novos',
  open: 'Abertos',
  waiting: 'Aguardando resposta',
}

/**
 * Contagens por status da caixa de entrada: o `total` da listagem filtrada com
 * `limit=1` conta TUDO no banco sem trazer a página inteira. Client component
 * (fetch via BFF) de propósito: `gatewayFetch` faz refresh-on-401 e SÓ pode
 * escrever cookies em Route Handlers — buscar aqui garante a rotação correta
 * (padrão do painel do marketing-app).
 */
export function PainelCards() {
  const [counts, setCounts] = useState<Record<TicketStatus, number> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const pages = await Promise.all(
          DISPLAY_STATUSES.map((status) =>
            apiGet<HelpdeskPage<TicketView>>(`/api/helpdesk/tickets?status=${status}&limit=1`),
          ),
        )
        if (!alive) return
        const next = {} as Record<TicketStatus, number>
        DISPLAY_STATUSES.forEach((status, i) => {
          next[status] = pages[i]?.total ?? 0
        })
        setCounts(next)
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
    <div className="space-y-3">
      {failed ? (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar as contagens do painel. Recarregue a página.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {DISPLAY_STATUSES.map((status) => (
          <Card key={status}>
            <CardContent className="space-y-1 p-4">
              <p className="text-sm text-muted-foreground">{CARD_LABELS[status]}</p>
              <p className="text-2xl font-bold tabular-nums">
                {counts === null ? '—' : (counts[status] ?? 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
