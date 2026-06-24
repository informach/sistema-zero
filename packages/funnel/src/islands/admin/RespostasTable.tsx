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
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import type { AdminFunnelInfo } from '../../funnels/registry'
import { apiGet } from '../../lib/api-fetch'
import { formatBRLFromCents } from '../../lib/money'

interface LeadRow {
  id: string
  nome: string | null
  email: string | null
  telefone: string | null
  // Respostas do quiz em JSON (chave → valor) — genérico por funil; + perfil do diagnóstico.
  quizAnswers: Record<string, string | number> | null
  perfilResultado: string | null
  funnel: string | null
  lastStep: string
  createdAt: string
  // Contato + compra.
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

// Paginação no SERVIDOR: a UI nunca carrega todos os leads de uma vez. Busca,
// ordenação e filtro de funil também vão ao servidor (valem sobre o total).
const PAGE_SIZE = 25

const txt = (v: string | number | null) => (v == null || v === '' ? '—' : String(v))
const formatCpf = (cpf: string) =>
  cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '—'

/** Valor de resposta para exibição: número em chave de dinheiro (valor/custo/preço) → R$. */
function answerDisplay(key: string, value: string | number): string {
  if (typeof value === 'number') {
    return /valor|custo|pre[cç]o/i.test(key) ? formatBRLFromCents(value) : String(value)
  }
  return value
}

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

function PerfilBadge({ label }: { label: string | null }) {
  if (!label) return <span className="text-muted-foreground">—</span>
  return (
    <Badge variant="outline" className="text-lime">
      {label}
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

interface DetailField {
  key: keyof LeadRow
  label: string
}
const CONTATO_FIELDS: DetailField[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'email', label: 'E-mail' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'document', label: 'CPF' },
]
const COMPRA_FIELDS: DetailField[] = [
  { key: 'paidAt', label: 'Pagou em' },
  { key: 'buyerIsNew', label: 'Comprador' },
  { key: 'couponCode', label: 'Cupom' },
  { key: 'offerRef', label: 'Oferta' },
]

function fieldValue(lead: LeadRow, key: keyof LeadRow): ReactNode {
  const raw = lead[key]
  if (key === 'document') return raw ? formatCpf(String(raw)) : '—'
  if (key === 'buyerIsNew') {
    if (!lead.buyerUserId) return '—'
    return raw ? 'Novo (1º acesso)' : 'Recorrente'
  }
  if (key === 'paidAt' || key === 'createdAt' || key === 'buyerRegisteredAt') {
    return raw ? fmtDateTime(String(raw)) : '—'
  }
  return txt(raw as string | number | null)
}

export default function RespostasTable({
  funnel,
  funnels,
}: {
  funnel: string
  funnels: AdminFunnelInfo[]
}) {
  const [data, setData] = useState<LeadsResponse | null>(null)
  const [erro, setErro] = useState(false)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<LeadRow | null>(null)

  const funnelMap = useMemo(() => new Map(funnels.map((f) => [f.key, f])), [funnels])
  const showFunnel = funnels.length > 1
  const funnelLabel = (key: string | null) => (key ? (funnelMap.get(key)?.label ?? key) : '—')
  const perfilLabel = (lead: LeadRow): string | null => {
    if (!lead.perfilResultado) return null
    return (
      funnelMap.get(lead.funnel ?? '')?.perfilLabels[lead.perfilResultado] ?? lead.perfilResultado
    )
  }

  // Debounce da busca: ao digitar, espera 300ms e volta p/ a 1ª página.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setOffset(0)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Troca de funil (filtro externo) reseta para a 1ª página.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset de página ao mudar o funil
  useEffect(() => {
    setOffset(0)
  }, [funnel])

  useEffect(() => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      sort: sortDesc ? 'desc' : 'asc',
    })
    if (debouncedQuery) params.set('q', debouncedQuery)
    if (funnel) params.set('funnel', funnel)
    setLoading(true)
    apiGet<LeadsResponse>(`/api/admin/leads?${params}`)
      .then((d) => {
        setData(d)
        setErro(false)
      })
      .catch((e) => {
        if (String((e as Error)?.message).includes('401')) {
          window.location.href = '/admin/login'
          return
        }
        setErro(true)
      })
      .finally(() => setLoading(false))
  }, [offset, debouncedQuery, sortDesc, funnel])

  if (erro) return <p className="text-destructive">Falha ao carregar os leads.</p>
  if (!data) return <p className="text-muted-foreground">Carregando…</p>

  const { leads, total } = data
  const searching = debouncedQuery.length > 0
  const selectedAnswers = selected?.quizAnswers ?? {}
  const selectedAnswerLabels = selected
    ? (funnelMap.get(selected.funnel ?? '')?.answerLabels ?? {})
    : {}

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
                  {showFunnel && <TableHead>Funil</TableHead>}
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
                      <PerfilBadge label={perfilLabel(lead)} />
                    </TableCell>
                    {showFunnel && (
                      <TableCell className="max-w-[160px] truncate text-muted-foreground">
                        {funnelLabel(lead.funnel)}
                      </TableCell>
                    )}
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
                  <PerfilBadge label={perfilLabel(lead)} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <StatusBadge lead={lead} />
                  {showFunnel && (
                    <span className="truncate text-xs text-muted-foreground">
                      {funnelLabel(lead.funnel)}
                    </span>
                  )}
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

            <DetailSection title="Contato">
              {CONTATO_FIELDS.map((f) => (
                <DetailItem key={String(f.key)} label={f.label}>
                  {fieldValue(selected, f.key)}
                </DetailItem>
              ))}
            </DetailSection>

            <DetailSection title="Compra">
              {COMPRA_FIELDS.map((f) => (
                <DetailItem key={String(f.key)} label={f.label}>
                  {fieldValue(selected, f.key)}
                </DetailItem>
              ))}
            </DetailSection>

            <DetailSection title="Diagnóstico">
              <DetailItem label="Perfil" wide>
                <PerfilBadge label={perfilLabel(selected)} />
              </DetailItem>
              {Object.entries(selectedAnswers).map(([key, value]) => (
                <DetailItem key={key} label={selectedAnswerLabels[key] ?? key} wide>
                  {answerDisplay(key, value)}
                </DetailItem>
              ))}
            </DetailSection>

            <DetailSection title="Sessão">
              <DetailItem label="Funil">{funnelLabel(selected.funnel)}</DetailItem>
              <DetailItem label="Última etapa">{txt(selected.lastStep)}</DetailItem>
              <DetailItem label="Criado em">{fmtDateTime(selected.createdAt)}</DetailItem>
            </DetailSection>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function DetailItem({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  )
}
