'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Hourglass, Plug } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import { NETWORK_LABELS, SOCIAL_NETWORKS, type SocialNetwork } from '@/lib/networks'
import type {
  AccountsResponse,
  BestTimesView,
  FollowersSeriesView,
  MetricsSummaryView,
} from '@/lib/types'
import { BestTimesHeatmap } from './best-times-heatmap'
import { FollowersChart } from './followers-chart'
import { NetworkCards } from './network-cards'
import { TopPublicationsTable } from './top-publications-table'

const PERIODS = [7, 30, 90] as const
type Period = (typeof PERIODS)[number]
const BEST_TIMES_PERIODS = [90, 180, 365] as const
type BestTimesPeriod = (typeof BEST_TIMES_PERIODS)[number]

/**
 * Dashboard de métricas (F3): cards por rede (seguidores + totais 28d), série
 * de seguidores com filtros de rede/período (refetch no backend) e top
 * publicações multi-rede. Os dois vazios continuam distintos: "nada conectado"
 * (CTA p/ Conexões) e "conectado, aguardando a primeira coleta".
 */
export function MetricasClient() {
  const [state, setState] = useState<{
    summary: MetricsSummaryView
    accounts: AccountsResponse
  } | null>(null)
  const [series, setSeries] = useState<FollowersSeriesView | null>(null)
  const [network, setNetwork] = useState<SocialNetwork | null>(null)
  const [days, setDays] = useState<Period>(30)
  const [bestTimes, setBestTimes] = useState<BestTimesView | null>(null)
  const [bestTimesNetwork, setBestTimesNetwork] = useState<SocialNetwork | null>(null)
  const [bestTimesDays, setBestTimesDays] = useState<BestTimesPeriod>(180)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
  useEffect(() => {
    let alive = true
    setFailed(false)
    Promise.all([
      apiGet<MetricsSummaryView>('/api/marketing/metrics/summary'),
      apiGet<AccountsResponse>('/api/marketing/accounts'),
    ])
      .then(([summary, accounts]) => {
        if (alive) setState({ summary, accounts })
      })
      .catch(() => {
        // Erro não vira "sem métricas" (indistinguível do vazio real).
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [reloadKey])

  // Série de seguidores refaz a busca ao trocar rede/período (dado do backend).
  useEffect(() => {
    let alive = true
    const params = new URLSearchParams({ days: String(days) })
    if (network) params.set('network', network)
    apiGet<FollowersSeriesView>(`/api/marketing/metrics/followers-series?${params}`)
      .then((view) => {
        if (alive) setSeries(view)
      })
      .catch(() => {
        if (alive) setSeries({ series: [] })
      })
    return () => {
      alive = false
    }
  }, [network, days])

  // Melhores horários: mesmo padrão (agregado no backend, filtros refazem).
  useEffect(() => {
    let alive = true
    const params = new URLSearchParams({ days: String(bestTimesDays) })
    if (bestTimesNetwork) params.set('network', bestTimesNetwork)
    apiGet<BestTimesView>(`/api/marketing/metrics/best-times?${params}`)
      .then((view) => {
        if (alive) setBestTimes(view)
      })
      .catch(() => {
        if (alive) setBestTimes({ cells: [], totalPosts: 0 })
      })
    return () => {
      alive = false
    }
  }, [bestTimesNetwork, bestTimesDays])

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-destructive" role="alert">
          Não foi possível carregar as métricas.
        </p>
        <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  if (state === null || series === null || bestTimes === null) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Carregando métricas</span>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const { summary, accounts } = state
  const connectedNetworks = new Set(
    accounts.items.filter((a) => a.status === 'connected').map((a) => a.network),
  )
  const hasData = summary.accounts.length > 0 || summary.topPublications.length > 0

  if (!hasData && connectedNetworks.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
        <Plug className="size-8 text-muted-foreground" aria-hidden />
        <div className="space-y-1 px-6">
          <p className="text-sm font-medium">Nenhuma conta conectada</p>
          <p className="text-sm text-muted-foreground">
            As métricas nascem das contas conectadas. Conecte o YouTube ou o Facebook e Instagram
            para começar a coleta.
          </p>
        </div>
        <Link href="/conexoes" className={cn(buttonVariants({ variant: 'outline' }))}>
          Conectar em Conexões
        </Link>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
        <Hourglass className="size-8 text-muted-foreground" aria-hidden />
        <div className="space-y-1 px-6">
          <p className="text-sm font-medium">As primeiras métricas chegam em algumas horas.</p>
          <p className="text-sm text-muted-foreground">
            As contas estão conectadas e a coleta automática já está agendada. Volte mais tarde.
          </p>
        </div>
      </div>
    )
  }

  const filterableNetworks = SOCIAL_NETWORKS.filter((n) => connectedNetworks.has(n))

  return (
    <div className="space-y-5">
      <NetworkCards summary={summary} series={series} />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Seguidores</h2>
          <div className="flex flex-wrap items-center gap-2">
            {filterableNetworks.length > 1 ? (
              <FilterGroup
                options={[
                  { key: 'all', label: 'Todas' },
                  ...filterableNetworks.map((n) => ({ key: n, label: NETWORK_LABELS[n] })),
                ]}
                active={network ?? 'all'}
                onSelect={(key) => setNetwork(key === 'all' ? null : (key as SocialNetwork))}
              />
            ) : null}
            <FilterGroup
              options={PERIODS.map((p) => ({ key: String(p), label: `${p}d` }))}
              active={String(days)}
              onSelect={(key) => setDays(Number(key) as Period)}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <FollowersChart view={series} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Melhores horários</h2>
          <div className="flex flex-wrap items-center gap-2">
            {filterableNetworks.length > 1 ? (
              <FilterGroup
                options={[
                  { key: 'all', label: 'Todas' },
                  ...filterableNetworks.map((n) => ({ key: n, label: NETWORK_LABELS[n] })),
                ]}
                active={bestTimesNetwork ?? 'all'}
                onSelect={(key) =>
                  setBestTimesNetwork(key === 'all' ? null : (key as SocialNetwork))
                }
              />
            ) : null}
            <FilterGroup
              options={BEST_TIMES_PERIODS.map((p) => ({ key: String(p), label: `${p}d` }))}
              active={String(bestTimesDays)}
              onSelect={(key) => setBestTimesDays(Number(key) as BestTimesPeriod)}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <BestTimesHeatmap view={bestTimes} />
        </div>
        <p className="text-xs text-muted-foreground">
          Cada célula é um horário da semana (fuso de São Paulo). Quanto mais forte a cor, mais
          views por post as publicações daquele horário somaram no período.
        </p>
      </div>

      <TopPublicationsTable publications={summary.topPublications} />
    </div>
  )
}

/** Grupo de botões-filtro (pílulas), padrão dos filtros do Painel. */
function FilterGroup({
  options,
  active,
  onSelect,
}: {
  options: Array<{ key: string; label: string }>
  active: string
  onSelect: (key: string) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onSelect(option.key)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            option.key === active
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
