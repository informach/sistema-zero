'use client'

import { Button } from '@sistemazero/ui/button'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Tabs } from '@sistemazero/ui/tabs'
import { ArrowLeft, SearchX } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ContentTypeBadge } from '@/components/shared/content-type-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { StageBadge } from '@/components/shared/stage-badge'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { isValidManualMove, type ProductionStage } from '@/lib/pipeline'
import type {
  AssetView,
  ChecklistItemView,
  ContentDetailView,
  MarketingPage,
  PublicationView,
} from '@/lib/types'
import { AttachmentsPanel } from './attachments-panel'
import { ChecklistPanel } from './checklist-panel'
import { CommentsTimeline } from './comments-timeline'
import { PublicationsPanel } from './publications-panel'
import { ScriptTab } from './script-tab'
import { StageStepper } from './stage-stepper'

type TabValue = 'roteiro' | 'checklist' | 'anexos' | 'publicacoes'

/**
 * Dono do `ContentDetailView`: busca no mount (client fetch via BFF — padrão do
 * painel), distribui pras abas e centraliza as mutações que devolvem o detail
 * inteiro (etapa, cancelar, salvar roteiro).
 */
export function ContentDetailClient({ contentId }: { contentId: string }) {
  const [detail, setDetail] = useState<ContentDetailView | null>(null)
  const [loadError, setLoadError] = useState<'not-found' | 'failed' | null>(null)
  const [assets, setAssets] = useState<AssetView[] | null>(null)
  const [assetsFailed, setAssetsFailed] = useState(false)
  const [tab, setTab] = useState<TabValue>('roteiro')
  const [cancelOpen, setCancelOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const view = await apiGet<ContentDetailView>(`/api/marketing/contents/${contentId}`)
      setDetail(view)
      setLoadError(null)
    } catch (error) {
      setLoadError((error as ApiError).status === 404 ? 'not-found' : 'failed')
    }
  }, [contentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let alive = true
    apiGet<MarketingPage<AssetView>>(`/api/marketing/media?contentId=${contentId}&limit=100`)
      .then((page) => {
        if (alive) setAssets(page.items)
      })
      .catch(() => {
        if (alive) {
          setAssets([])
          setAssetsFailed(true)
        }
      })
    return () => {
      alive = false
    }
  }, [contentId])

  const updateChecklist = useCallback(
    (updater: (items: ChecklistItemView[]) => ChecklistItemView[]) => {
      setDetail((current) =>
        current ? { ...current, checklist: updater(current.checklist) } : current,
      )
    },
    [],
  )

  const updateAssets = useCallback((updater: (items: AssetView[]) => AssetView[]) => {
    setAssets((current) => updater(current ?? []))
  }, [])

  async function moveStage(to: ProductionStage) {
    if (!detail || !isValidManualMove(detail.stage, to)) return
    const previous = detail
    setDetail({ ...detail, stage: to })
    try {
      const view = await apiSend<ContentDetailView>(
        `/api/marketing/contents/${contentId}/stage`,
        'POST',
        { to },
      )
      setDetail(view)
    } catch (error) {
      setDetail(previous)
      const apiError = error as ApiError
      toast.error(
        apiError.code === 'CHECKLIST_INCOMPLETE'
          ? 'Conclua o checklist antes de aprovar este conteúdo.'
          : apiError.message,
      )
    }
  }

  async function cancelContent() {
    try {
      const view = await apiSend<ContentDetailView>(
        `/api/marketing/contents/${contentId}/cancel`,
        'POST',
      )
      setDetail(view)
      setCancelOpen(false)
      toast.success('Conteúdo cancelado. As publicações canceláveis foram canceladas junto.')
    } catch (error) {
      toast.error((error as ApiError).message)
    }
  }

  if (loadError === 'not-found') {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={SearchX}
          title="Conteúdo não encontrado"
          description="Ele pode ter sido removido, ou o link está errado."
        />
        <div className="flex justify-center">
          <Link href="/pipeline" className="text-sm font-medium text-primary hover:underline">
            Voltar ao pipeline
          </Link>
        </div>
      </div>
    )
  }

  if (loadError === 'failed') {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Não foi possível carregar o conteúdo"
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

  if (!detail) {
    return (
      <div className="space-y-6" aria-busy="true">
        <span className="sr-only">Carregando o conteúdo</span>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-9 w-96 max-w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const checklistDone = detail.checklist.filter((item) => item.done).length
  const showCancel = detail.stage !== 'published' && detail.stage !== 'canceled'
  const tabItems = [
    { value: 'roteiro', label: 'Roteiro' },
    {
      value: 'checklist',
      label: 'Checklist',
      badge: `${checklistDone}/${detail.checklist.length}`,
    },
    { value: 'anexos', label: 'Anexos', badge: assets === null ? undefined : assets.length },
    { value: 'publicacoes', label: 'Publicações', badge: detail.publications.length },
  ]

  return (
    <div className="space-y-6">
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Voltar ao pipeline
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-2xl font-bold tracking-tight">{detail.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={detail.stage} />
            <ContentTypeBadge contentType={detail.contentType} />
          </div>
        </div>
        {showCancel ? (
          <Button variant="destructive" className="shrink-0" onClick={() => setCancelOpen(true)}>
            Cancelar conteúdo
          </Button>
        ) : null}
      </div>

      {detail.stage === 'canceled' ? (
        <div
          role="status"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Este conteúdo foi cancelado.
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <StageStepper stage={detail.stage} onMove={(to) => void moveStage(to)} />
          <Tabs value={tab} onChange={(value) => setTab(value as TabValue)} items={tabItems} />
          {tab === 'roteiro' ? (
            <ScriptTab
              key={`${detail.id}:${detail.version}`}
              detail={detail}
              onSaved={setDetail}
              reload={load}
            />
          ) : null}
          {tab === 'checklist' ? (
            <ChecklistPanel
              contentId={contentId}
              items={detail.checklist}
              onItemsChange={updateChecklist}
            />
          ) : null}
          {tab === 'anexos' ? (
            <AttachmentsPanel
              contentId={contentId}
              assets={assets}
              loadFailed={assetsFailed}
              onAssetsChange={updateAssets}
            />
          ) : null}
          {tab === 'publicacoes' ? (
            <PublicationsPanel
              contentId={contentId}
              stage={detail.stage}
              publications={detail.publications}
              onCreated={(views: PublicationView[]) =>
                setDetail((current) =>
                  current
                    ? { ...current, publications: [...current.publications, ...views] }
                    : current,
                )
              }
            />
          ) : null}
        </div>
        <CommentsTimeline
          contentId={contentId}
          comments={detail.comments}
          stageEvents={detail.stageEvents}
          onCommentAdded={(comment) =>
            setDetail((current) =>
              current ? { ...current, comments: [comment, ...current.comments] } : current,
            )
          }
        />
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar conteúdo"
        message="O conteúdo sai do pipeline e as publicações ainda canceláveis são canceladas junto. Essa ação não tem volta."
        confirmText="Cancelar conteúdo"
        cancelText="Voltar"
        confirmVariant="destructive"
        onConfirm={cancelContent}
      />
    </div>
  )
}
