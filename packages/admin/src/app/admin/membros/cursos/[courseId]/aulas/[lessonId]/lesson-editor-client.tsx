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
import type {
  BlockLevel,
  IDEMode,
  LessonActivity,
  Project,
  StudioHandle,
} from '@sistemazero/studio'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowLeft, GripVertical, Pencil, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { StudioEmbed } from '@/components/studio/studio-embed'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import {
  type AttachmentView,
  type BlockView,
  LESSON_BLOCK_KINDS,
  type LessonBlockContent,
  type LessonBlockKind,
  type LessonContentView,
} from '@/lib/types'
import { ActivityBuilder, EMPTY_ACTIVITY, validateStudioActivity } from './activity-builder'
import { QuizBuilder, type QuizValue, validateQuiz } from './quiz-builder'
import { StudioSubmissionsDialog } from './studio-submissions-dialog'

const KIND_LABELS: Record<string, string> = {
  rich_text: 'Texto',
  video: 'Vídeo',
  image: 'Imagem',
  audio: 'Áudio',
  quiz: 'Quiz',
  embed: 'Interativo',
  ebook: 'E-book (livro 3D)',
  studio: 'Estúdio',
}

const STUDIO_LEVELS: { value: BlockLevel; label: string }[] = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
]
// Categorias da paleta do Estúdio (espelha CORE_CATEGORY_LEVELS da lib).
const STUDIO_CATEGORIES = [
  'HTML',
  'CSS',
  'DOM',
  'JavaScript',
  'Matemática',
  'Canvas',
  'Valores',
  'Objetos',
  'Funções',
  'Classes',
  'Avançado',
]
const STUDIO_MODES: { value: IDEMode; label: string }[] = [
  { value: 'blocks', label: 'Blocos' },
  { value: 'bridge', label: 'Ponte' },
  { value: 'code', label: 'Código' },
]

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
  /** Estúdio: nível fixado (paleta por dificuldade). */
  studioLevel: BlockLevel
  /** Estúdio: categorias de blocos sempre visíveis. */
  studioCategories: string[]
  /** Estúdio: modos liberados ao aluno (vazio = todos os do tipo de projeto). */
  studioModes: IDEMode[]
  /** Estúdio: aluno pode revelar blocos avançados. */
  studioAllowReveal: boolean
  /**
   * Estúdio: allowlist de blocos por id. Sem UI hoje, mas carregada/reemitida p/
   * não ser APAGADA ao editar+salvar um bloco que a tenha (seed/import; achado do review).
   */
  studioAllowBlocks: string[]
  /** Estúdio: atividade com auto-correção (fase 2). Vazia = bloco só de entrega. */
  studioActivity: LessonActivity
  /** Estúdio: nome do projeto contínuo (cadeia). Vazio = aula independente. */
  studioChain: string
  /** Estúdio: vitrine (Mural) — auto-publicar o projeto ao concluir esta aula. */
  studioShowcaseEnabled: boolean
  studioShowcaseTitle: string
  studioShowcaseSummary: string
  studioShowcaseCover: string
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
  studioLevel: 'iniciante',
  studioCategories: [],
  studioModes: ['blocks', 'bridge', 'code'],
  studioAllowReveal: true,
  studioAllowBlocks: [],
  studioActivity: EMPTY_ACTIVITY,
  studioChain: '',
  studioShowcaseEnabled: false,
  studioShowcaseTitle: '',
  studioShowcaseSummary: '',
  studioShowcaseCover: '',
}

const num = (s: string): number | undefined => (s.trim() ? Number(s) : undefined)
const opt = (s: string): string | undefined => (s.trim() ? s.trim() : undefined)

