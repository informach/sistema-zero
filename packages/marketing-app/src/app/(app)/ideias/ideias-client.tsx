'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Archive, Lightbulb, type LucideIcon, Plus, Rocket } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatShortSp } from '@/lib/dates'
import type { IdeaStatus, IdeaView, MarketingPage } from '@/lib/types'
import { IdeaDialog } from './idea-dialog'
import { PotentialStars } from './potential-stars'
import { PromoteDialog } from './promote-dialog'

const LIMIT = 50

const FILTERS: { value: IdeaStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'discarded', label: 'Descartadas' },
  { value: 'accepted', label: 'Promovidas' },
]

type EmptyCopy = { icon: LucideIcon; title: string; description: string }

const EMPTY_BY_STATUS: Record<IdeaStatus, EmptyCopy> = {
  inbox: {
    icon: Lightbulb,
    title: 'Nenhuma ideia no inbox',
    description: 'Capture a próxima ideia de conteúdo para avaliar e promover.',
  },
  discarded: {
    icon: Archive,
    title: 'Nenhuma ideia descartada',
    description: 'As ideias descartadas ficam aqui, prontas para restaurar.',
  },
  accepted: {
    icon: Rocket,
    title: 'Nenhuma ideia promovida',
    description: 'Promova uma ideia do inbox para criar o conteúdo no pipeline.',
  },
}

const COMPLEXITY_LABELS: Record<string, string> = {
  P: 'Complexidade P',
  M: 'Complexidade M',
  G: 'Complexidade G',
}

