'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  isGalleryBlock,
  LESSON_SECTION_TEMPLATES,
  type LessonDraftChange,
  type LessonDraftDocument,
  type LessonDraftIssue,
  type LessonSection,
  SECTION_INTENT_LABELS,
  SECTION_INTENTS,
  sectionCompletionIssues,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Copy,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
} from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/admin/use-confirm'
import { useSortableItem } from '@/components/dnd/use-sortable-item'
import {
  canShareSectionProject,
  copyLessonContent,
  duplicateLessonSection,
  lessonContentLabel,
  newAuthoringSection,
  type ProjectCopyMode,
  type SectionStarterOptions,
  sectionCompletionCandidates,
  sectionCompletionSummary,
  suggestedCompletion,
} from '@/lib/lesson-authoring'
import type { BlockView, LessonBlockContent, LessonContentView } from '@/lib/types'
import { LessonBlockKindBadge } from './lesson-block-kind'
import { SectionCompletionEditor } from './section-completion-editor'

export interface SectionAuthoringProps {
  lesson: LessonContentView
  document: LessonDraftDocument<LessonBlockContent>
  canWrite: boolean
  onChange: (change: LessonDraftChange<LessonBlockContent>, immediate?: boolean) => void
  onAddBlock: (sectionId: string | null) => void
  onEditBlock: (block: BlockView) => void
  onRemoveBlock: (block: BlockView) => void
  onCreateStructure: (intent: string, options?: SectionStarterOptions) => void
  authorId: string
  issues: LessonDraftIssue[]
  area: 'sections' | 'materials'
  focusRequest?: { sectionId: string; target?: 'completion' | 'settings'; sequence: number }
  uploadStatus?: Record<string, string>
}

