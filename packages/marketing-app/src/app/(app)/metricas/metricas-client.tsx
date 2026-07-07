'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { InfoTooltip } from '@sistemazero/ui/info-tooltip'
import { Skeleton } from '@sistemazero/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { Hourglass, Plug } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { NetworkChip } from '@/components/shared/network-chip'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatShortSp } from '@/lib/dates'
import type { AccountsResponse, MetricsSummaryView } from '@/lib/types'

const NUMBER_FMT = new Intl.NumberFormat('pt-BR')

/**
 * Métricas básicas do YouTube (F2): último snapshot do canal + top publicações
 * por views. Busca também as contas p/ separar os dois vazios: "nada conectado"
 * (CTA p/ Conexões) e "conectado, aguardando a primeira coleta" (worker de 6h).
 */
export function MetricasClient() {
  const [state, setState] = useState<{
    summary: MetricsSummaryView
    accounts: AccountsResponse
  } | null>(null)
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

  if (state === null) {
    return (
      <div className="space-y-4" aria-busy="true">
        <span className="sr-only">Carregando métricas</span>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const { summary, accounts } = state
  const hasData = summary.account !== null || summary.topPublications.length > 0
  const hasConnectedYoutube = accounts.items.some(
    (it) => it.network === 'youtube' && it.status === 'connected',
  )

  if (!hasData && !hasConnectedYoutube) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
        <Plug className="size-8 text-muted-foreground" aria-hidden />
        <div className="space-y-1 px-6">
          <p className="text-sm font-medium">Nenhuma conta do YouTube conectada</p>
          <p className="text-sm text-muted-foreground">
            As métricas nascem da conta conectada. Conecte o canal para começar a coleta.
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
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
          <Hourglass className="size-8 text-muted-foreground" aria-hidden />
          <div className="space-y-1 px-6">
            <p className="text-sm font-medium">As primeiras métricas chegam em algumas horas.</p>
            <p className="text-sm text-muted-foreground">
              A conta está conectada e a coleta automática roda a cada 6 horas. Volte mais tarde.
            </p>
          </div>
        </div>
        <NextPhasesCard />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {summary.account ? (
        <Card>
          <CardContent className="flex flex-wrap items-end justify-between gap-4 p-5">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Canal</p>
              <p className="font-medium">
                {summary.account.channelTitle ?? summary.account.displayName}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Inscritos</p>
              <p className="text-2xl font-bold tabular-nums">
                {NUMBER_FMT.format(summary.account.followers)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              coletado em {formatShortSp(summary.account.capturedAt)}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {summary.topPublications.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-medium">Top publicações</h2>
            <InfoTooltip text="Publicações do YouTube ordenadas por views, com o último snapshot coletado de cada uma." />
          </div>
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Publicação</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Publicado em</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Likes</TableHead>
                  <TableHead className="text-right">Comentários</TableHead>
                  <TableHead>Coletado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.topPublications.map((pub) => (
                  <TableRow key={pub.publicationId}>
                    <TableCell>
                      <Link
                        href={`/conteudos/${pub.contentId}/publicacoes/${pub.publicationId}`}
                        className="font-medium hover:underline"
                      >
                        {pub.contentTitle}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <NetworkChip format={pub.format} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {pub.publishedAt ? formatShortSp(pub.publishedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {NUMBER_FMT.format(pub.views)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {NUMBER_FMT.format(pub.likes)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {NUMBER_FMT.format(pub.comments)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatShortSp(pub.capturedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma publicação com métricas ainda. Os números aparecem depois da primeira coleta
            pós-publicação.
          </p>
        </div>
      )}

      <NextPhasesCard />
    </div>
  )
}

/** Bloco discreto do que vem depois (sem badge: é nota, não stub). */
function NextPhasesCard() {
  return (
    <Card>
      <CardContent className="p-4 text-sm text-muted-foreground">
        O dashboard completo (comparativos por rede, heatmap de horários) chega nas próximas fases.
      </CardContent>
    </Card>
  )
}
