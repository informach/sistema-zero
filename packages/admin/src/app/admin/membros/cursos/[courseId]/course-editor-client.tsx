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
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Spinner } from '@sistemazero/ui/spinner'
import { Switch } from '@sistemazero/ui/switch'
import { Textarea } from '@sistemazero/ui/textarea'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Plus,
  SquarePen,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { useConfirm } from '@/components/admin/use-confirm'
import { useSortableItem } from '@/components/dnd/use-sortable-item'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import { slugify } from '@/lib/slug'
import type { CourseTreeView, LessonView, ModuleView } from '@/lib/types'
import { CourseFormDialog } from '../course-form-dialog'
import { CourseSubmissionsPanel } from './course-submissions-client'

type CourseTab = 'estrutura' | 'entregas'

type Tree = CourseTreeView
type TreeModule = Tree['modules'][number]

export function CourseEditorClient({
  courseId,
  currentRole,
}: {
  courseId: string
  currentRole: string
}) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'

  // Aba do curso: "Estrutura" (árvore de módulos/aulas) × "Entregas" (entregas do
  // Estúdio de todas as aulas, centralizadas). Estado local — a sub-rota de aula
  // vive fora deste componente, então não dá p/ usar layout com abas por rota.
  const [tab, setTab] = useState<CourseTab>('estrutura')

  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const { confirm, confirmDialog } = useConfirm()
  // Módulos COLAPSADOS (default = tudo expandido).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Dialog de edição do PRÓPRIO curso (mesmo form da listagem — reusa CourseFormDialog).
  const [courseEditOpen, setCourseEditOpen] = useState(false)

  const [moduleOpen, setModuleOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleView | null>(null)
  const [moduleForm, setModuleForm] = useState({ title: '', summary: '' })

  const [lessonOpen, setLessonOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonView | null>(null)
  const [lessonModuleId, setLessonModuleId] = useState<string>('')
  const [lessonForm, setLessonForm] = useState({
    slug: '',
    title: '',
    estimatedMinutes: '',
    isPublished: false,
  })
  // Slug da aula = auto do título até o autor editar o slug à mão (dirty) — só na
  // CRIAÇÃO (igual a produto/oferta/curso); na edição o slug é estável.
  const [lessonSlugDirty, setLessonSlugDirty] = useState(false)

  // Arrastar só após 5px (deixa o clique nos botões do card livre).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTree(await apiGet<Tree>(`/api/members/courses/${courseId}`))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar o curso.')
    } finally {
      setLoading(false)
    }
  }, [courseId])

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

  function toggleCollapsed(moduleId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
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

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!tree || !over || active.id === over.id) return
    const oldIdx = tree.modules.findIndex((m) => m.id === active.id)
    const newIdx = tree.modules.findIndex((m) => m.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(tree.modules, oldIdx, newIdx)
    setTree({ ...tree, modules: reordered })
    void persistOrder(
      `/api/members/courses/${courseId}/modules/reorder`,
      reordered.map((m) => m.id),
    )
  }

  function handleLessonDragEnd(mod: TreeModule, event: DragEndEvent) {
    const { active, over } = event
    if (!tree || !over || active.id === over.id) return
    const oldIdx = mod.lessons.findIndex((l) => l.id === active.id)
    const newIdx = mod.lessons.findIndex((l) => l.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const lessons = arrayMove(mod.lessons, oldIdx, newIdx)
    setTree({
      ...tree,
      modules: tree.modules.map((m) => (m.id === mod.id ? { ...m, lessons } : m)),
    })
    void persistOrder(
      `/api/members/modules/${mod.id}/lessons/reorder`,
      lessons.map((l) => l.id),
    )
  }

  // ── Módulos ──
  function openCreateModule() {
    setEditingModule(null)
    setModuleForm({ title: '', summary: '' })
    setModuleOpen(true)
  }
  function openEditModule(m: ModuleView) {
    setEditingModule(m)
    setModuleForm({ title: m.title, summary: m.summary ?? '' })
    setModuleOpen(true)
  }
  async function saveModule() {
    if (!moduleForm.title.trim()) {
      toast.error('Informe o título do módulo.')
      return
    }
    const payload = { title: moduleForm.title.trim(), summary: moduleForm.summary.trim() || null }
    await run(async () => {
      if (editingModule) await apiSend(`/api/members/modules/${editingModule.id}`, 'PATCH', payload)
      else await apiSend(`/api/members/courses/${courseId}/modules`, 'POST', payload)
      setModuleOpen(false)
    }, 'Módulo salvo.')
  }
  function deleteModule(m: ModuleView) {
    confirm({
      title: 'Excluir módulo',
      message: (
        <>
          Excluir o módulo <strong className="text-foreground">{m.title}</strong> e todas as suas
          aulas? Esta ação não pode ser desfeita.
        </>
      ),
      confirmText: 'Excluir',
      confirmVariant: 'destructive',
      onConfirm: () =>
        run(() => apiSend(`/api/members/modules/${m.id}`, 'DELETE'), 'Módulo excluído.'),
    })
  }

  // ── Aulas ──
  function openCreateLesson(moduleId: string) {
    setEditingLesson(null)
    setLessonModuleId(moduleId)
    // Aula nova nasce RASCUNHO — o autor publica quando o conteúdo estiver pronto.
    setLessonForm({ slug: '', title: '', estimatedMinutes: '', isPublished: false })
    setLessonSlugDirty(false) // slug em branco → autogera do título
    setLessonOpen(true)
  }
  function openEditLesson(l: LessonView) {
    setEditingLesson(l)
    setLessonModuleId(l.moduleId)
    setLessonForm({
      slug: l.slug,
      title: l.title,
      estimatedMinutes: l.estimatedMinutes === null ? '' : String(l.estimatedMinutes),
      isPublished: l.isPublished,
    })
    setLessonSlugDirty(true) // edição: slug existente é estável, não regenerar
    setLessonOpen(true)
  }
  async function saveLesson() {
    if (!lessonForm.title.trim() || !lessonForm.slug.trim()) {
      toast.error('Informe slug e título da aula.')
      return
    }
    const mins = lessonForm.estimatedMinutes.trim()
    const payload = {
      slug: lessonForm.slug.trim(),
      title: lessonForm.title.trim(),
      estimatedMinutes: mins ? Number(mins) : null,
      isPublished: lessonForm.isPublished,
    }
    await run(async () => {
      if (editingLesson) await apiSend(`/api/members/lessons/${editingLesson.id}`, 'PATCH', payload)
      else await apiSend(`/api/members/modules/${lessonModuleId}/lessons`, 'POST', payload)
      setLessonOpen(false)
    }, 'Aula salva.')
  }
  function deleteLesson(l: LessonView) {
    confirm({
      title: 'Excluir aula',
      message: (
        <>
          Excluir a aula <strong className="text-foreground">{l.title}</strong>? Esta ação não pode
          ser desfeita.
        </>
      ),
      confirmText: 'Excluir',
      confirmVariant: 'destructive',
      onConfirm: () =>
        run(() => apiSend(`/api/members/lessons/${l.id}`, 'DELETE'), 'Aula excluída.'),
    })
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <Link
        href="/admin/membros/cursos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Cursos
      </Link>

      <AdminHeader
        title={tree?.title ?? 'Curso'}
        description={tree ? `${tree.slug} · ${tree.status}` : courseId}
        action={
          canWrite ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCourseEditOpen(true)} disabled={!tree}>
                <Pencil className="size-4" /> Editar curso
              </Button>
              {tab === 'estrutura' ? (
                <Button onClick={openCreateModule}>
                  <Plus className="size-4" /> Novo módulo
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      />

      {/* Abas do curso: Estrutura (árvore) × Entregas (Estúdio, todas as aulas). */}
      <div className="flex items-center gap-1 border-b border-border">
        {(
          [
            ['estrutura', 'Estrutura'],
            ['entregas', 'Entregas'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              tab === key
                ? 'border-primary font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'entregas' ? (
        <CourseSubmissionsPanel courseId={courseId} audience={tree?.audience ?? 'kids'} />
      ) : loading ? (
        <Card className="py-10 text-center text-muted-foreground">
          <Spinner className="mx-auto" />
        </Card>
      ) : !tree ? (
        <Card className="py-10 text-center text-muted-foreground">Curso não encontrado.</Card>
      ) : tree.modules.length === 0 ? (
        <Card className="py-10 text-center text-muted-foreground">
          Nenhum módulo ainda. Crie o primeiro módulo para começar.
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleModuleDragEnd}
        >
          <SortableContext
            items={tree.modules.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {tree.modules.map((mod) => (
                <SortableModuleItem
                  key={mod.id}
                  mod={mod}
                  courseId={courseId}
                  canWrite={canWrite}
                  expanded={!collapsed.has(mod.id)}
                  onToggle={() => toggleCollapsed(mod.id)}
                  onEditModule={() => openEditModule(mod)}
                  onDeleteModule={() => deleteModule(mod)}
                  onCreateLesson={() => openCreateLesson(mod.id)}
                  onEditLesson={openEditLesson}
                  onDeleteLesson={deleteLesson}
                  onLessonDragEnd={(e) => handleLessonDragEnd(mod, e)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {tree ? (
        <CourseFormDialog
          open={courseEditOpen}
          onClose={() => setCourseEditOpen(false)}
          editing={tree}
          onSaved={load}
        />
      ) : null}

      <Dialog
        open={moduleOpen}
        onClose={() => setModuleOpen(false)}
        title={editingModule ? 'Editar módulo' : 'Novo módulo'}
        footer={
          <>
            <Button variant="outline" onClick={() => setModuleOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={saveModule} disabled={busy}>
              {busy ? <Spinner /> : null}
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Título" htmlFor="mtitle">
            <Input
              id="mtitle"
              value={moduleForm.title}
              onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <Field label="Resumo" htmlFor="msummary" hint="Opcional.">
            <Textarea
              id="msummary"
              value={moduleForm.summary}
              onChange={(e) => setModuleForm((f) => ({ ...f, summary: e.target.value }))}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={lessonOpen}
        onClose={() => setLessonOpen(false)}
        title={editingLesson ? 'Editar aula' : 'Nova aula'}
        footer={
          <>
            <Button variant="outline" onClick={() => setLessonOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={saveLesson} disabled={busy}>
              {busy ? <Spinner /> : null}
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug" htmlFor="lslug" hint="único no curso">
              <Input
                id="lslug"
                value={lessonForm.slug}
                onChange={(e) => {
                  setLessonSlugDirty(true)
                  setLessonForm((f) => ({ ...f, slug: e.target.value }))
                }}
              />
            </Field>
            <Field label="Duração (min)" htmlFor="lmin" hint="Opcional.">
              <Input
                id="lmin"
                type="number"
                min={0}
                value={lessonForm.estimatedMinutes}
                onChange={(e) => setLessonForm((f) => ({ ...f, estimatedMinutes: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Título" htmlFor="ltitle">
            <Input
              id="ltitle"
              value={lessonForm.title}
              onChange={(e) => {
                const title = e.target.value
                setLessonForm((f) => ({
                  ...f,
                  title,
                  // Autogera o slug do título até o autor editá-lo à mão (dirty).
                  ...(!editingLesson && !lessonSlugDirty ? { slug: slugify(title) } : {}),
                }))
              }}
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <div className="text-sm font-medium">Aula publicada</div>
              <div className="text-xs text-muted-foreground">
                Rascunho fica invisível para o aluno até você publicar.
              </div>
            </div>
            <Switch
              checked={lessonForm.isPublished}
              onCheckedChange={(v) => setLessonForm((f) => ({ ...f, isPublished: v }))}
              disabled={busy}
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}

// ── Módulo arrastável (card colapsável com contadores e DnD aninhado de aulas) ──
function SortableModuleItem({
  mod,
  courseId,
  canWrite,
  expanded,
  onToggle,
  onEditModule,
  onDeleteModule,
  onCreateLesson,
  onEditLesson,
  onDeleteLesson,
  onLessonDragEnd,
}: {
  mod: TreeModule
  courseId: string
  canWrite: boolean
  expanded: boolean
  onToggle: () => void
  onEditModule: () => void
  onDeleteModule: () => void
  onCreateLesson: () => void
  onEditLesson: (l: LessonView) => void
  onDeleteLesson: (l: LessonView) => void
  onLessonDragEnd: (event: DragEndEvent) => void
}) {
  const { attributes, listeners, setNodeRef, style } = useSortableItem(mod.id)
  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const published = mod.lessons.filter((l) => l.isPublished).length
  const totalMinutes = mod.lessons.reduce((s, l) => s + (l.estimatedMinutes ?? 0), 0)

  return (
    <Card ref={setNodeRef} style={style} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-1">
          {canWrite ? (
            <button
              type="button"
              className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label="Arrastar módulo"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            className="mt-0.5 text-muted-foreground hover:text-foreground"
            aria-label={expanded ? 'Colapsar módulo' : 'Expandir módulo'}
            onClick={onToggle}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <div className="min-w-0">
            <div className="font-semibold">{mod.title}</div>
            {mod.summary ? (
              <div className="text-sm text-muted-foreground">{mod.summary}</div>
            ) : null}
            <div className="mt-0.5 text-xs text-muted-foreground">
              {published} de {mod.lessons.length}{' '}
              {mod.lessons.length === 1 ? 'aula publicada' : 'aulas publicadas'}
              {totalMinutes > 0 ? ` · ${totalMinutes} min` : ''}
            </div>
          </div>
        </div>
        {canWrite ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEditModule}>
              <Pencil className="size-4" /> Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeleteModule}>
              Excluir
            </Button>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <>
          <div className="mt-3 divide-y divide-border border-t border-border">
            {mod.lessons.length === 0 ? (
              <div className="py-3 text-sm text-muted-foreground">Nenhuma aula.</div>
            ) : (
              <DndContext
                sensors={lessonSensors}
                collisionDetection={closestCenter}
                onDragEnd={onLessonDragEnd}
              >
                <SortableContext
                  items={mod.lessons.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {mod.lessons.map((lesson) => (
                    <SortableLessonItem
                      key={lesson.id}
                      lesson={lesson}
                      courseId={courseId}
                      canWrite={canWrite}
                      onEdit={() => onEditLesson(lesson)}
                      onDelete={() => onDeleteLesson(lesson)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {canWrite ? (
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={onCreateLesson}>
                <Plus className="size-4" /> Nova aula
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  )
}

// ── Aula arrastável (linha com handle, badge de publicação e ações) ──────────
function SortableLessonItem({
  lesson,
  courseId,
  canWrite,
  onEdit,
  onDelete,
}: {
  lesson: LessonView
  courseId: string
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, style } = useSortableItem(lesson.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 bg-background py-2"
    >
      <div className="flex min-w-0 items-center gap-2">
        {canWrite ? (
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Arrastar aula"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{lesson.title}</span>
            <Badge variant={lesson.isPublished ? 'success' : 'muted'}>
              {lesson.isPublished ? 'Publicada' : 'Rascunho'}
            </Badge>
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {lesson.slug}
            {lesson.estimatedMinutes != null ? ` · ${lesson.estimatedMinutes} min` : ''}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/admin/membros/cursos/${courseId}/aulas/${lesson.id}`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          <SquarePen className="size-4" /> Conteúdo
        </Link>
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
    </div>
  )
}
