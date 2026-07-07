'use client'

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { OwnerSelect } from '@/components/shared/owner-select'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { type ContentStage, isValidManualMove, PRODUCTION_STAGES } from '@/lib/pipeline'
import type {
  ContentDetailView,
  ContentSummaryView,
  MarketingPage,
  StageCountsView,
} from '@/lib/types'
import { ContentCardGhost } from './content-card'
import { KanbanColumn } from './kanban-column'
import { NewContentDialog } from './new-content-dialog'

/** Colunas do board: produção (dnd) + derivadas scheduled/published (só leitura). */
const BOARD_STAGES: readonly ContentStage[] = [...PRODUCTION_STAGES, 'scheduled', 'published']

export function PipelineClient() {
  const router = useRouter()
  const [items, setItems] = useState<ContentSummaryView[]>([])
  const [counts, setCounts] = useState<Record<ContentStage, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Suprime o clique nativo que dispara logo depois de soltar um arrasto.
  const justDraggedRef = useRef(false)

  // distance 5 separa clique de arrasto (padrão do monorepo, ver dnd do admin).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(handle)
  }, [q])

  const refreshCounts = useCallback(() => {
    apiGet<StageCountsView>('/api/marketing/contents/stage-counts')
      .then((data) => setCounts(data.counts))
      .catch(() => {
        // Contagens são complemento do header: sem elas o board segue de pé.
      })
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setFailed(false)
    const params = new URLSearchParams({ limit: '100' })
    const term = debouncedQ.trim()
    if (term) params.set('q', term)
    if (ownerUserId) params.set('ownerUserId', ownerUserId)
    apiGet<MarketingPage<ContentSummaryView>>(`/api/marketing/contents?${params.toString()}`)
      .then((page) => {
        if (!alive) return
        setItems(page.items)
        setLoading(false)
        setLoadedOnce(true)
      })
      .catch(() => {
        // Erro não vira board vazio (indistinguível de pipeline sem conteúdo).
        if (!alive) return
        setFailed(true)
        setLoading(false)
      })
    refreshCounts()
    return () => {
      alive = false
    }
  }, [debouncedQ, ownerUserId, reloadKey, refreshCounts])

  const byStage = useMemo(() => {
    const map = new Map<ContentStage, ContentSummaryView[]>()
    for (const stage of BOARD_STAGES) map.set(stage, [])
    // `canceled` não tem coluna: cai fora do board de propósito.
    for (const item of items) map.get(item.stage)?.push(item)
    return map
  }, [items])

  const activeItem = useMemo(
    () => (activeId ? (items.find((item) => item.id === activeId) ?? null) : null),
    [activeId, items],
  )

  const hasFilters = debouncedQ.trim() !== '' || ownerUserId !== null

  const handleOpen = useCallback(
    (contentId: string) => {
      if (justDraggedRef.current) return
      router.push(`/conteudos/${contentId}`)
    },
    [router],
  )

  function finishDrag() {
    setActiveId(null)
    // O clique dispara logo após o soltar: libera a navegação só no próximo tick.
    setTimeout(() => {
      justDraggedRef.current = false
    }, 0)
  }

  function handleDragStart(event: DragStartEvent) {
    justDraggedRef.current = true
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const contentId = String(event.active.id)
    finishDrag()
    if (!event.over) return
    const overId = event.over.id
    const to = BOARD_STAGES.find((stage) => stage === overId)
    const item = items.find((content) => content.id === contentId)
    if (!to || !item) return
    if (!isValidManualMove(item.stage, to)) {
      if (item.stage === to) return
      toast.info(
        to === 'scheduled' || to === 'published'
          ? 'Essa etapa é derivada das publicações.'
          : 'Esse movimento não é permitido.',
      )
      return
    }
    moveContent(item, to)
  }

  async function moveContent(item: ContentSummaryView, to: ContentStage) {
    const from = item.stage
    // Move otimista: o card troca de coluna já; erro abaixo desfaz.
    setItems((cur) => cur.map((c) => (c.id === item.id ? { ...c, stage: to } : c)))
    try {
      const detail = await apiSend<ContentDetailView>(
        `/api/marketing/contents/${item.id}/stage`,
        'POST',
        { to },
      )
      setItems((cur) =>
        cur.map((c) =>
          c.id === item.id
            ? { ...c, stage: detail.stage, version: detail.version, updatedAt: detail.updatedAt }
            : c,
        ),
      )
      refreshCounts()
    } catch (error) {
      setItems((cur) => cur.map((c) => (c.id === item.id ? { ...c, stage: from } : c)))
      const apiError = error as ApiError
      toast.error(
        apiError.code === 'CHECKLIST_INCOMPLETE'
          ? 'Conclua o checklist antes de aprovar este conteúdo.'
          : apiError.status === 409
            ? apiError.message
            : 'Não foi possível mover o conteúdo. Tente novamente.',
      )
    }
  }

  function handleCreated(detail: ContentDetailView) {
    const summary: ContentSummaryView = {
      id: detail.id,
      version: detail.version,
      title: detail.title,
      contentType: detail.contentType,
      stage: detail.stage,
      ownerUserId: detail.ownerUserId,
      ownerName: detail.ownerName,
      dueDate: detail.dueDate,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      checklistDone: detail.checklist.filter((entry) => entry.done).length,
      checklistTotal: detail.checklist.length,
      commentCount: detail.comments.length,
      publicationFormats: detail.publications.map((pub) => pub.format),
    }
    setItems((cur) => [summary, ...cur])
    refreshCounts()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título"
            aria-label="Buscar conteúdos"
            className="pl-8"
          />
        </div>
        <div className="w-48">
          <OwnerSelect value={ownerUserId} onChange={(id) => setOwnerUserId(id)} />
        </div>
        <Button className="ml-auto" onClick={() => setDialogOpen(true)}>
          <Plus aria-hidden />
          Novo conteúdo
        </Button>
      </div>

      {failed ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar o pipeline.
          </p>
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            Tentar de novo
          </Button>
        </div>
      ) : !loadedOnce ? (
        <div className="flex items-start gap-3 overflow-x-auto pb-4" aria-busy="true">
          <span className="sr-only">Carregando o pipeline</span>
          {BOARD_STAGES.map((stage) => (
            <div key={stage} className="w-[280px] min-w-[280px] shrink-0 space-y-2">
              <Skeleton className="h-9 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={finishDrag}
        >
          <div
            className={cn(
              'flex items-start gap-3 overflow-x-auto pb-4',
              loading && 'pointer-events-none opacity-60',
            )}
          >
            {BOARD_STAGES.map((stage) => {
              const columnItems = byStage.get(stage) ?? []
              // Com filtro ativo as contagens globais não batem com o board: mostra só N.
              const total = counts?.[stage]
              const countLabel =
                !hasFilters && total !== undefined && total > columnItems.length
                  ? `${columnItems.length} de ${total}`
                  : String(columnItems.length)
              return (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  items={columnItems}
                  countLabel={countLabel}
                  activeStage={activeItem?.stage ?? null}
                  onOpen={handleOpen}
                />
              )
            })}
          </div>
          <DragOverlay>{activeItem ? <ContentCardGhost content={activeItem} /> : null}</DragOverlay>
        </DndContext>
      )}

      <NewContentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
