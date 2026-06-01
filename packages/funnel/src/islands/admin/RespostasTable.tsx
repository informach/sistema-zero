import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api-fetch'
import { formatBRLFromCents } from '../../lib/money'

interface LeadRow {
  id: string
  nome: string | null
  email: string | null
  telefone: string | null
  segmento: string | null
  gastoTerceiros: number | null
  formaDeCriar: string | null
  jaQuebrou: string | null
  nivelRefem: number | null
  horasRetrabalho: number | null
  valorHora: number | null
  custoMensal: number | null
  pesoPrincipal: string | null
  visualizacao: string | null
  oQueFalta: string | null
  mudancaDesejada: string | null
  lastStep: string
  createdAt: string
}

const money = (c: number | null) => (c == null ? '—' : formatBRLFromCents(c))
const txt = (v: string | number | null) => (v == null || v === '' ? '—' : String(v))

const COLS: Array<{ key: keyof LeadRow; label: string; numeric?: boolean }> = [
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'segmento', label: 'Segmento' },
  { key: 'gastoTerceiros', label: 'Gasto terceiros', numeric: true },
  { key: 'formaDeCriar', label: 'Como cria' },
  { key: 'jaQuebrou', label: 'Já quebrou' },
  { key: 'nivelRefem', label: 'Nível refém', numeric: true },
  { key: 'horasRetrabalho', label: 'Horas/sem', numeric: true },
  { key: 'valorHora', label: 'Valor hora', numeric: true },
  { key: 'custoMensal', label: 'Custo mensal', numeric: true },
  { key: 'pesoPrincipal', label: 'Peso' },
  { key: 'visualizacao', label: 'Visualização' },
  { key: 'oQueFalta', label: 'O que falta' },
  { key: 'mudancaDesejada', label: 'Mudança' },
  { key: 'lastStep', label: 'Última etapa' },
]

const MONEY_COLS = new Set<keyof LeadRow>(['gastoTerceiros', 'valorHora', 'custoMensal'])

function SegmentoBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted">—</span>
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line bg-card-2 px-2 text-xs font-bold text-cyan">
      {value}
    </span>
  )
}

export default function RespostasTable() {
  const [leads, setLeads] = useState<LeadRow[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    apiGet<{ leads: LeadRow[] }>('/api/admin/leads')
      .then((d) => setLeads(d.leads))
      .catch((e) => {
        // Sessão expirada/ausente → volta ao login.
        if (String((e as Error)?.message).includes('401')) {
          window.location.href = '/admin/login'
          return
        }
        setErro(true)
      })
  }, [])

  if (erro) return <p className="text-red-400">Falha ao carregar os leads.</p>
  if (!leads) return <p className="text-muted">Carregando…</p>
  if (leads.length === 0)
    return (
      <div className="card p-10 text-center text-muted">
        Nenhum lead ainda. Os dados aparecem aqui assim que alguém entrar no quiz.
      </div>
    )

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        <span className="font-bold text-ink">{leads.length}</span>{' '}
        {leads.length === 1 ? 'lead' : 'leads'}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-card-2 text-xs uppercase tracking-wide text-muted">
            <tr>
              {COLS.map((c) => (
                <th
                  key={String(c.key)}
                  className={`whitespace-nowrap px-3 py-2.5 font-semibold ${
                    c.numeric ? 'text-right' : ''
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-line/70 transition hover:bg-card/50">
                {COLS.map((c) => {
                  const raw = lead[c.key]
                  if (c.key === 'segmento') {
                    return (
                      <td key={String(c.key)} className="px-3 py-2.5">
                        <SegmentoBadge value={raw as string | null} />
                      </td>
                    )
                  }
                  const value = MONEY_COLS.has(c.key) ? money(raw as number | null) : txt(raw)
                  return (
                    <td
                      key={String(c.key)}
                      className={`whitespace-nowrap px-3 py-2.5 text-ink ${
                        c.numeric ? 'text-right font-mono tabular-nums' : ''
                      }`}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
