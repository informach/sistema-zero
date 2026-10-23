'use client'

import type { KnowledgeAudience, KnowledgeProduct } from '@sistemazero/helpdesk-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Textarea } from '@sistemazero/ui/textarea'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { KbArticleView } from '@/lib/types'
import { KnowledgeFields } from './knowledge-fields'

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
  const [audience, setAudience] = useState<KnowledgeAudience>('staff_only')
  const [product, setProduct] = useState<KnowledgeProduct>('all')
  const [ownerName, setOwnerName] = useState('')
  const [origin, setOrigin] = useState('manual')
  const [validUntil, setValidUntil] = useState('')
  const [version, setVersion] = useState(0)
  const [conflict, setConflict] = useState(false)
  const [current, setCurrent] = useState<KbArticleView | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reidrata os campos a cada abertura (criação limpa; edição carrega o artigo).
  useEffect(() => {
    if (!open) return
    setTitle(article?.title ?? '')
    setContent(article?.content ?? '')
    setAudience(article?.audience ?? 'staff_only')
    setProduct(article?.product ?? 'all')
    setOwnerName(article?.ownerName ?? '')
    setOrigin(article?.origin ?? 'manual')
    setValidUntil(article?.validUntil?.slice(0, 10) ?? '')
    setVersion(article?.version ?? 0)
    setConflict(false)
    setCurrent(null)
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
            audience,
            product,
            ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
            origin,
            validUntil: validUntil ? new Date(`${validUntil}T23:59:59.999Z`).toISOString() : null,
            version,
          })
        : await apiSend<KbArticleView>('/api/helpdesk/kb', 'POST', {
            title: trimmedTitle,
            content: trimmedContent,
            audience,
            product,
            ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
            origin,
            validUntil: validUntil ? new Date(`${validUntil}T23:59:59.999Z`).toISOString() : null,
          })
      toast.success(article ? 'Artigo atualizado.' : 'Artigo criado.')
      onSaved(saved, !article)
      onClose()
    } catch (error) {
      const apiError = error as ApiError
      if (apiError.status === 409) {
        // Concorrência otimista: alguém salvou por cima — recarrega e reabre.
        toast.error(
          'Outra pessoa salvou uma revisão. Seu texto foi preservado; confira a versão atual antes de salvar.',
        )
        setConflict(true)
        onStale()
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
          <Button onClick={submit} disabled={saving || conflict}>
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
        <KnowledgeFields
          audience={audience}
          product={product}
          onAudience={setAudience}
          onProduct={setProduct}
        />
        <Field label="Responsável editorial" htmlFor="article-owner">
          <Input
            id="article-owner"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Origem do conteúdo" htmlFor="article-origin">
          <Input
            id="article-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            maxLength={500}
          />
        </Field>
        <Field label="Válido até (obrigatório para publicar)" htmlFor="article-validity">
          <Input
            id="article-validity"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Salvar cria um rascunho. Um administrador publica a revisão depois da indexação e da
          revisão editorial.
        </p>
        {conflict && article ? (
          <div role="alert" className="space-y-2 text-sm">
            <p>
              Seu texto continua aqui. Abra a versão atual para comparar antes de tentar salvar
              novamente.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setCurrent(await apiGet<KbArticleView>(`/api/helpdesk/kb/${article.id}`))
                } catch {
                  toast.error(
                    'Não foi possível consultar a revisão atual. Seu texto foi preservado.',
                  )
                }
              }}
            >
              Consultar versão atual
            </Button>
            {current ? (
              <>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap">
                  {current.title}
                  {'\n'}
                  {current.content}
                </pre>
                <Button
                  variant="outline"
                  onClick={() => {
                    setVersion(current.version)
                    setConflict(false)
                  }}
                >
                  Conferi: salvar meu texto como nova revisão
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
