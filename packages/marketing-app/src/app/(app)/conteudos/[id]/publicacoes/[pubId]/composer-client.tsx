'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Label } from '@sistemazero/ui/label'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ArrowLeft, SearchX, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { MarkPublishedDialog } from '@/components/shared/mark-published-dialog'
import { NetworkChip } from '@/components/shared/network-chip'
import { PubStatusBadge } from '@/components/shared/pub-status-badge'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { FORMAT_LABELS, FORMAT_NETWORK, NETWORK_LIMITS } from '@/lib/networks'
import { canMarkPublished, isEditable } from '@/lib/publications'
import type { AccountsResponse, PublicationView, PublishMode } from '@/lib/types'
import { handleConflict } from '../../../shared'
import { CaptionEditor } from './caption-editor'
import { CoverPicker } from './cover-picker'
import { PreviewCard } from './preview-card'
import { PublishModeToggle } from './publish-mode-toggle'
import { ScheduleSection } from './schedule-section'
import { StatusBanner } from './status-banner'

const MAX_TAGS = 50

/**
 * Composer da publicação: busca a view (+ contas p/ o toggle auto/lembrete) e
 * guarda a rota (publicação de outro conteúdo → replace pra rota certa).
 */
export function ComposerClient({
  contentId,
  publicationId,
}: {
  contentId: string
  publicationId: string
}) {
  const router = useRouter()
  const [view, setView] = useState<PublicationView | null>(null)
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null)
  const [loadError, setLoadError] = useState<'not-found' | 'failed' | null>(null)

  const load = useCallback(async () => {
    try {
      const fetched = await apiGet<PublicationView>(`/api/marketing/publications/${publicationId}`)
      setView(fetched)
      setLoadError(null)
    } catch (error) {
      setLoadError((error as ApiError).status === 404 ? 'not-found' : 'failed')
    }
  }, [publicationId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let alive = true
    apiGet<AccountsResponse>('/api/marketing/accounts')
      .then((res) => {
        if (alive) setAccounts(res)
      })
      .catch(() => {
        // Sem as contas o toggle fica em lembrete (fail-safe) — não trava a tela.
        if (alive) setAccounts({ items: [], autoCapableNetworks: [] })
      })
    return () => {
      alive = false
    }
  }, [])

  // Guard: a publicação pertence a OUTRO conteúdo → corrige a URL.
  useEffect(() => {
    if (view && view.contentId !== contentId) {
      router.replace(`/conteudos/${view.contentId}/publicacoes/${view.id}`)
    }
  }, [view, contentId, router])

  if (loadError === 'not-found') {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={SearchX}
          title="Publicação não encontrada"
          description="Ela pode ter sido removida, ou o link está errado."
        />
        <div className="flex justify-center">
          <Link
            href={`/conteudos/${contentId}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Voltar ao conteúdo
          </Link>
        </div>
      </div>
    )
  }

  if (loadError === 'failed') {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Não foi possível carregar a publicação"
          description="Verifique sua conexão e tente de novo."
        />
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void load()}>
            Tentar de novo
          </Button>
        </div>
      </div>
    )
  }

  if (!view || view.contentId !== contentId) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only">Carregando a publicação</span>
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <ComposerForm
      contentId={contentId}
      view={view}
      accounts={accounts}
      onView={setView}
      reload={load}
    />
  )
}

/** Compara os arrays de tags (ordem importa — é a ordem visível dos chips). */
function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}

function ComposerForm({
  contentId,
  view,
  accounts,
  onView,
  reload,
}: {
  contentId: string
  view: PublicationView
  accounts: AccountsResponse | null
  onView: (view: PublicationView) => void
  reload: () => Promise<void>
}) {
  const [caption, setCaption] = useState(view.caption)
  const [title, setTitle] = useState(view.title ?? '')
  const [tags, setTags] = useState<string[]>(view.tags)
  const [tagInput, setTagInput] = useState('')
  const [coverAssetId, setCoverAssetId] = useState<string | null>(view.coverAssetId)
  const [publishMode, setPublishMode] = useState<PublishMode>(view.publishMode)
  const [saving, setSaving] = useState(false)
  const [markOpen, setMarkOpen] = useState(false)

  // Re-sincroniza os campos quando a VERSÃO do servidor muda (salvar, agendar,
  // cancelar, marcar publicada, conflito 409). A identidade do objeto muda mais
  // vezes que a versão — o ref evita reset em re-render sem mudança real.
  const syncedVersion = useRef(view.version)
  useEffect(() => {
    if (view.version === syncedVersion.current) return
    syncedVersion.current = view.version
    setCaption(view.caption)
    setTitle(view.title ?? '')
    setTags(view.tags)
    setCoverAssetId(view.coverAssetId)
    setPublishMode(view.publishMode)
  }, [view])

  const network = FORMAT_NETWORK[view.format]
  const isYouTube = network === 'youtube'
  const editable = isEditable(view.status)

  const dirty =
    caption !== view.caption ||
    coverAssetId !== view.coverAssetId ||
    publishMode !== view.publishMode ||
    (isYouTube && (title.trim() !== (view.title ?? '') || !sameTags(tags, view.tags)))

  function addTag() {
    const tag = tagInput.trim()
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return
    setTags([...tags, tag])
    setTagInput('')
  }

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        caption,
        coverAssetId,
        publishMode,
        version: view.version,
      }
      if (isYouTube) {
        body.title = title.trim() || null
        body.tags = tags
      }
      const updated = await apiSend<PublicationView>(
        `/api/marketing/publications/${view.id}`,
        'PATCH',
        body,
      )
      onView(updated)
      toast.success('Publicação salva.')
    } catch (error) {
      const apiError = error as ApiError
      if (await handleConflict(error, reload)) return
      if (apiError.status === 409 && apiError.code === 'AUTO_PUBLISH_UNAVAILABLE') {
        toast.error(apiError.message)
        setPublishMode(view.publishMode)
        return
      }
      toast.error(apiError.message)
    } finally {
      setSaving(false)
    }
  }

  function focusSchedule() {
    document
      .getElementById('schedule-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const input = document.getElementById('composer-schedule-at')
    if (input instanceof HTMLElement) input.focus({ preventScroll: true })
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/conteudos/${contentId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Voltar ao conteúdo
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{FORMAT_LABELS[view.format]}</h1>
        <NetworkChip format={view.format} />
        <PubStatusBadge status={view.status} />
      </div>

      <StatusBanner
        view={view}
        onReschedule={focusSchedule}
        onMarkPublished={() => setMarkOpen(true)}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardContent className="space-y-5 p-5">
              <CaptionEditor
                format={view.format}
                value={caption}
                onChange={setCaption}
                disabled={!editable}
              />

              {isYouTube ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="composer-title">Título</Label>
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          title.length > NETWORK_LIMITS.youtube.title
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {title.length}/{NETWORK_LIMITS.youtube.title}
                      </span>
                    </div>
                    <Input
                      id="composer-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={!editable}
                    />
                    <p className="text-xs text-muted-foreground">
                      Obrigatório para publicar no YouTube.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="composer-tags">Tags</Label>
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => setTags(tags.filter((t) => t !== tag))}
                              disabled={!editable}
                              aria-label={`Remover tag ${tag}`}
                              className="text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
                            >
                              <X className="size-3" aria-hidden />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <Input
                      id="composer-tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                      placeholder="Digite uma tag e aperte Enter"
                      disabled={!editable || tags.length >= MAX_TAGS}
                    />
                    <p className="text-xs text-muted-foreground">
                      {tags.length}/{MAX_TAGS} tags
                    </p>
                  </div>
                </>
              ) : null}

              <CoverPicker
                contentId={contentId}
                value={coverAssetId}
                onChange={setCoverAssetId}
                disabled={!editable}
              />

              <PublishModeToggle
                format={view.format}
                accounts={accounts}
                value={publishMode}
                onChange={setPublishMode}
                disabled={!editable}
              />

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                {canMarkPublished(view.status) ? (
                  <Button variant="outline" onClick={() => setMarkOpen(true)}>
                    Marcar como publicada
                  </Button>
                ) : null}
                <Button onClick={save} disabled={!editable || !dirty || saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <ScheduleSection view={view} onView={onView} reload={reload} />
        </div>

        <PreviewCard
          format={view.format}
          caption={caption}
          title={isYouTube ? title : null}
          coverAssetId={coverAssetId}
        />
      </div>

      <MarkPublishedDialog
        publicationId={view.id}
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        onDone={onView}
      />
    </div>
  )
}
