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
import { isCarouselReady } from '@/lib/carousel'
import { cn } from '@/lib/cn'
import { FORMAT_LABELS, FORMAT_NETWORK, NETWORK_LIMITS } from '@/lib/networks'
import { canMarkPublished, isEditable } from '@/lib/publications'
import type {
  AccountsResponse,
  AssetView,
  MarketingPage,
  PublicationView,
  PublishMode,
} from '@/lib/types'
import { handleConflict, uploadAsset } from '../../../shared'
import { CaptionEditor } from './caption-editor'
import { CarouselPicker } from './carousel-picker'
import { CoverPicker } from './cover-picker'
import { LinkExternalDialog } from './link-external-dialog'
import { PreviewCard } from './preview-card'
import { PublicationMetricsCard } from './publication-metrics-card'
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
  const [socialAccountId, setSocialAccountId] = useState<string | null>(view.socialAccountId)
  const [assetIds, setAssetIds] = useState<string[]>(view.assetIds)
  const [saving, setSaving] = useState(false)
  const [markOpen, setMarkOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  // Imagens PRONTAS do conteúdo: UMA busca alimenta a capa E o carrossel.
  const [images, setImages] = useState<AssetView[] | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    apiGet<MarketingPage<AssetView>>(`/api/marketing/media?contentId=${contentId}&limit=100`)
      .then((page) => {
        if (alive) {
          setImages(
            page.items.filter(
              (asset) => asset.contentType.startsWith('image/') && asset.status === 'ready',
            ),
          )
        }
      })
      .catch(() => {
        if (alive) setImages([])
      })
    return () => {
      alive = false
    }
  }, [contentId])

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
    setSocialAccountId(view.socialAccountId)
    setAssetIds(view.assetIds)
  }, [view])

  const network = FORMAT_NETWORK[view.format]
  const isYouTube = network === 'youtube'
  const isCarousel = view.format === 'ig_carousel'
  const editable = isEditable(view.status)

  const assetsDirty = isCarousel && !sameTags(assetIds, view.assetIds)
  const fieldsDirty =
    caption !== view.caption ||
    coverAssetId !== view.coverAssetId ||
    publishMode !== view.publishMode ||
    socialAccountId !== view.socialAccountId ||
    (isYouTube && (title.trim() !== (view.title ?? '') || !sameTags(tags, view.tags)))
  const dirty = fieldsDirty || assetsDirty

  async function uploadImage(file: File) {
    setUploadProgress(0)
    try {
      const asset = await uploadAsset({
        file,
        contentId,
        kind: 'cover',
        onProgress: setUploadProgress,
      })
      setImages((current) => [asset, ...(current ?? [])])
      setCoverAssetId(asset.id)
      toast.success('Imagem enviada e selecionada como capa.')
    } catch (error) {
      toast.error((error as ApiError).message)
    } finally {
      setUploadProgress(null)
    }
  }

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
      // Sequência PATCH → PUT: os campos vão no PATCH (bump de versão); a
      // ordem do carrossel vai no PUT /assets (não mexe na versão).
      let updated = view
      if (fieldsDirty) {
        const body: Record<string, unknown> = {
          caption,
          coverAssetId,
          publishMode,
          socialAccountId,
          version: view.version,
        }
        if (isYouTube) {
          body.title = title.trim() || null
          body.tags = tags
        }
        updated = await apiSend<PublicationView>(
          `/api/marketing/publications/${view.id}`,
          'PATCH',
          body,
        )
      }
      if (assetsDirty && assetIds.length > 0) {
        updated = await apiSend<PublicationView>(
          `/api/marketing/publications/${view.id}/assets`,
          'PUT',
          { assetIds },
        )
        // O PUT devolve a view com a versão do PATCH — preserva os campos dele.
        updated = { ...updated, assetIds: [...assetIds] }
      }
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
        onLinkExternal={() => setLinkOpen(true)}
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

              {isCarousel ? (
                <CarouselPicker
                  images={images}
                  selected={assetIds}
                  onChange={setAssetIds}
                  disabled={!editable}
                />
              ) : null}

              <CoverPicker
                images={images}
                uploadProgress={uploadProgress}
                onUpload={(file) => void uploadImage(file)}
                value={coverAssetId}
                onChange={setCoverAssetId}
                disabled={!editable}
              />

              <PublishModeToggle
                format={view.format}
                accounts={accounts}
                value={publishMode}
                socialAccountId={socialAccountId}
                onChange={setPublishMode}
                onAccountChange={setSocialAccountId}
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

          <ScheduleSection
            view={view}
            onView={onView}
            reload={reload}
            blockedReason={
              publishMode === 'auto' && isCarousel && !isCarouselReady(view.assetIds)
                ? 'O carrossel automático precisa de 2 a 10 imagens salvas. Selecione as imagens e salve antes de agendar'
                : null
            }
          />
        </div>

        <div className="space-y-4">
          <PreviewCard
            format={view.format}
            caption={caption}
            title={isYouTube ? title : null}
            coverAssetId={coverAssetId}
            carouselAssetIds={assetIds}
          />
          {view.status === 'published' && view.externalPostId ? (
            <PublicationMetricsCard publicationId={view.id} />
          ) : null}
        </div>
      </div>

      <MarkPublishedDialog
        publicationId={view.id}
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        onDone={onView}
      />
      <LinkExternalDialog
        publicationId={view.id}
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onDone={onView}
      />
    </div>
  )
}
