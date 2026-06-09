import { Button } from '@sistemazero/ui/button'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { PRODUTO } from '../../content/copy'
import { apiPost } from '../../lib/api-fetch'
import PerfisPanel from './PerfisPanel'
import PerformancePanel from './PerformancePanel'
import RespostasTable from './RespostasTable'

type Aba = 'respostas' | 'performance' | 'perfis'

export default function AdminDashboard() {
  const [aba, setAba] = useState<Aba>('respostas')
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
          <span className="hidden truncate text-sm font-medium text-muted sm:inline">
            Painel · {PRODUTO.nome}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={sair} disabled={saindo}>
          {saindo ? 'Saindo…' : 'Sair'}
        </Button>
      </header>

      <div className="mb-6 inline-flex gap-1 rounded-xl border border-line bg-card/50 p-1">
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

      {aba === 'respostas' && <RespostasTable />}
      {aba === 'performance' && <PerformancePanel />}
      {aba === 'perfis' && <PerfisPanel />}
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
