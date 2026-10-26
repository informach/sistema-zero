'use client'

import { CREATOR_CAPABILITIES, type CreatorJourneyCurriculum } from '@sistemazero/core/journey'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import Link from 'next/link'
import { useState } from 'react'
import { KIDS_TOOL_LABELS } from '@/lib/kids-journey-editor'
import type { CourseView } from '@/lib/types'

type Stage = CreatorJourneyCurriculum['stages'][number]
type Area = CreatorJourneyCurriculum['masteries'][number]

/** Edits the published curriculum itself; legacy slots are never a second placement authority. */
export function CreatorCurriculumEditor({
  value,
  courses,
  disabled,
  onChange,
}: {
  value: CreatorJourneyCurriculum
  courses: readonly CourseView[]
  disabled: boolean
  onChange: (value: CreatorJourneyCurriculum) => void
}) {
  const [selected, setSelected] = useState<string>(value.stages[0]?.level ?? 'noob')
  const stage = value.stages.find((item) => item.level === selected)
  const area = value.masteries.find((item) => item.id === selected)
  const availableCourses = courses.filter((course) => course.modality !== 'live')
  const updateStage = (patch: Partial<Stage>) => {
    if (!stage || disabled) return
    onChange({
      ...value,
      stages: value.stages.map((item) =>
        item.level === stage.level ? { ...item, ...patch } : item,
      ),
    })
  }
  const updateArea = (patch: Partial<Area>) => {
    if (!area || disabled) return
    onChange({
      ...value,
      masteries: value.masteries.map((item) =>
        item.id === area.id ? { ...item, ...patch } : item,
      ),
    })
  }
  const selector = (label: string, courseId: string, change: (id: string) => void) => (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className="min-h-11 w-full rounded-lg border bg-background px-3 py-2"
        value={courseId}
        disabled={disabled}
        onChange={(event) => change(event.target.value)}
      >
        {!availableCourses.some((course) => course.id === courseId) ? (
          <option value={courseId}>
            {courseId ? `Vínculo indisponível (${courseId})` : 'Escolha um curso'}
          </option>
        ) : null}
        {availableCourses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
            {course.status === 'published' ? '' : ' · em preparação'}
          </option>
        ))}
      </select>
    </label>
  )
  const courseList = (label: string, ids: readonly string[], change: (ids: string[]) => void) => (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {ids.map((id, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: each editable row keeps focus when its course changes
        <div key={`${index}-${id}`} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            {selector(`Curso ${index + 1}`, id, (next) =>
              change(ids.map((item, at) => (at === index ? next : item))),
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => change(ids.filter((_, at) => at !== index))}
          >
            Remover
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={disabled || !availableCourses.some((course) => !ids.includes(course.id))}
        onClick={() => {
          const next = availableCourses.find((course) => !ids.includes(course.id))
          if (next) change([...ids, next.id])
        }}
      >
        Adicionar curso
      </Button>
    </fieldset>
  )
  return (
    <section aria-label="Currículo da Jornada do Criador" className="space-y-6">
      <Card className="space-y-2 p-5">
        <h2 className="text-lg font-semibold">Uma regra para toda a jornada</h2>
        <p className="text-sm">
          Cada posto tem duas bases. O par abre a missão, os poderes e os extras. Para avançar: duas
          bases, missão concluída e o mínimo de poderes distintos aplicados. Extras são opcionais.
        </p>
        <p className="text-sm text-muted-foreground">
          Cada curso concluído libera seus blocos. Compra específica ativa de Farol ou Cadê Todo
          Mundo? mantém o acesso próprio. Cursos em preparação aparecem aqui, mas não prometem uma
          aula disponível para o aluno.
        </p>
        <p className="text-sm text-muted-foreground">
          Os vínculos usam a identidade do curso. Renomear um curso não muda o progresso. Esta
          edição segue a preparação e publicação da política; posições históricas não substituem
          estes vínculos.
        </p>
        <Link
          href="/admin/professor/maestrias"
          className="inline-flex min-h-11 items-center font-medium text-primary underline"
        >
          Revisar entregas de Maestrias
        </Link>
      </Card>
      <nav aria-label="Editar posto ou maestria" className="flex flex-wrap gap-2">
        {value.stages.map((item) => (
          <button
            key={item.level}
            type="button"
            aria-pressed={selected === item.level}
            onClick={() => setSelected(item.level)}
            className="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium aria-pressed:border-primary aria-pressed:bg-primary/10"
          >
            {item.title}
          </button>
        ))}
        {value.masteries.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
            className="min-h-11 rounded-lg border px-3 py-2 text-sm font-medium aria-pressed:border-primary aria-pressed:bg-primary/10"
          >
            {item.title}
          </button>
        ))}
      </nav>
      {stage ? (
        <Card className="space-y-6 p-5">
          <h3 className="text-xl font-semibold">{stage.title}</h3>
          <label className="grid gap-1.5 text-sm font-medium">
            Nome do posto
            <Input
              value={stage.title}
              maxLength={160}
              disabled={disabled}
              onChange={(event) => updateStage({ title: event.target.value })}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Tipo de jogo
            <Input
              value={stage.genre ?? ''}
              maxLength={160}
              disabled={disabled}
              onChange={(event) => updateStage({ genre: event.target.value || undefined })}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            O que o aluno vai criar
            <textarea
              value={stage.goal ?? ''}
              maxLength={500}
              disabled={disabled}
              className="min-h-20 rounded-lg border bg-background p-3 font-normal"
              onChange={(event) => updateStage({ goal: event.target.value || undefined })}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            {selector('Base 2D · primeiro passo do posto', stage.base2dCourseId, (base2dCourseId) =>
              updateStage({ base2dCourseId }),
            )}
            {selector('Base 3D · completa o par', stage.base3dCourseId, (base3dCourseId) =>
              updateStage({ base3dCourseId }),
            )}
          </div>
          {selector(
            'Missão · transferência em 2D e 3D no mesmo curso',
            stage.missionCourseId,
            (missionCourseId) => updateStage({ missionCourseId }),
          )}
          <p className="text-sm text-muted-foreground">
            A missão aplica as lógicas das bases em outro contexto. Não deve exigir poderes ou
            extras para ser resolvida.
          </p>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Poderes distintos necessários para avançar</span>
            <select
              value={stage.minimumPowers}
              disabled={disabled}
              onChange={(event) =>
                updateStage({ minimumPowers: event.target.value === '1' ? 1 : 2 })
              }
              className="min-h-11 rounded-lg border bg-background px-3 py-2"
            >
              <option value="1" disabled={stage.level !== 'noob'}>
                1 poder aplicado
              </option>
              <option value="2" disabled={stage.level === 'noob'}>
                2 poderes aplicados
              </option>
            </select>
          </label>
          <section className="space-y-4">
            <h4 className="font-semibold">Poderes oferecidos</h4>
            <p className="text-sm text-muted-foreground">
              Um poder é uma mecânica distinta. Cursos equivalentes em 2D e 3D contam uma vez;
              concluir qualquer versão aplica esse poder.
            </p>
            {stage.powers.map((power, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the mechanic identifier is editable; keyed by row to preserve input focus
              <fieldset key={index} className="space-y-3 rounded-xl border p-4">
                <legend className="px-1 font-medium">Poder {index + 1}</legend>
                <label className="grid gap-1 text-sm">
                  Identidade da mecânica
                  <Input
                    value={power.mechanicId}
                    disabled={disabled}
                    onChange={(event) =>
                      updateStage({
                        powers: stage.powers.map((item, at) =>
                          at === index ? { ...item, mechanicId: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Nome do poder
                  <Input
                    value={power.title}
                    disabled={disabled}
                    onChange={(event) =>
                      updateStage({
                        powers: stage.powers.map((item, at) =>
                          at === index ? { ...item, title: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </label>
                {courseList('Versões equivalentes do poder', power.courseIds, (courseIds) =>
                  updateStage({
                    powers: stage.powers.map((item, at) =>
                      at === index ? { ...item, courseIds } : item,
                    ),
                  }),
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() =>
                    updateStage({ powers: stage.powers.filter((_, at) => at !== index) })
                  }
                >
                  Remover poder
                </Button>
              </fieldset>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() =>
                updateStage({
                  powers: [
                    ...stage.powers,
                    {
                      mechanicId: `poder-${stage.powers.length + 1}`,
                      title: 'Novo poder',
                      courseIds: [],
                    },
                  ],
                })
              }
            >
              Adicionar poder
            </Button>
          </section>
          <section className="space-y-4">
            <h4 className="font-semibold">Extras · nunca obrigatórios para promoção</h4>
            {stage.extras.map((extra, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: course assignment is editable within this row
              <div key={`${index}-${extra.courseId}`} className="space-y-3 rounded-xl border p-4">
                {selector('Curso extra', extra.courseId, (courseId) =>
                  updateStage({
                    extras: stage.extras.map((item, at) =>
                      at === index ? { ...item, courseId } : item,
                    ),
                  }),
                )}
                <label className="grid gap-1 text-sm">
                  Nome no posto
                  <Input
                    value={extra.title}
                    disabled={disabled}
                    onChange={(event) =>
                      updateStage({
                        extras: stage.extras.map((item, at) =>
                          at === index ? { ...item, title: event.target.value } : item,
                        ),
                      })
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() =>
                    updateStage({ extras: stage.extras.filter((_, at) => at !== index) })
                  }
                >
                  Remover extra
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={disabled || availableCourses.length === 0}
              onClick={() => {
                const first = availableCourses[0]
                if (first)
                  updateStage({
                    extras: [...stage.extras, { courseId: first.id, title: first.title }],
                  })
              }}
            >
              Adicionar extra
            </Button>
          </section>
          <section className="space-y-3">
            <h4 className="font-semibold">Ferramentas conquistadas</h4>
            {stage.grants.map((grant, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: grants have no independent identity and their milestone is editable
                key={`${grant.after}-${index}`}
                className="grid gap-2 rounded-lg border p-3 text-sm"
              >
                <span>
                  {grant.capabilities.map((capability) => KIDS_TOOL_LABELS[capability]).join(', ')}
                </span>
                <select
                  aria-label="Quando a ferramenta é conquistada"
                  value={grant.after}
                  disabled={disabled}
                  className="min-h-11 rounded-lg border bg-background px-3"
                  onChange={(event) =>
                    updateStage({
                      grants: stage.grants.map((item, at) =>
                        at === index
                          ? event.target.value === 'course'
                            ? {
                                after: 'course',
                                courseId: stage.base2dCourseId,
                                capabilities: item.capabilities,
                              }
                            : {
                                after: event.target.value as 'base2d' | 'base3d' | 'pair',
                                capabilities: item.capabilities,
                              }
                          : item,
                      ),
                    })
                  }
                >
                  <option value="base2d">Depois da base 2D</option>
                  <option value="base3d">Depois da base 3D</option>
                  <option value="pair">Depois das duas bases</option>
                  <option value="course">Depois de um curso específico</option>
                </select>
                {grant.after === 'course'
                  ? selector('Curso que libera a ferramenta', grant.courseId, (courseId) =>
                      updateStage({
                        grants: stage.grants.map((item, at) =>
                          at === index ? { ...grant, courseId } : item,
                        ),
                      }),
                    )
                  : null}
                <fieldset className="flex flex-wrap gap-3">
                  <legend className="mb-2 font-medium">Ferramentas deste marco</legend>
                  {CREATOR_CAPABILITIES.map((capability) => (
                    <label key={capability} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={grant.capabilities.includes(capability)}
                        disabled={disabled}
                        onChange={(event) =>
                          updateStage({
                            grants: stage.grants.map((item, at) =>
                              at === index
                                ? {
                                    ...item,
                                    capabilities: event.target.checked
                                      ? [...item.capabilities, capability]
                                      : item.capabilities.filter((entry) => entry !== capability),
                                  }
                                : item,
                            ),
                          })
                        }
                      />
                      {capability}
                    </label>
                  ))}
                </fieldset>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() =>
                    updateStage({ grants: stage.grants.filter((_, at) => at !== index) })
                  }
                >
                  Remover marco
                </Button>
              </div>
            ))}
            {!stage.grants.length ? (
              <p className="text-sm text-muted-foreground">
                Este posto acrescenta os blocos dos cursos; não tem outra ferramenta configurada.
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() =>
                updateStage({
                  grants: [...stage.grants, { after: 'pair', capabilities: ['studio'] }],
                })
              }
            >
              Adicionar marco de ferramenta
            </Button>
          </section>
        </Card>
      ) : null}
      {area ? (
        <Card className="space-y-6 p-5">
          <h3 className="text-xl font-semibold">{area.title}</h3>
          <label className="grid gap-1.5 text-sm font-medium">
            Nome da área
            <Input
              value={area.title}
              maxLength={160}
              disabled={disabled}
              onChange={(event) => updateArea({ title: event.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm">
            Entrada na área depois do par de bases de
            <select
              value={area.opensAfterPair}
              disabled={disabled}
              className="min-h-11 rounded-lg border bg-background px-3"
              onChange={(event) =>
                updateArea({ opensAfterPair: event.target.value as Area['opensAfterPair'] })
              }
            >
              {value.stages.map((item) => (
                <option key={item.level} value={item.level}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm">
            Cada nível pede o núcleo, duas oficinas distintas entre três e um projeto aprovado em
            todos os critérios essenciais. II pede I da mesma área; III pede II. Não exige Lenda nem
            outra linguagem.
          </p>
          {area.levels.map((level, index) => {
            const update = (patch: Partial<typeof level>) =>
              updateArea({
                levels: area.levels.map((item, at) =>
                  at === index ? { ...item, ...patch } : item,
                ),
              })
            return (
              <fieldset key={level.level} className="space-y-4 rounded-xl border p-4">
                <legend className="px-1 font-semibold">
                  Nível {level.level} · {level.title}
                </legend>
                <label className="grid gap-1.5 text-sm font-medium">
                  Nome do nível
                  <Input
                    value={level.title}
                    maxLength={160}
                    disabled={disabled}
                    onChange={(event) => update({ title: event.target.value })}
                  />
                </label>
                {courseList(
                  'Núcleo · todos os cursos vinculados ou equivalência validada pela equipe',
                  level.nucleusCourseIds,
                  (nucleusCourseIds) => update({ nucleusCourseIds }),
                )}
                <fieldset className="space-y-2 rounded-lg border p-3">
                  <legend className="px-1 text-sm font-medium">
                    Ferramentas liberadas pelo núcleo
                  </legend>
                  <p className="text-sm text-muted-foreground">
                    São concedidas ao concluir o núcleo ou validar sua equivalência. A licença da
                    ferramenta continua sendo verificada no uso.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CREATOR_CAPABILITIES.map((capability) => (
                      <label key={capability} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={level.grants?.includes(capability) ?? false}
                          onChange={(event) => {
                            const grants = event.target.checked
                              ? [...(level.grants ?? []), capability]
                              : (level.grants ?? []).filter((item) => item !== capability)
                            update({ grants: grants.length ? grants : undefined })
                          }}
                        />
                        {KIDS_TOOL_LABELS[capability]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {level.workshops.map((workshop, workshopIndex) => (
                  <div key={workshop.id} className="space-y-3 rounded-lg bg-muted/40 p-3">
                    <label className="grid gap-1 text-sm">
                      Oficina {workshopIndex + 1}
                      <Input
                        value={workshop.title}
                        disabled={disabled}
                        onChange={(event) =>
                          update({
                            workshops: level.workshops.map((item, at) =>
                              at === workshopIndex ? { ...item, title: event.target.value } : item,
                            ),
                          })
                        }
                      />
                    </label>
                    {courseList('Cursos equivalentes da oficina', workshop.courseIds, (courseIds) =>
                      update({
                        workshops: level.workshops.map((item, at) =>
                          at === workshopIndex ? { ...item, courseIds } : item,
                        ),
                      }),
                    )}
                  </div>
                ))}
                <section className="space-y-3 rounded-lg border p-3">
                  {level.projectCourseId ? (
                    <>
                      {selector(
                        'Guia opcional para preparar o projeto',
                        level.projectCourseId,
                        (projectCourseId) => update({ projectCourseId }),
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        onClick={() => update({ projectCourseId: undefined })}
                      >
                        Remover guia
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disabled || !availableCourses.length}
                      onClick={() => update({ projectCourseId: availableCourses[0]?.id })}
                    >
                      Vincular guia de projeto
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground">
                    O envio acontece na página da maestria e aceita versões já salvas. Um guia não
                    substitui a avaliação do projeto.
                  </p>
                </section>
                <section className="space-y-3">
                  <h4 className="font-medium">Critérios essenciais do projeto</h4>
                  <label className="grid gap-1 text-sm">
                    Versão da rubrica
                    <Input
                      type="number"
                      min={1}
                      value={level.rubric.version}
                      disabled={disabled}
                      onChange={(event) =>
                        update({ rubric: { ...level.rubric, version: Number(event.target.value) } })
                      }
                    />
                  </label>
                  {level.rubric.criteria.map((criterion, criterionIndex) => (
                    <div key={criterion.id} className="flex items-end gap-2">
                      <label className="grid min-w-0 flex-1 gap-1 text-sm">
                        Critério {criterionIndex + 1}
                        <Input
                          value={criterion.title}
                          disabled={disabled}
                          onChange={(event) =>
                            update({
                              rubric: {
                                ...level.rubric,
                                criteria: level.rubric.criteria.map((item, at) =>
                                  at === criterionIndex
                                    ? { ...item, title: event.target.value }
                                    : item,
                                ),
                              },
                            })
                          }
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={disabled || level.rubric.criteria.length <= 1}
                        onClick={() =>
                          update({
                            rubric: {
                              ...level.rubric,
                              criteria: level.rubric.criteria.filter(
                                (item) => item.id !== criterion.id,
                              ),
                            },
                          })
                        }
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || level.rubric.criteria.length >= 30}
                    onClick={() => {
                      let suffix = 1
                      while (
                        level.rubric.criteria.some(
                          (criterion) => criterion.id === `criterio-${suffix}`,
                        )
                      )
                        suffix++
                      update({
                        rubric: {
                          ...level.rubric,
                          criteria: [
                            ...level.rubric.criteria,
                            { id: `criterio-${suffix}`, title: 'Novo critério essencial' },
                          ],
                        },
                      })
                    }}
                  >
                    Adicionar critério
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Ao mudar o que é avaliado, publique uma nova versão. Entregas anteriores
                    conservam a rubrica e a evidência que foram enviadas.
                  </p>
                </section>
              </fieldset>
            )
          })}
        </Card>
      ) : null}
    </section>
  )
}