/** Monta o conteúdo do bloco a partir do form. `studioProject` = snapshot do editor embutido. */
function buildContent(f: BlockForm, studioProject?: Project): LessonBlockContent {
  const dur = num(f.durationSeconds)
  switch (f.kind) {
    case 'studio': {
      // `studioProject` é garantido não-nulo no saveBlock (validação antes de chamar).
      // Atividade só entra se tiver checagens OU enunciado (atividade vazia = omitida).
      const hasActivity =
        f.studioActivity.checks.length > 0 || f.studioActivity.instructions.trim() !== ''
      return {
        kind: 'studio',
        initialProject: studioProject as Project,
        level: f.studioLevel,
        ...(f.studioCategories.length > 0 ? { allowCategories: f.studioCategories } : {}),
        ...(f.studioAllowBlocks.length > 0 ? { allowBlocks: f.studioAllowBlocks } : {}),
        ...(f.studioModes.length > 0 && f.studioModes.length < STUDIO_MODES.length
          ? { allowedModes: f.studioModes }
          : {}),
        allowLevelReveal: f.studioAllowReveal,
        ...(hasActivity ? { activity: f.studioActivity } : {}),
        ...(f.studioChain.trim() ? { chain: f.studioChain.trim() } : {}),
        ...(f.studioShowcaseEnabled
          ? {
              showcase: {
                enabled: true,
                ...(f.studioShowcaseTitle.trim() ? { title: f.studioShowcaseTitle.trim() } : {}),
                ...(f.studioShowcaseSummary.trim()
                  ? { summary: f.studioShowcaseSummary.trim() }
                  : {}),
                ...(f.studioShowcaseCover.trim()
                  ? { defaultCoverUrl: f.studioShowcaseCover.trim() }
                  : {}),
              },
            }
          : {}),
      }
    }
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
    case 'studio': {
      // O projeto inicial vem do editor embutido (validado no saveBlock). Aqui só
      // barramos "zero modos" — que, omitido no payload, viraria "todos liberados"
      // (o OPOSTO da intenção do autor; achado do review).
      if (f.studioModes.length === 0) return 'Selecione ao menos um modo do Estúdio.'
      // Atividade (auto-correção): coerência espelhando o members.
      return validateStudioActivity(f.studioActivity)
    }
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
    case 'studio':
      return (c.initialProject as { name?: string })?.name ?? 'Atividade do Estúdio'
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
  // Handle do Estúdio embutido na autoria — lido no saveBlock (snapshot do projeto inicial).
  const studioHandleRef = useRef<StudioHandle | null>(null)
  // Bloco cujas ENTREGAS o professor está acompanhando (dialog separado).
  const [submissionsBlockId, setSubmissionsBlockId] = useState<string | null>(null)

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
      studioLevel: c.kind === 'studio' ? (c.level ?? 'iniciante') : 'iniciante',
      studioCategories: c.kind === 'studio' ? (c.allowCategories ?? []) : [],
      studioModes:
        c.kind === 'studio'
          ? (c.allowedModes ?? ['blocks', 'bridge', 'code'])
          : ['blocks', 'bridge', 'code'],
      studioAllowReveal: c.kind === 'studio' ? (c.allowLevelReveal ?? true) : true,
      studioAllowBlocks: c.kind === 'studio' ? (c.allowBlocks ?? []) : [],
      studioActivity: c.kind === 'studio' ? (c.activity ?? EMPTY_ACTIVITY) : EMPTY_ACTIVITY,
      studioChain: c.kind === 'studio' ? (c.chain ?? '') : '',
      studioShowcaseEnabled: c.kind === 'studio' ? (c.showcase?.enabled ?? false) : false,
      studioShowcaseTitle: c.kind === 'studio' ? (c.showcase?.title ?? '') : '',
      studioShowcaseSummary: c.kind === 'studio' ? (c.showcase?.summary ?? '') : '',
      studioShowcaseCover: c.kind === 'studio' ? (c.showcase?.defaultCoverUrl ?? '') : '',
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
    // Estúdio: captura o snapshot do editor embutido (nome/tipo/código de partida).
    let studioProject: Project | undefined
    if (blockForm.kind === 'studio') {
      const p = studioHandleRef.current?.getProject()
      if (!p) {
        toast.error('Monte o projeto inicial no Estúdio antes de salvar.')
        return
      }
      studioProject = p
    }
    const missing = validateBlock(blockForm)
    if (missing) {
      toast.error(missing)
      return
    }
    const content = buildContent(blockForm, studioProject)
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
                      onSubmissions={
                        b.kind === 'studio' ? () => setSubmissionsBlockId(b.id) : undefined
                      }
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
                  label="Clique para enviar o PDF do e-book (até 200 MB)"
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

          {blockForm.kind === 'studio' ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Nível"
                  htmlFor="slevel"
                  hint="Cura a paleta de blocos por dificuldade."
                >
                  <Select
                    id="slevel"
                    value={blockForm.studioLevel}
                    onChange={(e) =>
                      setBlockForm((f) => ({ ...f, studioLevel: e.target.value as BlockLevel }))
                    }
                  >
                    {STUDIO_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Modos liberados"
                  hint="O aluno alterna entre eles (limitado ao tipo do projeto)."
                >
                  <div className="flex flex-wrap gap-3 pt-1.5">
                    {STUDIO_MODES.map((m) => (
                      <label key={m.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={blockForm.studioModes.includes(m.value)}
                          onChange={(e) =>
                            setBlockForm((f) => ({
                              ...f,
                              studioModes: e.target.checked
                                ? [...f.studioModes, m.value]
                                : f.studioModes.filter((x) => x !== m.value),
                            }))
                          }
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </Field>
              </div>
              <Field
                label="Bloquinhos sempre visíveis"
                hint="Categorias liberadas independente do nível (opcional)."
              >
                <div className="flex flex-wrap gap-3 pt-1.5">
                  {STUDIO_CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={blockForm.studioCategories.includes(cat)}
                        onChange={(e) =>
                          setBlockForm((f) => ({
                            ...f,
                            studioCategories: e.target.checked
                              ? [...f.studioCategories, cat]
                              : f.studioCategories.filter((x) => x !== cat),
                          }))
                        }
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={blockForm.studioAllowReveal}
                  onChange={(e) =>
                    setBlockForm((f) => ({ ...f, studioAllowReveal: e.target.checked }))
                  }
                />
                Aluno pode revelar blocos avançados
              </label>
              <Field
                label="Projeto contínuo (nome)"
                hint="Opcional. Dê o MESMO nome às aulas que constroem um único projeto (ex.: 'jogo-da-cobrinha'): o aluno abre cada aula com o código que enviou na anterior da cadeia. Vazio = aula independente."
              >
                <Input
                  value={blockForm.studioChain}
                  maxLength={80}
                  placeholder="ex.: jogo-da-cobrinha"
                  onChange={(e) => setBlockForm((f) => ({ ...f, studioChain: e.target.value }))}
                />
              </Field>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-xs text-muted-foreground">
                  Mural dos Criadores (vitrine)
                </legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={blockForm.studioShowcaseEnabled}
                    onChange={(e) =>
                      setBlockForm((f) => ({ ...f, studioShowcaseEnabled: e.target.checked }))
                    }
                  />
                  Publicar no Mural ao concluir esta aula
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ligue no bloco da ÚLTIMA aula do projeto: a criança ganha o botão "Publicar no
                  Mural" e o post é montado com o título/resumo abaixo + um print do projeto (jogos)
                  ou a capa padrão.
                </p>
                {blockForm.studioShowcaseEnabled ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <Field label="Título do post" htmlFor="bk-showcase-title">
                      <Input
                        id="bk-showcase-title"
                        value={blockForm.studioShowcaseTitle}
                        maxLength={300}
                        placeholder="Ex.: Meu jogo da cobrinha"
                        onChange={(e) =>
                          setBlockForm((f) => ({ ...f, studioShowcaseTitle: e.target.value }))
                        }
                      />
                    </Field>
                    <Field
                      label="Resumo do projeto"
                      hint="Aparece no card do Mural. A criança não escreve — você define aqui."
                    >
                      <Textarea
                        value={blockForm.studioShowcaseSummary}
                        maxLength={2000}
                        placeholder="Um breve resumo do que se trata o projeto."
                        onChange={(e) =>
                          setBlockForm((f) => ({ ...f, studioShowcaseSummary: e.target.value }))
                        }
                      />
                    </Field>
                    <Field
                      label="Capa padrão"
                      hint="Usada em projetos web (e como reserva quando o print do jogo falha)."
                    >
                      <ImageUploader
                        scope="block"
                        allowManualUrl={false}
                        value={blockForm.studioShowcaseCover}
                        onChange={(url) =>
                          setBlockForm((f) => ({ ...f, studioShowcaseCover: url }))
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </fieldset>
              <Field
                label="Projeto inicial"
                hint="Monte o tipo de projeto, o código de partida e o nome — é o que o aluno abre na aula."
              >
                <StudioEmbed
                  key={editingBlock?.id ?? 'new-studio'}
                  initialProject={
                    editingBlock && editingBlock.content.kind === 'studio'
                      ? (editingBlock.content.initialProject as Project)
                      : null
                  }
                  handleRef={studioHandleRef}
                  features={{ terminal: false, ai: false, professional: false, export: false }}
                />
              </Field>
              <Field
                label="Atividade (auto-correção)"
                hint="Opcional. Defina checagens que o editor corrige na hora; com nota de corte, viram gate da aula. Só 'estrutura' é reverificada no servidor."
              >
                <ActivityBuilder
                  value={blockForm.studioActivity}
                  onChange={(studioActivity) => setBlockForm((f) => ({ ...f, studioActivity }))}
                />
              </Field>
            </div>
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

      {submissionsBlockId ? (
        <StudioSubmissionsDialog
          blockId={submissionsBlockId}
          open
          onClose={() => setSubmissionsBlockId(null)}
        />
      ) : null}
    </div>
  )
}

// ── Bloco arrastável (card com handle, tipo e resumo) ────────────────────────
function SortableBlockItem({
  block,
  canWrite,
  onEdit,
  onDelete,
  onSubmissions,
}: {
  block: BlockView
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
  /** Presente só em blocos de estúdio — abre o acompanhamento de entregas. */
  onSubmissions?: () => void
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
      <div className="flex shrink-0 items-center gap-1">
        {onSubmissions ? (
          <Button variant="ghost" size="sm" onClick={onSubmissions}>
            <Users className="size-4" /> Entregas
          </Button>
        ) : null}
        {canWrite ? (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="size-4" /> Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              Excluir
            </Button>
          </>
        ) : null}
      </div>
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
