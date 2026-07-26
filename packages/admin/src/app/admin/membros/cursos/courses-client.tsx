'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { Pagination } from '@sistemazero/ui/pagination'
import { Select } from '@sistemazero/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import {
  CheckCircle2,
  CircleDashed,
  Pencil,
  Plus,
  Search,
  SquarePen,
  TriangleAlert,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { loadAllPages } from '@/lib/load-all-pages'
import { COURSE_STATUSES, COURSE_TIER_OPTIONS, type CourseView, type Paginated } from '@/lib/types'
import { CourseFormDialog, type CoursePrefill } from './course-form-dialog'

const LIMIT = 20

export function CoursesClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'

  const [items, setItems] = useState<CourseView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [careerItems, setCareerItems] = useState<CourseView[]>([])
  const [careerLoading, setCareerLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CourseView | null>(null)
  const [prefill, setPrefill] = useState<CoursePrefill | undefined>(undefined)
  const { confirm, confirmDialog } = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      const page = await apiGet<Paginated<CourseView>>(`/api/members/courses?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar cursos.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status])

  const loadCareer = useCallback(async () => {
    setCareerLoading(true)
    try {
      const courses = await loadAllPages((pageOffset, limit) =>
        apiGet<Paginated<CourseView>>(
          `/api/members/courses?audience=kids&limit=${limit}&offset=${pageOffset}`,
        ),
      )
      setCareerItems(courses)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao conferir a Carreira do Criador.')
    } finally {
      setCareerLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    void loadCareer()
  }, [loadCareer])

  function openCreate() {
    setEditing(null)
    setPrefill(undefined)
    setOpen(true)
  }
  function openEdit(c: CourseView) {
    setEditing(c)
    setPrefill(undefined)
    setOpen(true)
  }
  // Painel de prontidão: clicar numa posição VAZIA abre a criação já mirando a
  // etapa+posição; clicar numa OCUPADA abre a edição daquele curso.
  function openCreateAtSlot(level: string, track: string, slot: number) {
    setEditing(null)
    setPrefill({ audience: 'kids', level, track, careerSlot: slot })
    setOpen(true)
  }

  function remove(c: CourseView) {
    confirm({
      title: 'Excluir curso',
      message: (
        <>
          Excluir o curso <strong className="text-foreground">{c.title}</strong>? Módulos, aulas e
          progresso serão removidos. Esta ação não pode ser desfeita.
        </>
      ),
      confirmText: 'Excluir',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          await apiSend(`/api/members/courses/${c.id}`, 'DELETE')
          toast.success('Curso excluído.')
          await Promise.all([load(), loadCareer()])
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não foi possível excluir.')
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <AdminHeader
        title="Membros"
        description="Cursos da área de membros — autoria de conteúdo (módulos, aulas, blocos)."
        action={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Novo curso
            </Button>
          ) : undefined
        }
      />

      <CareerReadiness
        courses={careerItems}
        loading={careerLoading}
        canWrite={canWrite}
        onPickSlot={(level, track, slot, course) =>
          course ? openEdit(course) : openCreateAtSlot(level, track, slot)
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou slug…"
            value={q}
            onChange={(e) => {
              setOffset(0)
              setQ(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
          className="sm:w-44"
        >
          <option value="">Todos os status</option>
          {COURSE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Curso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={4} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nenhum curso encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.title}</span>
                      {c.audience === 'kids' ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success-foreground">
                          Kids
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.slug}</div>
                    {c.audience === 'kids' ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {c.level === 'lenda' ? (
                          '👑 Lenda — curso bônus da formatura (aparece na trilha da Lenda; fora da carreira)'
                        ) : c.careerSlot == null ? (
                          `Bônus — recompensa da etapa ${
                            COURSE_TIER_OPTIONS.find(
                              (option) => option.level === c.level && option.track === c.track,
                            )?.label ?? `${c.level} ${c.track}`
                          } (abre quando ela completa); não conta para subir de nível`
                        ) : (
                          <>
                            <span>
                              {`Carreira: ${
                                COURSE_TIER_OPTIONS.find(
                                  (option) => option.level === c.level && option.track === c.track,
                                )?.label ?? `${c.level} ${c.track}`
                              } · posição ${c.careerSlot}`}
                            </span>
                            {c.careerSlot === 1 ? (
                              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-medium text-[11px] text-primary">
                                Curso-base
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/membros/cursos/${c.id}`}
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      >
                        <SquarePen className="size-4" /> Conteúdo
                      </Link>
                      {canWrite ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                            <Pencil className="size-4" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(c)}>
                            Excluir
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />

      <CourseFormDialog
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        prefill={prefill}
        careerCourses={careerItems}
        onSaved={async () => {
          await Promise.all([load(), loadCareer()])
        }}
      />
    </div>
  )
}

