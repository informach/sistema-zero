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

export default function PerformancePanel() {
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [total, setTotal] = useState(0)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    apiGet<{ total: number; steps: Step[] }>('/api/admin/funnel')
      .then((d) => {
        setTotal(d.total)
        setSteps(d.steps)
      })
      .catch(() => setErro(true))
  }, [])

  if (erro) return <p className="text-red-400">Falha ao carregar o funil.</p>
  if (!steps) return <p className="text-muted">Carregando…</p>

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Topo do funil: <span className="font-bold text-ink">{total}</span> leads
      </p>
      <div className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <div key={s.name} className="card p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{s.label}</span>
              <span className="text-muted">
                <span className="font-bold text-lime">{s.count}</span> · {pct(s.fromTop)} do topo
                {i > 0 && <span className="text-cyan"> · {pct(s.fromPrev)} da etapa anterior</span>}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg">
              <div className="h-full bg-lime" style={{ width: pct(s.fromTop) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
