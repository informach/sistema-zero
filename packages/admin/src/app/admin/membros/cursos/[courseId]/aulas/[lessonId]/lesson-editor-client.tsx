'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { ArrowLeft, GripVertical, Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { useSortableItem } from '@/components/dnd/use-sortable-item'
import { HtmlCodeEditor } from '@/components/editor/html-code-editor'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { AudioUploader } from '@/components/media/audio-uploader'
import { FileUploader, type UploadedFile } from '@/components/media/file-uploader'
import { ImageUploader } from '@/components/media/image-uploader'
import { VideoThumbnailUploader } from '@/components/media/video-thumbnail-uploader'
import { VideoUploader } from '@/components/media/video-uploader'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import {
  type AttachmentView,
  type BlockView,
  LESSON_BLOCK_KINDS,
  type LessonBlockContent,
  type LessonBlockKind,
  type LessonContentView,
} from '@/lib/types'
import { QuizBuilder, type QuizValue, validateQuiz } from './quiz-builder'

const KIND_LABELS: Record<string, string> = {
  rich_text: 'Texto',
  video: 'Vídeo',
  image: 'Imagem',
  audio: 'Áudio',
  quiz: 'Quiz',
  embed: 'Interativo',
  ebook: 'E-book (livro 3D)',
}

interface BlockForm {
  kind: LessonBlockKind
  markdown: string
  html: string
  /** Embed URL do vídeo (preenchida pelo uploader Vimeo — sem campo manual). */
  src: string
  /** URL da imagem/áudio (preenchida pelos uploaders — sem campo manual). */
  url: string
  /**
   * Provider do vídeo — SEM UI (autoria v3 = Vimeo). Preservado na edição p/
   * não corromper blocos legados (youtube/file) ao salvar sem trocar o vídeo.
   */
  provider: string
  /** Duração (s) AUTO-detectada (Vimeo no vídeo; loadedmetadata no áudio). */
  durationSeconds: string
  alt: string
  caption: string
  quiz: QuizValue
  /** Legendas/transcrição do vídeo (preenchidas pelo uploader Vimeo). */
  captions: { lang: string; url: string }[]
  /** E-book: referência `r2priv:<key>` do PDF + título opcional. */
  pdfUrl: string
  title: string
}

const EMPTY_BLOCK: BlockForm = {
  kind: 'rich_text',
  markdown: '',
  html: '',
  src: '',
  url: '',
  provider: 'vimeo',
  durationSeconds: '',
  alt: '',
  caption: '',
  quiz: { questions: [], passingScore: 70 },
  captions: [],
  pdfUrl: '',
  title: '',
}

const num = (s: string): number | undefined => (s.trim() ? Number(s) : undefined)
const opt = (s: string): string | undefined => (s.trim() ? s.trim() : undefined)

/** Monta o conteúdo do bloco a partir do form. */
function buildContent(f: BlockForm): LessonBlockContent {
  const dur = num(f.durationSeconds)
  switch (f.kind) {
    case 'rich_text':
      return {
        kind: 'rich_text',
        ...(opt(f.markdown) ? { markdown: f.markdown } : {}),
        ...(opt(f.html) ? { html: f.html } : {}),
      }
    case 'video':
      return {
        kind: 'video',
        provider: f.provider as 'mux' | 'youtube' | 'vimeo' | 'file',
        src: f.src.trim(),
        ...(dur != null ? { durationSeconds: dur } : {}),
        ...(f.captions.length > 0 ? { captions: f.captions } : {}),
      }
    case 'image':
      return {
        kind: 'image',
        url: f.url.trim(),
        ...(opt(f.alt) ? { alt: f.alt } : {}),
        ...(opt(f.caption) ? { caption: f.caption } : {}),
      }
    case 'audio':
      return { kind: 'audio', url: f.url.trim(), ...(dur != null ? { durationSeconds: dur } : {}) }
    case 'embed':
      // Autoria v3: interativo = só HTML (sempre iframe sandbox 16:9 no aluno).
      return { kind: 'embed', html: f.html }
    case 'ebook':
      return {
        kind: 'ebook',
        url: f.pdfUrl.trim(),
        ...(opt(f.title) ? { title: f.title.trim() } : {}),
      }
    default:
      return {
        kind: 'quiz',
        questions: f.quiz.questions,
        ...(f.quiz.passingScore != null ? { passingScore: f.quiz.passingScore } : {}),
      }
  }
}

