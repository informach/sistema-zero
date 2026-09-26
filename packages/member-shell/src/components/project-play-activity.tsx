'use client'

import type { LearningAnswers, ProjectPlayActivity } from '@sistemazero/core/learning'
import { StudioProjectPlayer } from '@sistemazero/studio/player'
import { sanitizeProjectForHost } from '@sistemazero/studio/project-validation'
import { Button } from '@sistemazero/ui/button'
import { Check, Expand, Minimize2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function clickedProjectPlayTarget(
  activity: ProjectPlayActivity,
  message: unknown,
): string | null {
  if (typeof message !== 'object' || message === null || !('type' in message)) return null
  if (message.type !== 'sz:g2d:group-click' || !('x' in message) || !('y' in message)) return null
  const x = message.x
  const y = message.y
  if (typeof x !== 'number' || typeof y !== 'number') return null
  const target = activity.targets.find(
    (item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height,
  )
  return target?.id ?? null
}

function foundIds(activity: ProjectPlayActivity, answers: LearningAnswers): string[] {
  const saved = answers.foundTargets
  return Array.isArray(saved)
    ? activity.targets.filter((target) => saved.includes(target.id)).map((target) => target.id)
    : []
}

export function ProjectPlayActivityView({
  activity,
  answers,
  onChange,
}: {
  activity: ProjectPlayActivity
  answers: LearningAnswers
  onChange: (answers: LearningAnswers) => void
}) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const toggleButton = useRef<HTMLButtonElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const found = foundIds(activity, answers)
  const current = useRef({ answers, onChange })
  current.current = { answers, onChange }
  const project = useMemo(() => {
    try {
      return sanitizeProjectForHost(activity.project)
    } catch {
      return null
    }
  }, [activity.project])
  const sendPointer = useCallback(
    (target: ProjectPlayActivity['targets'][number]) => {
      iframe.current?.contentWindow?.postMessage(
        {
          type: 'sz:pointer-at',
          x: target.x + target.width / 2,
          y: target.y + target.height / 2,
          w: activity.stage.width,
          h: activity.stage.height,
        },
        '*',
      )
    },
    [activity.stage.width, activity.stage.height],
  )

  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.source !== iframe.current?.contentWindow) return
      if (
        typeof event.data === 'object' &&
        event.data !== null &&
        'type' in event.data &&
        event.data.type === 'sz:g2d:ready'
      ) {
        setReady(true)
        for (const id of foundIds(activity, current.current.answers)) {
          const target = activity.targets.find((item) => item.id === id)
          if (target) sendPointer(target)
        }
        return
      }
      const id = clickedProjectPlayTarget(activity, event.data)
      if (!id) return
      const previous = foundIds(activity, current.current.answers)
      if (previous.includes(id)) return
      const next = { ...current.current.answers, foundTargets: [...previous, id] }
      current.current.answers = next
      current.current.onChange(next)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [activity, sendPointer])

  useEffect(() => {
    if (!expanded) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    toggleButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = oldOverflow
      window.removeEventListener('keydown', onKey)
      toggleButton.current?.focus()
    }
  }, [expanded])

  if (!project) return <p role="alert">Não foi possível abrir o jogo desta atividade.</p>

  return (
    <div
      role="region"
      aria-label={expanded ? 'Jogo ampliado' : 'Jogo pronto para brincar'}
      className={
        expanded
          ? 'fixed inset-0 z-80 flex flex-col gap-4 overflow-y-auto bg-background p-4 sm:p-6'
          : 'space-y-4'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold" role="status" aria-live="polite">
          {found.length === activity.targets.length
            ? 'Você encontrou todo mundo!'
            : `Encontrados: ${found.length} de ${activity.targets.length}`}
        </p>
        <Button
          type="button"
          variant="outline"
          ref={toggleButton}
          onClick={() => setExpanded((value) => !value)}
          className="min-h-11"
        >
          {expanded ? (
            <Minimize2 className="size-4" aria-hidden />
          ) : (
            <Expand className="size-4" aria-hidden />
          )}
          {expanded ? 'Voltar à aula' : 'Ampliar jogo'}
        </Button>
      </div>
      <div
        className={
          expanded
            ? 'mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card [@media(min-height:900px)]:max-w-5xl'
            : 'aspect-video w-full overflow-hidden rounded-xl border border-border bg-card'
        }
      >
        <StudioProjectPlayer
          ref={iframe}
          project={project}
          title="Cadê Todo Mundo? — toque nos esconderijos para procurar"
          onError={() => setFailed(true)}
        />
      </div>
      {failed ? (
        <p role="alert">Não foi possível carregar o jogo. Reabra a seção para tentar novamente.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Toque no jardim ou escolha onde procurar pelos botões.
          </p>
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="group"
            aria-label="Lugares para procurar"
          >
            {activity.targets.map((target) => {
              const discovered = found.includes(target.id)
              return (
                <Button
                  key={target.id}
                  type="button"
                  variant={discovered ? 'secondary' : 'outline'}
                  className="min-h-12 whitespace-normal"
                  disabled={!ready || discovered}
                  onClick={() => sendPointer(target)}
                >
                  {discovered && <Check className="size-4" aria-hidden />}
                  {discovered ? `Já procurou ${target.label}` : `Procurar ${target.label}`}
                </Button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
