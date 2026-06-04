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
import { ArrowLeft, GripVertical, Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { useSortableItem } from '@/components/dnd/use-sortable-item'
import { FileUploader } from '@/components/media/file-uploader'
import { ImageUploader } from '@/components/media/image-uploader'
import { VideoThumbnailUploader } from '@/components/media/video-thumbnail-uploader'
import { VideoUploader } from '@/components/media/video-uploader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import {
  type AttachmentView,
  type BlockView,
  LESSON_BLOCK_KINDS,
  type LessonBlockContent,
  type LessonBlockKind,
  type LessonContentView,
} from '@/lib/types'

const KIND_LABELS: Record<string, string> = {
  rich_text: 'Texto',
  video: 'Vídeo',
  image: 'Imagem',
  audio: 'Áudio',
  quiz: 'Quiz',
  embed: 'Interativo',
}

interface BlockForm {
  kind: LessonBlockKind
  markdown: string
  html: string
  src: string
  url: string
  provider: string
  posterUrl: string
  durationSeconds: string
  alt: string
  caption: string
  embedType: string
  height: string
  quizJson: string
  /** Legendas/transcrição do vídeo (preenchidas pelo uploader Vimeo). */
  captions: { lang: string; url: string }[]
}

const EMPTY_BLOCK: BlockForm = {
  kind: 'rich_text',
  markdown: '',
  html: '',
  src: '',
  url: '',
  provider: 'youtube',
  posterUrl: '',
  durationSeconds: '',
  alt: '',
  caption: '',
  embedType: 'iframe',
  height: '',
  quizJson: '{\n  "questions": [],\n  "passingScore": 70\n}',
  captions: [],
}

const num = (s: string): number | undefined => (s.trim() ? Number(s) : undefined)
const opt = (s: string): string | undefined => (s.trim() ? s.trim() : undefined)

