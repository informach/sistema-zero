'use client'
import {
  ADULT_CREATOR_CAPABILITIES,
  type AdultCreatorCapability,
  type AdultJourneyPolicy,
  AdultJourneyPolicySchema,
} from '@sistemazero/core/journey'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { usePlatform } from '@/components/admin/platform-provider'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { journeyLensHref } from '@/lib/platform-transition'
import { type CourseView, courseTierLabel, type Paginated } from '@/lib/types'
import type { AdultJourneyPolicyRecord } from '@/server/adult-journey'

const labels: Record<AdultCreatorCapability, string> = {
  studio: 'Estúdio livre',
  pinta: 'Pinta',
  molda: 'Molda',
  bridge: 'Ponte: blocos e código',
  pro: 'Modo Pro',
  ai: 'Zappy',
  pensa: 'Pensa',
}
type Stage = AdultJourneyPolicy['stages'][number]

async function listAdultCourses() {
  const courses: CourseView[] = []
  let offset = 0
  while (true) {
    const page = await apiGet<Paginated<CourseView>>(
      `/api/members/courses?audience=adult&modality=recorded&limit=100&offset=${offset}`,
    )
    courses.push(
      ...page.items.filter((course) => course.audience === 'adult' && course.modality !== 'live'),
    )
    offset += page.items.length
    if (!page.items.length || offset >= page.total) return courses
  }
}

/** A página da Jornada do Criador: o item "Jornada" do menu segue a lente (23/10/2026). */
const KIDS_JOURNEY_PATH = '/admin/professor/jornada-kids'