/** Campo obrigatório faltando → mensagem amigável (null = válido). */
function validateBlock(f: BlockForm): string | null {
  switch (f.kind) {
    case 'video':
      return f.src.trim() ? null : 'Envie o vídeo antes de salvar.'
    case 'image':
      return f.url.trim() ? null : 'Envie a imagem antes de salvar.'
    case 'audio':
      return f.url.trim() ? null : 'Envie o áudio antes de salvar.'
    case 'embed':
      return f.html.trim() ? null : 'Escreva o HTML do conteúdo interativo.'
    case 'ebook':
      return f.pdfUrl.trim() ? null : 'Envie o PDF do e-book antes de salvar.'
    default:
      return null
  }
}

/** Resumo de uma linha p/ a lista de blocos. */
function blockSummary(b: BlockView): string {
  const c = b.content
  switch (c.kind) {
    case 'rich_text':
      return (c.markdown ?? c.html ?? '').slice(0, 80) || '—'
    case 'video':
      return `${c.provider}: ${c.src}`
    case 'image':
      return c.url
    case 'audio':
      return c.url
    case 'embed':
      return c.html ? 'HTML interativo (iframe sandbox)' : (c.src ?? '—')
    case 'ebook':
      return c.title ?? c.url
    case 'quiz':
      return `${c.questions.length} pergunta(s)`
    default:
      return '—'
  }
}

