import type { ReactNode } from 'react'
import { useState } from 'react'
import { PRODUTO } from '../../content/copy'
import { apiPost } from '../../lib/api-fetch'
import PerformancePanel from './PerformancePanel'
import RespostasTable from './RespostasTable'

type Aba = 'respostas' | 'performance'

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
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">Sistema Zero</p>
          <h1 className="mt-0.5 text-lg font-bold text-ink">Painel · {PRODUTO.nome}</h1>
        </div>
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="btn btn-ghost px-4 py-2 text-sm disabled:opacity-50"
        >
          Sair
        </button>
      </header>

      <div className="mb-6 inline-flex gap-1 rounded-xl border border-line bg-card/50 p-1">
        <TabBtn active={aba === 'respostas'} onClick={() => setAba('respostas')}>
          Respostas
        </TabBtn>
        <TabBtn active={aba === 'performance'} onClick={() => setAba('performance')}>
          Performance
        </TabBtn>
      </div>

      {aba === 'respostas' ? <RespostasTable /> : <PerformancePanel />}
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
