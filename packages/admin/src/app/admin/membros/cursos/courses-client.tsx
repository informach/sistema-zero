'use client'
import { creatorJourneyCoursePlacements } from '@sistemazero/core/journey'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
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
  Copy,
  Pencil,
  Plus,
  Search,
  SquarePen,
  TriangleAlert,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  CurriculumLoadNotice,
  creatorRoleLabel,
  useCreatorCurriculum,
} from '@/components/admin/course-curriculum-placement'
import { CreatorJourneyGrid } from '@/components/admin/creator-journey-grid'
import { EmptyState, LoadError } from '@/components/admin/empty-state'
import { usePlatform } from '@/components/admin/platform-provider'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { StatusBadge, statusLabel } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import { MoreMenu } from '@/components/professor/more-menu'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { isLiveCourse } from '@/lib/course-modality'
import { formatDate } from '@/lib/format'
import {
  createForegroundPriority,
  createScopeAuthority,
  runLatestForeground,
} from '@/lib/latest-wins'
import { loadAllPages } from '@/lib/load-all-pages'
import { COMMUNITY_NAMES } from '@/lib/platform'
import { offsetForPlatform, pageForPlatform } from '@/lib/platform-pagination'
import { courseCreationPrefill } from '@/lib/platform-transition'
import { slugify } from '@/lib/slug'
import { fetchSubmissionCountsSafe, submissionCountWarning } from '@/lib/submission-counts'
import {
  COURSE_MODALITY_LABELS,
  COURSE_STATUSES,
  COURSE_TIER_OPTIONS,
  type CourseView,
  type Paginated,
} from '@/lib/types'
import { CourseFormDialog, type CoursePrefill, slotsForTier } from './course-form-dialog'
import { CoursePublicationDialog } from './course-publication-dialog'

const LIMIT = 20

