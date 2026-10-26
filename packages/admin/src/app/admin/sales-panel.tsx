'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@sistemazero/ui/card'
import { InfoTooltip } from '@sistemazero/ui/info-tooltip'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { ChartLine, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { communityPage, useCommunityRequests } from '@/components/admin/community-page'
import { LoadError } from '@/components/admin/empty-state'
import { formatCentsStr } from '@/lib/format'
import { loadAllPages } from '@/lib/load-all-pages'
import type { Platform } from '@/lib/platform'
import type { DailyPaymentStats, Paginated, ProductView, SubscriptionStatsView } from '@/lib/types'
import { SalesChart } from './sales-chart'

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Últimos 12 meses' },
] as const

const TOOLTIPS = {
  net: 'O que entrou no período em pagamentos confirmados, menos os estornos do período. O estorno desconta no dia em que aconteceu, então um dia pode ficar negativo.',
  transactions:
    'Cobranças criadas no período, em qualquer situação: aguardando, pagas ou que não deram certo. Mostra quantas compras começaram.',
  cancellations:
    'Estornos no período, isto é, dinheiro devolvido a quem comprou. Pix e boleto que expiraram não contam, porque o pagamento nunca aconteceu.',
  mrr: 'Quanto as assinaturas em dia rendem por mês, somadas agora. A anual entra com um doze avos do valor. Não muda com o período escolhido.',
  activeSubs:
    'Assinaturas em dia agora, separadas em mensais e anuais. Não muda com o período escolhido.',
  subsFlow:
    'Assinaturas que começaram e que foram canceladas no período escolhido. A taxa de cancelamento é canceladas dividido por (em dia mais canceladas).',
}

function MetricCard({ title, value, tooltip }: { title: string; value: string; tooltip: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-1.5 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <InfoTooltip text={tooltip} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}

/** Seção "Vendas" (estilo Hotmart): filtros + cards + gráfico diário. */
export const SalesPanel = communityPage(SalesPanelCommunity)

function SalesPanelCommunity({ audience }: { audience: Platform }) {
  const { get: apiGet } = useCommunityRequests(audience)
  const [products, setProducts] = useState<ProductView[]>([])
  const [productsError, setProductsError] = useState(false)
  const [productsAttempt, setProductsAttempt] = useState(0)
  const [productId, setProductId] = useState('')
  const [period, setPeriod] = useState('30')
  const [data, setData] = useState<DailyPaymentStats | null>(null)
  const [subs, setSubs] = useState<SubscriptionStatsView | null>(null)
  // A falha dos cards de assinatura aparece (não some calada): "não carregou" + tentar de novo.
  const [subsError, setSubsError] = useState(false)
  const [subsAttempt, setSubsAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [chartOpen, setChartOpen] = useState(true)

  // Todas as páginas do catálogo da comunidade; retry explícito se falhar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: productsAttempt aciona o retry.
  useEffect(() => {
    let alive = true
    setProductsError(false)
    loadAllPages<ProductView>((offset, limit) =>
      apiGet<Paginated<ProductView>>(`/api/catalog/products?limit=${limit}&offset=${offset}`),
    )
      .then((items) => {
        if (alive) setProducts(items)
      })
      .catch(() => {
        if (alive) {
          setProducts([])
          setProductsError(true)
        }
      })
    return () => {
      alive = false
    }
  }, [apiGet, productsAttempt])

  // Série diária: refaz ao trocar produto/período.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(false)
    const to = new Date()
    const from = new Date(to.getTime() - Number(period) * 24 * 60 * 60 * 1000)
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
    if (productId) params.set('productId', productId)
    apiGet<DailyPaymentStats>(`/api/payments/stats/daily?${params}`)
      .then((stats) => {
        if (alive) setData(stats)
      })
      .catch(() => {
        if (alive) setError(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [apiGet, productId, period])

  // Recorrência: MRR/ativas são "agora"; novas/canceladas usam a MESMA janela
  // do período (não filtra por produto: assinatura é do catálogo todo).
  // biome-ignore lint/correctness/useExhaustiveDependencies: subsAttempt refaz a busca no "Tentar de novo".
  useEffect(() => {
    let alive = true
    setSubsError(false)
    const to = new Date()
    const from = new Date(to.getTime() - Number(period) * 24 * 60 * 60 * 1000)
    apiGet<SubscriptionStatsView>(
      `/api/payments/stats/subscriptions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
    )
      .then((stats) => {
        if (alive) setSubs(stats)
      })
      .catch(() => {
        // Em falha os cards dizem que não carregaram; o painel de vendas segue útil.
        if (alive) {
          setSubs(null)
          setSubsError(true)
        }
      })
    return () => {
      alive = false
    }
  }, [apiGet, period, subsAttempt])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">Vendas</h2>
        <Badge variant="outline">BRL</Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          aria-label="Filtrar por produto"
          className="w-56"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">Todos os produtos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Período"
          className="w-44"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {productsError ? (
        <LoadError what="o filtro de produtos" onRetry={() => setProductsAttempt((n) => n + 1)} />
      ) : null}
      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Os números de vendas não carregaram. Troque o período ou tente de novo em instantes.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              title="Recebido, menos estornos"
              value={loading || !data ? '—' : formatCentsStr(data.totals.netAmountInCents)}
              tooltip={TOOLTIPS.net}
            />
            <MetricCard
              title="Cobranças criadas"
              value={loading || !data ? '—' : String(data.totals.transactions)}
              tooltip={TOOLTIPS.transactions}
            />
            <MetricCard
              title="Estornos"
              value={loading || !data ? '—' : String(data.totals.cancellations)}
              tooltip={TOOLTIPS.cancellations}
            />
          </div>

          {subsError ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {['Receita das assinaturas por mês', 'Assinaturas em dia', 'Novas e canceladas'].map(
                (title) => (
                  <Card key={title}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-[15px] text-muted-foreground">
                        Não conseguimos carregar este número.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSubsAttempt((n) => n + 1)}
                      >
                        Tentar de novo
                      </Button>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>
          ) : subs ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                title="Receita das assinaturas por mês"
                value={formatCentsStr(subs.mrrCents)}
                tooltip={TOOLTIPS.mrr}
              />
              <MetricCard
                title="Assinaturas em dia"
                value={`${subs.active.total}: ${subs.active.monthly} mensais e ${subs.active.annual} anuais`}
                tooltip={TOOLTIPS.activeSubs}
              />
              <MetricCard
                title="Novas e canceladas"
                value={`${subs.newInWindow} novas, ${subs.canceledInWindow} canceladas (${(subs.churnRate * 100).toFixed(1)}% cancelaram)`}
                tooltip={TOOLTIPS.subsFlow}
              />
            </div>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ChartLine className="size-4 text-muted-foreground" aria-hidden />
                {data?.granularity === 'month'
                  ? 'Vendas por mês'
                  : data?.granularity === 'week'
                    ? 'Vendas por semana'
                    : 'Vendas por dia'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setChartOpen((v) => !v)}>
                {chartOpen ? (
                  <>
                    Esconder <ChevronUp className="ml-1 size-4" />
                  </>
                ) : (
                  <>
                    Mostrar <ChevronDown className="ml-1 size-4" />
                  </>
                )}
              </Button>
            </CardHeader>
            {chartOpen ? (
              <CardContent>
                {loading || !data ? (
                  <div className="flex h-[300px] items-center justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <SalesChart days={data.days} granularity={data.granularity} />
                )}
              </CardContent>
            ) : null}
          </Card>
        </>
      )}
    </section>
  )
}
