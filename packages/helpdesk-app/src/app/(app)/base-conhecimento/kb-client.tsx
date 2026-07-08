'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Switch } from '@sistemazero/ui/switch'
import { BookOpen, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatShortSp } from '@/lib/dates'
import type { HelpdeskPage, KbArticleView } from '@/lib/types'
import { ArticleDialog } from './article-dialog'

const LIMIT = 50

function articleMeta(article: KbArticleView): string {
  return [article.createdByName, `Atualizado ${formatShortSp(article.updatedAt)}`]
    .filter(Boolean)
    .join(' · ')
}

export function KbClient() {
  const [items, setItems] = useState<KbArticleView[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<KbArticleView | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KbArticleView | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadKey` é só o gatilho do retry — bump força a re-carga sem ser lido no corpo.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setFailed(false)
    apiGet<HelpdeskPage<KbArticleView>>(`/api/helpdesk/kb?limit=${LIMIT}&offset=0`)
      .then((page) => {
        if (!alive) return
        setItems(page.items)
        setTotal(page.total)
        setHasMore(page.hasMore)
        setLoading(false)
      })
      .catch(() => {
        // Erro não vira lista vazia (indistinguível de base vazia): aviso + tentar de novo.
        if (!alive) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [reloadKey])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const page = await apiGet<HelpdeskPage<KbArticleView>>(
        `/api/helpdesk/kb?limit=${LIMIT}&offset=${items.length}`,
      )
      setItems((cur) => {
        const seen = new Set(cur.map((it) => it.id))
        return [...cur, ...page.items.filter((it) => !seen.has(it.id))]
      })
      setTotal(page.total)
      setHasMore(page.hasMore)
    } catch {
      toast.error('Não foi possível carregar mais artigos. Tente novamente.')
    } finally {
      setLoadingMore(false)
    }
  }

  function reload() {
    setReloadKey((key) => key + 1)
  }

  function openCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function openEdit(article: KbArticleView) {
    setEditTarget(article)
    setDialogOpen(true)
  }

  function handleSaved(saved: KbArticleView, created: boolean) {
    if (created) {
      setItems((cur) => [saved, ...cur])
      setTotal((t) => t + 1)
      return
    }
    setItems((cur) => cur.map((it) => (it.id === saved.id ? saved : it)))
  }

  async function togglePublished(article: KbArticleView, published: boolean) {
    setTogglingId(article.id)
    try {
      const saved = await apiSend<KbArticleView>(`/api/helpdesk/kb/${article.id}`, 'PATCH', {
        published,
        version: article.version,
      })
      setItems((cur) => cur.map((it) => (it.id === saved.id ? saved : it)))
      toast.success(published ? 'Artigo publicado.' : 'Artigo despublicado.')
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.status === 409) {
        toast.error('Alguém editou antes; recarregue.')
        reload()
        return
      }
      toast.error('Não foi possível atualizar o artigo. Tente novamente.')
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await apiSend<null>(`/api/helpdesk/kb/${deleteTarget.id}`, 'DELETE')
      setItems((cur) => cur.filter((it) => it.id !== deleteTarget.id))
      setTotal((t) => Math.max(0, t - 1))
      toast.success('Artigo excluído.')
      setDeleteTarget(null)
    } catch (error) {
      // 404 = já tinha sido excluído (outra aba/tentativa anterior) — sincroniza.
      if ((error as ApiError).status === 404) {
        toast.success('Artigo excluído.')
        setDeleteTarget(null)
        reload()
        return
      }
      toast.error('Não foi possível excluir o artigo. Tente novamente.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? 'artigo' : 'artigos'}
        </p>
        <Button onClick={openCreate}>
          <Plus aria-hidden />
          Novo artigo
        </Button>
      </div>

      {failed ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-destructive" role="alert">
            Não foi possível carregar os artigos.
          </p>
          <Button variant="outline" onClick={reload}>
            Tentar de novo
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">Carregando artigos</span>
          {['a', 'b', 'c'].map((key) => (
            <Skeleton key={key} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
          <BookOpen className="size-8 text-muted-foreground" />
          <div className="space-y-1 px-6">
            <p className="text-sm font-medium">Nenhum artigo ainda</p>
            <p className="text-sm text-muted-foreground">
              Escreva o primeiro artigo para a IA usar nas respostas.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            Novo artigo
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((article) => (
              <li
                key={article.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{article.title}</h3>
                    {article.published ? (
                      <Badge variant="success">Publicado</Badge>
                    ) : (
                      <Badge variant="muted">Rascunho</Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{article.content}</p>
                  <p className="text-xs text-muted-foreground">{articleMeta(article)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  <Switch
                    checked={article.published}
                    onCheckedChange={(next) => togglePublished(article, next)}
                    disabled={togglingId === article.id}
                    aria-label={`Publicado: ${article.title}`}
                  />
                  <Button variant="outline" size="sm" onClick={() => openEdit(article)}>
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(article)}>
                    Excluir
                  </Button>
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

      <ArticleDialog
        open={dialogOpen}
        article={editTarget}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        onStale={reload}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Excluir artigo"
        message={
          deleteTarget
            ? `O artigo "${deleteTarget.title}" some da base e a IA deixa de usá-lo. Não dá para desfazer.`
            : ''
        }
        confirmText="Excluir"
        confirmVariant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