function ideaMeta(idea: IdeaView): string {
  return [
    idea.createdByName,
    formatShortSp(idea.createdAt),
    idea.source ? `Fonte: ${idea.source}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function IdeiasClient() {
  const [status, setStatus] = useState<IdeaStatus>('inbox')
  const [items, setItems] = useState<IdeaView[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<IdeaView | null>(null)
  const [promoteTarget, setPromoteTarget] = useState<IdeaView | null>(null)
  const [discardTarget, setDiscardTarget] = useState<IdeaView | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setFailed(false)
    const path = `/api/marketing/ideas?status=${status}&limit=${LIMIT}&offset=0`
    apiGet<MarketingPage<IdeaView>>(path)
      .then((page) => {
        if (!alive) return
        setItems(page.items)
        setTotal(page.total)
        setHasMore(page.hasMore)
        setLoading(false)
      })
      .catch(() => {
        // Erro não vira lista vazia (indistinguível de inbox vazio): aviso + tentar de novo.
        if (!alive) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [status, reloadKey])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const path = `/api/marketing/ideas?status=${status}&limit=${LIMIT}&offset=${items.length}`
      const page = await apiGet<MarketingPage<IdeaView>>(path)
      setItems((cur) => {
        const seen = new Set(cur.map((it) => it.id))
        return [...cur, ...page.items.filter((it) => !seen.has(it.id))]
      })
      setTotal(page.total)
      setHasMore(page.hasMore)
    } catch {
      toast.error('Não foi possível carregar mais ideias. Tente novamente.')
    } finally {
      setLoadingMore(false)
    }
  }

  function openCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function openEdit(idea: IdeaView) {
    setEditTarget(idea)
    setDialogOpen(true)
  }

  function handleSaved(saved: IdeaView, created: boolean) {
    if (!created) {
      setItems((cur) => cur.map((it) => (it.id === saved.id ? saved : it)))
      return
    }
    if (status === 'inbox') {
      setItems((cur) => [saved, ...cur])
      setTotal((t) => t + 1)
    } else {
      // Criou olhando outro filtro: leva pro inbox (o refetch traz a ideia nova).
      setStatus('inbox')
    }
  }

  function handlePromoted(updated: IdeaView) {
    setItems((cur) => cur.filter((it) => it.id !== updated.id))
    setTotal((t) => Math.max(0, t - 1))
  }

  async function confirmDiscard() {
    if (!discardTarget) return
    try {
      await apiSend<IdeaView>(`/api/marketing/ideas/${discardTarget.id}`, 'PATCH', {
        status: 'discarded',
      })
      setItems((cur) => cur.filter((it) => it.id !== discardTarget.id))
      setTotal((t) => Math.max(0, t - 1))
      toast.success('Ideia descartada.')
      setDiscardTarget(null)
    } catch (error) {
      const apiError = error as ApiError
      toast.error(
        apiError.status === 409
          ? apiError.message
          : 'Não foi possível descartar a ideia. Tente novamente.',
      )
    }
  }

  async function restore(idea: IdeaView) {
    setRestoringId(idea.id)
    try {
      await apiSend<IdeaView>(`/api/marketing/ideas/${idea.id}`, 'PATCH', { status: 'inbox' })
      setItems((cur) => cur.filter((it) => it.id !== idea.id))
      setTotal((t) => Math.max(0, t - 1))
      toast.success('Ideia restaurada para o inbox.')
    } catch (error) {
      const apiError = error as ApiError
      toast.error(
        apiError.status === 409
          ? apiError.message
          : 'Não foi possível restaurar a ideia. Tente novamente.',
      )
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              aria-pressed={status === filter.value}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                status === filter.value
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <Button onClick={openCreate}>
          <Plus aria-hidden />
          Nova ideia
        </Button>
      </div>

      {failed ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar as ideias.
          </p>
          <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
            Tentar de novo
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">Carregando ideias</span>
          {['a', 'b', 'c'].map((key) => (
            <Skeleton key={key} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyBlock
          {...EMPTY_BY_STATUS[status]}
          action={
            status === 'inbox' ? (
              <Button onClick={openCreate}>
                <Plus aria-hidden />
                Nova ideia
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((idea) => (
              <li
                key={idea.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{idea.title}</h3>
                    <PotentialStars value={idea.potential} />
                    {idea.complexity ? (
                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {COMPLEXITY_LABELS[idea.complexity] ?? `Complexidade ${idea.complexity}`}
                      </span>
                    ) : null}
                  </div>
                  {idea.notes ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{idea.notes}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{ideaMeta(idea)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {status === 'inbox' ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(idea)}>
                        Editar
                      </Button>
                      <Button size="sm" onClick={() => setPromoteTarget(idea)}>
                        Promover
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDiscardTarget(idea)}
                      >
                        Descartar
                      </Button>
                    </>
                  ) : null}
                  {status === 'discarded' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={restoringId === idea.id}
                      onClick={() => restore(idea)}
                    >
                      {restoringId === idea.id ? 'Restaurando…' : 'Restaurar'}
                    </Button>
                  ) : null}
                  {status === 'accepted' && idea.promotedContentId ? (
                    <Link
                      href={`/conteudos/${idea.promotedContentId}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      Abrir conteúdo
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {hasMore ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Carregando…' : `Carregar mais (${items.length} de ${total})`}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <IdeaDialog
        open={dialogOpen}
        idea={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
      <PromoteDialog
        idea={promoteTarget}
        open={promoteTarget !== null}
        onClose={() => setPromoteTarget(null)}
        onPromoted={handlePromoted}
        onStale={() => setReloadKey((key) => key + 1)}
      />
      <ConfirmDialog
        open={discardTarget !== null}
        onClose={() => setDiscardTarget(null)}
        title="Descartar ideia"
        message={
          discardTarget
            ? `A ideia "${discardTarget.title}" sai do inbox. Dá para restaurar depois em Descartadas.`
            : ''
        }
        confirmText="Descartar"
        confirmVariant="destructive"
        onConfirm={confirmDiscard}
      />
    </div>
  )
}

/** Bloco vazio com CTA opcional (o EmptyState compartilhado não aceita ação). */
function EmptyBlock({
  icon: Icon,
  title,
  description,
  action,
}: EmptyCopy & { action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <div className="space-y-1 px-6">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
