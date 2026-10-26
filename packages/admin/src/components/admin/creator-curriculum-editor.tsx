'use client'

import { CREATOR_CAPABILITIES, type CreatorJourneyCurriculum } from '@sistemazero/core/journey'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Input } from '@sistemazero/ui/input'
import Link from 'next/link'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
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
  const cardRef = useRef<HTMLDivElement>(null)
  // A grade de Cursos leva direto a um posto ou Maestria (`?posto=<nível ou área>`). Lido depois
  // de montar: o servidor não conhece o endereço do navegador e a hidratação ficaria diferente.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só a chegada pelo link escolhe o posto; editar a política não pode trocar a seleção
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('posto')
    if (
      target &&
      (value.stages.some((item) => item.level === target) ||
        value.masteries.some((item) => item.id === target))
    ) {
      setSelected(target)
      requestAnimationFrame(() => cardRef.current?.scrollIntoView?.({ block: 'start' }))
    }
  }, [])
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
      <CourseState course={availableCourses.find((course) => course.id === courseId)} />
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
      <Card className="space-y-4 p-5 md:p-6">
        <div className="space-y-1">
          <h2 className="font-display font-semibold text-lg">Uma regra para toda a jornada</h2>
          <p className="text-sm">
            Cada posto tem dois cursos da trilha, um 2D e um 3D. Os dois juntos abrem a missão, os
            Poderes e os extras. Para subir: os cursos da trilha, a missão concluída e o mínimo de
            Poderes distintos. Extras são opcionais.
          </p>
        </div>
        <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {RULE_STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-3">
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs"
              >
                {index + 1}
              </span>
              <span className="min-w-0 text-sm">
                <strong className="block">{step.title}</strong>
                <span className="text-muted-foreground text-xs">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground">
          Cada curso concluído libera os blocos dele. Compra específica ativa de Farol ou Cadê Todo
          Mundo? mantém o acesso próprio. Cursos em preparação aparecem aqui, mas não prometem uma
          aula disponível para o aluno. Os vínculos usam a identidade do curso: renomear um curso
          não muda o progresso, e posições históricas não substituem estes vínculos.
        </p>
        <Link
          href="/admin/professor/maestrias"
          className="inline-flex min-h-11 items-center font-medium text-primary underline"
        >
          Revisar entregas de Maestrias
        </Link>
      </Card>
      <nav aria-label="Editar posto ou maestria" className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-mono font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Postos
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {value.stages.map((item, index) => (
              <button
                key={item.level}
                type="button"
                aria-pressed={selected === item.level}
                onClick={() => setSelected(item.level)}
                className={PICKER}
              >
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-muted font-bold text-xs"
                >
                  {index + 1}
                </span>
                <span className="min-w-0 break-words leading-tight">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="font-mono font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            Maestrias
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {value.masteries.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
                className={PICKER}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      </nav>
      <div ref={cardRef} className="scroll-mt-6" />
      {stage ? (
        <Card className="space-y-5 p-5 md:p-6">
          <header className="space-y-0.5">
            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
              Posto {value.stages.findIndex((item) => item.level === stage.level) + 1} de{' '}
              {value.stages.length}
            </span>
            <h3 className="font-display font-semibold text-xl">{stage.title}</h3>
          </header>
          <EditorSection title="Sobre o posto">
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
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
          </EditorSection>
          <EditorSection
            title="Cursos da trilha (2D e 3D)"
            hint="Primeiro o 2D, depois o 3D. Os dois juntos abrem a missão, os Poderes e os extras."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {selector(
                'Curso da trilha 2D · primeiro passo do posto',
                stage.base2dCourseId,
                (base2dCourseId) => updateStage({ base2dCourseId }),
              )}
              {selector(
                'Curso da trilha 3D · completa a trilha',
                stage.base3dCourseId,
                (base3dCourseId) => updateStage({ base3dCourseId }),
              )}
            </div>
          </EditorSection>
          <EditorSection
            title="Missão"
            hint="A missão aplica as lógicas dos cursos da trilha em outro contexto. Não deve exigir Poderes ou extras para ser resolvida."
          >
            {selector(
              'Curso da missão · 2D e 3D no mesmo curso',
              stage.missionCourseId,
              (missionCourseId) => updateStage({ missionCourseId }),
            )}
          </EditorSection>
          <EditorSection
            title={`Poderes · ${stage.minimumPowers} ${stage.minimumPowers === 1 ? 'exigido' : 'exigidos'}`}
            hint="Um Poder é uma mecânica distinta. Cursos equivalentes em 2D e 3D contam uma vez: concluir qualquer versão aplica esse Poder."
          >
            <label className="grid max-w-sm gap-1.5 text-sm">
              <span className="font-medium">Poderes distintos necessários para subir</span>
              <select
                value={stage.minimumPowers}
                disabled={disabled}
                onChange={(event) =>
                  updateStage({ minimumPowers: event.target.value === '1' ? 1 : 2 })
                }
                className="min-h-11 rounded-lg border bg-background px-3 py-2"
              >
                <option value="1" disabled={stage.level !== 'noob'}>
                  1 Poder aplicado
                </option>
                <option value="2" disabled={stage.level === 'noob'}>
                  2 Poderes aplicados
                </option>
              </select>
            </label>
            {stage.powers.map((power, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the mechanic identifier is editable; keyed by row to preserve input focus
              <fieldset key={index} className="space-y-3 rounded-xl border bg-card p-4">
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
                  Remover Poder
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
                      title: 'Novo Poder',
                      courseIds: [],
                    },
                  ],
                })
              }
            >
              Adicionar Poder
            </Button>
          </EditorSection>
          <EditorSection
            title="Extras · não contam para subir"
            hint="Para ir além. Nunca são obrigatórios para subir de posto."
          >
            {stage.extras.map((extra, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: course assignment is editable within this row
                key={`${index}-${extra.courseId}`}
                className="space-y-3 rounded-xl border bg-card p-4"
              >
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
          </EditorSection>
          <EditorSection
            title="Ferramentas conquistadas neste posto"
            hint="Cada marco libera as ferramentas escolhidas durante a trilha. A licença da ferramenta continua sendo conferida no uso."
          >
            {stage.grants.map((grant, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: grants have no independent identity and their milestone is editable
                key={`${grant.after}-${index}`}
                className="grid gap-3 rounded-xl border bg-card p-4 text-sm"
              >
                <strong>
                  {grant.capabilities.length
                    ? grant.capabilities
                        .map((capability) => KIDS_TOOL_LABELS[capability])
                        .join(', ')
                    : 'Nenhuma ferramenta marcada'}
                </strong>
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
                  <option value="base2d">Depois do curso 2D da trilha</option>
                  <option value="base3d">Depois do curso 3D da trilha</option>
                  <option value="pair">Depois dos dois cursos da trilha</option>
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
                <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <legend className="mb-2 font-medium">Ferramentas deste marco</legend>
                  {CREATOR_CAPABILITIES.map((capability) => (
                    <label key={capability} className="flex min-h-9 items-center gap-2">
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
                      {KIDS_TOOL_LABELS[capability]}
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
                Este posto acrescenta os blocos dos cursos e não tem outra ferramenta configurada.
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
          </EditorSection>
        </Card>
      ) : null}
      {area ? (
        <Card className="space-y-5 p-5 md:p-6">
          <header className="space-y-0.5">
            <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
              Maestria · três níveis
            </span>
            <h3 className="font-display font-semibold text-xl">{area.title}</h3>
          </header>
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
            A área abre depois dos cursos da trilha de
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
              <fieldset key={level.level} className="space-y-4 rounded-xl border bg-muted/20 p-4">
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

/** Os quatro passos de um posto, na ordem em que a criança ou o adulto os encontra. */
const RULE_STEPS = [
  { title: 'Curso da trilha 2D', text: 'O primeiro passo do posto.' },
  { title: 'Curso da trilha 3D', text: 'Abre depois do 2D e completa a trilha.' },
  { title: 'Missão', text: 'Um jogo novo em 2D e 3D, sem passo a passo.' },
  { title: 'Poderes', text: '1 na Faísca e 2 nos outros postos para subir.' },
] as const

const PICKER = cn(
  'flex min-h-11 min-w-0 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm font-medium transition-colors',
  'hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary',
)

function EditorSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="space-y-0.5">
        <h4 className="font-semibold">{title}</h4>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

/** A situação do curso escolhido, embaixo do seletor: escrita, nunca só a cor. */
function CourseState({ course }: { course: CourseView | undefined }) {
  const [text, tone] = !course
    ? ['O curso deste vínculo não está na lista. Escolha outro.', 'text-destructive']
    : course.status === 'published'
      ? ['Publicado', 'text-success-foreground']
      : ['Em preparação: ainda não aparece para o aluno', 'text-warning']
  return <span className={cn('text-xs', tone)}>{text}</span>
}
