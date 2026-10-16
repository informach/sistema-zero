import { BrandLogo } from '@sistemazero/ui/brand-logo'
import { Button } from '@sistemazero/ui/button'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { AdminFunnelInfo } from '../../funnels/registry'
import { apiPost } from '../../lib/api-fetch'
import AnalyticsPanel from './AnalyticsPanel'
import PerfisPanel from './PerfisPanel'
import PerformancePanel from './PerformancePanel'
import RespostasTable from './RespostasTable'

type Aba = 'respostas' | 'performance' | 'perfis' | 'analytics'

export default function AdminDashboard({ funnels }: { funnels: AdminFunnelInfo[] }) {
  const [aba, setAba] = useState<Aba>('respostas')
  // Funil selecionado ('' = todos). Filtra as 3 abas.
  const [funnel, setFunnel] = useState('')
  const [saindo, setSaindo] = useState(false)
  // Quiz versionado: Performance e Perfis podem olhar só a versão atual do quiz (sem as respostas
  // antigas nem quem foi direto à oferta) e separar as manchetes do teste A/B. O recorte vem
  // ligado só no funil que tem teste A/B (a Comunidade); nos outros, a visão segue completa.
  const [quizAtual, setQuizAtual] = useState(false)
  const [manchete, setManchete] = useState('')
  const quizInfo = funnels.find((f) => f.key === funnel)?.quiz
  const scope = new URLSearchParams()
  if (quizInfo && (quizAtual || manchete)) scope.set('quiz', 'atual')
  if (quizInfo && manchete) scope.set('manchete', manchete)
  const scopeQs = scope.toString()

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
          {/* A logo oficial em SVG embutido: o ZERO lê `--logo-zero-*` (a cor da casa). O
              /admin do funil é sempre escuro, daí o fundo `escuro`. */}
          <BrandLogo
            fundo="escuro"
            label="Sistema Zero — painel do funil"
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
          <TabBtn active={aba === 'analytics'} onClick={() => setAba('analytics')}>
            Métricas
          </TabBtn>
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
            onChange={(e) => {
              setFunnel(e.target.value)
              setManchete('')
              const info = funnels.find((f) => f.key === e.target.value)?.quiz
              setQuizAtual(Boolean(info && info.headlines.length > 1))
            }}
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

      {quizInfo && (aba === 'performance' || aba === 'perfis') && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-line bg-card/50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 font-medium text-ink">
            <input
              type="checkbox"
              checked={quizAtual || Boolean(manchete)}
              disabled={Boolean(manchete)}
              onChange={(e) => setQuizAtual(e.target.checked)}
              className="h-4 w-4 accent-lime"
            />
            <span>
              Só quem abriu o quiz atual ({quizInfo.version})
              <span className="block text-xs font-normal text-muted">
                Quem foi direto à oferta fica de fora. Com uma manchete escolhida, fica sempre
                ligado.
              </span>
            </span>
          </label>
          {quizInfo.headlines.length > 1 && (
            <select
              value={manchete}
              onChange={(e) => setManchete(e.target.value)}
              aria-label="Filtrar por manchete do quiz"
              className="rounded-lg border border-line bg-card/50 px-3 py-2 font-medium text-ink"
            >
              <option value="">Todas as manchetes</option>
              {quizInfo.headlines.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {aba === 'respostas' && <RespostasTable funnel={funnel} funnels={funnels} />}
      {aba === 'analytics' && <AnalyticsPanel funnel={funnel} />}
      {aba === 'performance' && <PerformancePanel funnel={funnel} scope={scopeQs} />}
      {aba === 'perfis' && <PerfisPanel funnel={funnel} scope={scopeQs} />}
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
