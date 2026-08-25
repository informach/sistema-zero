'use client'

import { AttachmentList } from '@sistemazero/member-shell/components/attachment-list'
import { renderUgcMarkdown } from '@sistemazero/member-shell/lib/markdown'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Pagination } from '@sistemazero/ui/pagination'
import { Select } from '@sistemazero/ui/select'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { usePlatform } from '@/components/admin/platform-provider'
import { refreshProfessorCounts } from '@/components/admin/professor-counts-store'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { canHideReportedContent } from '@/lib/hub-moderation'
import type {
  HubModerationExcerptView,
  HubModerationIdentity,
  HubMuteBanView,
  HubPendingItemView,
  HubReportedContentView,
  HubReportView,
  HubSpaceView,
} from '@/lib/hub-types'
import {
  createForegroundPriority,
  createScopeAuthority,
  runLatestForeground,
} from '@/lib/latest-wins'
import { platformTransition } from '@/lib/platform-transition'
import type { Paginated } from '@/lib/types'

const PAGE = 20

function preview(text: string, max = 240): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function PersonDetails({
  audience,
  identity,
  displayName,
  userId,
  label = 'Autor',
}: {
  audience: 'adult' | 'kids' | 'unknown'
  identity?: HubModerationIdentity
  displayName: string | null
  userId: string
  label?: string
}) {
  const childName = identity?.childName ?? displayName
  const primaryName = audience === 'kids' ? childName : (identity?.accountName ?? displayName)

  return (
    <div className="space-y-0.5 text-xs text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">
          {audience === 'kids' ? (label === 'Denunciante' ? 'Aluno denunciante' : 'Aluno') : label}:
        </span>{' '}
        {primaryName || 'Nome não disponível'}
      </p>
      {audience === 'kids' ? (
        <p>
          <span className="font-medium text-foreground">Responsável:</span>{' '}
          {identity?.accountName || 'Não identificado'}
          {identity?.accountEmail ? ` · ${identity.accountEmail}` : ''}
        </p>
      ) : identity?.accountEmail ? (
        <p>{identity.accountEmail}</p>
      ) : null}
      {!primaryName ? <p className="font-mono">ID: {userId}</p> : null}
    </div>
  )
}

function Location({ content }: { content: HubPendingItemView }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{content.context.spaceName}</span>
      <span aria-hidden="true">›</span>
      <span>{content.context.channelName}</span>
      <Badge variant="muted">{content.context.spaceAudience === 'kids' ? 'Kids' : 'Adulto'}</Badge>
    </div>
  )
}

function ContextExcerpt({
  label,
  excerpt,
  audience,
}: {
  label: string
  excerpt: HubModerationExcerptView
  audience: 'adult' | 'kids'
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <time className="text-xs text-muted-foreground" dateTime={excerpt.createdAt}>
          {formatDate(excerpt.createdAt)}
        </time>
      </div>
      {excerpt.title ? <p className="text-sm font-medium">{excerpt.title}</p> : null}
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{preview(excerpt.body)}</p>
      <PersonDetails
        audience={audience}
        identity={excerpt.authorIdentity}
        displayName={excerpt.authorDisplayName}
        userId={excerpt.authorId}
      />
      <AttachmentList attachments={excerpt.attachments} />
    </div>
  )
}

function ContentContext({ content }: { content: HubPendingItemView }) {
  return content.context.thread || content.context.replyTo ? (
    <div className="grid gap-2 lg:grid-cols-2">
      {content.context.thread ? (
        <ContextExcerpt
          label="Tópico relacionado"
          excerpt={content.context.thread}
          audience={content.context.spaceAudience}
        />
      ) : null}
      {content.context.replyTo ? (
        <ContextExcerpt
          label="Em resposta a"
          excerpt={content.context.replyTo}
          audience={content.context.spaceAudience}
        />
      ) : null}
    </div>
  ) : null
}

function ModeratedContent({ content }: { content: HubPendingItemView | HubReportedContentView }) {
  return (
    <div className="space-y-3">
      <Location content={content} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{content.type === 'thread' ? 'Tópico' : 'Comentário'}</Badge>
            {'status' in content ? <Badge variant="outline">{content.status}</Badge> : null}
            {content.title ? <h3 className="font-semibold">{content.title}</h3> : null}
          </div>
          <PersonDetails
            audience={content.context.spaceAudience}
            identity={content.authorIdentity}
            displayName={content.authorDisplayName}
            userId={content.authorId}
          />
        </div>
        <time className="text-xs text-muted-foreground" dateTime={content.createdAt}>
          {formatDate(content.createdAt)}
        </time>
      </div>
      <div className="rich-text-content rounded-lg border bg-background px-4 py-3 text-sm">
        {renderUgcMarkdown(content.body)}
      </div>
      <AttachmentList attachments={content.attachments} />
      <ContentContext content={content} />
    </div>
  )
}

