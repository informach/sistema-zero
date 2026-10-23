'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { type ApiError, apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import {
  attentionDeadlineLabel,
  HELPDESK_PATHS,
  type HelpdeskAttentionView,
  helpdeskHref,
  helpdeskTicketPath,
  type TicketStatsView,
} from '@/lib/helpdesk-panel'
import { VolumeChart } from './volume-chart'

interface StatDef {
  key: string
  label: string
  value: (s: TicketStatsView) => number
  path?: string
  /** Destaca o cartão quando o número passa de zero (exceções que pedem ação). */
  alert?: boolean
}

// Exceções primeiro, na mesma ordem do painel do app de atendimento.
const ATTENTION: StatDef[] = [
  {
    key: 'breached',
    label: 'Prazo estourado',
    value: (s) => s.sla.breached,
    path: HELPDESK_PATHS.attention,
    alert: true,
  },
  {
    key: 'atRisk',
    label: 'Prazo perto do fim',
    value: (s) => s.sla.atRisk,
    path: HELPDESK_PATHS.attention,
    alert: true,
  },
  {
    key: 'unassigned',
    label: 'Sem ninguém cuidando',
    value: (s) => s.sla.unassigned,
    path: HELPDESK_PATHS.unassigned,
    alert: true,
  },
]

const QUEUE: StatDef[] = [
  { key: 'new', label: 'Novos', value: (s) => s.counts.new, path: HELPDESK_PATHS.new },
  { key: 'open', label: 'Em aberto', value: (s) => s.counts.open, path: HELPDESK_PATHS.open },
  {
    key: 'waiting',
    label: 'Esperando quem abriu',
    value: (s) => s.counts.waiting,
    path: HELPDESK_PATHS.waiting,
  },
  { key: 'resolvedToday', label: 'Resolvidos hoje', value: (s) => s.resolvedToday },
  { key: 'resolved7d', label: 'Resolvidos em 7 dias', value: (s) => s.resolved7d },
]

function errorMessage(result: PromiseRejectedResult, fallback: string): string {
  return (result.reason as ApiError | undefined)?.message ?? fallback
}

function PanelError({ children }: { children?: string }) {
  return children ? (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm"
    >
      {children}
    </p>
  ) : null
}

/**
 * Painel de Atendimento: SOMENTE LEITURA. Mostra o que pede ação e leva ao app de
 * atendimento (outra aba, login próprio) já no filtro certo. Busca no client, como o resto do
 * admin: o refresh da sessão só pode regravar cookies em Route Handler.
 */
