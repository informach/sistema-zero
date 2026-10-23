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
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Tabs } from '@sistemazero/ui/tabs'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { usePlatform } from '@/components/admin/platform-provider'
import { refreshProfessorCounts } from '@/components/admin/professor-counts-store'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { canHideReportedContent } from '@/lib/hub-moderation'
import type {
  HubContentStatus,
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
import { canWriteRole, type Paginated } from '@/lib/types'

const PAGE = 20

type ModerationTab = 'aprovar' | 'denuncias' | 'silenciados'

/** `?aba=` (o link da Home): a aba que a tela abre. */
export function moderationTabFrom(value: string | null): ModerationTab {
  return value === 'denuncias' || value === 'silenciados' ? value : 'aprovar'
}

const CONTENT_STATUS_LABEL: Record<HubContentStatus, string> = {
  pending: 'Esperando aprovação',
  visible: 'Publicado',
  hidden: 'Escondido',
  deleted: 'Apagado',
  rejected: 'Não publicado',
}

function preview(text: string, max = 240): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/** O nome que a equipe lê: a criança no Kids, o titular no Adultos. */
function personName(
  audience: 'adult' | 'kids' | 'unknown',
  identity: HubModerationIdentity | undefined,
  displayName: string | null,
): string | null {
  const childName = identity?.childName ?? displayName
  return (audience === 'kids' ? childName : (identity?.accountName ?? displayName)) || null
}

function authorOf(content: HubPendingItemView): string {
  return (
    personName(content.context.spaceAudience, content.authorIdentity, content.authorDisplayName) ??
    'quem escreveu'
  )
}

function reporterOf(report: HubReportView): string {
  return (
    personName(report.spaceAudience, report.reporterIdentity, report.reporterDisplayName) ??
    'quem denunciou'
  )
}

/** "o tópico “Meu jogo”" / "o comentário": o que a confirmação nomeia. */
function contentPhrase(content: { type: 'thread' | 'comment'; title: string | null }): string {
  const kind = content.type === 'thread' ? 'o tópico' : 'o comentário'
  return content.title ? `${kind} “${content.title}”` : kind
}

function PersonDetails({
  audience,
  identity,
  displayName,
  userId,
  who = 'author',
}: {
  audience: 'adult' | 'kids' | 'unknown'
  identity?: HubModerationIdentity
  displayName: string | null
  userId: string
  who?: 'author' | 'reporter'
}) {
  const primaryName = personName(audience, identity, displayName)
  const label =
    who === 'reporter'
      ? audience === 'kids'
        ? 'Criança que denunciou'
        : 'Quem denunciou'
      : audience === 'kids'
        ? 'Criança'
        : 'Quem escreveu'

  return (
    <div className="space-y-0.5 text-sm text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">{label}:</span>{' '}
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
      {!primaryName ? (
        <details className="text-xs">
          <summary className="cursor-pointer">Detalhes técnicos</summary>
          <p className="mt-1 font-mono">Conta (ID): {userId}</p>
        </details>
      ) : null}
    </div>
  )
}

function Location({ content }: { content: HubPendingItemView }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>{content.context.spaceName}</span>
      <span aria-hidden="true">›</span>
      <span>{content.context.channelName}</span>
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
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
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
            {'status' in content ? (
              <Badge variant="outline">
                {CONTENT_STATUS_LABEL[content.status] ?? content.status}
              </Badge>
            ) : null}
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
      <div className="rich-text-content rounded-xl border bg-background px-4 py-3 text-sm">
        {renderUgcMarkdown(content.body)}
      </div>
      <AttachmentList attachments={content.attachments} />
      <ContentContext content={content} />
    </div>
  )
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function ListSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-2" role="status" aria-label={label}>
      <Skeleton className="h-40 w-full rounded-[18px]" />
      <Skeleton className="h-40 w-full rounded-[18px]" />
    </div>
  )
}

/**
 * Moderação (Turma → Moderação): as publicações que esperam aprovação, as denúncias abertas e,
 * com um servidor escolhido, quem está silenciado. Cada ação confirma antes, dizendo de quem é o
 * conteúdo e o que acontece. Quem é da Equipe vê tudo com os botões apagados (o gateway
 * reautoriza cada escrita).
 */
