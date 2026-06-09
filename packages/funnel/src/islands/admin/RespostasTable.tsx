import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { type ReactNode, useEffect, useState } from 'react'
import { apiGet } from '../../lib/api-fetch'
import { formatBRLFromCents } from '../../lib/money'
import { isPerfil, PERFIL_LABELS } from '../../lib/perfil'

interface LeadRow {
  id: string
  nome: string | null
  email: string | null
  telefone: string | null
  // 12 chaves do quiz + perfil do diagnóstico (P1..P10; P7 é a calculadora).
  segmento: string | null
  tipoCriar: string | null
  relacaoIa: string | null
  jaQuebrou: string | null
  travaPrincipal: string | null
  custoPrincipal: string | null
  horasRetrabalho: number | null
  valorHora: number | null
  custoMensal: number | null
  mudancaDesejada: string | null
  proximoPasso: string | null
  sintese: string | null
  perfilResultado: string | null
  lastStep: string
  createdAt: string
  // Contato + compra (já vêm no /api/admin/leads; antes não eram exibidos).
  document: string | null
  paymentId: string | null
  paidAt: string | null
  couponCode: string | null
  offerRef: string | null
  buyerUserId: string | null
  buyerIsNew: boolean | null
  buyerRegisteredAt: string | null
}

interface LeadsResponse {
  leads: LeadRow[]
  total: number
  limit: number
  offset: number
}

// Paginação no SERVIDOR: a UI nunca carrega todos os leads de uma vez (escala p/
// muitos leads). Busca e ordenação também vão ao servidor (valem sobre o total).
const PAGE_SIZE = 25

const MONEY_COLS = new Set<keyof LeadRow>(['valorHora', 'custoMensal'])
const DATETIME_COLS = new Set<keyof LeadRow>(['createdAt', 'paidAt', 'buyerRegisteredAt'])

const money = (c: number | null) => (c == null ? '—' : formatBRLFromCents(c))
const txt = (v: string | number | null) => (v == null || v === '' ? '—' : String(v))
const formatCpf = (cpf: string) =>
  cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '—'

// Status do lead derivado dos dados reais (o `last_step` NÃO avança p/ checkout/
// pagamento — fica na última pergunta do quiz). Por isso usamos paidAt/paymentId/email.
type StatusKey = 'comprou' | 'checkout' | 'precheckout' | 'quiz'
function leadStatus(l: LeadRow): { key: StatusKey; label: string } {
  if (l.paidAt) return { key: 'comprou', label: 'Comprou' }
  if (l.paymentId) return { key: 'checkout', label: 'Checkout' }
  if (l.email) return { key: 'precheckout', label: 'Pré-checkout' }
  return { key: 'quiz', label: 'Quiz' }
}

const STATUS_CLASS: Record<StatusKey, string> = {
  comprou: 'border-transparent bg-emerald-500/15 text-emerald-400',
  checkout: 'border-transparent bg-amber-500/15 text-amber-400',
  precheckout: 'border-transparent bg-cyan/15 text-cyan',
  quiz: 'text-muted-foreground',
}

function StatusBadge({ lead }: { lead: LeadRow }) {
  const s = leadStatus(lead)
  return (
    <Badge variant="outline" className={STATUS_CLASS[s.key]}>
      {s.label}
    </Badge>
  )
}

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Agrupamento dos campos do lead p/ o Dialog de detalhe.
const DETAIL_GROUPS: Array<{
  title: string
  fields: Array<{ key: keyof LeadRow; label: string; wide?: boolean }>
}> = [
  {
    title: 'Contato',
    fields: [
      { key: 'nome', label: 'Nome' },
      { key: 'email', label: 'E-mail' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'document', label: 'CPF' },
    ],
  },
  {
    title: 'Compra',
    fields: [
      { key: 'paidAt', label: 'Pagou em' },
      { key: 'buyerIsNew', label: 'Comprador' },
      { key: 'couponCode', label: 'Cupom' },
      { key: 'offerRef', label: 'Oferta' },
    ],
  },
  {
    title: 'Diagnóstico',
    fields: [
      { key: 'perfilResultado', label: 'Perfil', wide: true },
      { key: 'segmento', label: 'Segmento (P1)' },
      { key: 'tipoCriar', label: 'O que quer criar (P2)' },
      { key: 'relacaoIa', label: 'Relação com IA (P3)' },
      { key: 'jaQuebrou', label: 'Já quebrou (P4)' },
      { key: 'travaPrincipal', label: 'O que mais trava (P5)' },
      { key: 'custoPrincipal', label: 'O que custou (P6)' },
      { key: 'horasRetrabalho', label: 'Horas/semana (P7)' },
      { key: 'valorHora', label: 'Valor hora (P7)' },
      { key: 'custoMensal', label: 'Custo mensal' },
      { key: 'mudancaDesejada', label: 'O que muda (P8)' },
      { key: 'proximoPasso', label: 'O que precisa (P9)' },
      { key: 'sintese', label: 'Síntese (P10)' },
    ],
  },
  {
    title: 'Sessão',
    fields: [
      { key: 'lastStep', label: 'Última etapa' },
      { key: 'createdAt', label: 'Criado em' },
    ],
  },
]

function SegmentoBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className="text-cyan">
      {value}
    </Badge>
  )
}

function PerfilBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className="text-lime">
      {isPerfil(value) ? PERFIL_LABELS[value] : value}
    </Badge>
  )
}

function fieldValue(lead: LeadRow, key: keyof LeadRow): ReactNode {
  const raw = lead[key]
  if (key === 'perfilResultado') return <PerfilBadge value={raw as string | null} />
  if (key === 'segmento') return <SegmentoBadge value={raw as string | null} />
  if (key === 'document') return raw ? formatCpf(String(raw)) : '—'
  if (key === 'buyerIsNew') {
    if (!lead.buyerUserId) return '—'
    return raw ? 'Novo (1º acesso)' : 'Recorrente'
  }
  if (DATETIME_COLS.has(key)) return raw ? fmtDateTime(String(raw)) : '—'
  if (MONEY_COLS.has(key))
    return <span className="font-mono tabular-nums">{money(raw as number | null)}</span>
  return txt(raw as string | number | null)
}

export default function RespostasTable() {
  const [data, setData] = useState<LeadsResponse | null>(null)
  const [erro, setErro] = useState(false)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<LeadRow | null>(null)

  // Debounce da busca: ao digitar, espera 300ms e volta p/ a 1ª página.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      sort: sortDesc ? 'desc' : 'asc',
    })
    if (debouncedQuery) params.set('q', debouncedQuery)
    setLoading(true)
    apiGet<LeadsResponse>(`/api/admin/leads?${params}`)
      .then((d) => {
        setData(d)
        setErro(false)
      })
      .catch((e) => {
        // Sessão expirada/ausente → volta ao login.
        if (String((e as Error)?.message).includes('401')) {
          window.location.href = '/admin/login'
          return
        }
        setErro(true)
      })
      .finally(() => setLoading(false))
  }, [offset, debouncedQuery, sortDesc])

  if (erro) return <p className="text-destructive">Falha ao carregar os leads.</p>
  if (!data) return <p className="text-muted-foreground">Carregando…</p>

  const { leads, total } = data
  const searching = debouncedQuery.length > 0

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{total}</span>{' '}
          {total === 1 ? 'lead' : 'leads'}
          {searching ? ' encontrado(s)' : ''}
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Buscar por nome ou e-mail…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-64"
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setSortDesc((v) => !v)
              setOffset(0)
            }}
            title="Ordenar por data"
          >
            Data {sortDesc ? '↓' : '↑'}
          </Button>
        </div>
      </div>

      {total === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          {searching
            ? `Nenhum lead corresponde a “${debouncedQuery}”.`
            : 'Nenhum lead ainda. Os dados aparecem aqui assim que alguém entrar no quiz.'}
        </Card>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {/* Desktop: tabela enxuta (≥ sm) */}
          <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Custo mensal</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    tabIndex={0}
                    aria-label={`Ver detalhes de ${txt(lead.nome)}`}
                    onClick={() => setSelected(lead)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(lead)
                      }
                    }}
                    className="cursor-pointer hover:bg-card/60"
                  >
                    <TableCell className="max-w-[160px] truncate font-medium text-foreground">
                      {txt(lead.nome)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {txt(lead.email)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge lead={lead} />
                    </TableCell>
                    <TableCell>
                      <PerfilBadge value={lead.perfilResultado} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-foreground">
                      {money(lead.custoMensal)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {fmtDate(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards empilhados (< sm) */}
          <div className="space-y-3 sm:hidden">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                onClick={() => setSelected(lead)}
                className="cursor-pointer p-4 transition-colors hover:border-cyan/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{txt(lead.nome)}</p>
                    <p className="truncate text-sm text-muted-foreground">{txt(lead.email)}</p>
                  </div>
                  <PerfilBadge value={lead.perfilResultado} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <StatusBadge lead={lead} />
                  <span className="font-mono tabular-nums text-foreground">
                    {money(lead.custoMensal)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(lead.createdAt)}</p>
              </Card>
            ))}
          </div>

          {total > PAGE_SIZE && (
            <div className="mt-4">
              <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
            </div>
          )}
        </div>
      )}

      <Dialog
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected ? txt(selected.nome) : 'Lead'}
        description={selected ? `Entrou em ${fmtDateTime(selected.createdAt)}` : undefined}
        className="max-w-2xl"
      >
        {selected ? (
          <div className="space-y-5">
            <StatusBadge lead={selected} />
            {DETAIL_GROUPS.map((g) => (
              <section key={g.title}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.title}
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {g.fields.map((f) => (
                    <div
                      key={String(f.key)}
                      className={`flex flex-col gap-0.5 ${f.wide ? 'sm:col-span-2' : ''}`}
                    >
                      <dt className="text-xs text-muted-foreground">{f.label}</dt>
                      <dd className="text-sm text-foreground">{fieldValue(selected, f.key)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
