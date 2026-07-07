'use client'

import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Input } from '@sistemazero/ui/input'
import { Progress } from '@sistemazero/ui/progress'
import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatShortSp } from '@/lib/dates'
import type { ChecklistItemView } from '@/lib/types'

type ItemsUpdater = (updater: (items: ChecklistItemView[]) => ChecklistItemView[]) => void

/**
 * Checklist do conteúdo: toggle otimista (rollback no erro), adicionar,
 * renomear inline e excluir. Completar tudo libera a etapa Aprovado (gate do
 * backend em `POST /stage`).
 */
export function ChecklistPanel({
  contentId,
  items,
  onItemsChange,
}: {
  contentId: string
  items: ChecklistItemView[]
  onItemsChange: ItemsUpdater
}) {
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ChecklistItemView | null>(null)

  const sorted = [...items].sort((a, b) => a.position - b.position)
  const done = items.filter((item) => item.done).length

  // Foca o input de renomear quando ele aparece (o Input do ui não expõe ref).
  useEffect(() => {
    if (editingId) document.getElementById('checklist-edit-input')?.focus()
  }, [editingId])

  async function toggle(item: ChecklistItemView) {
    const nextDone = !item.done
    onItemsChange((current) =>
      current.map((i) => (i.id === item.id ? { ...i, done: nextDone } : i)),
    )
    try {
      const updated = await apiSend<ChecklistItemView>(
        `/api/marketing/checklist/${item.id}`,
        'PATCH',
        { done: nextDone },
      )
      onItemsChange((current) => current.map((i) => (i.id === updated.id ? updated : i)))
    } catch (error) {
      onItemsChange((current) => current.map((i) => (i.id === item.id ? item : i)))
      toast.error((error as ApiError).message)
    }
  }

  async function add() {
    const label = newLabel.trim()
    if (!label || adding) return
    setAdding(true)
    try {
      const item = await apiSend<ChecklistItemView>(
        `/api/marketing/contents/${contentId}/checklist`,
        'POST',
        { label },
      )
      onItemsChange((current) => [...current, item])
      setNewLabel('')
    } catch (error) {
      toast.error((error as ApiError).message)
    } finally {
      setAdding(false)
    }
  }

  async function rename(item: ChecklistItemView) {
    const label = editLabel.trim()
    if (!label || label === item.label) {
      setEditingId(null)
      return
    }
    setRenaming(true)
    try {
      const updated = await apiSend<ChecklistItemView>(
        `/api/marketing/checklist/${item.id}`,
        'PATCH',
        { label },
      )
      onItemsChange((current) => current.map((i) => (i.id === updated.id ? updated : i)))
      setEditingId(null)
    } catch (error) {
      toast.error((error as ApiError).message)
    } finally {
      setRenaming(false)
    }
  }

  async function removeItem() {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await apiSend<unknown>(`/api/marketing/checklist/${target.id}`, 'DELETE')
      onItemsChange((current) => current.filter((i) => i.id !== target.id))
      setDeleteTarget(null)
    } catch (error) {
      toast.error((error as ApiError).message)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {done} de {items.length} itens concluídos
            </span>
            <span className="tabular-nums">
              {items.length > 0 ? Math.round((done / items.length) * 100) : 0}%
            </span>
          </div>
          <Progress value={items.length > 0 ? done / items.length : 0} />
          <p className="text-xs text-muted-foreground">
            Checklist completo libera a etapa Aprovado.
          </p>
        </div>

        <ul className="space-y-1">
          {sorted.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
            >
              {editingId === item.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void rename(item)
                  }}
                  className="flex flex-1 items-center gap-2"
                >
                  <Input
                    id="checklist-edit-input"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-7 text-sm"
                    maxLength={200}
                  />
                  <Button type="submit" size="xs" disabled={renaming}>
                    Salvar
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </form>
              ) : (
                <>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-primary"
                      checked={item.done}
                      onChange={() => void toggle(item)}
                    />
                    <span
                      className={cn(
                        'truncate text-sm',
                        item.done && 'text-muted-foreground line-through',
                      )}
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </label>
                  {item.done && item.doneByName && item.doneAt ? (
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                      {item.doneByName} · {formatShortSp(item.doneAt)}
                    </span>
                  ) : null}
                  <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Renomear "${item.label}"`}
                      onClick={() => {
                        setEditingId(item.id)
                        setEditLabel(item.label)
                      }}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={`Excluir "${item.label}"`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </span>
                </>
              )}
            </li>
          ))}
          {sorted.length === 0 ? (
            <li className="px-2 py-3 text-sm text-muted-foreground">
              Nenhum item ainda. Adicione o primeiro abaixo.
            </li>
          ) : null}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
          className="flex items-center gap-2 border-t border-border pt-4"
        >
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Novo item do checklist"
            maxLength={200}
            aria-label="Novo item do checklist"
          />
          <Button type="submit" disabled={!newLabel.trim() || adding}>
            Adicionar
          </Button>
        </form>
      </CardContent>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Excluir item"
        message={`"${deleteTarget?.label ?? ''}" sai do checklist deste conteúdo.`}
        confirmText="Excluir"
        confirmVariant="destructive"
        onConfirm={removeItem}
      />
    </Card>
  )
}
