'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
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
import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { OverviewCard } from '@/components/admin/overview-card'
import { type ApiError, apiGet } from '@/lib/api'
import type { AiUsageStatsView } from '@/lib/types'

/** Rótulos amigáveis dos recursos que consomem IA (feature desconhecida = cru). */
const FEATURE_LABELS: Record<string, string> = {
  'pensa-chat': 'Pensa — conversa com o Zappy',
  'pensa-synthesis': 'Pensa — gerações (carta/desenho/missões)',
  'studio-describe': 'Mural — descrição do jogo',
}

/** Mês civil corrente em São Paulo (`YYYY-MM`) — espelha a régua do members. */
function currentMonthSp(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  })
    .format(new Date())
    .slice(0, 7)
}

export function AiUsageClient() {
  const [month, setMonth] = useState(currentMonthSp)
  const [stats, setStats] = useState<AiUsageStatsView | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (target: string) => {
    setLoading(true)
    try {
      setStats(await apiGet<AiUsageStatsView>(`/api/members/ai-usage?month=${target}`))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar o uso de IA.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(month)
  }, [load, month])

  const fmt = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString('pt-BR'))

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Uso de IA"
        description="Consumo da quota de IA por conta (50/dia + 500/mês) — Pensa, descrição do Mural e recursos futuros."
        action={
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Mês"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button variant="outline" onClick={() => load(month)} disabled={loading}>
              {loading ? <Spinner /> : <RefreshCw className="size-4" />} Atualizar
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <OverviewCard
          title="Interações no mês"
          value={fmt(stats?.monthUsed)}
          description="Chamadas de IA pagas pelo servidor"
        />
        <OverviewCard title="Hoje" value={fmt(stats?.todayUsed)} description="Interações do dia" />
        <OverviewCard
          title="Contas ativas"
          value={fmt(stats?.accounts)}
          description="Contas distintas que usaram IA no mês"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por recurso</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.byFeature.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum uso registrado neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead className="text-right">Interações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.byFeature ?? []).map((f) => (
                    <TableRow key={f.feature}>
                      <TableCell>{FEATURE_LABELS[f.feature] ?? f.feature}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {f.used.toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top contas do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.topAccounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum uso registrado neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Interações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.topAccounts ?? []).map((a) => (
                    <TableRow key={a.accountId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {a.name ?? `Conta ${a.accountId.slice(0, 8)}`}
                            </p>
                            {a.email ? (
                              <p className="truncate text-muted-foreground text-xs">{a.email}</p>
                            ) : null}
                          </div>
                          {a.privileged ? <Badge variant="muted">equipe</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top tabular-nums">
                        {a.used.toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
