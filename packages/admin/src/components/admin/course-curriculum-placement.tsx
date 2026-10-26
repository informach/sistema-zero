'use client'
import {
  type CreatorJourneyCurriculum,
  creatorJourneyCoursePlacements,
} from '@sistemazero/core/journey'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { creatorJourneyEditorHref } from '@/lib/creator-journey-grid'

type CurriculumStatus = 'loading' | 'error' | 'ready'

export function useCreatorCurriculum(audience: string, enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    audience: string
    attempt: number
    status: CurriculumStatus
    curriculum: CreatorJourneyCurriculum | null
  }>({ audience, attempt, status: 'loading', curriculum: null })
  useEffect(() => {
    if (!enabled) return
    let active = true
    setState({ audience, attempt, status: 'loading', curriculum: null })
    void apiGet<{ policy: { curriculum?: CreatorJourneyCurriculum } }>(
      `/api/members/journey/${audience === 'adult' ? 'adult' : 'kids'}`,
    )
      .then((record) => {
        if (active)
          setState({
            audience,
            attempt,
            status: 'ready',
            curriculum: record.policy.curriculum ?? null,
          })
      })
      .catch(() => {
        if (active) setState({ audience, attempt, status: 'error', curriculum: null })
      })
    return () => {
      active = false
    }
  }, [audience, enabled, attempt])
  const current =
    state.audience === audience && state.attempt === attempt
      ? state
      : { audience, status: 'loading' as const, curriculum: null }
  return {
    ...current,
    loaded: current.status === 'ready',
    retry: () => setAttempt((value) => value + 1),
  }
}

export function CurriculumLoadNotice({
  state,
}: {
  state: ReturnType<typeof useCreatorCurriculum>
}) {
  if (state.status === 'ready') return null
  return state.status === 'error' ? (
    <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 p-3 text-sm">
      <p>
        Não foi possível consultar a política da jornada. Carregue as regras antes de salvar este
        curso.
      </p>
      <button
        type="button"
        className="min-h-10 font-medium text-primary underline"
        onClick={state.retry}
      >
        Tentar novamente
      </button>
    </div>
  ) : (
    <p role="status" className="text-sm text-muted-foreground">
      Consultando os vínculos da jornada. Eles são definidos no editor da política.
    </p>
  )
}

/** O nome de cada papel e o que ele quer dizer, na língua da equipe. */
const ROLE: Record<string, { label: string; hint: string }> = {
  base2d: {
    label: 'Curso da trilha 2D',
    hint: 'O primeiro passo do posto. Concluir abre o curso 3D da trilha.',
  },
  base3d: {
    label: 'Curso da trilha 3D',
    hint: 'Completa os cursos da trilha. Os dois juntos abrem a missão, os Poderes e os extras.',
  },
  mission: {
    label: 'Missão',
    hint: 'Um jogo novo em 2D e 3D, sem passo a passo. Obrigatória para subir de posto.',
  },
  power: {
    label: 'Poder',
    hint: 'Uma mecânica a mais. O posto exige um número mínimo de Poderes distintos.',
  },
  extra: { label: 'Extra', hint: 'Para ir além. Não conta para subir de posto.' },
  'mastery-nucleus': {
    label: 'Núcleo da Maestria',
    hint: 'Ensina a base do nível. Um crédito validado pela equipe também vale.',
  },
  'mastery-workshop': {
    label: 'Oficina da Maestria',
    hint: 'Uma das três aplicações do nível; a pessoa escolhe duas.',
  },
  'mastery-project': {
    label: 'Guia de projeto',
    hint: 'Opcional: ajuda a preparar o projeto que a equipe avalia.',
  },
}

export function CourseCurriculumPlacement({
  curriculum,
  courseId,
  audience,
}: {
  curriculum: CreatorJourneyCurriculum
  courseId?: string
  audience: string
}) {
  const placements = courseId ? creatorJourneyCoursePlacements(curriculum, courseId) : []
  return (
    <section
      className="space-y-3 rounded-xl border bg-muted/20 p-4 text-sm"
      aria-label="Lugar na Jornada do Criador"
    >
      <h3 className="font-semibold">Lugar na Jornada do Criador</h3>
      {placements.length ? (
        <ul className="space-y-2.5">
          {placements.map((placement) => {
            const role = ROLE[placement.role] ?? { label: placement.role, hint: '' }
            const where = placement.level
              ? curriculum.stages.find((stage) => stage.level === placement.level)?.title
              : curriculum.masteries.find((area) => area.id === placement.masteryId)?.title
            return (
              <li
                key={`${placement.level ?? placement.masteryId}:${placement.masteryLevel ?? 0}:${placement.role}:${placement.mechanicId ?? placement.workshopId ?? ''}`}
                className="space-y-1 rounded-lg bg-background p-3"
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex h-6 items-center rounded-full bg-primary/10 px-2.5 font-semibold text-primary text-xs">
                    {placement.level ? `Posto ${where ?? placement.level}` : (where ?? 'Maestria')}
                    {placement.masteryLevel ? ` · nível ${placement.masteryLevel}` : ''}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 font-semibold text-xs">
                    {role.label}
                  </span>
                </span>
                {role.hint ? <p className="text-muted-foreground text-xs">{role.hint}</p> : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <p>
          {courseId
            ? 'Este curso ainda não está vinculado a um posto ou a uma Maestria.'
            : 'Depois de salvar o curso, vincule-o a um posto ou a uma Maestria no editor da jornada.'}
        </p>
      )}
      <p className="text-muted-foreground">
        O vínculo é publicado na política da jornada e reutiliza este curso e o progresso dele. O
        nível e a dimensão abaixo descrevem o curso, mas não liberam acesso sozinhos.
      </p>
      <Link
        href={creatorJourneyEditorHref(
          audience,
          placements[0]?.level ?? placements[0]?.masteryId ?? undefined,
        )}
        className="inline-flex min-h-10 items-center font-medium text-primary underline"
      >
        Editar vínculos e regras na jornada
      </Link>
    </section>
  )
}
