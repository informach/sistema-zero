import type { ReactNode } from 'react'
import { useState } from 'react'
import PerformancePanel from './PerformancePanel'
import RespostasTable from './RespostasTable'

type Aba = 'respostas' | 'performance'

export default function AdminDashboard() {
  const [aba, setAba] = useState<Aba>('respostas')

  return (
    <div>
      <div className="mb-6 flex gap-2">
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
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
        active ? 'border-lime bg-lime text-[#0b0f14]' : 'border-line text-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