export function ModerationClient({ currentRole }: { currentRole: string }) {
  const canWrite = canWriteRole(currentRole)
  const searchParams = useSearchParams()
  const abaParam = searchParams.get('aba')
  const [tab, setTab] = useState<ModerationTab>(() => moderationTabFrom(abaParam))
  // Um link novo com `?aba=` (a Home, com a tela já aberta) troca a aba também.
  useEffect(() => {
    setTab(moderationTabFrom(abaParam))
  }, [abaParam])
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
  /** A primeira leitura (ou a da troca de lente): o vazio só aparece depois dela. */
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const loadAuthority = useRef(createForegroundPriority()).current
  const mutationScope = useRef(createScopeAuthority(platform)).current
  mutationScope.update(platform)
  const { confirm, confirmDialog } = useConfirm()

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
    setStatus('loading')
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
          setStatus('ready')
        },
        onError: (error) => {
          setStatus((current) => (current === 'ready' ? current : 'error'))
          toast.error((error as ApiError).message ?? 'Não conseguimos carregar a moderação.')
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
      toast.error((err as ApiError).message ?? 'Não deu certo. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const target = (t: HubPendingItemView | HubReportView): 'threads' | 'comments' =>
    ('type' in t ? t.type : t.targetType) === 'thread' ? 'threads' : 'comments'

  function approve(item: HubPendingItemView) {
    confirm({
      title: 'Aprovar e publicar?',
      message: `${capitalize(contentPhrase(item))} de ${authorOf(item)} aparece para a comunidade agora.`,
      confirmText: 'Aprovar e publicar',
      onConfirm: () =>
        run(
          () => apiSend(`/api/hub/admin/${target(item)}/${item.id}/approve`, 'POST'),
          'Publicado.',
        ),
    })
  }

  function reject(item: HubPendingItemView) {
    confirm({
      title: 'Não publicar?',
      message: `${capitalize(contentPhrase(item))} de ${authorOf(item)} não vai aparecer para a comunidade.`,
      confirmText: 'Não publicar',
      confirmVariant: 'destructive',
      onConfirm: () =>
        run(
          () => apiSend(`/api/hub/admin/${target(item)}/${item.id}/reject`, 'POST'),
          'Não vai ser publicado.',
        ),
    })
  }

  function hide(report: HubReportView & { content: HubReportedContentView }) {
    confirm({
      title: 'Esconder o conteúdo?',
      message: `${capitalize(contentPhrase(report.content))} de ${authorOf(report.content)} deixa de aparecer para a comunidade.`,
      confirmText: 'Esconder o conteúdo',
      confirmVariant: 'destructive',
      onConfirm: () =>
        run(
          () => apiSend(`/api/hub/admin/${target(report)}/${report.targetId}/hide`, 'POST'),
          'Conteúdo escondido.',
        ),
    })
  }

  function resolve(report: HubReportView) {
    confirm({
      title: 'Resolver sem esconder?',
      message: report.content
        ? `A denúncia de ${reporterOf(report)} sai da lista e ${contentPhrase(report.content)} de ${authorOf(report.content)} continua como está.`
        : `A denúncia de ${reporterOf(report)} sai da lista como resolvida.`,
      confirmText: 'Resolver sem esconder',
      onConfirm: () =>
        run(
          () =>
            apiSend(`/api/hub/admin/reports/${report.id}/resolve`, 'POST', { action: 'resolve' }),
          'Denúncia resolvida.',
        ),
    })
  }

  function dismiss(report: HubReportView) {
    confirm({
      title: 'Descartar a denúncia?',
      message: `A denúncia de ${reporterOf(report)} é descartada, sem mudar nada no conteúdo.`,
      confirmText: 'Descartar a denúncia',
      onConfirm: () =>
        run(
          () =>
            apiSend(`/api/hub/admin/reports/${report.id}/resolve`, 'POST', { action: 'dismiss' }),
          'Denúncia descartada.',
        ),
    })
  }

  const visibleSpaces = spaces.filter((space) => space.audience === platform)
  const spaceName = visibleSpaces.find((space) => space.id === spaceId)?.name ?? 'este espaço'

  function muteBan() {
    if (!spaceId) {
      toast.error('Escolha um espaço primeiro.')
      return
    }
    const userId = mbUserId.trim()
    if (!userId) {
      toast.error('Cole o ID da conta.')
      return
    }
    const kind = mbKind
    confirm({
      title: kind === 'mute' ? 'Silenciar esta conta?' : 'Afastar esta conta?',
      message:
        kind === 'mute'
          ? `A conta ${userId} não pode postar em ${spaceName} até alguém da equipe tirar o silêncio.`
          : `A conta ${userId} não posta nem reage em ${spaceName} até alguém da equipe tirar o afastamento.`,
      confirmText: kind === 'mute' ? 'Silenciar' : 'Afastar',
      confirmVariant: 'destructive',
      onConfirm: () =>
        run(
          async () => {
            await apiSend(`/api/hub/admin/${kind === 'mute' ? 'mutes' : 'bans'}`, 'POST', {
              userId,
              spaceId,
              reason: mbReason.trim() || null,
            })
            setMbUserId('')
            setMbReason('')
          },
          kind === 'mute' ? 'Conta silenciada.' : 'Conta afastada.',
        ),
    })
  }

  function lift(mb: HubMuteBanView) {
    const mute = mb.kind === 'mute'
    confirm({
      title: mute ? 'Tirar o silêncio?' : 'Tirar o afastamento?',
      message: mute
        ? `A conta ${mb.userId} volta a poder postar em ${spaceName}.`
        : `A conta ${mb.userId} volta a postar e reagir em ${spaceName}.`,
      confirmText: mute ? 'Tirar o silêncio' : 'Tirar o afastamento',
      onConfirm: () =>
        run(
          () =>
            apiSend(`/api/hub/admin/${mute ? 'mutes' : 'bans'}/remove`, 'POST', {
              userId: mb.userId,
              spaceId,
            }),
          mute ? 'Silêncio tirado.' : 'Afastamento tirado.',
        ),
    })
  }

  // Silenciados só existe para quem escreve. A lista vale por espaço: sem um escolhido, a aba
  // pede para escolher primeiro (`?aba=silenciados` chega aqui antes de haver espaço).
  const showSilenced = canWrite
  const activeTab: ModerationTab = tab === 'silenciados' && !showSilenced ? 'aprovar' : tab
  const ready = status === 'ready'
  const tabs = [
    { value: 'aprovar', label: `Para aprovar${ready ? ` (${pendingTotal})` : ''}` },
    { value: 'denuncias', label: `Denúncias${ready ? ` (${reportsTotal})` : ''}` },
    ...(showSilenced ? [{ value: 'silenciados', label: 'Silenciados' }] : []),
  ]
  const off = busy || !canWrite
  const readOnlyHint = canWrite ? undefined : 'Só Admin muda a moderação.'

  return (
    <div className="space-y-6">
      {confirmDialog}
      <AdminHeader
        title="Moderação"
        description="As publicações que esperam aprovação e as denúncias da comunidade. Cada ação pede confirmação antes de valer."
      />
      {!canWrite ? <ReadOnlyNotice /> : null}

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
          <option value="">Todos os espaços</option>
          {visibleSpaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>

      <Tabs value={activeTab} onChange={(value) => setTab(value as ModerationTab)} items={tabs} />

      {status === 'error' && activeTab !== 'silenciados' ? (
        <div className="rounded-[18px] border border-border bg-card">
          <LoadError what="a moderação" onRetry={() => void load()} />
        </div>
      ) : null}

      {activeTab === 'aprovar' && status !== 'error' ? (
        <section aria-label="Para aprovar" className="space-y-3">
          {status === 'loading' ? (
            <ListSkeleton label="Carregando o que espera aprovação" />
          ) : pending.length === 0 ? (
            <div className="rounded-[18px] border border-border bg-card">
              <EmptyState zappy="celebrating" title="Nada esperando aprovação." />
            </div>
          ) : (
            pending.map((item) => (
              <Card key={item.id} className="space-y-4 rounded-[18px] p-5">
                <ModeratedContent content={item} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-11 px-4"
                    disabled={off}
                    title={readOnlyHint}
                    onClick={() => approve(item)}
                  >
                    Aprovar e publicar
                  </Button>
                  <Button
                    className="min-h-11 px-4"
                    variant="outline"
                    disabled={off}
                    title={readOnlyHint}
                    onClick={() => reject(item)}
                  >
                    Não publicar
                  </Button>
                </div>
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
      ) : null}

      {activeTab === 'denuncias' && status !== 'error' ? (
        <section aria-label="Denúncias" className="space-y-3">
          {status === 'loading' ? (
            <ListSkeleton label="Carregando as denúncias" />
          ) : reports.length === 0 ? (
            <div className="rounded-[18px] border border-border bg-card">
              <EmptyState zappy="celebrating" title="Nenhuma denúncia aberta." />
            </div>
          ) : (
            reports.map((r) => {
              const audience = r.spaceAudience
              const content = r.content
              return (
                <Card key={r.id} className="space-y-4 rounded-[18px] p-5">
                  <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">Denúncia</span>
                        {audience === 'unknown' ? (
                          <Badge variant="outline">Espaço que não existe mais</Badge>
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
                      who="reporter"
                    />
                  </div>
                  {content ? (
                    <ModeratedContent content={content} />
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                      O conteúdo denunciado não existe mais. Ainda dá para resolver ou descartar a
                      denúncia.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {canHideReportedContent(content) ? (
                      <Button
                        className="min-h-11 px-4"
                        variant="outline"
                        disabled={off}
                        title={readOnlyHint}
                        onClick={() => hide({ ...r, content })}
                      >
                        Esconder o conteúdo
                      </Button>
                    ) : null}
                    <Button
                      className="min-h-11 px-4"
                      disabled={off}
                      title={readOnlyHint}
                      onClick={() => resolve(r)}
                    >
                      Resolver sem esconder
                    </Button>
                    <Button
                      className="min-h-11 px-4"
                      variant="ghost"
                      disabled={off}
                      title={readOnlyHint}
                      onClick={() => dismiss(r)}
                    >
                      Descartar a denúncia
                    </Button>
                  </div>
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
      ) : null}

      {/* ── Silenciar / afastar (por servidor) ── */}
      {activeTab === 'silenciados' && showSilenced && !spaceId ? (
        <section aria-label="Silenciados" className="rounded-[18px] border border-border bg-card">
          <EmptyState
            zappy="thinking"
            title="Escolha um espaço primeiro."
            description="Quem está silenciado ou afastado vale para um espaço. Escolha o espaço no campo Servidor, aqui em cima."
          />
        </section>
      ) : null}

      {activeTab === 'silenciados' && showSilenced && spaceId ? (
        <section aria-label="Silenciados" className="space-y-3">
          <Card className="space-y-3 rounded-[18px] p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <Field label="Conta (ID)" htmlFor="mb-user" hint="Copie o ID na ficha do aluno.">
                <Input
                  id="mb-user"
                  value={mbUserId}
                  onChange={(e) => setMbUserId(e.target.value)}
                />
              </Field>
              <Field label="O que fazer" htmlFor="mb-kind">
                <Select
                  id="mb-kind"
                  value={mbKind}
                  onChange={(e) => setMbKind(e.target.value as 'mute' | 'ban')}
                >
                  <option value="mute">Silenciar: não pode postar</option>
                  <option value="ban">Afastar: não posta nem reage</option>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button className="min-h-11 px-4" onClick={muteBan} disabled={busy}>
                  Aplicar
                </Button>
              </div>
            </div>
            <Field label="Motivo, se quiser" htmlFor="mb-reason" hint="Fica só para a equipe.">
              <Input
                id="mb-reason"
                value={mbReason}
                onChange={(e) => setMbReason(e.target.value)}
              />
            </Field>
          </Card>

          {mutesBans.length === 0 ? (
            <div className="rounded-[18px] border border-border bg-card">
              <EmptyState title="Ninguém silenciado neste espaço." />
            </div>
          ) : (
            mutesBans.map((mb) => (
              <Card
                key={mb.id}
                className="flex items-center justify-between gap-3 rounded-[18px] p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{mb.kind === 'ban' ? 'Afastado' : 'Silenciado'}</Badge>
                    <span className="truncate font-mono text-xs">{mb.userId}</span>
                  </div>
                  {mb.reason ? (
                    <p className="truncate text-sm text-muted-foreground">{mb.reason}</p>
                  ) : null}
                </div>
                <Button
                  className="min-h-11 px-4"
                  variant="outline"
                  disabled={busy}
                  onClick={() => lift(mb)}
                >
                  {mb.kind === 'mute' ? 'Tirar o silêncio' : 'Tirar o afastamento'}
                </Button>
              </Card>
            ))
          )}
        </section>
      ) : null}
    </div>
  )
}
