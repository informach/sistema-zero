'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type {
  HubMuteBanView,
  HubPendingItemView,
  HubReportView,
  HubSpaceView,
} from '@/lib/hub-types'
import type { Paginated } from '@/lib/types'

function preview(text: string, max = 160): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > max ? `${t.slice(0, max)}…` : t
}

export function ModerationClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const [spaces, setSpaces] = useState<HubSpaceView[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [pending, setPending] = useState<HubPendingItemView[]>([])
  const [reports, setReports] = useState<HubReportView[]>([])
  const [mutesBans, setMutesBans] = useState<HubMuteBanView[]>([])
  const [busy, setBusy] = useState(false)

  // ban/mute form
  const [mbUserId, setMbUserId] = useState('')
  const [mbKind, setMbKind] = useState<'mute' | 'ban'>('mute')
  const [mbReason, setMbReason] = useState('')

  useEffect(() => {
    apiGet<Paginated<HubSpaceView>>('/api/hub/admin/spaces?limit=100')
      .then((p) => setSpaces(p.items))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    // URLSearchParams (e não interpolação): sem servidor selecionado a versão
    // antiga gerava `…/pending&limit=100` (sem `?`) → o limit virava parte do
    // PATH e o upstream caía no default 20, truncando a fila (achado do review).
    const pendQs = new URLSearchParams({ limit: '100' })
    if (spaceId) pendQs.set('spaceId', spaceId)
    const repQs = new URLSearchParams({ status: 'open', limit: '100' })
    if (spaceId) repQs.set('spaceId', spaceId)
    try {
      const [pend, rep] = await Promise.all([
        apiGet<Paginated<HubPendingItemView>>(`/api/hub/admin/pending?${pendQs}`),
        apiGet<Paginated<HubReportView>>(`/api/hub/admin/reports?${repQs}`),
      ])
      setPending(pend.items)
      setReports(rep.items)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar a moderação.')
    }
    if (spaceId) {
      try {
        const mb = await apiGet<{ items: HubMuteBanView[] }>(
          `/api/hub/admin/mutes-bans?spaceId=${spaceId}`,
        )
        setMutesBans(mb.items)
      } catch {
        setMutesBans([])
      }
    } else {
      setMutesBans([])
    }
  }, [spaceId])

  useEffect(() => {
    void load()
  }, [load])

  async function run(fn: () => Promise<unknown>, okMsg?: string) {
    setBusy(true)
    try {
      await fn()
      if (okMsg) toast.success(okMsg)
      await load()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Operação falhou.')
    } finally {
      setBusy(false)
    }
  }

  const target = (t: HubPendingItemView | HubReportView): 'threads' | 'comments' =>
    ('type' in t ? t.type : t.targetType) === 'thread' ? 'threads' : 'comments'

  async function muteBan() {
    if (!spaceId) {
      toast.error('Selecione um servidor.')
      return
    }
    if (!mbUserId.trim()) {
      toast.error('Informe o ID do usuário.')
      return
    }
    await run(
      async () => {
        await apiSend(`/api/hub/admin/${mbKind === 'mute' ? 'mutes' : 'bans'}`, 'POST', {
          userId: mbUserId.trim(),
          spaceId,
          reason: mbReason.trim() || null,
        })
        setMbUserId('')
        setMbReason('')
      },
      mbKind === 'mute' ? 'Usuário silenciado.' : 'Usuário banido.',
    )
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Moderação"
        description="Aprovação de conteúdo, denúncias e silenciamentos/banimentos."
      />

      <Field label="Servidor" htmlFor="mod-space">
        <Select id="mod-space" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
          <option value="">Todos os servidores</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.audience === 'kids' ? 'kids' : 'adulto'})
            </option>
          ))}
        </Select>
      </Field>

      {/* ── Fila de aprovação ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Aguardando aprovação ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Nada pendente. 🎉</Card>
        ) : (
          pending.map((item) => (
            <Card key={item.id} className="space-y-2 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="muted">{item.type === 'thread' ? 'Tópico' : 'Comentário'}</Badge>
                {item.title ? <span className="font-medium">{item.title}</span> : null}
              </div>
              <p className="text-sm text-muted-foreground">{preview(item.body)}</p>
              {canWrite ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => apiSend(`/api/hub/admin/${target(item)}/${item.id}/approve`, 'POST'),
                        'Aprovado.',
                      )
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => apiSend(`/api/hub/admin/${target(item)}/${item.id}/reject`, 'POST'),
                        'Rejeitado.',
                      )
                    }
                  >
                    Rejeitar
                  </Button>
                </div>
              ) : null}
            </Card>
          ))
        )}
      </section>

      {/* ── Denúncias ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Denúncias abertas ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Nenhuma denúncia aberta.</Card>
        ) : (
          reports.map((r) => (
            <Card key={r.id} className="space-y-2 p-3">
              <div className="flex items-center gap-2">
                <Badge variant="muted">{r.targetType === 'thread' ? 'Tópico' : 'Comentário'}</Badge>
                <span className="text-sm">Motivo: {preview(r.reason, 120)}</span>
              </div>
              {canWrite ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () => apiSend(`/api/hub/admin/${target(r)}/${r.targetId}/hide`, 'POST'),
                        'Conteúdo ocultado.',
                      )
                    }
                  >
                    Ocultar conteúdo
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          apiSend(`/api/hub/admin/reports/${r.id}/resolve`, 'POST', {
                            action: 'resolve',
                          }),
                        'Denúncia resolvida.',
                      )
                    }
                  >
                    Resolver
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          apiSend(`/api/hub/admin/reports/${r.id}/resolve`, 'POST', {
                            action: 'dismiss',
                          }),
                        'Denúncia descartada.',
                      )
                    }
                  >
                    Descartar
                  </Button>
                </div>
              ) : null}
            </Card>
          ))
        )}
      </section>

      {/* ── Silenciar / banir (por servidor) ── */}
      {spaceId && canWrite ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Silenciamentos e banimentos
          </h2>
          <Card className="space-y-3 p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <Field label="ID do usuário" htmlFor="mb-user">
                <Input
                  id="mb-user"
                  value={mbUserId}
                  onChange={(e) => setMbUserId(e.target.value)}
                  placeholder="uuid do aluno"
                />
              </Field>
              <Field label="Ação" htmlFor="mb-kind">
                <Select
                  id="mb-kind"
                  value={mbKind}
                  onChange={(e) => setMbKind(e.target.value as 'mute' | 'ban')}
                >
                  <option value="mute">Silenciar (não posta)</option>
                  <option value="ban">Banir (não posta nem reage)</option>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button onClick={muteBan} disabled={busy}>
                  Aplicar
                </Button>
              </div>
            </div>
            <Field label="Motivo (opcional)" htmlFor="mb-reason">
              <Input
                id="mb-reason"
                value={mbReason}
                onChange={(e) => setMbReason(e.target.value)}
              />
            </Field>
          </Card>

          {mutesBans.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              Ninguém silenciado/banido neste servidor.
            </Card>
          ) : (
            mutesBans.map((mb) => (
              <Card key={mb.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{mb.kind === 'ban' ? 'Banido' : 'Silenciado'}</Badge>
                    <span className="truncate font-mono text-xs">{mb.userId}</span>
                  </div>
                  {mb.reason ? (
                    <p className="truncate text-xs text-muted-foreground">{mb.reason}</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        apiSend(
                          `/api/hub/admin/${mb.kind === 'mute' ? 'mutes' : 'bans'}/remove`,
                          'POST',
                          {
                            userId: mb.userId,
                            spaceId,
                          },
                        ),
                      'Removido.',
                    )
                  }
                >
                  Remover
                </Button>
              </Card>
            ))
          )}
        </section>
      ) : null}
    </div>
  )
}
