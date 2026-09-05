'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Switch } from '@sistemazero/ui/switch'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'
import type { KbArticleView } from '@/lib/types'

/** Criar/editar artigo. `article` presente = edição; ausente = criação. */
export function ArticleDialog({
  open,
  article,
  onClose,
  onSaved,
  onStale,
}: {
  open: boolean
  article: KbArticleView | null
  onClose: () => void
  onSaved: (saved: KbArticleView, created: boolean) => void
  /** 409 de concorrência: o chamador re-carrega a lista. */
  onStale: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reidrata os campos a cada abertura (criação limpa; edição carrega o artigo).
  useEffect(() => {
    if (!open) return
    setTitle(article?.title ?? '')
    setContent(article?.content ?? '')
    setPublished(article?.published ?? false)
    setTitleError(null)
    setContentError(null)
  }, [open, article])

  async function submit() {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    let invalid = false
    if (!trimmedTitle) {
      setTitleError('Dê um título ao artigo.')
      invalid = true
    } else if (trimmedTitle.length > 300) {
      setTitleError('O título pode ter até 300 caracteres.')
      invalid = true
    } else {
      setTitleError(null)
    }
    if (!trimmedContent) {
      setContentError('Escreva o conteúdo do artigo.')
      invalid = true
    } else {
      setContentError(null)
    }
    if (invalid) return

    setSaving(true)
    try {
      const saved = article
        ? await apiSend<KbArticleView>(`/api/helpdesk/kb/${article.id}`, 'PATCH', {
            title: trimmedTitle,
            content: trimmedContent,
            published,
            version: article.version,
          })
        : await apiSend<KbArticleView>('/api/helpdesk/kb', 'POST', {
            title: trimmedTitle,
            content: trimmedContent,
            published,
          })
      toast.success(article ? 'Artigo atualizado.' : 'Artigo criado.')
      onSaved(saved, !article)
      onClose()
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.status === 409) {
        // Concorrência otimista: alguém salvou por cima — recarrega e reabre.
        toast.error('Alguém editou antes; recarregue.')
        onStale()
        onClose()
        return
      }
      toast.error(
        apiError.status === 400
          ? apiError.message
          : 'Não foi possível salvar o artigo. Tente novamente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={article ? 'Editar artigo' : 'Novo artigo'}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : article ? 'Salvar' : 'Criar artigo'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título" htmlFor="article-title" error={titleError ?? undefined}>
          <Input
            id="article-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sobre o que é o artigo?"
            maxLength={300}
          />
        </Field>
        <Field
          label="Conteúdo"
          htmlFor="article-content"
          error={contentError ?? undefined}
          hint="Aceita markdown. A IA usa este texto para montar as respostas."
        >
          <Textarea
            id="article-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva o conteúdo em markdown…"
            className="min-h-48 font-mono text-sm"
          />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <label htmlFor="article-published" className="text-sm font-medium">
              Publicado
            </label>
            <p className="text-xs text-muted-foreground">
              Artigos publicados entram no prompt da IA. Rascunhos ficam só aqui.
            </p>
          </div>
          <Switch
            id="article-published"
            checked={published}
            onCheckedChange={setPublished}
            disabled={saving}
          />
        </div>
      </div>
    </Dialog>
  )
}
