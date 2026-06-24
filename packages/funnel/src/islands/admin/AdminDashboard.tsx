import { Button } from '@sistemazero/ui/button'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { AdminFunnelInfo } from '../../funnels/registry'
import { apiPost } from '../../lib/api-fetch'
import PerfisPanel from './PerfisPanel'
import PerformancePanel from './PerformancePanel'
import RespostasTable from './RespostasTable'

type Aba = 'respostas' | 'performance' | 'perfis'

export default function AdminDashboard({ funnels }: { funnels: AdminFunnelInfo[] }) {
  const [aba, setAba] = useState<Aba>('respostas')
  // Funil selecionado ('' = todos). Filtra as 3 abas.
  const [funnel, setFunnel] = useState('')
  const [saindo, setSaindo] = useState(false)

  async function sair() {
    if (saindo) return
    setSaindo(true)
    try {
      await apiPost('/api/admin/logout')
    } catch {
      /* segue p/ o login de qualquer forma */
    }
    window.location.href = '/admin/login'
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* Logo do sistema-zero (versão p/ fundo escuro — o /admin é sempre dark). */}
          <img
            src="/logo_dark.svg"
            alt="Sistema Zero"
            width={515}
            height={44}
            className="h-auto w-[116px] shrink-0 sm:w-[132px]"
          />
          <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />
          <span className="hidden truncate text-sm font-medium text-muted sm:inline">Painel</span>
        </div>
        <Button variant="outline" size="sm" onClick={sair} disabled={saindo}>
          {saindo ? 'Saindo…' : 'Sair'}
        </Button>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex gap-1 rounded-xl border border-line bg-card/50 p-1">
          <TabBtn active={aba === 'respostas'} onClick={() => setAba('respostas')}>
            Respostas
          </TabBtn>
          <TabBtn active={aba === 'performance'} onClick={() => setAba('performance')}>
            Performance
          </TabBtn>
          <TabBtn active={aba === 'perfis'} onClick={() => setAba('perfis')}>
            Perfis
          </TabBtn>
        </div>
        {funnels.length > 1 && (
          <select
            value={funnel}
            onChange={(e) => setFunnel(e.target.value)}
            aria-label="Filtrar por funil"
            className="rounded-lg border border-line bg-card/50 px-3 py-2 text-sm font-medium text-ink"
          >
            <option value="">Todos os funis</option>
            {funnels.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {aba === 'respostas' && <RespostasTable funnel={funnel} funnels={funnels} />}
      {aba === 'performance' && <PerformancePanel funnel={funnel} />}
      {aba === 'perfis' && <PerfisPanel funnel={funnel} />}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-lime text-[#0b0f14]' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
