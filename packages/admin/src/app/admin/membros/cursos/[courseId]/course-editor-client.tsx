'use client'

import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus, SquarePen } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { CourseTreeView, LessonView, ModuleView } from '@/lib/types'

type Tree = CourseTreeView
type TreeModule = Tree['modules'][number]

/** Move o item `index` na direção `dir` e devolve a nova ordem de ids (ou null se não move). */
function movedOrder<T extends { id: string }>(
  items: T[],
  index: number,
  dir: -1 | 1,
): string[] | null {
  const target = index + dir
  if (target < 0 || target >= items.length) return null
  const ids = items.map((i) => i.id)
  ;[ids[index], ids[target]] = [ids[target] as string, ids[index] as string]
  return ids
}

export function CourseEditorClient({
  courseId,
  currentRole,
}: {
  courseId: string
  currentRole: string
}) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'

  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

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
    if (!window.confirm(`Excluir o módulo "${m.title}" e suas aulas?`)) return
    void run(() => apiSend(`/api/members/modules/${m.id}`, 'DELETE'), 'Módulo excluído.')
  }
  function moveModule(index: number, dir: -1 | 1) {
    if (!tree) return
    const order = movedOrder(tree.modules, index, dir)
    if (!order) return
    void run(() =>
      apiSend(`/api/members/courses/${courseId}/modules/reorder`, 'POST', { orderedIds: order }),
    )
  }

  // ── Aulas ──
  function openCreateLesson(moduleId: string) {
    setEditingLesson(null)
    setLessonModuleId(moduleId)
    // Aula nova nasce RASCUNHO — o autor publica quando o conteúdo estiver pronto.
    setLessonForm({ slug: '', title: '', estimatedMinutes: '', isPublished: false })
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
    if (!window.confirm(`Excluir a aula "${l.title}"?`)) return
    void run(() => apiSend(`/api/members/lessons/${l.id}`, 'DELETE'), 'Aula excluída.')
  }
  function moveLesson(mod: TreeModule, index: number, dir: -1 | 1) {
    const order = movedOrder(mod.lessons, index, dir)
    if (!order) return
    void run(() =>
      apiSend(`/api/members/modules/${mod.id}/lessons/reorder`, 'POST', { orderedIds: order }),
    )
  }

  return (
    <div className="space-y-6">
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
            <Button onClick={openCreateModule}>
              <Plus className="size-4" /> Novo módulo
            </Button>
          ) : undefined
        }
      />

      {loading ? (
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
        <div className="space-y-4">
          {tree.modules.map((mod, mi) => (
            <Card key={mod.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{mod.title}</div>
                  {mod.summary ? (
                    <div className="text-sm text-muted-foreground">{mod.summary}</div>
                  ) : null}
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {mod.lessons.filter((l) => l.isPublished).length} de {mod.lessons.length}{' '}
                    {mod.lessons.length === 1 ? 'aula publicada' : 'aulas publicadas'}
                    {(() => {
                      const min = mod.lessons.reduce((s, l) => s + (l.estimatedMinutes ?? 0), 0)
                      return min > 0 ? ` · ${min} min` : ''
                    })()}
                  </div>
                </div>
                {canWrite ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy || mi === 0}
                      onClick={() => moveModule(mi, -1)}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy || mi === tree.modules.length - 1}
                      onClick={() => moveModule(mi, 1)}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditModule(mod)}>
                      <Pencil className="size-4" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteModule(mod)}>
                      Excluir
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 divide-y divide-border border-t border-border">
                {mod.lessons.length === 0 ? (
                  <div className="py-3 text-sm text-muted-foreground">Nenhuma aula.</div>
                ) : (
                  mod.lessons.map((lesson, li) => (
                    <div key={lesson.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{lesson.title}</span>
                          <Badge variant={lesson.isPublished ? 'success' : 'muted'}>
                            {lesson.isPublished ? 'Publicada' : 'Rascunho'}
                          </Badge>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {lesson.slug}
                          {lesson.estimatedMinutes != null
                            ? ` · ${lesson.estimatedMinutes} min`
                            : ''}
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
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busy || li === 0}
                              onClick={() => moveLesson(mod, li, -1)}
                            >
                              <ChevronUp className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busy || li === mod.lessons.length - 1}
                              onClick={() => moveLesson(mod, li, 1)}
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditLesson(lesson)}
                            >
                              <Pencil className="size-4" /> Editar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteLesson(lesson)}>
                              Excluir
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canWrite ? (
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => openCreateLesson(mod.id)}>
                    <Plus className="size-4" /> Nova aula
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

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
                onChange={(e) => setLessonForm((f) => ({ ...f, slug: e.target.value }))}
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
              onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
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
