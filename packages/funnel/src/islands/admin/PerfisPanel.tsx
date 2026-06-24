import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api-fetch'

interface PerfilCount {
  perfil: string
  label: string
  count: number
}

const pct = (n: number, total: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%')

export default function PerfisPanel({ funnel }: { funnel: string }) {
  const [counts, setCounts] = useState<PerfilCount[] | null>(null)
  const [total, setTotal] = useState(0)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    const qs = funnel ? `?funnel=${encodeURIComponent(funnel)}` : ''
    apiGet<{ total: number; counts: PerfilCount[] }>(`/api/admin/perfis${qs}`)
      .then((d) => {
        setTotal(d.total)
        setCounts(d.counts)
      })
      .catch((e) => {
        if (String((e as Error)?.message).includes('401')) {
          window.location.href = '/admin/login'
          return
        }
        setErro(true)
      })
  }, [funnel])

  if (erro) return <p className="text-red-400">Falha ao carregar os perfis.</p>
  if (!counts) return <p className="text-muted">Carregando…</p>

  return (
    <div>
      <p className="mb-5 text-sm text-muted">
        <span className="font-bold text-ink">{total}</span>{' '}
        {total === 1 ? 'lead com diagnóstico' : 'leads com diagnóstico'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {counts.map((c) => (
          <div key={c.perfil} className="card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{c.label}</p>
              <p className="text-sm text-muted">
                <span className="font-mono font-bold tabular-nums text-lime">{c.count}</span>
                <span className="ml-2">{pct(c.count, total)}</span>
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan to-lime transition-[width] duration-500 ease-out"
                style={{ width: pct(c.count, total) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