export function AdultJourneyEditor() {
  const platform = usePlatform()
  const router = useRouter()
  // Trocar a lente para Kids aqui leva à jornada de lá, em vez de um aviso sem saída. O
  // endereço vai junto: o `?preparacao=` que veio da Jornada Kids volta com ela e a retoma.
  useEffect(() => {
    if (platform === 'kids') {
      router.replace(journeyLensHref(KIDS_JOURNEY_PATH, window.location.search))
    }
  }, [platform, router])
  const [record, setRecord] = useState<AdultJourneyPolicyRecord | null>(null)
  const [draft, setDraft] = useState<AdultJourneyPolicy | null>(null)
  const [courses, setCourses] = useState<CourseView[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadGeneration = useRef(0)
  const load = useCallback(async () => {
    if (platform !== 'adult') return
    const generation = ++loadGeneration.current
    setLoading(true)
    await Promise.all([
      apiGet<AdultJourneyPolicyRecord>('/api/members/journey/adult'),
      listAdultCourses(),
    ])
      .then(([policy, items]) => {
        if (loadGeneration.current !== generation) return
        setRecord(policy)
        setDraft(policy.policy)
        setCourses(items)
        setError(null)
      })
      .catch((cause: ApiError) => {
        if (loadGeneration.current === generation)
          setError(cause.message || 'Não foi possível carregar a jornada.')
      })
      .finally(() => {
        if (loadGeneration.current === generation) setLoading(false)
      })
  }, [platform])
  useEffect(() => {
    void load()
    return () => {
      loadGeneration.current++
    }
  }, [load])

  const updateStage = useCallback(
    (id: string, update: (stage: Stage) => Stage) =>
      setDraft((policy) =>
        policy
          ? {
              ...policy,
              stages: policy.stages.map((stage) => (stage.id === id ? update(stage) : stage)),
            }
          : policy,
      ),
    [],
  )
  function move(index: number, direction: -1 | 1) {
    setDraft((policy) => {
      if (!policy?.stages[index] || !policy.stages[index + direction]) return policy
      const stages = [...policy.stages]
      const current = stages[index]
      const target = stages[index + direction]
      if (!current || !target) return policy
      stages[index] = target
      stages[index + direction] = current
      return { ...policy, stages }
    })
  }
  async function save() {
    if (!record || !draft) return
    const parsed = AdultJourneyPolicySchema.safeParse(draft)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Confira as etapas: algum campo não está certo.')
      return
    }
    setSaving(true)
    try {
      const result = await apiSend<AdultJourneyPolicyRecord>('/api/members/journey/adult', 'PUT', {
        expectedVersion: record.version,
        policy: parsed.data,
      })
      setRecord(result)
      setDraft(result.policy)
      setError(null)
      toast.success('Jornada salva.')
    } catch (cause) {
      setError(
        (cause as ApiError).message ||
          'Não foi possível salvar. O que você mudou continua aqui: tente de novo.',
      )
    } finally {
      setSaving(false)
    }
  }
  const dirty = draft && record && JSON.stringify(draft) !== JSON.stringify(record.policy)
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Jornada"
        description="As etapas da Comunidade Sistema Zero: os cursos que cada etapa pede e o que ela libera."
      />
      {platform !== 'adult' ? (
        <p role="status" className="text-sm text-muted-foreground">
          Abrindo a Jornada do Criador…
        </p>
      ) : (
        <>
          <Card className="space-y-2 p-5 text-sm">
            <p>
              Cada etapa pede as anteriores. A licença da ferramenta e os blocos de cada curso
              continuam sendo conferidos à parte.
            </p>
            <p>
              O Zappy e o Pensa pedem um curso avançado terminado nesta etapa ou numa anterior. O
              que o aluno já ganhou continua com ele quando a jornada muda.
            </p>
          </Card>
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p role="status">Carregando a jornada…</p>
          ) : draft ? (
            <>
              {!courses.length ? (
                <Card className="p-5">
                  Crie um curso gravado na Comunidade Sistema Zero para começar a montar as etapas.
                </Card>
              ) : null}
              {draft.stages.map((stage, index) => (
                <Card key={stage.id} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold">Etapa {index + 1}</h2>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        Subir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving || index === draft.stages.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        Descer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() =>
                          setDraft((policy) =>
                            policy
                              ? {
                                  ...policy,
                                  stages: policy.stages.filter((item) => item.id !== stage.id),
                                }
                              : policy,
                          )
                        }
                      >
                        Remover etapa
                      </Button>
                    </div>
                  </div>
                  <label className="grid gap-2 text-sm">
                    Nome da etapa
                    <Input
                      value={stage.title}
                      disabled={saving}
                      onChange={(event) =>
                        updateStage(stage.id, (item) => ({ ...item, title: event.target.value }))
                      }
                    />
                  </label>
                  <fieldset className="space-y-3">
                    <legend className="mb-2 font-medium">Cursos que esta etapa pede</legend>
                    {stage.requirements.map((requirement, requirementIndex) => (
                      <div key={requirement.courseId} className="flex flex-wrap items-center gap-2">
                        <label className="grid min-w-48 flex-1 gap-1 text-sm">
                          Curso
                          <select
                            value={requirement.courseId}
                            disabled={saving}
                            className="rounded-md border bg-background p-2"
                            onChange={(event) =>
                              updateStage(stage.id, (item) => ({
                                ...item,
                                requirements: item.requirements.map((entry, at) =>
                                  at === requirementIndex
                                    ? { ...entry, courseId: event.target.value }
                                    : entry,
                                ),
                              }))
                            }
                          >
                            {!courses.some((course) => course.id === requirement.courseId) ? (
                              <option value={requirement.courseId}>Curso indisponível</option>
                            ) : null}
                            {courses.map((course) => (
                              <option
                                key={course.id}
                                value={course.id}
                                disabled={stage.requirements.some(
                                  (entry) => entry !== requirement && entry.courseId === course.id,
                                )}
                              >
                                {course.title} ({courseTierLabel(course.level ?? '', course.track)})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1 text-sm">
                          O que o aluno faz
                          <select
                            value={requirement.milestone}
                            disabled={saving}
                            className="rounded-md border bg-background p-2"
                            onChange={(event) => {
                              const milestone =
                                event.target.value === 'showcase' ? 'showcase' : 'complete'
                              updateStage(stage.id, (item) => ({
                                ...item,
                                requirements: item.requirements.map((entry, at) =>
                                  at === requirementIndex ? { ...entry, milestone } : entry,
                                ),
                              }))
                            }}
                          >
                            <option value="complete">Concluir o curso</option>
                            <option value="showcase">Concluir e publicar projeto</option>
                          </select>
                        </label>
                        <Button
                          variant="outline"
                          disabled={saving || stage.requirements.length === 1}
                          onClick={() =>
                            updateStage(stage.id, (item) => ({
                              ...item,
                              requirements: item.requirements.filter(
                                (_, at) => at !== requirementIndex,
                              ),
                            }))
                          }
                        >
                          Remover curso
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      disabled={
                        saving ||
                        !courses.some(
                          (course) =>
                            !stage.requirements.some(
                              (requirement) => requirement.courseId === course.id,
                            ),
                        )
                      }
                      onClick={() => {
                        const course = courses.find(
                          (course) =>
                            !stage.requirements.some(
                              (requirement) => requirement.courseId === course.id,
                            ),
                        )
                        if (course)
                          updateStage(stage.id, (item) => ({
                            ...item,
                            requirements: [
                              ...item.requirements,
                              { courseId: course.id, milestone: 'complete' },
                            ],
                          }))
                      }}
                    >
                      Adicionar curso
                    </Button>
                  </fieldset>
                  <fieldset>
                    <legend className="mb-3 font-medium">O que esta etapa libera</legend>
                    <div className="flex flex-wrap gap-4">
                      {ADULT_CREATOR_CAPABILITIES.map((capability) => (
                        <label key={capability} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            disabled={saving}
                            checked={stage.capabilities.includes(capability)}
                            onChange={(event) =>
                              updateStage(stage.id, (item) => ({
                                ...item,
                                capabilities: event.target.checked
                                  ? [...item.capabilities, capability]
                                  : item.capabilities.filter((value) => value !== capability),
                              }))
                            }
                          />
                          {labels[capability]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </Card>
              ))}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  disabled={saving || !courses.length}
                  onClick={() => {
                    const course = courses[0]
                    if (course)
                      setDraft((policy) =>
                        policy
                          ? {
                              ...policy,
                              stages: [
                                ...policy.stages,
                                {
                                  id: `etapa-${crypto.randomUUID()}`,
                                  title: 'Nova etapa',
                                  requirements: [{ courseId: course.id, milestone: 'complete' }],
                                  capabilities: [],
                                },
                              ],
                            }
                          : policy,
                      )
                  }}
                >
                  Adicionar etapa
                </Button>
                <Button disabled={saving || !dirty} onClick={() => void save()}>
                  {saving ? 'Salvando…' : 'Salvar a jornada'}
                </Button>
              </div>
            </>
          ) : null}
          <Button variant="outline" disabled={saving || loading} onClick={() => void load()}>
            Recarregar a jornada
          </Button>
          {dirty ? (
            <p className="text-sm text-muted-foreground">
              Recarregar descarta o que você mudou e ainda não salvou.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