/** Monta o conteúdo do bloco a partir do form (ou lança em quiz JSON inválido). */
function buildContent(f: BlockForm): LessonBlockContent {
  const dur = num(f.durationSeconds)
  const height = num(f.height)
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
        ...(opt(f.posterUrl) ? { posterUrl: f.posterUrl.trim() } : {}),
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
      return {
        kind: 'embed',
        embedType: f.embedType as 'three_js' | 'iframe' | 'codepen' | 'custom',
        ...(opt(f.src) ? { src: f.src.trim() } : {}),
        ...(opt(f.html) ? { html: f.html } : {}),
        ...(height != null ? { height } : {}),
      }
    default: {
      // quiz — JSON.parse pode lançar (tratado em saveBlock).
      const parsed = JSON.parse(f.quizJson)
      const questions = Array.isArray(parsed?.questions) ? parsed.questions : []
      const passingScore =
        typeof parsed?.passingScore === 'number' ? parsed.passingScore : undefined
      return {
        kind: 'quiz',
        questions,
        ...(passingScore != null ? { passingScore } : {}),
      } as LessonBlockContent
    }
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
      return `${c.embedType}${c.src ? `: ${c.src}` : ''}`
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
      src: c.kind === 'video' || c.kind === 'embed' ? (c.src ?? '') : '',
      url: c.kind === 'image' || c.kind === 'audio' ? c.url : '',
      provider: c.kind === 'video' ? c.provider : 'youtube',
      posterUrl: c.kind === 'video' ? (c.posterUrl ?? '') : '',
      durationSeconds:
        (c.kind === 'video' || c.kind === 'audio') && c.durationSeconds != null
          ? String(c.durationSeconds)
          : '',
      alt: c.kind === 'image' ? (c.alt ?? '') : '',
      caption: c.kind === 'image' ? (c.caption ?? '') : '',
      embedType: c.kind === 'embed' ? c.embedType : 'iframe',
      height: c.kind === 'embed' && c.height != null ? String(c.height) : '',
      quizJson:
        c.kind === 'quiz'
          ? JSON.stringify({ questions: c.questions, passingScore: c.passingScore }, null, 2)
          : EMPTY_BLOCK.quizJson,
      captions: c.kind === 'video' ? (c.captions ?? []) : [],
    })
    setBlockOpen(true)
  }
  async function saveBlock() {
    let content: LessonBlockContent
    try {
      content = buildContent(blockForm)
    } catch {
      toast.error('JSON do quiz inválido.')
      return
    }
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
            <Field label="Markdown" htmlFor="bmd">
              <Textarea
                id="bmd"
                rows={6}
                value={blockForm.markdown}
                onChange={(e) => setBlockForm((f) => ({ ...f, markdown: e.target.value }))}
              />
            </Field>
          ) : null}

          {blockForm.kind === 'video' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Provedor" htmlFor="bprov">
                  <Select
                    id="bprov"
                    value={blockForm.provider}
                    onChange={(e) => setBlockForm((f) => ({ ...f, provider: e.target.value }))}
                  >
                    {['youtube', 'vimeo', 'mux', 'file'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Duração (s)" htmlFor="bdur" hint="Opcional.">
                  <Input
                    id="bdur"
                    type="number"
                    min={0}
                    value={blockForm.durationSeconds}
                    onChange={(e) =>
                      setBlockForm((f) => ({ ...f, durationSeconds: e.target.value }))
                    }
                  />
                </Field>
              </div>
              {blockForm.provider === 'vimeo' ? (
                <Field
                  label="Vídeo (Vimeo)"
                  hint="Sobe direto pro Vimeo (resumável) e preenche URL/duração/transcrição."
                >
                  <VideoUploader
                    currentSrc={blockForm.src || undefined}
                    onReady={(v) =>
                      setBlockForm((f) => ({
                        ...f,
                        src: v.embedUrl,
                        durationSeconds:
                          v.durationSeconds != null ? String(v.durationSeconds) : f.durationSeconds,
                        captions: v.captions.length > 0 ? v.captions : f.captions,
                      }))
                    }
                  />
                </Field>
              ) : null}
              <Field label="URL/ID do vídeo" htmlFor="bsrc">
                <Input
                  id="bsrc"
                  value={blockForm.src}
                  onChange={(e) => setBlockForm((f) => ({ ...f, src: e.target.value }))}
                />
              </Field>
              {blockForm.provider === 'vimeo' &&
              /vimeo\.com\/(?:video\/)?\d{6,12}/.test(blockForm.src) ? (
                <Field label="Capa do vídeo" hint="Troca a capa no Vimeo e preenche o poster.">
                  <VideoThumbnailUploader
                    videoId={
                      blockForm.src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] as string
                    }
                    onPoster={(posterUrl) => setBlockForm((f) => ({ ...f, posterUrl }))}
                  />
                </Field>
              ) : null}
              <Field label="Poster (URL)" htmlFor="bposter" hint="Opcional.">
                <Input
                  id="bposter"
                  value={blockForm.posterUrl}
                  onChange={(e) => setBlockForm((f) => ({ ...f, posterUrl: e.target.value }))}
                />
              </Field>
              {blockForm.captions.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Transcrição: {blockForm.captions.map((c) => c.lang).join(', ')} (legenda salva no
                  bloco)
                </p>
              ) : null}
            </>
          ) : null}

          {blockForm.kind === 'image' ? (
            <>
              <Field label="Imagem" htmlFor="bimg" hint="Envie um arquivo ou cole uma URL.">
                <ImageUploader
                  inputId="bimg"
                  scope="block"
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
              <Field label="Áudio" hint="Envie um arquivo (MP3/M4A/OGG/WAV) ou cole a URL abaixo.">
                <FileUploader
                  accept="audio/*"
                  label="Clique para enviar o áudio (até 50 MB)"
                  onUploaded={({ url, sizeBytes: _sz }) => setBlockForm((f) => ({ ...f, url }))}
                />
              </Field>
              <Field label="URL do áudio" htmlFor="baud">
                <Input
                  id="baud"
                  value={blockForm.url}
                  onChange={(e) => setBlockForm((f) => ({ ...f, url: e.target.value }))}
                />
              </Field>
              <Field label="Duração (s)" htmlFor="badur" hint="Opcional.">
                <Input
                  id="badur"
                  type="number"
                  min={0}
                  value={blockForm.durationSeconds}
                  onChange={(e) => setBlockForm((f) => ({ ...f, durationSeconds: e.target.value }))}
                />
              </Field>
            </>
          ) : null}

          {blockForm.kind === 'embed' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipo" htmlFor="betype">
                  <Select
                    id="betype"
                    value={blockForm.embedType}
                    onChange={(e) => setBlockForm((f) => ({ ...f, embedType: e.target.value }))}
                  >
                    {['iframe', 'three_js', 'codepen', 'custom'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Altura (px)" htmlFor="bh" hint="Opcional.">
                  <Input
                    id="bh"
                    type="number"
                    min={0}
                    value={blockForm.height}
                    onChange={(e) => setBlockForm((f) => ({ ...f, height: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="URL (src)" htmlFor="besrc" hint="Para iframe/codepen.">
                <Input
                  id="besrc"
                  value={blockForm.src}
                  onChange={(e) => setBlockForm((f) => ({ ...f, src: e.target.value }))}
                />
              </Field>
              <Field label="HTML" htmlFor="behtml" hint="Para conteúdo custom/three.js.">
                <Textarea
                  id="behtml"
                  rows={4}
                  value={blockForm.html}
                  onChange={(e) => setBlockForm((f) => ({ ...f, html: e.target.value }))}
                />
              </Field>
            </>
          ) : null}

          {blockForm.kind === 'quiz' ? (
            <Field label="Quiz (JSON)" htmlFor="bquiz" hint="{ questions: [...], passingScore? }">
              <Textarea
                id="bquiz"
                rows={10}
                className="font-mono text-xs"
                value={blockForm.quizJson}
                onChange={(e) => setBlockForm((f) => ({ ...f, quizJson: e.target.value }))}
              />
            </Field>
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
