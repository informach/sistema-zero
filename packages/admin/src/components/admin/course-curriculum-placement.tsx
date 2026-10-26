'use client'
import {
  type CreatorJourneyCurriculum,
  creatorJourneyCoursePlacements,
} from '@sistemazero/core/journey'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

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
  const labels: Record<string, string> = {
    base2d: 'Base 2D',
    base3d: 'Base 3D',
    mission: 'Missão',
    power: 'Poder',
    extra: 'Extra',
    'mastery-nucleus': 'Núcleo',
    'mastery-workshop': 'Oficina',
    'mastery-project': 'Guia de projeto',
  }
  return (
    <section
      className="space-y-3 rounded-xl border bg-muted/20 p-4 text-sm"
      aria-label="Posição no currículo"
    >
      <h3 className="font-semibold">Posição na Jornada do Criador</h3>
      {placements.length ? (
        <ul className="space-y-2">
          {placements.map((placement) => (
            <li
              key={`${placement.level ?? placement.masteryId}:${placement.masteryLevel ?? 0}:${placement.role}:${placement.mechanicId ?? placement.workshopId ?? ''}`}
            >
              <strong>{labels[placement.role]}</strong> ·{' '}
              {placement.level
                ? curriculum.stages.find((stage) => stage.level === placement.level)?.title
                : `${curriculum.masteries.find((area) => area.id === placement.masteryId)?.title} · nível ${placement.masteryLevel}`}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {courseId
            ? 'Este curso ainda não está vinculado a um posto ou maestria.'
            : 'Depois de salvar o curso, vincule-o ao posto ou à maestria no editor da jornada.'}
        </p>
      )}
      <p className="text-muted-foreground">
        O vínculo é publicado na política da jornada e reutiliza este curso e seu progresso. Nível e
        dimensão abaixo descrevem o curso, mas não concedem acesso por conta própria.
      </p>
      <Link
        href={`/admin/professor/jornada-${audience === 'adult' ? 'adulta' : 'kids'}`}
        className="inline-flex min-h-10 items-center font-medium text-primary underline"
      >
        Editar vínculos e regras na jornada
      </Link>
    </section>
  )
}
