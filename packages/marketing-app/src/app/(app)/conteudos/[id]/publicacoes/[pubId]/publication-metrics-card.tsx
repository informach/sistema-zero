'use client'

import { Card, CardContent } from '@sistemazero/ui/card'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { apiGet } from '@/lib/api'
import { formatShortSp } from '@/lib/dates'
import type { PublicationMetricsView } from '@/lib/types'

const NUMBER_FMT = new Intl.NumberFormat('pt-BR')

/**
 * Mini-métricas da publicação PUBLICADA (coluna do preview): último snapshot
 * + série curta de views. Sem snapshot ainda = aviso de que a coleta chega.
 */
export function PublicationMetricsCard({ publicationId }: { publicationId: string }) {
  const [view, setView] = useState<PublicationMetricsView | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    apiGet<PublicationMetricsView>(`/api/marketing/publications/${publicationId}/metrics`)
      .then((res) => {
        if (alive) setView(res)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [publicationId])

  if (failed) return null
  if (view === null) {
    return <Skeleton className="h-32 w-full rounded-xl" />
  }

  const latest = view.snapshots[0]
  if (!latest) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          As métricas deste post chegam na próxima coleta automática.
        </CardContent>
      </Card>
    )
  }

  // A série vem mais recente primeiro — o gráfico quer o tempo crescendo.
  const points = [...view.snapshots]
    .reverse()
    .map((s) => ({ capturedAt: s.capturedAt, views: s.views }))

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">Métricas do post</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MetricItem label="Views" value={latest.views} />
          <MetricItem label="Likes" value={latest.likes} />
          <MetricItem label="Comentários" value={latest.comments} />
        </div>
        {points.length > 1 ? (
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <XAxis dataKey="capturedAt" hide />
              <Tooltip
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as
                    | { capturedAt: string; views: number }
                    | undefined
                  if (!active || !point) return null
                  return (
                    <div className="rounded-md border border-border bg-card px-2 py-1 text-xs shadow-md">
                      {formatShortSp(point.capturedAt)} ·{' '}
                      <span className="font-medium">{NUMBER_FMT.format(point.views)} views</span>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Último snapshot em {formatShortSp(latest.capturedAt)}.
        </p>
      </CardContent>
    </Card>
  )
}

function MetricItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-1.5">
      <p className="text-sm font-bold tabular-nums">{NUMBER_FMT.format(value)}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
