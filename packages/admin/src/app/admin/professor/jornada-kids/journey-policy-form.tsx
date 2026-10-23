'use client'

import {
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  journeySlotsForTier,
  KIDS_CREATOR_CAPABILITIES,
  KIDS_JOURNEY_REQUIREMENTS_MAX,
  type KidsJourneyPolicy,
  type KidsJourneyStep,
  type KidsRequirement,
  type KidsTierAccess,
} from '@sistemazero/core/journey'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Select } from '@sistemazero/ui/select'
import { type ReactNode, useId, useState } from 'react'
import { KIDS_POST_LABELS, KIDS_TIER_LABELS, KIDS_TOOL_LABELS } from '@/lib/kids-journey-editor'
import type { CourseView } from '@/lib/types'

function Field({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <p id={id} className="text-sm font-medium">
        {title}
      </p>
      <div aria-describedby={id}>{children}</div>
    </div>
  )
}
const pickerClass =
  'rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function KidsJourneyPolicyForm({
  value,
  courses,
  disabled,
  onChange,
}: {
  value: KidsJourneyPolicy
  courses: readonly CourseView[]
  disabled: boolean
  onChange: (policy: KidsJourneyPolicy) => void
}) {
  const [post, setPost] = useState<(typeof JOURNEY_LEVEL_SLUGS)[number]>('noob')
  const [tier, setTier] = useState<(typeof JOURNEY_COURSE_TIERS)[number]>('primeiros-passos-2d')
  const step = value.steps.find((entry) => entry.level === post)
  const access = value.tierAccess.find((entry) => entry.tier === tier)
  const eligibleCourses = courses.filter(
    (course) =>
      course.audience === 'kids' &&
      course.modality !== 'live' &&
      course.level !== 'lenda' &&
      course.status === 'published',
  )
  function updateStep(patch: Partial<KidsJourneyStep>) {
    if (disabled || !step) return
    onChange({
      ...value,
      steps: value.steps.map((entry) =>
        entry.level === step.level ? { ...entry, ...patch } : entry,
      ),
    })
  }
  function updateRequirement(index: number, requirement: KidsRequirement) {
    if (!step) return
    updateStep({
      requirements: step.requirements.map((entry, i) => (i === index ? requirement : entry)),
    })
  }
  function updateAccess(patch: Partial<KidsTierAccess>) {
    if (disabled || !access) return
    onChange({
      ...value,
      tierAccess: value.tierAccess.map((entry) =>
        entry.tier === tier ? { ...entry, ...patch } : entry,
      ),
    })
  }
  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-5">
        <Field title="Andamento da jornada">
          <Select
            aria-label="Progressão"
            value={value.mode}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, mode: event.target.value === 'paused' ? 'paused' : 'active' })
            }
          >
            <option value="active">Progressão ativa</option>
            <option value="paused">Progressão pausada</option>
          </Select>
        </Field>
        <p className="text-sm text-muted-foreground">
          Pausar mantém as regras e o que cada criança já ganhou. Ninguém sobe de posto nem ganha
          ferramenta enquanto estiver pausado, mas terminar o primeiro curso de uma trilha ainda
          abre os outros cursos dela.
        </p>
      </Card>
      <section aria-labelledby="kids-posts-title" className="space-y-4">
        <div>
          <h2 id="kids-posts-title" className="text-lg font-semibold">
            Postos e ferramentas
          </h2>
          <p className="text-sm text-muted-foreground">
            Os nomes e a ordem dos postos não mudam. Para subir, a criança cumpre todos os
            requisitos do posto.
          </p>
        </div>
        <nav aria-label="Postos" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {JOURNEY_LEVEL_SLUGS.map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={post === level}
              className={pickerClass}
              onClick={() => setPost(level)}
            >
              {KIDS_POST_LABELS[level]}
            </button>
          ))}
        </nav>
        <Card className="space-y-5 p-5">
          <h3 className="font-semibold">{KIDS_POST_LABELS[post]}</h3>
          {!step ? (
            <p className="text-sm text-muted-foreground">
              A Faísca começa criando dentro das aulas. A primeira subida é para Construtor(a), e as
              ferramentas que valem fora das aulas vêm nos postos seguintes.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Cursos para chegar aqui</h4>
                {step.requirements.map((requirement, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered controlled fields have no row-local state; duplicate draft requirements must stay editable until validation.
                    key={`${step.level}-${index}`}
                    className="space-y-3 rounded-lg border bg-muted/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        Requisito {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled || step.requirements.length <= 1}
                        onClick={() =>
                          updateStep({
                            requirements: step.requirements.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Remover requisito {index + 1}
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field title="Qual curso">
                        <Select
                          aria-label={`Tipo do requisito ${index + 1}`}
                          disabled={disabled}
                          value={requirement.kind}
                          onChange={(event) => {
                            if (event.target.value === 'course') {
                              const first = eligibleCourses[0]
                              if (first)
                                updateRequirement(index, {
                                  kind: 'course',
                                  courseId: first.id,
                                  milestone: requirement.milestone,
                                })
                            } else
                              updateRequirement(index, {
                                kind: 'slot',
                                tier: 'primeiros-passos-2d',
                                slot: 1,
                                milestone: requirement.milestone,
                              })
                          }}
                        >
                          <option value="slot">Uma posição da trilha</option>
                          <option
                            value="course"
                            disabled={!eligibleCourses.length && requirement.kind !== 'course'}
                          >
                            Um curso escolhido
                          </option>
                        </Select>
                      </Field>
                      <Field title="O que a criança faz">
                        <Select
                          aria-label={`Marco do requisito ${index + 1}`}
                          disabled={disabled}
                          value={requirement.milestone}
                          onChange={(event) =>
                            updateRequirement(index, {
                              ...requirement,
                              milestone:
                                event.target.value === 'complete' ? 'complete' : 'showcase',
                            })
                          }
                        >
                          <option value="complete">Concluir o curso</option>
                          <option value="showcase">Concluir e publicar no Mural</option>
                        </Select>
                      </Field>
                      {requirement.kind === 'course' ? (
                        <div className="sm:col-span-2">
                          <Field title="Curso">
                            <Select
                              aria-label={`Curso do requisito ${index + 1}`}
                              disabled={disabled}
                              value={requirement.courseId}
                              onChange={(event) =>
                                updateRequirement(index, {
                                  ...requirement,
                                  courseId: event.target.value,
                                })
                              }
                            >
                              {!eligibleCourses.some(
                                (course) => course.id === requirement.courseId,
                              ) && (
                                <option value={requirement.courseId}>
                                  Curso indisponível · {requirement.courseId}
                                </option>
                              )}
                              {eligibleCourses.map((course) => (
                                <option key={course.id} value={course.id}>
                                  {course.title}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </div>
                      ) : (
                        <>
                          <Field title="Trilha">
                            <Select
                              aria-label={`Trilha do requisito ${index + 1}`}
                              disabled={disabled}
                              value={requirement.tier}
                              onChange={(event) => {
                                const next = JOURNEY_COURSE_TIERS.find(
                                  (entry) => entry === event.target.value,
                                )
                                if (next)
                                  updateRequirement(index, {
                                    ...requirement,
                                    tier: next,
                                    slot: Math.min(requirement.slot, journeySlotsForTier(next)),
                                  })
                              }}
                            >
                              {JOURNEY_COURSE_TIERS.map((entry) => (
                                <option key={entry} value={entry}>
                                  {KIDS_TIER_LABELS[entry]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field title="Posição">
                            <Select
                              aria-label={`Posição do requisito ${index + 1}`}
                              disabled={disabled}
                              value={requirement.slot}
                              onChange={(event) =>
                                updateRequirement(index, {
                                  ...requirement,
                                  slot: Number(event.target.value),
                                })
                              }
                            >
                              {Array.from(
                                { length: journeySlotsForTier(requirement.tier) },
                                (_, i) => i + 1,
                              ).map((position) => (
                                <option key={position} value={position}>
                                  {position}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || step.requirements.length >= KIDS_JOURNEY_REQUIREMENTS_MAX}
                  onClick={() =>
                    updateStep({
                      requirements: [
                        ...step.requirements,
                        {
                          kind: 'slot',
                          tier: 'primeiros-passos-2d',
                          slot: 1,
                          milestone: 'complete',
                        },
                      ],
                    })
                  }
                >
                  Adicionar requisito
                </Button>
              </div>
              <fieldset aria-label="Ferramentas deste posto" className="space-y-3">
                <legend className="text-sm font-medium">
                  Ferramentas conquistadas neste posto
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {KIDS_CREATOR_CAPABILITIES.map((capability) => (
                    <label key={capability} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        aria-label={KIDS_TOOL_LABELS[capability]}
                        disabled={disabled}
                        checked={step.capabilities.includes(capability)}
                        onChange={(event) =>
                          updateStep({
                            capabilities: event.target.checked
                              ? [...step.capabilities, capability]
                              : step.capabilities.filter((entry) => entry !== capability),
                          })
                        }
                      />
                      {KIDS_TOOL_LABELS[capability]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-muted-foreground">
                Valem também fora das aulas. Licença, matrícula, os blocos de cada curso e o que a
                aula pede continuam sendo conferidos à parte. Se uma ferramenta depende de outra,
                isso é conferido na comparação.
              </p>
            </>
          )}
        </Card>
      </section>
      <section aria-labelledby="kids-access-title" className="space-y-4">
        <div>
          <h2 id="kids-access-title" className="text-lg font-semibold">
            Acesso às trilhas
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada trilha tem as próprias regras. Mudar um posto acima não muda nada aqui.
          </p>
        </div>
        <nav aria-label="Trilhas" className="flex flex-wrap gap-2">
          {JOURNEY_COURSE_TIERS.map((entry) => (
            <button
              key={entry}
              type="button"
              aria-pressed={tier === entry}
              className={pickerClass}
              onClick={() => setTier(entry)}
            >
              {KIDS_TIER_LABELS[entry]}
            </button>
          ))}
        </nav>
        {access && (
          <Card className="space-y-4 p-5">
            <h3 className="font-semibold">{KIDS_TIER_LABELS[tier]}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field title="Posto que abre a trilha">
                <Select
                  aria-label="Posto de entrada"
                  disabled={disabled}
                  value={access.opensAt}
                  onChange={(event) => {
                    const level = JOURNEY_LEVEL_SLUGS.find((entry) => entry === event.target.value)
                    if (level) updateAccess({ opensAt: level })
                  }}
                >
                  {JOURNEY_LEVEL_SLUGS.map((entry) => (
                    <option key={entry} value={entry}>
                      {KIDS_POST_LABELS[entry]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field title="Posto que deixa rever a trilha inteira">
                <Select
                  aria-label="Posto de revisão"
                  disabled={disabled}
                  value={access.completedAt}
                  onChange={(event) => {
                    const level = JOURNEY_LEVEL_SLUGS.find((entry) => entry === event.target.value)
                    if (level) updateAccess({ completedAt: level })
                  }}
                >
                  {JOURNEY_LEVEL_SLUGS.map((entry) => (
                    <option key={entry} value={entry}>
                      {KIDS_POST_LABELS[entry]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field title="Primeiro curso: abre os outros cursos e os prêmios">
                <Select
                  aria-label="Marco do primeiro curso"
                  disabled={disabled}
                  value={access.foundation.milestone}
                  onChange={(event) =>
                    updateAccess({
                      foundation: {
                        ...access.foundation,
                        milestone: event.target.value === 'complete' ? 'complete' : 'showcase',
                      },
                    })
                  }
                >
                  <option value="complete">Concluir o curso</option>
                  <option value="showcase">Concluir e publicar no Mural</option>
                </Select>
              </Field>
              <Field title="Quando a trilha ainda não tem o primeiro curso">
                <Select
                  aria-label="Ausência do primeiro curso"
                  disabled={disabled}
                  value={access.foundation.whenMissing}
                  onChange={(event) =>
                    updateAccess({
                      foundation: {
                        ...access.foundation,
                        whenMissing: event.target.value === 'open' ? 'open' : 'locked',
                      },
                    })
                  }
                >
                  <option value="locked">Manter requisito pendente</option>
                  <option value="open">Dispensar esse requisito</option>
                </Select>
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Dispensar o primeiro curso não dispensa o posto que abre a trilha. Os prêmios têm
              regra própria e não abrem a trilha. Se a lista de cursos não carregar, isso nunca
              conta como curso que falta. Matrícula e acesso ao produto continuam valendo.
            </p>
          </Card>
        )}
      </section>
    </div>
  )
}
