'use client'

import { Card, CardContent } from '@sistemazero/ui/card'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { followersDeltaByNetwork } from '@/lib/metrics'
import { NETWORK_LABELS, type SocialNetwork } from '@/lib/networks'
import type { FollowersSeriesView, MetricsSummaryView } from '@/lib/types'

const NUMBER_FMT = new Intl.NumberFormat('pt-BR')

/**
 * Um card por REDE com conta conectada: seguidores (soma das contas) + delta
 * do período da série + totais de 28 dias (posts/views/likes/comments).
 */
export function NetworkCards({
  summary,
  series,
}: {
  summary: MetricsSummaryView
  series: FollowersSeriesView
}) {
  const networks = [...new Set(summary.accounts.map((a) => a.network))]
  if (networks.length === 0) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {networks.map((network) => (
        <NetworkCard key={network} network={network} summary={summary} series={series} />
      ))}
    </div>
  )
}

function NetworkCard({
  network,
  summary,
  series,
}: {
  network: SocialNetwork
  summary: MetricsSummaryView
  series: FollowersSeriesView
}) {
  const accounts = summary.accounts.filter((a) => a.network === network)
  const followers = accounts.reduce((sum, a) => sum + a.followers, 0)
  const delta = followersDeltaByNetwork(series, network)
  const totals = summary.networkTotals.find((t) => t.network === network)
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{NETWORK_LABELS[network]}</p>
          {accounts.length > 1 ? (
            <span className="text-xs text-muted-foreground">{accounts.length} contas</span>
          ) : null}
        </div>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold tabular-nums">{NUMBER_FMT.format(followers)}</p>
          <span className="pb-0.5 text-xs text-muted-foreground">seguidores</span>
        </div>
        <DeltaLine delta={delta} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          <TotalsItem label="Posts (28d)" value={totals?.posts} />
          <TotalsItem label="Views" value={totals?.views} />
          <TotalsItem label="Likes" value={totals?.likes} />
          <TotalsItem label="Comentários" value={totals?.comments} />
        </div>
      </CardContent>
    </Card>
  )
}

function DeltaLine({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <p className="text-xs text-muted-foreground">Sem variação no período ainda</p>
  }
  const positive = delta >= 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <p
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        positive ? 'text-success-foreground' : 'text-destructive',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {positive ? '+' : ''}
      {NUMBER_FMT.format(delta)} no período
    </p>
  )
}

function TotalsItem({ label, value }: { label: string; value: number | undefined }) {
  return (
    <p className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="font-medium tabular-nums text-foreground">
        {value === undefined ? '—' : NUMBER_FMT.format(value)}
      </span>
    </p>
  )
}