export function LessonEditorClient({
  courseId,
  lessonId,
  currentRole,
}: {
  courseId: string
  lessonId: string
  currentRole: string
}) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'

  const [lesson, setLesson] = useState<LessonContentView | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [blockOpen, setBlockOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<BlockView | null>(null)
  const [blockForm, setBlockForm] = useState<BlockForm>(EMPTY_BLOCK)

  const [attOpen, setAttOpen] = useState(false)
  const [editingAtt, setEditingAtt] = useState<AttachmentView | null>(null)
  const [attForm, setAttForm] = useState({ label: '', url: '', fileType: '', sizeBytes: '' })

  // Arrastar só após 5px (deixa o clique nos botões do card livre).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setLesson(await apiGet<LessonContentView>(`/api/members/lessons/${lessonId}/content`))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar a aula.')
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    load()
  }, [load])

  async function run(fn: () => Promise<unknown>, okMsg?: string) {
    setBusy(true)
    try {
      await fn()
      if (okMsg) toast.success(okMsg)
      await load()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Operação falhou.')
    } finally {
      setBusy(false)
    }
  }

  // ── Blocos ──
  function openCreateBlock() {
    setEditingBlock(null)
    setBlockForm(EMPTY_BLOCK)
    setBlockOpen(true)
  }
  function openEditBlock(b: BlockView) {
    setEditingBlock(b)
    const c = b.content
    setBlockForm({
      ...EMPTY_BLOCK,
      kind: c.kind,
      markdown: c.kind === 'rich_text' ? (c.markdown ?? '') : '',
      html: c.kind === 'rich_text' ? (c.html ?? '') : c.kind === 'embed' ? (c.html ?? '') : '',
      src: c.kind === 'video' ? c.src : '',
      url: c.kind === 'image' || c.kind === 'audio' ? c.url : '',
      // Preserva o provider legado (youtube/file) — salvar sem trocar o vídeo não corrompe.
      provider: c.kind === 'video' ? c.provider : 'vimeo',
      durationSeconds:
        (c.kind === 'video' || c.kind === 'audio') && c.durationSeconds != null
          ? String(c.durationSeconds)
          : '',
      alt: c.kind === 'image' ? (c.alt ?? '') : '',
      caption: c.kind === 'image' ? (c.caption ?? '') : '',
      quiz:
        c.kind === 'quiz'
          ? { questions: c.questions, passingScore: c.passingScore }
          : EMPTY_BLOCK.quiz,
      captions: c.kind === 'video' ? (c.captions ?? []) : [],
      pdfUrl: c.kind === 'ebook' ? c.url : '',
      title: c.kind === 'ebook' ? (c.title ?? '') : '',
    })
    setBlockOpen(true)
  }
  async function saveBlock() {
    if (blockForm.kind === 'quiz') {
      const error = validateQuiz(blockForm.quiz)
      if (error) {
        toast.error(error)
        return
      }
    }
    const missing = validateBlock(blockForm)
    if (missing) {
      toast.error(missing)
      return
    }
    const content = buildContent(blockForm)
    await run(async () => {
      if (editingBlock)
        await apiSend(`/api/members/blocks/${editingBlock.id}`, 'PATCH', { content })
      else await apiSend(`/api/members/lessons/${lessonId}/blocks`, 'POST', { content })
      setBlockOpen(false)
    }, 'Bloco salvo.')
  }
  function deleteBlock(b: BlockView) {
    if (!window.confirm('Excluir este bloco?')) return
    void run(() => apiSend(`/api/members/blocks/${b.id}`, 'DELETE'), 'Bloco excluído.')
  }

  // ── Reordenação (drag-and-drop, otimista; falhou → toast + reload) ─────────
  async function persistOrder(url: string, orderedIds: string[]) {
    try {
      await apiSend(url, 'POST', { orderedIds })
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao reordenar.')
      await load()
    }
  }

  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!lesson || !over || active.id === over.id) return
    const oldIdx = lesson.blocks.findIndex((b) => b.id === active.id)
    const newIdx = lesson.blocks.findIndex((b) => b.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const blocks = arrayMove(lesson.blocks, oldIdx, newIdx)
    setLesson({ ...lesson, blocks })
    void persistOrder(
      `/api/members/lessons/${lessonId}/blocks/reorder`,
      blocks.map((b) => b.id),
    )
  }

  function handleAttachmentDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!lesson || !over || active.id === over.id) return
    const oldIdx = lesson.attachments.findIndex((a) => a.id === active.id)
    const newIdx = lesson.attachments.findIndex((a) => a.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const attachments = arrayMove(lesson.attachments, oldIdx, newIdx)
    setLesson({ ...lesson, attachments })
    void persistOrder(
      `/api/members/lessons/${lessonId}/attachments/reorder`,
      attachments.map((a) => a.id),
    )
  }

  // ── Anexos ──
  function openCreateAtt() {
    setEditingAtt(null)
    setAttForm({ label: '', url: '', fileType: '', sizeBytes: '' })
    setAttOpen(true)
  }
  function openEditAtt(a: AttachmentView) {
    setEditingAtt(a)
    setAttForm({
      label: a.label,
      url: a.url,
      fileType: a.fileType ?? '',
      sizeBytes: a.sizeBytes == null ? '' : String(a.sizeBytes),
    })
    setAttOpen(true)
  }
  async function saveAtt() {
    if (!attForm.label.trim() || !attForm.url.trim()) {
      toast.error('Informe rótulo e URL.')
      return
    }
    const payload = {
      label: attForm.label.trim(),
      url: attForm.url.trim(),
      fileType: attForm.fileType.trim() || null,
      sizeBytes: attForm.sizeBytes.trim() ? Number(attForm.sizeBytes) : null,
    }
    await run(async () => {
      if (editingAtt) await apiSend(`/api/members/attachments/${editingAtt.id}`, 'PATCH', payload)
      else await apiSend(`/api/members/lessons/${lessonId}/attachments`, 'POST', payload)
      setAttOpen(false)
    }, 'Anexo salvo.')
  }
  function deleteAtt(a: AttachmentView) {
    if (!window.confirm(`Excluir o anexo "${a.label}"?`)) return
    void run(() => apiSend(`/api/members/attachments/${a.id}`, 'DELETE'), 'Anexo excluído.')
  }

  /** E-book: além do bloco (livro 3D), o PDF entra nos materiais da aula p/ download. */
  async function addEbookAttachment(file: UploadedFile) {
    if (lesson?.attachments.some((a) => a.url === file.url)) return
    try {
      await apiSend(`/api/members/lessons/${lessonId}/attachments`, 'POST', {
        label: file.filename.replace(/\.pdf$/i, ''),
        url: file.url,
        fileType: file.fileType || 'pdf',
        sizeBytes: file.sizeBytes ?? null,
      })
      await load()
      toast.success('E-book adicionado aos materiais da aula.')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao adicionar o e-book aos materiais.')
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/membros/cursos/${courseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Conteúdo do curso
      </Link>

      <AdminHeader
        title={lesson?.title ?? 'Aula'}
        description={lesson ? lesson.slug : lessonId}
        action={
          canWrite ? (
            <Button onClick={openCreateBlock}>
              <Plus className="size-4" /> Adicionar bloco
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <Card className="py-10 text-center text-muted-foreground">
          <Spinner className="mx-auto" />
        </Card>
      ) : !lesson ? (
        <Card className="py-10 text-center text-muted-foreground">Aula não encontrada.</Card>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Blocos</h3>
            {lesson.blocks.length === 0 ? (
              <Card className="py-8 text-center text-sm text-muted-foreground">
                Nenhum bloco. Adicione texto, vídeo, imagem, quiz ou conteúdo interativo.
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleBlockDragEnd}
              >
                <SortableContext
                  items={lesson.blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {lesson.blocks.map((b) => (
                    <SortableBlockItem
                      key={b.id}
                      block={b}
                      canWrite={canWrite}
                      onEdit={() => openEditBlock(b)}
                      onDelete={() => deleteBlock(b)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Anexos</h3>
              {canWrite ? (
                <Button variant="outline" size="sm" onClick={openCreateAtt}>
                  <Plus className="size-4" /> Adicionar anexo
                </Button>
              ) : null}
            </div>
            {lesson.attachments.length === 0 ? (
              <Card className="py-6 text-center text-sm text-muted-foreground">Nenhum anexo.</Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleAttachmentDragEnd}
              >
                <SortableContext
                  items={lesson.attachments.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {lesson.attachments.map((a) => (
                    <SortableAttachmentItem
                      key={a.id}
                      attachment={a}
                      canWrite={canWrite}
                      onEdit={() => openEditAtt(a)}
                      onDelete={() => deleteAtt(a)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </>
      )}

      <Dialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title={editingBlock ? 'Editar bloco' : 'Adicionar bloco'}
        footer={
          <>
            <Button variant="outline" onClick={() => setBlockOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={saveBlock} disabled={busy}>
              {busy ? <Spinner /> : null}
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Tipo" htmlFor="bkind">
            <Select
              id="bkind"
              value={blockForm.kind}
              disabled={!!editingBlock}
              onChange={(e) =>
                setBlockForm((f) => ({ ...f, kind: e.target.value as LessonBlockKind }))
              }
            >
              {LESSON_BLOCK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k] ?? k}
                </option>
              ))}
            </Select>
          </Field>

          {blockForm.kind === 'rich_text' ? (
            <Field label="Conteúdo" hint="Salvo como markdown — renderiza igual na área do aluno.">
              <RichTextEditor
                content={blockForm.markdown}
                onChange={(markdown) => setBlockForm((f) => ({ ...f, markdown }))}
              />
            </Field>
          ) : null}

          {blockForm.kind === 'video' ? (
            <>
              <Field
                label="Vídeo (Vimeo)"
                hint="Sobe direto pro Vimeo (resumável); duração e transcrição entram sozinhas."
              >
                <VideoUploader
                  currentSrc={blockForm.src || undefined}
                  onReady={(v) =>
                    setBlockForm((f) => ({
                      ...f,
                      provider: 'vimeo',
                      src: v.embedUrl,
                      durationSeconds:
                        v.durationSeconds != null ? String(v.durationSeconds) : f.durationSeconds,
                      captions: v.captions.length > 0 ? v.captions : f.captions,
                    }))
                  }
                />
              </Field>
              {/vimeo\.com\/(?:video\/)?\d{6,12}/.test(blockForm.src) ? (
                <Field
                  label="Capa do vídeo"
                  hint="Envia direto pro Vimeo (o player usa essa capa)."
                >
                  <VideoThumbnailUploader
                    videoId={
                      blockForm.src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] as string
                    }
                  />
                </Field>
              ) : null}
              {blockForm.durationSeconds || blockForm.captions.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {blockForm.durationSeconds
                    ? `Duração: ${blockForm.durationSeconds}s (automática do Vimeo)`
                    : null}
                  {blockForm.durationSeconds && blockForm.captions.length > 0 ? ' · ' : null}
                  {blockForm.captions.length > 0
                    ? `Transcrição: ${blockForm.captions.map((c) => c.lang).join(', ')}`
                    : null}
                </p>
              ) : null}
            </>
          ) : null}

          {blockForm.kind === 'image' ? (
            <>
              <Field label="Imagem" hint="Otimizada (WebP) e hospedada no R2 automaticamente.">
                <ImageUploader
                  scope="block"
                  allowManualUrl={false}
                  value={blockForm.url}
                  onChange={(url) => setBlockForm((f) => ({ ...f, url }))}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Texto alternativo" htmlFor="balt" hint="Opcional.">
                  <Input
                    id="balt"
                    value={blockForm.alt}
                    onChange={(e) => setBlockForm((f) => ({ ...f, alt: e.target.value }))}
                  />
                </Field>
                <Field label="Legenda" htmlFor="bcap" hint="Opcional.">
                  <Input
                    id="bcap"
                    value={blockForm.caption}
                    onChange={(e) => setBlockForm((f) => ({ ...f, caption: e.target.value }))}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {blockForm.kind === 'audio' ? (
            <>
              <Field label="Áudio" hint="Hospedado no R2; a duração é detectada do arquivo.">
                <AudioUploader
                  value={blockForm.url || undefined}
                  onUploaded={({ url, durationSeconds }) =>
                    setBlockForm((f) => ({
                      ...f,
                      url,
                      durationSeconds:
                        durationSeconds != null ? String(durationSeconds) : f.durationSeconds,
                    }))
                  }
                />
              </Field>
              {blockForm.durationSeconds ? (
                <p className="text-xs text-muted-foreground">
                  Duração: {blockForm.durationSeconds}s (automática do arquivo)
                </p>
              ) : null}
            </>
          ) : null}

          {blockForm.kind === 'embed' ? (
            <Field
              label="HTML"
              hint="Roda em iframe sandbox na área do aluno — largura total, proporção 16:9."
            >
              <HtmlCodeEditor
                value={blockForm.html}
                onChange={(html) => setBlockForm((f) => ({ ...f, html }))}
              />
            </Field>
          ) : null}

          {blockForm.kind === 'ebook' ? (
            <>
              <Field
                label="E-book (PDF)"
                hint="Bucket privado; o aluno vê como livro 3D interativo com marca d'água. O PDF também entra automaticamente nos materiais da aula para download."
              >
                <FileUploader
                  accept="application/pdf,.pdf"
                  label="Clique para enviar o PDF do e-book (até 100 MB)"
                  onUploaded={(file) => {
                    setBlockForm((f) => ({
                      ...f,
                      pdfUrl: file.url,
                      title: f.title.trim() ? f.title : file.filename.replace(/\.pdf$/i, ''),
                    }))
                    void addEbookAttachment(file)
                  }}
                />
              </Field>
              {blockForm.pdfUrl ? (
                <p className="truncate text-xs text-muted-foreground">
                  PDF enviado: {blockForm.pdfUrl}
                </p>
              ) : null}
              <Field label="Título" htmlFor="btitle" hint="Opcional — aparece junto ao livro.">
                <Input
                  id="btitle"
                  value={blockForm.title}
                  onChange={(e) => setBlockForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
            </>
          ) : null}

          {blockForm.kind === 'quiz' ? (
            <QuizBuilder
              value={blockForm.quiz}
              onChange={(quiz) => setBlockForm((f) => ({ ...f, quiz }))}
            />
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={attOpen}
        onClose={() => setAttOpen(false)}
        title={editingAtt ? 'Editar anexo' : 'Adicionar anexo'}
        footer={
          <>
            <Button variant="outline" onClick={() => setAttOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={saveAtt} disabled={busy}>
              {busy ? <Spinner /> : null}
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Arquivo"
            hint="Envie o arquivo (preenche URL/tipo/tamanho) ou informe a URL."
          >
            <FileUploader
              onUploaded={({ url, fileType, sizeBytes, filename }) =>
                setAttForm((f) => ({
                  ...f,
                  url,
                  fileType,
                  sizeBytes: String(sizeBytes),
                  label: f.label.trim() ? f.label : filename,
                }))
              }
            />
          </Field>
          <Field label="Rótulo" htmlFor="alabel">
            <Input
              id="alabel"
              value={attForm.label}
              onChange={(e) => setAttForm((f) => ({ ...f, label: e.target.value }))}
            />
          </Field>
          <Field label="URL" htmlFor="aurl">
            <Input
              id="aurl"
              value={attForm.url}
              onChange={(e) => setAttForm((f) => ({ ...f, url: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo do arquivo" htmlFor="aft" hint="Opcional (ex.: application/pdf).">
              <Input
                id="aft"
                value={attForm.fileType}
                onChange={(e) => setAttForm((f) => ({ ...f, fileType: e.target.value }))}
              />
            </Field>
            <Field label="Tamanho (bytes)" htmlFor="asz" hint="Opcional.">
              <Input
                id="asz"
                type="number"
                min={0}
                value={attForm.sizeBytes}
                onChange={(e) => setAttForm((f) => ({ ...f, sizeBytes: e.target.value }))}
              />
            </Field>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

// ── Bloco arrastável (card com handle, tipo e resumo) ────────────────────────
function SortableBlockItem({
  block,
  canWrite,
  onEdit,
  onDelete,
}: {
  block: BlockView
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, style } = useSortableItem(block.id)

  return (
    <Card ref={setNodeRef} style={style} className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {canWrite ? (
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Arrastar bloco"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <Badge variant="outline">{KIND_LABELS[block.kind] ?? block.kind}</Badge>
        <span className="truncate text-sm text-muted-foreground">{blockSummary(block)}</span>
      </div>
      {canWrite ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

// ── Anexo arrastável (card com handle, rótulo e URL) ─────────────────────────
function SortableAttachmentItem({
  attachment,
  canWrite,
  onEdit,
  onDelete,
}: {
  attachment: AttachmentView
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, style } = useSortableItem(attachment.id)

  return (
    <Card ref={setNodeRef} style={style} className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {canWrite ? (
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Arrastar anexo"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{attachment.label}</div>
          <div className="truncate text-xs text-muted-foreground">{attachment.url}</div>
        </div>
      </div>
      {canWrite ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