function CareerReadiness({
  courses,
  loading,
  canWrite,
  onPickSlot,
}: {
  courses: CourseView[]
  loading: boolean
  canWrite: boolean
  onPickSlot: (level: string, track: string, slot: number, course: CourseView | undefined) => void
}) {
  const tiers = COURSE_TIER_OPTIONS.map((tier) => {
    // 8 posições por degrau (reforma 07/2026; era 6 no Iniciante 2D e 5 nas demais).
    const required = 8
    const slots = Array.from({ length: required }, (_, slotIndex) => {
      const slot = slotIndex + 1
      const course = courses.find(
        (item) =>
          item.level === tier.level &&
          (item.track ?? '2d') === tier.track &&
          item.careerSlot === slot,
      )
      // Curso-base publicado SEM aula publicada com bloco de Estúdio de vitrine:
      // o aluno nunca publica no Mural → o slot 1 nunca qualifica e a etapa não
      // destrava. Publicado sem vitrine NÃO conta como pronto.
      const missingShowcase =
        slot === 1 && course?.status === 'published' && course.hasShowcaseBlock === false
      return {
        slot,
        course,
        missingShowcase,
        ready: course?.status === 'published' && !missingShowcase,
      }
    })
    return {
      ...tier,
      slots,
      ready: slots.every((item) => item.ready),
    }
  })
  const readyCount = tiers.reduce(
    (total, tier) => total + tier.slots.filter((item) => item.ready).length,
    0,
  )
  const requiredCount = tiers.reduce((total, tier) => total + tier.slots.length, 0)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">Carreira do Criador</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Confira se todos os cursos obrigatórios estão posicionados e publicados antes do
            lançamento. A <strong className="text-foreground">posição 1</strong> é o curso-base da
            etapa: o aluno precisa concluí-lo e publicar no Mural para liberar as demais.
            {canWrite ? ' Clique numa posição para cadastrar ou editar o curso dela.' : ''}
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 font-medium text-sm ${
            readyCount === requiredCount
              ? 'bg-success/15 text-success-foreground'
              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
          }`}
        >
          {loading ? 'Conferindo…' : `${readyCount} de ${requiredCount} prontos`}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier) => (
          <div key={`${tier.level}:${tier.track}`} className="rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{tier.label}</span>
              {tier.ready ? (
                <span className="inline-flex items-center gap-1 text-success-foreground text-xs">
                  <CheckCircle2 className="size-3.5" /> Pronto
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                  <CircleDashed className="size-3.5" /> Incompleto
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {tier.slots.map(({ slot, course, missingShowcase }) => {
                const inner = (
                  <>
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full font-medium ${
                        slot === 1 ? 'bg-primary/15 text-primary' : 'bg-background'
                      }`}
                    >
                      {slot}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left text-foreground">
                      {course?.title ??
                        (slot === 1 ? 'Curso-base ainda vazio' : 'Posição ainda vazia')}
                    </span>
                    {course ? (
                      missingShowcase ? (
                        <span
                          className="inline-flex items-center gap-1 text-destructive"
                          title="Nenhuma aula publicada tem bloco de Estúdio com vitrine (Publicar no Mural). Sem isso o curso-base nunca qualifica e a etapa não destrava para os alunos."
                        >
                          <TriangleAlert className="size-3.5" /> Sem vitrine
                        </span>
                      ) : (
                        <span
                          className={
                            course.status === 'published'
                              ? 'text-success-foreground'
                              : 'text-amber-700 dark:text-amber-300'
                          }
                        >
                          {course.status === 'published' ? 'Publicado' : 'Falta publicar'}
                        </span>
                      )
                    ) : (
                      <span className="text-destructive">Falta curso</span>
                    )}
                  </>
                )
                const className =
                  'flex w-full min-w-0 items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs'
                return canWrite ? (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => onPickSlot(tier.level, tier.track, slot, course)}
                    className={`${className} text-left transition-colors hover:bg-muted`}
                    title={course ? `Editar ${course.title}` : 'Cadastrar curso nesta posição'}
                  >
                    {inner}
                  </button>
                ) : (
                  <div key={slot} className={className}>
                    {inner}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
