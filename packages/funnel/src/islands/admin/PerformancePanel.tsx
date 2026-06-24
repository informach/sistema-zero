import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api-fetch'

interface Step {
  name: string
  label: string
  count: number
  fromTop: number
  fromPrev: number
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export default function PerformancePanel({ funnel }: { funnel: string }) {
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [total, setTotal] = useState(0)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const qs = funnel ? `?funnel=${encodeURIComponent(funnel)}` : ''
    apiGet<{ total: number; steps: Step[] }>(`/api/admin/funnel${qs}`)
      .then((d) => {
        setTotal(d.total)
        setSteps(d.steps)
      })
      .catch((e) => {
        if (String((e as Error)?.message).includes('401')) {
          window.location.href = '/admin/login'
          return
        }
        setErro(true)
      })
  }, [funnel])

  if (erro) return <p className="text-red-400">Falha ao carregar o funil.</p>
  if (!steps) return <p className="text-muted">Carregando…</p>

  const vendas = steps.find((s) => s.name === 'viu_pagina_vendas')?.count ?? 0
  const pagos = steps.find((s) => s.name === 'pagamento_confirmado')?.count ?? 0
  const convGeral = total > 0 ? pagos / total : 0

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Kpi label="Topo do funil" value={String(total)} hint="entraram no quiz" />
        <Kpi
          label="Página de vendas"
          value={String(vendas)}
          hint={`${pct(total > 0 ? vendas / total : 0)} do topo`}
        />
        <Kpi
          label="Pagamentos"
          value={String(pagos)}
          hint={`${pct(convGeral)} de conversão`}
          accent
        />
      </div>

      <div className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <div key={s.name} className="card p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink">{s.label}</span>
              <span className="text-sm text-muted">
                <span className="font-mono font-bold tabular-nums text-lime">{s.count}</span>
                <span className="ml-2">{pct(s.fromTop)} do topo</span>
                {i > 0 && <span className="ml-2 text-cyan">{pct(s.fromPrev)} da etapa</span>}
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-lime transition-[width] duration-500 ease-out"
                style={{ width: pct(s.fromTop) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <div className={`card p-5 ${accent ? 'border-lime/40 bg-lime/5' : ''}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 text-3xl font-extrabold tabular-nums ${accent ? 'text-lime' : 'text-ink'}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  )
}