export function ModerationClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const [spaces, setSpaces] = useState<HubSpaceView[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [pending, setPending] = useState<HubPendingItemView[]>([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [pendingOffset, setPendingOffset] = useState(0)
  const [reports, setReports] = useState<HubReportView[]>([])
  const [reportsTotal, setReportsTotal] = useState(0)
  const [reportsOffset, setReportsOffset] = useState(0)
  const platform = usePlatform()
  const [mutesBans, setMutesBans] = useState<HubMuteBanView[]>([])
  const [busy, setBusy] = useState(false)
  const loadAuthority = useRef(createForegroundPriority()).current
  const mutationScope = useRef(createScopeAuthority(platform)).current
  mutationScope.update(platform)

  // ban/mute form
  const [mbUserId, setMbUserId] = useState('')
  const [mbKind, setMbKind] = useState<'mute' | 'ban'>('mute')
  const [mbReason, setMbReason] = useState('')

  useEffect(() => {
    apiGet<Paginated<HubSpaceView>>('/api/hub/admin/spaces?limit=100')
      .then((p) => setSpaces(p.items))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const transition = platformTransition(platform).moderation
    loadAuthority.invalidate()
    setSpaceId(transition.spaceId)
    setPendingOffset(transition.offset)
    setReportsOffset(transition.offset)
    setPending([])
    setReports([])
    setMutesBans([])
  }, [platform, loadAuthority])

  const load = useCallback(async () => {
    // URLSearchParams (e não interpolação): sem servidor selecionado a versão
    // antiga gerava `…/pending&limit=100` (sem `?`) → o limit virava parte do
    // PATH e o upstream caía no default 20, truncando a fila (achado do review).
    const pendQs = new URLSearchParams({
      audience: platform,
      limit: String(PAGE),
      offset: String(pendingOffset),
    })
    if (spaceId) pendQs.set('spaceId', spaceId)
    const repQs = new URLSearchParams({
      audience: platform,
      status: 'open',
      limit: String(PAGE),
      offset: String(reportsOffset),
    })
    if (spaceId) repQs.set('spaceId', spaceId)
    await runLatestForeground(
      loadAuthority,
      () =>
        Promise.all([
          apiGet<Paginated<HubPendingItemView>>(`/api/hub/admin/pending?${pendQs}`),
          apiGet<Paginated<HubReportView>>(`/api/hub/admin/reports?${repQs}`),
          spaceId
            ? apiGet<{ items: HubMuteBanView[] }>(
                `/api/hub/admin/mutes-bans?spaceId=${spaceId}`,
              ).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
        ]),
      {
        onSuccess: ([pend, rep, mutes]) => {
          setPending(pend.items)
          setPendingTotal(pend.total)
          setReports(rep.items)
          setReportsTotal(rep.total)
          setMutesBans(mutes.items)
        },
        onError: (error) => {
          toast.error((error as ApiError).message ?? 'Falha ao carregar a moderação.')
        },
        onSettled: () => {},
      },
    )
  }, [spaceId, platform, pendingOffset, reportsOffset, loadAuthority])

  useEffect(() => {
    void load()
    return () => loadAuthority.invalidate()
  }, [load, loadAuthority])

  async function run(fn: () => Promise<unknown>, okMsg?: string) {
    const scope = mutationScope.capture()
    setBusy(true)
    try {
      await fn()
      if (okMsg) toast.success(okMsg)
      // A closure de `load` pertence ao render do clique. Se a plataforma
      // mudou enquanto a mutação estava em voo, o effect atual já carregou a
      // audiência correta e esta recarga antiga não pode voltar a publicá-la.
      if (mutationScope.isCurrent(scope)) await load()
      // Aprovar/rejeitar/resolver muda as pendências → badge da sidebar re-busca já.
      refreshProfessorCounts()
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

  const visibleSpaces = spaces.filter((space) => space.audience === platform)

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Moderação"
        description="Aprovação de conteúdo, denúncias e silenciamentos/banimentos."
      />

      <Field label="Servidor" htmlFor="mod-space">
        <Select
          id="mod-space"
          value={spaceId}
          onChange={(event) => {
            setSpaceId(event.target.value)
            setPendingOffset(0)
            setReportsOffset(0)
          }}
        >
          <option value="">Todos os servidores</option>
          {visibleSpaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.audience === 'kids' ? 'kids' : 'adulto'})
            </option>
          ))}
        </Select>
      </Field>

      {/* ── Fila de aprovação ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Aguardando aprovação ({pendingTotal})
        </h2>
        {pending.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Nada pendente. 🎉</Card>
        ) : (
          pending.map((item) => (
            <Card key={item.id} className="space-y-4 p-4">
              <ModeratedContent content={item} />
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
        <Pagination
          total={pendingTotal}
          limit={PAGE}
          offset={pendingOffset}
          onChange={setPendingOffset}
        />
      </section>

      {/* ── Denúncias ── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Denúncias abertas ({reportsTotal})
        </h2>
        {reports.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Nenhuma denúncia aberta.</Card>
        ) : (
          reports.map((r) => {
            const audience = r.spaceAudience
            return (
              <Card key={r.id} className="space-y-4 p-4">
                <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">Denúncia</span>
                      {audience === 'unknown' ? (
                        <Badge variant="outline">Plataforma desconhecida (legado)</Badge>
                      ) : null}
                    </div>
                    <time className="text-xs text-muted-foreground" dateTime={r.createdAt}>
                      {formatDate(r.createdAt)}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">
                    <span className="font-medium">Motivo:</span> {r.reason}
                  </p>
                  <PersonDetails
                    audience={audience}
                    identity={r.reporterIdentity}
                    displayName={r.reporterDisplayName}
                    userId={r.reporterId}
                    label="Denunciante"
                  />
                </div>
                {r.content ? (
                  <ModeratedContent content={r.content} />
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    O conteúdo denunciado não está mais disponível. A denúncia ainda pode ser
                    resolvida ou descartada.
                  </div>
                )}
                {canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    {canHideReportedContent(r.content) ? (
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
                    ) : null}
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
            )
          })
        )}
        <Pagination
          total={reportsTotal}
          limit={PAGE}
          offset={reportsOffset}
          onChange={setReportsOffset}
        />
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
