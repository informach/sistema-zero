'use client'

import type {
  CampaignDetailView,
  CampaignInput,
  CampaignState,
  CampaignView,
} from '@sistemazero/core/referrals'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/app/admin/notas-fiscais/copy-to-clipboard'
import { apiGet, apiSend } from '@/lib/api'
import { campaignIsoDate, campaignLocalDate } from '@/lib/campaign-dates'
import { EmbaixadoresClient } from './embaixadores-client'

const labels: Record<CampaignState, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  active: 'Aberta',
  paused: 'Pausada',
  ended: 'Encerrada',
}
const dateLabel = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
const message = (err: unknown) =>
  err && typeof err === 'object' && 'message' in err
    ? String(err.message)
    : 'Não foi possível concluir. Tente novamente.'
type Editing = {
  value: CampaignInput
  id?: string
  duplicate?: boolean
  expectedUpdatedAt?: string
}
const empty = (): CampaignInput => ({
  name: '',
  publicTitle: '',
  description: '',
  context: 'ad',
  code: '',
  channel: '',
  status: 'draft',
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
})

export function ConvitesClient({ currentRole }: { currentRole: string }) {
  const [tab, setTab] = useState<'campaigns' | 'people'>('campaigns')
  return (
    <div className="space-y-6">
      <nav aria-label="Convites e campanhas" className="flex flex-wrap gap-2">
        <Button
          variant={tab === 'campaigns' ? 'default' : 'outline'}
          onClick={() => setTab('campaigns')}
        >
          Campanhas
        </Button>
        <Button variant={tab === 'people' ? 'default' : 'outline'} onClick={() => setTab('people')}>
          Embaixadores e bônus
        </Button>
      </nav>
      {tab === 'campaigns' ? (
        <Campaigns canWrite={['admin', 'superadmin'].includes(currentRole)} />
      ) : (
        <EmbaixadoresClient currentRole={currentRole} />
      )}
    </div>
  )
}

