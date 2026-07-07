'use client'

import { Card, CardContent } from '@sistemazero/ui/card'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { type ContentStage, PRODUCTION_STAGES, STAGE_LABELS } from '@/lib/pipeline'
import type { StageCountsView } from '@/lib/types'

// Etapas exibidas no painel (produção + derivadas; `canceled` fica de fora).
const DISPLAY_STAGES: readonly ContentStage[] = [...PRODUCTION_STAGES, 'scheduled', 'published']

/**
 * Contagens por etapa do pipeline, agregadas no backend (`stage-counts` conta
 * TUDO — somar uma página de listagem subcontaria acima de 100 conteúdos).
 * Client component (fetch via BFF) de propósito: `gatewayFetch` faz
 * refresh-on-401 e SÓ pode escrever cookies em Route Handlers — buscar aqui
 * garante a rotação correta (padrão do dashboard do admin).
 */
export function PainelCards() {
  const [counts, setCounts] = useState<Record<ContentStage, number> | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const data = await apiGet<StageCountsView>('/api/marketing/contents/stage-counts')
        if (alive) setCounts(data.counts)
      } catch {
        // Erro NÃO vira "0" (indistinguível de pipeline vazio): fica o traço + aviso.
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
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {DISPLAY_STAGES.map((stage) => (
          <Card key={stage}>
            <CardContent className="space-y-1 p-4">
              <p className="text-sm text-muted-foreground">{STAGE_LABELS[stage]}</p>
              <p className="text-2xl font-bold tabular-nums">
                {counts === null ? '—' : (counts[stage] ?? 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