export function AtendimentoClient({ appUrl }: { appUrl: string | null }) {
  const [stats, setStats] = useState<TicketStatsView | null>(null)
  const [attention, setAttention] = useState<HelpdeskAttentionView | null>(null)
  const [statsError, setStatsError] = useState<string>()
  const [attentionError, setAttentionError] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const loadSequence = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true)
    const [statsResult, attentionResult] = await Promise.allSettled([
      apiGet<TicketStatsView>('/api/helpdesk/stats'),
      apiGet<HelpdeskAttentionView>('/api/helpdesk/attention'),
    ])
    if (sequence !== loadSequence.current) return
    // Falha NÃO vira zero (seria igual a caixa vazia): o último dado bom fica, com o aviso.
    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value)
      setStatsError(undefined)
    } else {
      setStatsError(
        errorMessage(statsResult, 'Os números do atendimento não carregaram. Tente de novo.'),
      )
    }
    if (attentionResult.status === 'fulfilled') {
      setAttention(attentionResult.value)
      setAttentionError(undefined)
    } else {
      setAttentionError(
        errorMessage(attentionResult, 'Os tickets que pedem atenção não carregaram.'),
      )
    }
    if (statsResult.status === 'fulfilled' || attentionResult.status === 'fulfilled') {
      setUpdatedAt(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openHref = helpdeskHref(appUrl, '/')
  const moreHref = helpdeskHref(appUrl, HELPDESK_PATHS.attention)

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Atendimento"
        description="Um resumo do que pede ação no atendimento. Para responder, cada número abre o app de atendimento já no lugar certo."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
              Atualizar
            </Button>
            {openHref ? (
              <a
                href={openHref}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants()}
              >
                <ExternalLink className="size-4" aria-hidden />
                Abrir atendimento
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            ) : null}
          </div>
        }
      />

      {!openHref ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-muted-foreground text-sm">
          O link do atendimento ainda não foi configurado. Os números continuam aqui.
        </p>
      ) : null}

      <PanelError>{statsError}</PanelError>

      <section aria-labelledby="attention-title" className="space-y-3">
        <div>
          <h2 id="attention-title" className="font-display text-lg font-bold">
            Precisa de atenção
          </h2>
          <p className="text-muted-foreground text-xs">
            Os prazos são metas da equipe para a primeira resposta. Quem abriu o atendimento não vê
            esses prazos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {ATTENTION.map((def) => (
            <StatCard key={def.key} def={def} stats={stats} appUrl={appUrl} />
          ))}
        </div>
      </section>

      <section aria-labelledby="queue-title" className="space-y-3">
        <h2 id="queue-title" className="font-display text-lg font-bold">
          Fila
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {QUEUE.map((def) => (
            <StatCard key={def.key} def={def} stats={stats} appUrl={appUrl} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Precisa de você</CardTitle>
            <p className="text-muted-foreground text-xs">
              Os tickets com o prazo estourado ou perto de estourar, do mais urgente ao menos.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <PanelError>{attentionError}</PanelError>
            {attention === null ? (
              attentionError ? null : (
                <div className="h-40 animate-pulse rounded-xl bg-muted/40" aria-hidden />
              )
            ) : attention.items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum ticket com o prazo em risco agora.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {attention.items.map((item) => {
                  const href = helpdeskHref(appUrl, helpdeskTicketPath(item.id))
                  return (
                    <li key={item.id} className="space-y-1 py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 break-words font-medium text-sm hover:underline"
                          >
                            {item.subject}
                            <span className="sr-only"> (abre em nova aba)</span>
                          </a>
                        ) : (
                          <p className="min-w-0 break-words font-medium text-sm">{item.subject}</p>
                        )}
                        <Badge
                          variant={item.slaState === 'breached' ? 'destructive' : 'outline'}
                          className="shrink-0"
                        >
                          {item.slaState === 'breached' ? 'Estourado' : 'Perto do fim'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {item.requester} · {item.assignedToName ?? 'Sem ninguém cuidando'} ·{' '}
                        {attentionDeadlineLabel(item)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
            {attention && moreHref && attention.total > attention.items.length ? (
              <a
                href={moreHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
              >
                Ver os {attention.total} tickets no atendimento
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Volume de tickets</CardTitle>
            <p className="text-muted-foreground text-xs">Recebidos por dia, nos últimos 14 dias.</p>
          </CardHeader>
          <CardContent>
            {stats !== null ? (
              <VolumeChart data={stats.volume} />
            ) : statsError ? (
              <p className="flex h-[240px] items-center justify-center text-muted-foreground text-sm">
                O gráfico volta quando os números carregarem.
              </p>
            ) : (
              <div className="h-[240px] animate-pulse rounded-xl bg-muted/40" aria-hidden />
            )}
          </CardContent>
        </Card>
      </div>

      {updatedAt ? (
        <p className="text-muted-foreground text-xs">
          Atualizado às{' '}
          {updatedAt.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          })}
          .
        </p>
      ) : null}
    </div>
  )
}

function StatCard({
  def,
  stats,
  appUrl,
}: {
  def: StatDef
  stats: TicketStatsView | null
  appUrl: string | null
}) {
  const value = stats === null ? null : def.value(stats)
  const highlighted = def.alert === true && value !== null && value > 0
  const href = def.path ? helpdeskHref(appUrl, def.path) : null
  const body = (
    <Card
      className={cn(
        'h-full transition-colors',
        highlighted && 'border-destructive/40 bg-destructive/5',
        href && 'hover:border-primary/40',
      )}
    >
      <CardContent className="space-y-1 p-4">
        <p className="flex items-center justify-between gap-2 text-muted-foreground text-sm">
          {def.label}
          {href ? <ExternalLink className="size-3.5 shrink-0" aria-hidden /> : null}
        </p>
        <p className={cn('font-bold text-2xl tabular-nums', highlighted && 'text-destructive')}>
          {value === null ? '—' : value.toLocaleString('pt-BR')}
        </p>
      </CardContent>
    </Card>
  )
  if (!href) return body
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {body}
      <span className="sr-only">Abrir no atendimento (nova aba)</span>
    </a>
  )
}