function SortableSection({
  id,
  title,
  canWrite,
  children,
}: {
  id: string
  title: string
  canWrite: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, style } = useSortableItem(id)
  return (
    <article
      ref={setNodeRef}
      style={style}
      className="relative rounded-2xl border border-border bg-card"
    >
      {canWrite && (
        <button
          {...attributes}
          {...listeners}
          aria-label={`Arrastar seção ${title}`}
          type="button"
          className="absolute left-1 top-5 z-10 cursor-grab touch-none rounded p-1 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      {children}
    </article>
  )
}

export function LessonSectionAuthoring({
  lesson,
  document: doc,
  canWrite,
  onChange,
  onAddBlock,
  onEditBlock,
  onRemoveBlock,
  onCreateStructure,
  authorId,
  issues,
  area,
  focusRequest,
  uploadStatus = {},
}: SectionAuthoringProps) {
  const [openIds, setOpenIds] = useState<string[]>([])
  const [activeEditor, setActiveEditor] = useState<{
    sectionId: string
    target: 'completion' | 'settings'
  } | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const [copyMode, setCopyMode] = useState<ProjectCopyMode>('independent')
  const [structureOpen, setStructureOpen] = useState(false)
  const [starterIntent, setStarterIntent] = useState('')
  const [starterOptions, setStarterOptions] = useState<SectionStarterOptions>({
    tool: 'studio',
    project: 'new',
    workspaceBlockId: '',
  })
  const preferenceKey = `sz:admin:lesson-sections:${authorId}:${lesson.id}`
  const loadedKey = useRef('')
  const returnFocus = useRef<HTMLElement | null>(null)
  const returnScroll = useRef(0)
  const editorHeading = useRef<HTMLHeadingElement>(null)
  const { confirm, confirmDialog } = useConfirm()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  useEffect(() => {
    let ids: string[] = []
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(preferenceKey) ?? '[]')
      if (Array.isArray(saved)) ids = saved.filter((id): id is string => typeof id === 'string')
    } catch {
      /* Preferences do not block authoring. */
    }
    loadedKey.current = preferenceKey
    setOpenIds(ids)
  }, [preferenceKey])
  function openSections(ids: string[]) {
    setOpenIds(ids)
    if (loadedKey.current === preferenceKey) {
      try {
        localStorage.setItem(preferenceKey, JSON.stringify(ids))
      } catch {
        /* Optional local preference. */
      }
    }
  }
  useEffect(() => {
    if (!focusRequest) return
    setOpenIds((ids) => [...new Set([...ids, focusRequest.sectionId])])
    setActiveEditor({
      sectionId: focusRequest.sectionId,
      target: focusRequest.target ?? 'completion',
    })
  }, [focusRequest])
  useEffect(() => {
    if (activeEditor) editorHeading.current?.focus()
  }, [activeEditor])
  useEffect(() => {
    void area
    setActiveEditor(null)
  }, [area])
  const blocks = new Map(lesson.blocks.map((b) => [b.id, b]))
  const tools = lesson.blocks.filter(
    (b) =>
      (b.kind === 'studio' || b.kind === 'pinta') &&
      !isGalleryBlock(b.content) &&
      !doc.supportBlockIds.includes(b.id),
  )
  const localIssues: LessonDraftIssue[] = sectionCompletionIssues(doc.sections, doc.blocks)
  const certificateLesson = doc.blocks.some((b) => b.content.kind === 'certificate')
  const allIssues = [...issues, ...localIssues].filter(
    (issue, i, list) =>
      list.findIndex(
        (v) =>
          v.message === issue.message &&
          v.sectionId === issue.sectionId &&
          v.blockId === issue.blockId,
      ) === i,
  )
  const structure = (
    sections: LessonSection[],
    supportBlockIds = doc.supportBlockIds,
    immediate = true,
  ) => onChange({ type: 'structure', sections, supportBlockIds }, immediate)
  const patch = (id: string, change: Partial<LessonSection>, immediate = false) =>
    structure(
      doc.sections.map((s) => (s.id === id ? { ...s, ...change } : s)),
      doc.supportBlockIds,
      immediate,
    )
  function editSection(sectionId: string, target: 'completion' | 'settings') {
    returnFocus.current = window.document.activeElement as HTMLElement
    returnScroll.current = window.scrollY
    setActiveEditor({ sectionId, target })
  }
  function closeEditor() {
    setActiveEditor(null)
    requestAnimationFrame(() => {
      returnFocus.current?.focus({ preventScroll: true })
      window.scrollTo({ top: returnScroll.current })
    })
  }
  function moveBlock(blockId: string, target: string) {
    const move = () => {
      const criterion = doc.sections.some((s) => s.completion?.blockIds.includes(blockId))
      structure(
        doc.sections.map((s) => ({
          ...s,
          blockIds: [
            ...s.blockIds.filter((id) => id !== blockId),
            ...(s.id === target ? [blockId] : []),
          ],
          ...(s.completion
            ? {
                completion: {
                  ...s.completion,
                  blockIds: [
                    ...s.completion.blockIds.filter((id) => id !== blockId),
                    ...(s.id === target && criterion ? [blockId] : []),
                  ],
                },
              }
            : {}),
        })),
        [
          ...doc.supportBlockIds.filter((id) => id !== blockId),
          ...(target === 'support' ? [blockId] : []),
        ],
      )
    }
    if (doc.sections.some((s) => s.workspaceBlockId === blockId))
      confirm({
        title: 'Mover projeto compartilhado',
        message:
          'Este projeto é usado por outras seções. Seus vínculos e objetivos serão mantidos; revise as pendências de posição depois de mover.',
        confirmText: 'Mover mantendo vínculos',
        onConfirm: move,
      })
    else move()
  }
  function duplicateBlock(block: BlockView, location: string) {
    const duplicate = () => {
      if (doc.blocks.length >= 200) {
        toast.error('A aula já tem 200 conteúdos. Organize a aula antes de duplicar este bloco.')
        return
      }
      const id = crypto.randomUUID()
      onChange(
        {
          type: 'block',
          block: { id, content: copyLessonContent(block.content) },
          sectionId: location === 'support' ? null : location,
        },
        true,
      )
      const planned = doc.plannedVideos.find((v) => v.blockId === block.id)
      if (planned)
        onChange(
          {
            type: 'planned-videos',
            plannedVideos: [...doc.plannedVideos, { ...planned, blockId: id }],
          },
          true,
        )
    }
    if (block.kind === 'studio' || block.kind === 'pinta')
      confirm({
        title: 'Duplicar como projeto independente',
        message:
          'A cópia mantém o projeto inicial e as configurações, com identidade própria e sem a cadeia entre aulas. Para continuar o mesmo trabalho, use “Onde a criança cria” na seção.',
        confirmText: 'Criar cópia independente',
        onConfirm: duplicate,
      })
    else duplicate()
  }
  function contentList(ids: string[], location: string) {
    return (
      <div className="space-y-2">
        {ids.map((id, index) => {
          const block = blocks.get(id)
          if (!block) return null
          return (
            <div key={id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <LessonBlockKindBadge kind={block.content.kind} />
                <span className="min-w-0 flex-1 break-words text-sm">
                  {lessonContentLabel(block)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canWrite}
                  onClick={() => onEditBlock(block)}
                  aria-label={`Editar ${lessonContentLabel(block)}`}
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
                <details className="relative">
                  <summary
                    aria-label={`Ações de ${lessonContentLabel(block)}`}
                    className="cursor-pointer list-none rounded-md p-2 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <MoreHorizontal className="size-4" />
                  </summary>
                  <fieldset
                    disabled={!canWrite}
                    className="absolute right-0 z-20 w-64 space-y-2 rounded-xl border border-border bg-popover p-3 shadow-sm"
                  >
                    <div className="flex gap-1">
                      {[-1, 1].map((direction) => (
                        <Button
                          key={direction}
                          variant="ghost"
                          size="sm"
                          disabled={!ids[index + direction]}
                          aria-label={
                            direction < 0 ? 'Mover conteúdo para cima' : 'Mover conteúdo para baixo'
                          }
                          onClick={() => {
                            const next = arrayMove(ids, index, index + direction)
                            if (location === 'support') structure(doc.sections, next)
                            else patch(location, { blockIds: next }, true)
                          }}
                        >
                          {direction < 0 ? (
                            <ArrowUp className="size-4" />
                          ) : (
                            <ArrowDown className="size-4" />
                          )}
                          {direction < 0 ? 'Subir' : 'Descer'}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateBlock(block, location)}
                    >
                      <Copy className="size-4" />
                      Duplicar conteúdo
                    </Button>
                    <label className="block space-y-1 text-xs">
                      Mover para
                      <Select
                        aria-label={`Local de ${lessonContentLabel(block)}`}
                        value={location}
                        onChange={(e) => moveBlock(id, e.target.value)}
                      >
                        {doc.sections.map((s, i) => (
                          <option key={s.id} value={s.id}>
                            {i + 1}. {s.title}
                          </option>
                        ))}
                        <option value="support">Materiais de apoio</option>
                      </Select>
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onRemoveBlock(block)}
                    >
                      Retirar conteúdo
                    </Button>
                  </fieldset>
                </details>
              </div>
              {uploadStatus[id] && (
                <p role="status" className="mt-2 text-xs text-primary">
                  {uploadStatus[id]}
                </p>
              )}
              {allIssues
                .filter((issue) => issue.blockId === id)
                .map((issue) => (
                  <p key={issue.message} className="mt-2 text-sm text-destructive">
                    {issue.message}
                  </p>
                ))}
            </div>
          )
        })}
      </div>
    )
  }
  function reorder(event: DragEndEvent) {
    if (!canWrite || !event.over || event.active.id === event.over.id) return
    const from = doc.sections.findIndex((s) => s.id === event.active.id)
    const to = doc.sections.findIndex((s) => s.id === event.over?.id)
    if (from >= 0 && to >= 0) structure(arrayMove(doc.sections, from, to))
  }
  const editing = doc.sections.find((s) => s.id === activeEditor?.sectionId)
  const copying = doc.sections.find((s) => s.id === duplicateId)
  return (
    <div className="space-y-4">
      {confirmDialog}
      {certificateLesson && (
        <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <p className="text-sm">
            Esta aula usa o fluxo do certificado, liberado pelas aulas anteriores do curso. Não
            exige checagens por seção nem atividades obrigatórias nesta aula.
          </p>
          {doc.sections.some((s) => s.completion !== undefined) && (
            <Button
              variant="outline"
              disabled={!canWrite}
              onClick={() =>
                confirm({
                  title: 'Usar o fluxo do certificado',
                  message:
                    'Os critérios de todas as seções desta aula serão removidos. Os conteúdos e o histórico dos alunos serão mantidos. Revise também quizzes e entregas obrigatórias, que não podem fazer parte da aula de certificado.',
                  confirmText: 'Usar fluxo do certificado',
                  onConfirm: () =>
                    structure(
                      doc.sections.map(({ completion: _completion, ...section }) => section),
                    ),
                })
              }
            >
              Usar conclusão própria do certificado
            </Button>
          )}
        </div>
      )}
      {editing && activeEditor && (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <Button variant="ghost" onClick={closeEditor}>
            <ArrowLeft className="size-4" />
            Voltar ao percurso
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">
              {doc.title} → {editing.title}
            </p>
            <h2
              ref={editorHeading}
              tabIndex={-1}
              className="mt-1 text-xl font-semibold outline-none"
            >
              {activeEditor.target === 'completion'
                ? 'Para avançar'
                : 'Orientações e projeto da seção'}
            </h2>
          </div>
          <fieldset disabled={!canWrite} className="space-y-5">
            {activeEditor.target === 'completion' ? (
              <>
                <p className="text-sm">{sectionCompletionSummary(editing, doc.blocks)}</p>
                {editing.intent !== 'material' &&
                  !editing.workspaceBlockId &&
                  !editing.externalTool &&
                  editing.blockIds.some((id) => blocks.get(id)?.kind === 'ebook') && (
                    <Button
                      variant="outline"
                      onClick={() => patch(editing.id, { intent: 'material' }, true)}
                    >
                      Usar Material do curso para avançar ao abrir ou baixar o caderno
                    </Button>
                  )}
                <SectionCompletionEditor
                  allowPlatformAction={
                    !editing.workspaceBlockId &&
                    !editing.externalTool &&
                    editing.intent !== 'material'
                  }
                  value={editing.completion ?? { version: 1, blockIds: [] }}
                  candidates={sectionCompletionCandidates(doc, editing)}
                  hasStudio={tools.some(
                    (b) => b.id === editing.workspaceBlockId && b.kind === 'studio',
                  )}
                  workspace={tools.find((b) => b.id === editing.workspaceBlockId)?.content}
                  allowBlocks={tools.flatMap((b) =>
                    b.id === editing.workspaceBlockId && b.content.kind === 'studio'
                      ? (b.content.allowBlocks ?? [])
                      : [],
                  )}
                  onChange={(completion) => patch(editing.id, { completion })}
                />
                <Button
                  variant="outline"
                  onClick={() => setActiveEditor({ sectionId: editing.id, target: 'settings' })}
                >
                  Ajustar intenção ou ferramenta
                </Button>
              </>
            ) : (
              <>
                <label className="block space-y-2 text-sm">
                  Título da seção
                  <Input
                    value={editing.title}
                    maxLength={200}
                    onChange={(e) => patch(editing.id, { title: e.target.value })}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  Intenção didática
                  <Select
                    value={editing.intent}
                    onChange={(e) =>
                      patch(editing.id, { intent: e.target.value as LessonSection['intent'] }, true)
                    }
                  >
                    {SECTION_INTENTS.map((intent) => (
                      <option key={intent} value={intent}>
                        {SECTION_INTENT_LABELS[intent]}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block space-y-2 text-sm">
                  Objetivo didático
                  <Textarea
                    value={editing.objective}
                    maxLength={500}
                    onChange={(e) => patch(editing.id, { objective: e.target.value })}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  Onde a criança cria
                  <Select
                    value={editing.workspaceBlockId ?? editing.externalTool ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      patch(
                        editing.id,
                        value === 'estudio' || value === 'pinta'
                          ? { externalTool: value, workspaceBlockId: null }
                          : { externalTool: null, workspaceBlockId: value || null },
                        true,
                      )
                    }}
                  >
                    <option value="">Somente os conteúdos desta seção</option>
                    <optgroup label="Continuar um projeto da aula">
                      {tools.map((b) => (
                        <option key={b.id} value={b.id}>
                          {lessonContentLabel(b)} ·{' '}
                          {doc.sections.find((s) => s.blockIds.includes(b.id))?.title}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Fora da aula">
                      <option value="estudio">Estúdio completo</option>
                      <option value="pinta">Pinta completo</option>
                    </optgroup>
                  </Select>
                </label>
                <p className="text-sm text-muted-foreground">
                  Para começar outro projeto, adicione um conteúdo Estúdio ou Pinta. Para continuar
                  o trabalho, selecione o projeto pelo nome e pela seção de origem.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveEditor({ sectionId: editing.id, target: 'completion' })}
                >
                  Configurar avanço
                </Button>
              </>
            )}
            {allIssues
              .filter((i) => i.sectionId === editing.id)
              .map((issue) => (
                <p key={issue.message} role="alert" className="text-sm text-destructive">
                  {issue.message}
                </p>
              ))}
          </fieldset>
          <Button onClick={closeEditor}>Voltar ao percurso</Button>
        </section>
      )}
      <div hidden={Boolean(editing)}>
        {area === 'materials' ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Materiais de apoio</h2>
              <p className="text-sm text-muted-foreground">
                Conteúdos opcionais, fora do percurso obrigatório da aula.
              </p>
            </div>
            {contentList(doc.supportBlockIds, 'support')}
            <Button variant="outline" disabled={!canWrite} onClick={() => onAddBlock(null)}>
              <Plus className="size-4" />
              Adicionar material de apoio
            </Button>
          </section>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {doc.sections.length} seções · organize na ordem da sua aula
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openSections([])}>
                  Recolher todas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openSections(doc.sections.map((s) => s.id))}
                >
                  Abrir todas
                </Button>
              </div>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
              <SortableContext
                items={doc.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {doc.sections.map((section, index) => {
                    const isOpen = openIds.includes(section.id)
                    const sectionIssues = allIssues.filter(
                      (i) =>
                        i.sectionId === section.id ||
                        Boolean(i.blockId && section.blockIds.includes(i.blockId)),
                    )
                    const pendingMedia = section.blockIds.filter((id) => {
                      const c = blocks.get(id)?.content
                      return c?.kind === 'video' && !c.src
                    })
                    const suggestion = suggestedCompletion(doc, section)
                    const noCompletion =
                      !section.completion?.blockIds.length &&
                      !section.completion?.projectChecks?.length &&
                      !section.completion?.platformAction
                    const workspace = blocks.get(section.workspaceBlockId ?? '')
                    return (
                      <SortableSection
                        key={section.id}
                        id={section.id}
                        title={section.title}
                        canWrite={canWrite}
                      >
                        <div className="flex items-start gap-2 py-4 pl-7 pr-3 sm:pr-5">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-controls={`section-content-${section.id}`}
                            aria-label={`${isOpen ? 'Recolher' : 'Abrir'} seção ${index + 1}: ${section.title}`}
                            onClick={() =>
                              openSections(
                                isOpen
                                  ? openIds.filter((id) => id !== section.id)
                                  : [...openIds, section.id],
                              )
                            }
                            className="mt-1 flex shrink-0 items-center gap-1 rounded-lg p-1 text-primary focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold">
                              {index + 1}
                            </span>
                            <ChevronDown
                              className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <div className="min-w-0 flex-1 space-y-2">
                            <Input
                              aria-label={`Título da seção ${index + 1}`}
                              value={section.title}
                              maxLength={200}
                              disabled={!canWrite}
                              className="border-transparent bg-transparent px-1 font-semibold hover:border-border focus:border-ring"
                              onChange={(e) => patch(section.id, { title: e.target.value })}
                            />
                            <div className="flex flex-wrap gap-1">
                              {[
                                ...new Set(
                                  section.blockIds.flatMap((id) => {
                                    const b = blocks.get(id)
                                    return b ? [b.content.kind] : []
                                  }),
                                ),
                              ].map((kind) => (
                                <LessonBlockKindBadge key={kind} kind={kind} />
                              ))}
                              {!section.blockIds.length && (
                                <span className="text-xs text-muted-foreground">
                                  Comece adicionando um conteúdo
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => editSection(section.id, 'completion')}
                              className="block text-left text-xs text-muted-foreground underline-offset-4 hover:underline"
                            >
                              {sectionCompletionSummary(section, doc.blocks)}
                            </button>
                            {workspace && (
                              <p className="text-xs text-muted-foreground">
                                Projeto: {lessonContentLabel(workspace)}
                              </p>
                            )}
                            {sectionIssues.length > 0 && (
                              <button
                                type="button"
                                onClick={() => editSection(section.id, 'completion')}
                                className="text-left text-xs text-amber-700 dark:text-amber-400"
                              >
                                {sectionIssues.length} pendência
                                {sectionIssues.length === 1 ? '' : 's'} ·{' '}
                                {sectionIssues[0]?.message}
                              </button>
                            )}
                            {pendingMedia.length > 0 && (
                              <p className="text-xs text-amber-700 dark:text-amber-400">
                                Vídeo aguardando envio
                              </p>
                            )}
                            {section.blockIds
                              .filter((id) => uploadStatus[id])
                              .map((id) => (
                                <p key={id} role="status" className="text-xs text-primary">
                                  {uploadStatus[id]}
                                </p>
                              ))}
                          </div>
                          <details className="relative">
                            <summary
                              aria-label={`Ações da seção ${index + 1}`}
                              className="cursor-pointer list-none rounded-md p-2 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                            >
                              <MoreHorizontal className="size-4" />
                            </summary>
                            <fieldset
                              disabled={!canWrite}
                              className="absolute right-0 z-20 w-64 space-y-1 rounded-xl border border-border bg-popover p-2 shadow-sm"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editSection(section.id, 'settings')}
                              >
                                Orientações e projeto
                              </Button>
                              {[-1, 1].map((direction) => (
                                <Button
                                  key={direction}
                                  variant="ghost"
                                  size="sm"
                                  disabled={!doc.sections[index + direction]}
                                  onClick={() =>
                                    structure(arrayMove(doc.sections, index, index + direction))
                                  }
                                >
                                  {direction < 0 ? (
                                    <ArrowUp className="size-4" />
                                  ) : (
                                    <ArrowDown className="size-4" />
                                  )}
                                  {direction < 0 ? 'Subir seção' : 'Descer seção'}
                                </Button>
                              ))}
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={doc.sections.length >= 60}
                                onClick={() => {
                                  setDuplicateId(section.id)
                                  setCopyMode('independent')
                                }}
                              >
                                <Copy className="size-4" />
                                Duplicar seção
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                disabled={doc.sections.length < 2}
                                onClick={() =>
                                  confirm({
                                    title: 'Remover seção e manter conteúdos',
                                    message:
                                      'Os conteúdos irão para a seção vizinha. Os critérios desta seção serão removidos e o avanço da seção de destino precisará ser revisado. O histórico dos alunos permanece preservado.',
                                    confirmText: 'Remover seção',
                                    confirmVariant: 'destructive',
                                    onConfirm: () => {
                                      const rest = doc.sections.filter((s) => s.id !== section.id)
                                      const target = rest[Math.max(0, index - 1)]
                                      structure(
                                        rest.map((s) =>
                                          s.id === target?.id
                                            ? {
                                                ...s,
                                                blockIds: [...s.blockIds, ...section.blockIds],
                                              }
                                            : s,
                                        ),
                                      )
                                    },
                                  })
                                }
                              >
                                Remover seção
                              </Button>
                            </fieldset>
                          </details>
                        </div>
                        <div
                          id={`section-content-${section.id}`}
                          hidden={!isOpen}
                          className="space-y-5 border-t border-border p-4 sm:p-5"
                        >
                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold">Conteúdos da seção</h3>
                            {contentList(section.blockIds, section.id)}
                            <Button
                              variant="outline"
                              disabled={!canWrite}
                              onClick={() => onAddBlock(section.id)}
                            >
                              <Plus className="size-4" />
                              Adicionar conteúdo
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                            <div>
                              <p className="text-sm font-medium">Onde a criança cria</p>
                              <p className="text-xs text-muted-foreground">
                                {workspace
                                  ? lessonContentLabel(workspace)
                                  : section.externalTool
                                    ? `${section.externalTool === 'estudio' ? 'Estúdio' : 'Pinta'} completo, fora da aula`
                                    : 'Somente os conteúdos desta seção'}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editSection(section.id, 'settings')}
                            >
                              Configurar projeto
                            </Button>
                          </div>
                          <div className="space-y-3 border-t border-border pt-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">Para avançar</p>
                                <p className="text-xs text-muted-foreground">
                                  {sectionCompletionSummary(section, doc.blocks)}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => editSection(section.id, 'completion')}
                              >
                                {noCompletion ? 'Definir avanço' : 'Editar avanço'}
                              </Button>
                            </div>
                            {noCompletion && section.completion && suggestion && (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/5 p-3">
                                <p className="text-sm">
                                  Sugestão:{' '}
                                  {sectionCompletionSummary(
                                    { ...section, completion: suggestion },
                                    doc.blocks,
                                  )}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!canWrite}
                                  onClick={() =>
                                    patch(section.id, { completion: suggestion }, true)
                                  }
                                >
                                  Usar este critério
                                </Button>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editSection(section.id, 'settings')}
                          >
                            Orientações do professor · {SECTION_INTENT_LABELS[section.intent]}
                          </Button>
                        </div>
                      </SortableSection>
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
            <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-border p-4">
              <Button
                disabled={!canWrite || doc.sections.length >= 60}
                onClick={() => {
                  const section = newAuthoringSection()
                  if (certificateLesson) delete section.completion
                  structure([...doc.sections, section])
                  openSections([...openIds, section.id])
                  requestAnimationFrame(() =>
                    window.document
                      .querySelector<HTMLInputElement>(
                        `[aria-label="Título da seção ${doc.sections.length + 1}"]`,
                      )
                      ?.focus(),
                  )
                }}
              >
                <Plus className="size-4" />
                Adicionar seção
              </Button>
              <Button
                variant="ghost"
                disabled={!canWrite || doc.sections.length >= 60}
                onClick={() => {
                  setStructureOpen(true)
                  setStarterIntent('')
                }}
              >
                Começar com uma estrutura
              </Button>
            </div>
          </div>
        )}
      </div>
      <Dialog
        open={structureOpen}
        onClose={() => setStructureOpen(false)}
        title="Começar com uma estrutura"
        className="max-w-2xl"
      >
        <p className="mb-4 text-sm text-muted-foreground">
          Um ponto de partida editável. A ordem da aula continua livre.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ...LESSON_SECTION_TEMPLATES,
            {
              intent: 'platform',
              label: 'Ação da plataforma',
              guidance: 'Orientar uma personalização e escolher qual ação verificar.',
            },
          ].map((item) => (
            <button
              key={item.intent}
              type="button"
              disabled={!canWrite}
              className="space-y-1 rounded-xl border border-border p-4 text-left hover:bg-muted"
              onClick={() => {
                if (item.intent === 'application' || item.intent === 'delivery') {
                  setStarterIntent(item.intent)
                  setStarterOptions({
                    tool: 'studio',
                    project: item.intent === 'delivery' ? 'external' : 'new',
                    workspaceBlockId: '',
                  })
                } else {
                  onCreateStructure(item.intent)
                  setStructureOpen(false)
                }
              }}
            >
              <span className="block font-medium">{item.label}</span>
              <span className="block text-xs text-muted-foreground">
                {item.intent === 'exploration'
                  ? 'Cena manipulável com missão e instrução editáveis. Você pode acrescentar vídeo e fala do Zappy. Avanço pelas descobertas da missão.'
                  : item.intent === 'material'
                    ? 'Livro 3D e PDF para baixar. Você pode acrescentar vídeo ou fala de apresentação. Avanço ao abrir o caderno ou baixar o PDF.'
                    : item.guidance}
              </span>
            </button>
          ))}
        </div>
        {starterIntent && (
          <fieldset className="mt-5 space-y-3 rounded-xl border border-primary/20 p-4">
            <legend className="px-2 font-medium">
              {starterIntent === 'delivery'
                ? 'Qual criação será entregue?'
                : 'Onde a criança vai criar?'}
            </legend>
            <Select
              aria-label="Projeto da estrutura inicial"
              value={starterOptions.project}
              onChange={(e) =>
                setStarterOptions((o) => ({
                  ...o,
                  project: e.target.value as SectionStarterOptions['project'],
                  workspaceBlockId: '',
                }))
              }
            >
              {starterIntent === 'application' && (
                <option value="new">Começar um projeto na aula</option>
              )}
              <option value="existing">Continuar um projeto desta aula</option>
              <option value="external">
                {starterIntent === 'delivery'
                  ? 'Selecionar trabalho da galeria'
                  : 'Criar na ferramenta completa, fora da aula'}
              </option>
            </Select>
            {starterOptions.project === 'existing' ? (
              <Select
                aria-label="Escolher projeto existente"
                value={starterOptions.workspaceBlockId}
                onChange={(e) =>
                  setStarterOptions((o) => ({ ...o, workspaceBlockId: e.target.value }))
                }
              >
                <option value="">Escolha o projeto pelo nome e origem</option>
                {tools.map((b) => (
                  <option key={b.id} value={b.id}>
                    {lessonContentLabel(b)} ·{' '}
                    {doc.sections.find((s) => s.blockIds.includes(b.id))?.title}
                  </option>
                ))}
              </Select>
            ) : (
              <Select
                aria-label="Ferramenta da estrutura inicial"
                value={starterOptions.tool}
                onChange={(e) =>
                  setStarterOptions((o) => ({ ...o, tool: e.target.value as 'studio' | 'pinta' }))
                }
              >
                <option value="studio">Estúdio</option>
                <option value="pinta">Pinta</option>
              </Select>
            )}
            {starterIntent === 'delivery' && starterOptions.project === 'existing' && (
              <p className="text-xs text-muted-foreground">
                O bloco de entrega será colocado na nova seção. As outras seções continuam usando o
                mesmo projeto; revise seus critérios de avanço.
              </p>
            )}
            <Button
              disabled={
                !canWrite ||
                (starterOptions.project === 'existing' && !starterOptions.workspaceBlockId)
              }
              onClick={() => {
                onCreateStructure(starterIntent, starterOptions)
                setStructureOpen(false)
              }}
            >
              Criar estrutura editável
            </Button>
          </fieldset>
        )}
      </Dialog>
      <Dialog
        open={Boolean(copying)}
        onClose={() => setDuplicateId(null)}
        title="Duplicar seção"
        footer={
          <Button
            disabled={!canWrite}
            onClick={() => {
              if (!copying) return
              let changes: LessonDraftChange<LessonBlockContent>[]
              try {
                changes = duplicateLessonSection(doc, copying.id, copyMode)
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : 'Não foi possível duplicar a seção.',
                )
                return
              }
              for (const change of changes) onChange(change, true)
              const first = changes[0]
              if (first?.type === 'structure')
                openSections([
                  ...openIds,
                  ...first.sections
                    .filter((s) => !doc.sections.some((old) => old.id === s.id))
                    .map((s) => s.id),
                ])
              setDuplicateId(null)
            }}
          >
            Criar cópia
          </Button>
        }
      >
        <p className="mb-4 text-sm">
          A cópia tem conteúdos e objetivos próprios. O progresso e os envios dos alunos não são
          copiados.
        </p>
        {copying?.workspaceBlockId && (
          <label className="block space-y-2 text-sm">
            Projeto da nova seção
            <Select
              value={copyMode}
              onChange={(e) => setCopyMode(e.target.value as ProjectCopyMode)}
            >
              <option value="independent">Criar uma cópia independente do projeto</option>
              {canShareSectionProject(copying) && (
                <option value="shared">
                  Continuar o mesmo projeto:{' '}
                  {blocks.get(copying.workspaceBlockId)
                    ? lessonContentLabel(blocks.get(copying.workspaceBlockId)!)
                    : 'projeto da aula'}
                </option>
              )}
            </Select>
          </label>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Projetos independentes mantêm o conteúdo inicial e as configurações, sem a cadeia entre
          aulas. Vídeos reutilizados mantêm sua mídia e capa compartilhadas.
        </p>
      </Dialog>
    </div>
  )
}
