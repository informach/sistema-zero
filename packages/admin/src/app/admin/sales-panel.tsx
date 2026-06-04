'use client'

import { ChartLine, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { apiGet } from '@/lib/api'
import { formatCentsStr } from '@/lib/format'
import type { DailyPaymentStats, Paginated, ProductView } from '@/lib/types'
import { SalesChart } from './sales-chart'

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Últimos 12 meses' },
] as const

const TOOLTIPS = {
  net: 'Valor recebido no período (pagamentos confirmados) menos os estornos no período. Um estorno desconta no dia em que aconteceu — por isso um dia pode ficar negativo.',
  transactions:
    'Cobranças criadas no período, em qualquer situação (pendentes, pagas, falhas…). Mostra o volume de entrada do funil.',
  cancellations:
    'Estornos/reembolsos no período (dinheiro devolvido ao comprador). Boleto/Pix expirados não contam — nunca houve pagamento.',
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

/** Seção "Gestão de vendas" (estilo Hotmart): filtros + cards + gráfico diário. */
export function SalesPanel() {
  const [products, setProducts] = useState<ProductView[]>([])
  const [productId, setProductId] = useState('')
  const [period, setPeriod] = useState('30')
  const [data, setData] = useState<DailyPaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [chartOpen, setChartOpen] = useState(true)

  // Produtos do dropdown (1x, no mount).
  useEffect(() => {
    let alive = true
    apiGet<Paginated<ProductView>>('/api/catalog/products?limit=100')
      .then((page) => {
        if (alive) setProducts(page.items)
      })
      .catch(() => {
        // Dropdown fica só com "Todos os produtos" — o painel segue útil.
      })
    return () => {
      alive = false
    }
  }, [])

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
  }, [productId, period])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Gestão de vendas</h2>
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

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Não foi possível carregar os dados de vendas. Tente novamente.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              title="Faturamento líquido"
              value={loading || !data ? '—' : formatCentsStr(data.totals.netAmountInCents)}
              tooltip={TOOLTIPS.net}
            />
            <MetricCard
              title="Transações"
              value={loading || !data ? '—' : String(data.totals.transactions)}
              tooltip={TOOLTIPS.transactions}
            />
            <MetricCard
              title="Cancelamentos"
              value={loading || !data ? '—' : String(data.totals.cancellations)}
              tooltip={TOOLTIPS.cancellations}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <ChartLine className="size-4 text-muted-foreground" />
                {data?.granularity === 'month'
                  ? 'Desempenho mensal de vendas'
                  : data?.granularity === 'week'
                    ? 'Desempenho semanal de vendas'
                    : 'Desempenho diário de vendas'}
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