export function CoursesClient({
  currentRole,
  showCoursePromotion = false,
}: {
  currentRole: string
  showCoursePromotion?: boolean
}) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  // Seletor global: a listagem mostra só os cursos da plataforma ativa.
  const platform = usePlatform()
  const curriculumState = useCreatorCurriculum(platform)

  const [items, setItems] = useState<CourseView[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(() => ({ platform, offset: 0 }))
  const offset = offsetForPlatform(page, platform)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  /** Gravado × ao vivo ('' = todos). O BFF repassa `?modality=` ao members. */
  const [modality, setModality] = useState('')
  const [loading, setLoading] = useState(true)
  const [journeyItems, setJourneyItems] = useState<CourseView[]>([])
  const [journeyLoading, setJourneyLoading] = useState(true)
  const [journeyError, setJourneyError] = useState(false)
  // A lista inteira de cursos gravados só serve à Jornada: no Kids (painel histórico ou grade do
  // currículo) e no Adultos só com o currículo novo.
  const journeyWanted = platform === 'kids' || Boolean(curriculumState.curriculum)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CourseView | null>(null)
  const [cloning, setCloning] = useState<CourseView | null>(null)
  const [publishing, setPublishing] = useState<CourseView | null>(null)
  const [publicationOperation, setPublicationOperation] = useState<'copy-adult' | 'promote-kids'>(
    'copy-adult',
  )
  const [prefill, setPrefill] = useState<CoursePrefill | undefined>(undefined)
  const { confirm, confirmDialog } = useConfirm()
  const loadAuthority = useRef(createForegroundPriority()).current
  const journeyAuthority = useRef(createForegroundPriority()).current
  const mutationScope = useRef(createScopeAuthority(platform)).current
  mutationScope.update(platform)
  const renderScope = mutationScope.capture()

  useEffect(() => {
    setPage((current) => pageForPlatform(current, platform))
    // Formulários abertos pertencem à plataforma em que foram iniciados.
    setOpen(false)
    setEditing(null)
    setCloning(null)
    setPublishing(null)
    setPrefill(undefined)
  }, [platform])

  const load = useCallback(async () => {
    setLoading(true)
    await runLatestForeground(
      loadAuthority,
      () => {
        const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
        params.set('audience', platform)
        if (q.trim()) params.set('q', q.trim())
        if (status) params.set('status', status)
        if (modality) params.set('modality', modality)
        return apiGet<Paginated<CourseView>>(`/api/members/courses?${params}`)
      },
      {
        onSuccess: (result) => {
          setItems(result.items)
          setTotal(result.total)
        },
        onError: (error) => {
          toast.error((error as ApiError).message ?? 'Não conseguimos carregar os cursos.')
        },
        onSettled: () => setLoading(false),
      },
    )
  }, [offset, q, status, modality, platform, loadAuthority])

  const loadJourney = useCallback(async () => {
    // A grade da Jornada precisa de TODOS os cursos gravados da plataforma (a varredura pagina a
    // lista inteira). Os call-sites pós-save chamam sem condição e viram no-op quando a lente não
    // usa a lista. A lista anterior sai na hora: a grade nunca confere uma plataforma com os
    // cursos da outra (nem quando a leitura nova falha).
    setJourneyItems([])
    setJourneyError(false)
    if (!journeyWanted) {
      journeyAuthority.invalidate()
      setJourneyLoading(false)
      return
    }
    setJourneyLoading(true)
    await runLatestForeground(
      journeyAuthority,
      () =>
        // A Jornada só tem cursos GRAVADOS: o curso ao vivo nunca ocupa posição. O filtro vai ao
        // servidor e é repetido aqui (members antigo ignora o parâmetro).
        loadAllPages((pageOffset, limit) =>
          apiGet<Paginated<CourseView>>(
            `/api/members/courses?audience=${platform}&modality=recorded&limit=${limit}&offset=${pageOffset}`,
          ),
        ),
      {
        onSuccess: (courses) => setJourneyItems(courses.filter((course) => !isLiveCourse(course))),
        onError: () => setJourneyError(true),
        onSettled: () => setJourneyLoading(false),
      },
    )
  }, [platform, journeyWanted, journeyAuthority])

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250)
    return () => {
      clearTimeout(timer)
      loadAuthority.invalidate()
    }
  }, [load, loadAuthority])

  useEffect(() => {
    void loadJourney()
    return () => journeyAuthority.invalidate()
  }, [loadJourney, journeyAuthority])

  function openCreate() {
    setEditing(null)
    setPrefill(courseCreationPrefill(platform))
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

  async function remove(c: CourseView) {
    const scope = mutationScope.capture()
    // Contagem ANTES do confirm (o `message` é fixo): a cascata do banco apaga as
    // entregas dos alunos do curso inteiro. Best-effort — falhou → confirm de sempre.
    const counts = await fetchSubmissionCountsSafe(c.id)
    const warning = submissionCountWarning(counts?.total ?? 0)
    confirm({
      title: 'Excluir curso',
      message: (
        <>
          Excluir o curso <strong className="text-foreground">{c.title}</strong>? Os módulos e as
          aulas dele somem, e não dá para desfazer.
          {warning ? (
            <>
              {' '}
              <strong className="text-destructive">{warning}</strong>
            </>
          ) : null}
        </>
      ),
      confirmText: 'Excluir',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          await apiSend(`/api/members/courses/${c.id}`, 'DELETE')
          toast.success('Curso excluído.')
          if (mutationScope.isCurrent(scope)) await Promise.all([load(), loadJourney()])
        } catch (err) {
          toast.error(
            (err as ApiError).message ?? 'Não foi possível excluir o curso. Tente de novo.',
          )
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <AdminHeader
        title="Cursos"
        description="Os cursos gravados e ao vivo da comunidade. Aqui você monta os módulos, as aulas e as partes de cada aula."
        action={
          <Button onClick={openCreate} disabled={!canWrite}>
            <Plus className="size-4" /> Novo curso
          </Button>
        }
      />
      {canWrite ? null : <ReadOnlyNotice />}

      {curriculumState.status !== 'ready' ? (
        <CurriculumLoadNotice state={curriculumState} />
      ) : curriculumState.curriculum && journeyError ? (
        <LoadError what="os cursos da Jornada do Criador" onRetry={() => void loadJourney()} />
      ) : curriculumState.curriculum ? (
        <CreatorJourneyGrid
          curriculum={curriculumState.curriculum}
          courses={journeyItems}
          loading={journeyLoading}
          audience={platform}
          canWrite={canWrite}
          onEditCourse={openEdit}
        />
      ) : curriculumState.loaded && platform === 'kids' && journeyError ? (
        <LoadError what="os cursos da Jornada do Criador" onRetry={() => void loadJourney()} />
      ) : curriculumState.loaded && platform === 'kids' ? (
        <JourneyReadiness
          courses={journeyItems}
          loading={journeyLoading}
          canWrite={canWrite}
          onPickSlot={(level, track, slot, course) =>
            course ? openEdit(course) : openCreateAtSlot(level, track, slot)
          }
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pelo título ou pelo endereço…"
            value={q}
            onChange={(e) => {
              setPage({ platform, offset: 0 })
              setQ(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setPage({ platform, offset: 0 })
            setStatus(e.target.value)
          }}
          aria-label="Situação"
          className="sm:w-44"
        >
          <option value="">Todas as situações</option>
          {COURSE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, 'catalog')}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Modalidade"
          value={modality}
          onChange={(e) => {
            setPage({ platform, offset: 0 })
            setModality(e.target.value)
          }}
          className="sm:w-44"
        >
          <option value="">Gravados e ao vivo</option>
          <option value="recorded">Só gravados</option>
          <option value="live">Só ao vivo</option>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Curso</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={4} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  {q.trim() || status || modality ? (
                    <EmptyState
                      title="Nenhum curso com esse filtro"
                      description="Tente outra busca ou tire um dos filtros."
                    />
                  ) : (
                    <EmptyState
                      zappy="happy"
                      title="Nenhum curso nesta comunidade ainda"
                      description="Comece criando o primeiro curso. Ele nasce como rascunho."
                      action={
                        canWrite ? (
                          <Button onClick={openCreate}>
                            <Plus className="size-4" /> Novo curso
                          </Button>
                        ) : undefined
                      }
                    />
                  )}
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
                      {isLiveCourse(c) ? (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {COURSE_MODALITY_LABELS.live}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>/{c.slug}</span>
                      {c.clonedFrom ? (
                        <span
                          className="rounded-full bg-muted px-1.5 py-0.5 font-medium text-[11px]"
                          title={`Copiado do curso ${c.clonedFrom}. O que muda num não muda no outro.`}
                        >
                          Cópia de {c.clonedFrom}
                        </span>
                      ) : null}
                    </div>
                    {isLiveCourse(c) ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Curso ao vivo: fora da trilha e da Jornada. As turmas ficam em{' '}
                        <Link href="/admin/oficinas" className="underline underline-offset-2">
                          Oficinas
                        </Link>
                        .
                      </div>
                    ) : curriculumState.curriculum ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {creatorJourneyCoursePlacements(curriculumState.curriculum, c.id)
                          .map((placement) => {
                            const role = creatorRoleLabel(placement.role)
                            return `${role} · ${placement.level ? curriculumState.curriculum!.stages.find((stage) => stage.level === placement.level)?.title : `${curriculumState.curriculum!.masteries.find((area) => area.id === placement.masteryId)?.title} · nível ${placement.masteryLevel}`}`
                          })
                          .join(' / ') ||
                          'Ainda sem vínculo no currículo. Configure no editor da jornada.'}
                      </div>
                    ) : curriculumState.status !== 'ready' ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vínculo da jornada aguardando consulta da política.
                      </p>
                    ) : c.audience === 'kids' ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {c.level === 'lenda' ? (
                          'Lenda: curso bônus da formatura. Aparece na Trilha Lenda, fora da Jornada.'
                        ) : c.journeyRole === 'extra' ? (
                          `Extra: curso sem posição em ${
                            COURSE_TIER_OPTIONS.find(
                              (option) => option.level === c.level && option.track === c.track,
                            )?.label ?? `${c.level} ${c.track}`
                          }. Abre para quem tem matrícula, sem depender do posto.`
                        ) : c.careerSlot == null ? (
                          `Bônus: prêmio de ${
                            COURSE_TIER_OPTIONS.find(
                              (option) => option.level === c.level && option.track === c.track,
                            )?.label ?? `${c.level} ${c.track}`
                          }. Abre quando a criança completa a trilha e não conta para subir de posto.`
                        ) : (
                          <>
                            <span>
                              {`Jornada: ${
                                COURSE_TIER_OPTIONS.find(
                                  (option) => option.level === c.level && option.track === c.track,
                                )?.label ?? `${c.level} ${c.track}`
                              } · posição ${c.careerSlot}`}
                            </span>
                            {c.careerSlot === 1 ? (
                              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 font-medium text-[11px] text-primary">
                                Curso de entrada
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} kind="catalog" />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/membros/cursos/${c.id}`}
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                        aria-label={`Abrir ${c.title}`}
                        title="Abrir curso"
                      >
                        <SquarePen className="size-4" aria-hidden />
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        disabled={!canWrite}
                        aria-label={`Editar dados de ${c.title}`}
                        title="Editar dados"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <MoreMenu
                        label="Mais ações"
                        items={[
                          ...(c.audience === 'kids' && !isLiveCourse(c)
                            ? [
                                {
                                  label: 'Publicar e atualizar no adulto',
                                  icon: <Copy className="size-4" aria-hidden />,
                                  onSelect: () => {
                                    setPublicationOperation('copy-adult')
                                    setPublishing(c)
                                  },
                                  disabled: !canWrite || c.status !== 'published',
                                  disabledReason:
                                    c.status !== 'published'
                                      ? 'Publique o curso Kids antes de copiar o conteúdo'
                                      : undefined,
                                },
                              ]
                            : [
                                {
                                  label: `Criar cópia na ${COMMUNITY_NAMES[c.audience === 'kids' ? 'adult' : 'kids']}`,
                                  icon: <Copy className="size-4" aria-hidden />,
                                  onSelect: () => setCloning(c),
                                  disabled: !canWrite,
                                },
                              ]),
                          ...(showCoursePromotion && c.audience === 'kids' && !isLiveCourse(c)
                            ? [
                                {
                                  label: 'Promover para produção',
                                  icon: <Copy className="size-4" aria-hidden />,
                                  onSelect: () => {
                                    setPublicationOperation('promote-kids')
                                    setPublishing(c)
                                  },
                                  disabled: !canWrite || c.status !== 'published',
                                  disabledReason:
                                    c.status !== 'published'
                                      ? 'Publique o curso Kids antes de promover o conteúdo'
                                      : undefined,
                                },
                              ]
                            : []),
                          {
                            label: 'Excluir curso',
                            onSelect: () => void remove(c),
                            disabled: !canWrite,
                          },
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination
        total={total}
        limit={LIMIT}
        offset={offset}
        onChange={(nextOffset) => setPage({ platform, offset: nextOffset })}
      />

      <CourseFormDialog
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        prefill={prefill}
        journeyCourses={journeyItems}
        onSaved={async () => {
          if (!mutationScope.isCurrent(renderScope)) return
          await Promise.all([load(), loadJourney()])
        }}
      />

      <CloneCourseDialog
        course={cloning}
        onClose={() => setCloning(null)}
        onCloned={async () => {
          if (!mutationScope.isCurrent(renderScope)) return
          await Promise.all([load(), loadJourney()])
        }}
      />
      <CoursePublicationDialog
        course={publishing}
        operation={publicationOperation}
        onClose={() => setPublishing(null)}
        onPublished={() => {
          if (mutationScope.isCurrent(renderScope)) void Promise.all([load(), loadJourney()])
        }}
      />
    </div>
  )
}

function JourneyReadiness({
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
    // ⚠️ POR DEGRAU, não um 8 fixo: a entrada tem 1 e o Iniciante 2D tem 7 (14/08). Este
    // número ficava solto aqui e não era coberto pela conformance — com o 8 fixo, o painel
    // pediria 8 cursos numa trilha de 1 e nunca marcaria a jornada como pronta.
    const required = slotsForTier(tier.level, tier.track)
    const slots = Array.from({ length: required }, (_, slotIndex) => {
      const slot = slotIndex + 1
      const course = courses.find(
        (item) =>
          item.level === tier.level &&
          (item.track ?? '2d') === tier.track &&
          item.careerSlot === slot,
      )
      // Toda posição obrigatória exige uma oportunidade publicada de ir ao Mural.
      // Resposta de um servidor antigo sem a verificação não significa prontidão.
      const missingShowcase = course?.status === 'published' && course.hasShowcaseBlock === false
      const unknownShowcase =
        course?.status === 'published' && course.hasShowcaseBlock === undefined
      return {
        slot,
        course,
        missingShowcase,
        unknownShowcase,
        ready: course?.status === 'published' && course.hasShowcaseBlock === true,
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
          <h2 className="font-semibold text-base">Jornada do Criador</h2>
          <p className="mt-1 text-muted-foreground text-sm">
            Cada trilha pede um curso publicado em cada posição. A{' '}
            <strong className="text-foreground">posição 1</strong> é o curso de entrada da trilha: a
            criança termina esse curso e publica no Mural dos Criadores para abrir os outros.
            {canWrite ? ' Clique numa posição para criar ou editar o curso dela.' : ''}
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 font-medium text-sm ${
            readyCount === requiredCount
              ? 'bg-success/15 text-success-foreground'
              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
          }`}
        >
          {loading ? 'Conferindo…' : `${readyCount} de ${requiredCount} posições prontas`}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {tiers.map((tier) => (
          <div key={`${tier.level}:${tier.track}`} className="rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{tier.label}</span>
              {tier.ready ? (
                <span className="inline-flex items-center gap-1 text-success-foreground text-xs">
                  <CheckCircle2 className="size-3.5" /> Pronta
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                  <CircleDashed className="size-3.5" /> Falta completar
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {tier.slots.map(({ slot, course, missingShowcase, unknownShowcase }) => {
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
                        (slot === 1 ? 'Curso de entrada sem curso' : 'Posição sem curso')}
                    </span>
                    {course ? (
                      missingShowcase ? (
                        <span
                          className="inline-flex items-center gap-1 text-destructive"
                          title="Nenhuma aula publicada tem um Estúdio que deixa publicar no Mural dos Criadores. Sem isso, o curso não conta para a Jornada."
                        >
                          <TriangleAlert className="size-3.5" /> Falta o Mural
                        </span>
                      ) : unknownShowcase ? (
                        <span className="text-muted-foreground">Ainda conferindo</span>
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
                      <span className="text-destructive">Posição sem curso</span>
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
                    title={course ? `Editar ${course.title}` : 'Criar um curso nesta posição'}
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

/**
 * Clonar o curso para a OUTRA plataforma (o substituto da "audiência Ambas",
 * decisão de produto de 24/08): o clone é um curso INDEPENDENTE na plataforma
 * destino — entra na jornada/chave-mestra/XP de lá sem regra nova. É um FORK:
 * edições depois do clone NÃO sincronizam (avisado aqui).
 */
function CloneCourseDialog({
  course,
  onClose,
  onCloned,
}: {
  course: CourseView | null
  onClose: () => void
  onCloned: () => Promise<void>
}) {
  const targetAudience = course?.audience === 'kids' ? 'adult' : 'kids'
  const targetLabel = COMMUNITY_NAMES[targetAudience]
  const live = isLiveCourse(course)
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  // Sugestões derivadas do curso de origem (re-semeia ao abrir p/ outro curso).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-semeia por curso
  useEffect(() => {
    if (!course) return
    setSlug(`${course.slug}-${targetAudience === 'kids' ? 'kids' : 'adulto'}`)
    setTitle(course.title)
  }, [course?.id])

  async function run() {
    if (!course) return
    setBusy(true)
    try {
      const view = await apiSend<CourseView>(`/api/members/courses/${course.id}/clone`, 'POST', {
        audience: targetAudience,
        // O clone MANTÉM a modalidade: um curso ao vivo vira outro curso ao vivo.
        modality: live ? 'live' : 'recorded',
        slug: slugify(slug) || undefined,
        title: title.trim() || undefined,
      })
      toast.success(`Curso copiado para a ${targetLabel}. A cópia nasce como rascunho.`)
      onClose()
      await onCloned()
      window.location.assign(`/admin/membros/cursos/${view.id}`)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível copiar o curso. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={course !== null}
      onClose={onClose}
      title={`Copiar para a ${targetLabel}`}
      description={
        live
          ? 'O curso inteiro é copiado: módulos, aulas, partes e anexos. A cópia também é ao vivo e nasce como rascunho, sem turmas. Depois de copiar, o que muda num curso não muda no outro.'
          : 'O curso inteiro é copiado: módulos, aulas, partes e anexos. A cópia nasce como rascunho, fora da Jornada do Criador. Depois de copiar, o que muda num curso não muda no outro.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void run()} disabled={busy || !slug.trim() || !title.trim()}>
            <Copy className="size-4" /> {busy ? 'Copiando…' : 'Copiar curso'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título da cópia" htmlFor="clone-title">
          <Input id="clone-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field
          label="Endereço da cópia"
          htmlFor="clone-slug"
          hint="Fica no endereço do curso e não pode repetir. A sugestão já vem com o nome da comunidade no fim."
        >
          <Input id="clone-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}