function Campaigns({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<CampaignView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Editing | null>(null)
  const [detail, setDetail] = useState<CampaignDetailView | null>(null)
  const loadSequence = useRef(0)
  const detailSequence = useRef(0)
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true)
    setError('')
    try {
      const result = await apiGet<{ items: CampaignView[]; total: number }>(
        `/api/admin/referrals/campaigns?${new URLSearchParams({ q: search, limit: '25', offset: String(offset) })}`,
      )
      if (sequence !== loadSequence.current) return
      setItems(result.items)
      setTotal(result.total)
    } catch (err) {
      if (sequence === loadSequence.current) {
        setItems([])
        setTotal(0)
        setError(message(err))
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [search, offset])
  useEffect(() => {
    void load()
    return () => {
      loadSequence.current++
      detailSequence.current++
    }
  }, [load])
  async function open(id: string) {
    const sequence = ++detailSequence.current
    try {
      const result = await apiGet<CampaignDetailView>(`/api/admin/referrals/campaigns/${id}`)
      if (sequence === detailSequence.current) setDetail(result)
    } catch (err) {
      if (sequence === detailSequence.current) toast.error(message(err))
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campanhas de presente</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Anúncios, palestras e outras ações do Sistema Zero. Cada campanha tem seu link e seu
            prazo para novos cadastros. O convidado recebe sete dias de curso a partir do cadastro.
          </p>
        </div>
        {canWrite && <Button onClick={() => setEditing({ value: empty() })}>Nova campanha</Button>}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setOffset(0)
          setSearch(query.trim())
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome, título ou código"
          aria-label="Buscar campanhas"
          maxLength={120}
        />
        <Button variant="outline" type="submit">
          Buscar
        </Button>
        <Button variant="outline" type="button" disabled={loading} onClick={() => void load()}>
          Atualizar
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive">
          {error}{' '}
          <button type="button" className="underline" onClick={() => void load()}>
            Tentar novamente
          </button>
        </p>
      )}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b">
            <tr>
              {[
                'Campanha',
                'Estado',
                'Inscrições até (Brasília)',
                'Resgates',
                'Conversões',
                'Ações',
              ].map((label) => (
                <th key={label} className="p-4 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6" role="status">
                  Carregando campanhas…
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-4">
                    <strong>{item.name}</strong>
                    <p className="mt-1 text-xs text-muted-foreground">{item.code}</p>
                  </td>
                  <td className="p-4">{labels[item.state]}</td>
                  <td className="p-4">{dateLabel(item.endsAt)}</td>
                  <td className="p-4">{item.stats.redemptions}</td>
                  <td className="p-4">{item.stats.conversions}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => void open(item.id)}>
                        Detalhes
                      </Button>
                      {canWrite && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditing({
                              value: item,
                              id: item.id,
                              expectedUpdatedAt: item.updatedAt,
                            })
                          }
                        >
                          Editar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6">
                  Nenhuma campanha encontrada. Crie uma campanha para divulgar o presente com um
                  link próprio.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - 25))}
        >
          Anterior
        </Button>
        <p className="text-sm">{total} campanhas</p>
        <Button
          variant="outline"
          disabled={offset + 25 >= total || loading}
          onClick={() => setOffset(offset + 25)}
        >
          Próxima
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Resgates são cadastros com os acessos concedidos. Conversões são as primeiras compras
        elegíveis da Comunidade após o presente, excluindo estornos. Campanhas não geram bônus Pix.
        Esses números contam contas de responsáveis, não crianças.
      </p>
      {editing && (
        <CampaignEditor
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(value) => {
            setEditing(null)
            void load()
            void open(value.id)
          }}
        />
      )}
      {detail && (
        <Dialog
          open
          onClose={() => {
            detailSequence.current++
            setDetail(null)
          }}
          title={detail.campaign.name}
          className="max-w-4xl"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-muted px-3 py-2 text-sm">
                {labels[detail.campaign.state]}
              </span>
              {canWrite && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing({
                        id: detail.campaign.id,
                        value: detail.campaign,
                        expectedUpdatedAt: detail.campaign.updatedAt,
                      })
                      setDetail(null)
                    }}
                  >
                    Editar campanha
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing({
                        id: detail.campaign.id,
                        duplicate: true,
                        value: {
                          ...detail.campaign,
                          name: `${detail.campaign.name} — nova edição`.slice(0, 120),
                          code: '',
                          status: 'draft',
                          startsAt: empty().startsAt,
                          endsAt: empty().endsAt,
                        },
                      })
                      setDetail(null)
                    }}
                  >
                    Duplicar como nova edição
                  </Button>
                </>
              )}
            </div>
            <p className="text-sm">
              Início: {dateLabel(detail.campaign.startsAt)} · Encerramento:{' '}
              {dateLabel(detail.campaign.endsAt)} (Brasília). Pausar ou encerrar impede novos
              cadastros; os acessos já aceitos mantêm seu vencimento.
            </p>
            <div className="space-y-3">
              <label className="block text-sm font-semibold" htmlFor="campaign-link">
                Link público para divulgar
              </label>
              <Input
                id="campaign-link"
                readOnly
                value={detail.campaign.shareUrl}
                onFocus={(event) => event.target.select()}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyToClipboard(detail.campaign.shareUrl, 'Link público')}
                >
                  Copiar link
                </Button>
                <a
                  className="text-sm underline"
                  href={previewUrl(detail.campaign)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Prévia sem cadastro
                </a>
                <a
                  className="text-sm underline"
                  href={detail.campaign.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir link público
                </a>
                <a
                  className="text-sm underline"
                  href={`/api/admin/referrals/campaigns/${detail.campaign.id}/qr`}
                >
                  Baixar QR Code
                </a>
              </div>
              {detail.campaign.state === 'draft' && (
                <p className="text-sm text-muted-foreground">
                  Rascunho: o link público ainda não aceita cadastros. Use a prévia para conferir a
                  página.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries({
                'Resgates concluídos': detail.campaign.stats.redemptions,
                'Em andamento': detail.campaign.stats.pending,
                'Com falha': detail.campaign.stats.failed,
                Conversões: detail.campaign.stats.conversions,
              }).map(([label, value]) => (
                <Card key={label} className="p-4">
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </Card>
              ))}
            </div>
            <section>
              <h2 className="font-bold">Últimos cadastros (até 200)</h2>
              <div className="mt-3 max-h-72 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">Responsável</th>
                      <th className="p-2">Situação</th>
                      <th className="p-2">Curso até</th>
                      <th className="p-2">Origem de mídia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.redemptions.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-2">
                          {row.name}
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                          {row.userId && (
                            <a
                              className="mt-1 inline-block text-xs underline"
                              href={`/admin/membros/${encodeURIComponent(row.userId)}`}
                            >
                              Ver conta e progresso dos perfis
                            </a>
                          )}
                        </td>
                        <td className="p-2">
                          {(
                            {
                              completed: 'Concluído',
                              pending: 'Em andamento',
                              failed: 'Falhou',
                            } as Record<string, string>
                          )[row.status] ?? row.status}
                          {row.lastError && (
                            <p className="text-xs text-destructive">{row.lastError}</p>
                          )}
                        </td>
                        <td className="p-2">
                          {row.expiresAt ? dateLabel(row.expiresAt) : 'Sem vencimento'}
                        </td>
                        <td className="p-2 text-xs">
                          {row.attribution
                            ? Object.values(row.attribution).filter(Boolean).join(' / ')
                            : 'Não informada'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.redemptions.length === 0 && (
                  <p className="py-3 text-sm text-muted-foreground">Ainda não houve cadastros.</p>
                )}
              </div>
            </section>
            <section>
              <h2 className="font-bold">Histórico de alterações</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                O relatório acima mede resgates e compras atribuídas. Visitas à página, ativação em
                sete dias e conclusão por campanha ainda não são indicadores consolidados. Consulte
                a ficha da conta para verificar o progresso real de cada perfil.
              </p>
              <ol className="mt-3 space-y-3 text-sm">
                {detail.history.map((entry) => (
                  <li key={entry.id} className="rounded-lg border p-3">
                    <p>
                      {dateLabel(entry.createdAt)} · {entry.actor}
                    </p>
                    <p className="text-muted-foreground">
                      {entry.action === 'created'
                        ? 'Criada'
                        : entry.action === 'duplicated'
                          ? 'Nova edição criada'
                          : 'Atualizada'}
                    </p>
                    <details>
                      <summary className="cursor-pointer">Ver valores registrados</summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                        {JSON.stringify(entry.changes, null, 2)}
                      </pre>
                    </details>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function previewUrl(campaign: CampaignView) {
  const url = new URL('/bolsa/previa', campaign.shareUrl)
  url.search = new URLSearchParams({
    title: campaign.publicTitle,
    description: campaign.description,
    context: campaign.context,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
  }).toString()
  return url.href
}

function CampaignEditor({
  editing,
  onClose,
  onSaved,
}: {
  editing: Editing
  onClose: () => void
  onSaved: (value: CampaignView) => void
}) {
  const [value, setValue] = useState(editing.value)
  const [start, setStart] = useState(campaignLocalDate(value.startsAt))
  const [end, setEnd] = useState(campaignLocalDate(value.endsAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const change = <K extends keyof CampaignInput>(key: K, next: CampaignInput[K]) =>
    setValue((current) => ({ ...current, [key]: next }))
  async function submit() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const body: CampaignInput = {
        name: value.name,
        publicTitle: value.publicTitle,
        description: value.description,
        context: value.context,
        code: value.code,
        channel: value.channel,
        status: value.status,
        startsAt: campaignIsoDate(start),
        endsAt: campaignIsoDate(end),
      }
      if (body.endsAt <= body.startsAt)
        throw new Error('O encerramento deve ser posterior ao início.')
      const suffix = editing.id ? `/${editing.id}${editing.duplicate ? '/duplicate' : ''}` : ''
      const result = await apiSend<{ campaign: CampaignView }>(
        `/api/admin/referrals/campaigns${suffix}`,
        editing.id && !editing.duplicate ? 'PATCH' : 'POST',
        editing.id && !editing.duplicate
          ? { ...body, expectedUpdatedAt: editing.expectedUpdatedAt }
          : body,
      )
      toast.success('Campanha salva.')
      onSaved(result.campaign)
    } catch (err) {
      setError(message(err))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onClose()
      }}
      title={
        editing.duplicate
          ? 'Nova edição da campanha'
          : editing.id
            ? 'Editar campanha'
            : 'Nova campanha'
      }
      className="max-w-2xl"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          <p className="text-sm text-muted-foreground">
            O nome é interno. O título e a apresentação aparecem para as famílias. O código
            permanece fixo depois de criado.
          </p>
          {(
            [
              { key: 'name', label: 'Nome interno', max: 120 },
              { key: 'publicTitle', label: 'Título público', max: 160 },
              {
                key: 'code',
                label: 'Código do link (4–32 letras minúsculas, números e hífens)',
                max: 32,
              },
              { key: 'channel', label: 'Canal de divulgação (interno)', max: 100 },
            ] as const
          ).map((field) => (
            <label key={field.key} className="block space-y-1 text-sm font-semibold">
              <span>{field.label}</span>
              <Input
                value={value[field.key]}
                onChange={(event) => change(field.key, event.target.value)}
                required={field.key !== 'channel'}
                maxLength={field.max}
                minLength={field.key === 'code' ? 4 : field.key === 'channel' ? 0 : 2}
                pattern={field.key === 'code' ? '[a-z0-9-]{4,32}' : undefined}
                disabled={field.key === 'code' && Boolean(editing.id) && !editing.duplicate}
              />
            </label>
          ))}
          <label className="block space-y-1 text-sm font-semibold">
            <span>Apresentação pública (opcional)</span>
            <textarea
              className="min-h-24 w-full rounded-md border bg-background p-3 font-normal"
              value={value.description}
              maxLength={600}
              onChange={(event) => change('description', event.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold">
              <span>Tipo</span>
              <select
                className="w-full rounded-md border bg-background p-2"
                value={value.context}
                onChange={(event) =>
                  change('context', event.target.value as CampaignInput['context'])
                }
              >
                <option value="ad">Anúncio</option>
                <option value="event">Palestra ou evento</option>
                <option value="other">Outra ação</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold">
              <span>Estado</span>
              <select
                className="w-full rounded-md border bg-background p-2"
                value={value.status}
                onChange={(event) =>
                  change('status', event.target.value as CampaignInput['status'])
                }
              >
                <option value="draft">Rascunho</option>
                <option value="active">Ativa (respeita as datas)</option>
                <option value="paused">Pausada</option>
                <option value="ended">Encerrada</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold">
              <span>Início (Brasília)</span>
              <Input
                type="datetime-local"
                value={start}
                required
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm font-semibold">
              <span>Encerramento (Brasília)</span>
              <Input
                type="datetime-local"
                value={end}
                required
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            O prazo acima controla novos cadastros. Cada cadastro aceito preserva seus sete dias de
            curso, mesmo se a campanha for encerrada depois. O link pode ser encaminhado; não valida
            presença no evento. Não há bônus Pix para campanhas.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar campanha'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Dialog>
  )
}
