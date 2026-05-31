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

const COLS: Array<{ key: keyof LeadRow; label: string }> = [
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'segmento', label: 'Segmento' },
  { key: 'gastoTerceiros', label: 'Gasto terceiros' },
  { key: 'formaDeCriar', label: 'Como cria' },
  { key: 'jaQuebrou', label: 'Já quebrou' },
  { key: 'nivelRefem', label: 'Nível refém' },
  { key: 'horasRetrabalho', label: 'Horas/sem' },
  { key: 'valorHora', label: 'Valor hora' },
  { key: 'custoMensal', label: 'Custo mensal' },
  { key: 'pesoPrincipal', label: 'Peso' },
  { key: 'visualizacao', label: 'Visualização' },
  { key: 'oQueFalta', label: 'O que falta' },
  { key: 'mudancaDesejada', label: 'Mudança' },
  { key: 'lastStep', label: 'Última etapa' },
]

const MONEY_COLS = new Set<keyof LeadRow>(['gastoTerceiros', 'valorHora', 'custoMensal'])

export default function RespostasTable() {
  const [leads, setLeads] = useState<LeadRow[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    apiGet<{ leads: LeadRow[] }>('/api/admin/leads')
      .then((d) => setLeads(d.leads))
      .catch(() => setErro(true))
  }, [])

  if (erro) return <p className="text-red-400">Falha ao carregar os leads.</p>
  if (!leads) return <p className="text-muted">Carregando…</p>
  if (leads.length === 0) return <p className="text-muted">Nenhum lead ainda.</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-card-2 text-xs uppercase text-muted">
          <tr>
            {COLS.map((c) => (
              <th key={String(c.key)} className="whitespace-nowrap px-3 py-2 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-line">
              {COLS.map((c) => {
                const raw = lead[c.key]
                const value = MONEY_COLS.has(c.key) ? money(raw as number | null) : txt(raw)
                return (
                  <td key={String(c.key)} className="whitespace-nowrap px-3 py-2 text-ink">
                    {value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
