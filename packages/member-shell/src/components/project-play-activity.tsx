'use client'

import {
  type LearningAnswers,
  type ProjectPlayActivity,
  projectPlayComplete,
} from '@sistemazero/core/learning'
import { StudioProjectPlayer } from '@sistemazero/studio/player'
import { sanitizeProjectForHost } from '@sistemazero/studio/project-validation'
import { Button } from '@sistemazero/ui/button'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Expand, Minimize2, RotateCcw } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  header,
  children,
}: {
  activity: ProjectPlayActivity
  answers: LearningAnswers
  onChange: (answers: LearningAnswers) => void
  header?: ReactNode
  children?: ReactNode
}) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [inlineHeight, setInlineHeight] = useState<number | null>(null)
  const expanded = inlineHeight !== null
  const [round, setRound] = useState(0)
  const roundFound = useRef<string[]>([])
  const readyWindow = useRef<MessageEventSource | null>(null)
  const workspace = useModalA11y<HTMLElement>({
    open: expanded,
    onClose: () => setInlineHeight(null),
  })
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
      if (!iframe.current?.contentWindow || event.source !== iframe.current.contentWindow) return
      if (typeof event.data !== 'object' || event.data === null || !('type' in event.data)) return
      if (event.data.type === 'sz:escape') {
        setInlineHeight(null)
        return
      }
      if (activity.completion === 'participation') {
        if (
          event.data.type !== 'sz:game-interaction' ||
          projectPlayComplete(activity, current.current.answers)
        )
          return
        const next = { ...current.current.answers, participated: true }
        current.current.answers = next
        current.current.onChange(next)
        return
      }
      if (event.data.type === 'sz:g2d:ready') {
        if (readyWindow.current === event.source) return
        readyWindow.current = event.source
        setReady(true)
        // Só a retomada restaura os achados. Jogar de novo começa uma partida vazia.
        roundFound.current = round === 0 ? foundIds(activity, current.current.answers) : []
        for (const id of roundFound.current) {
          const target = activity.targets.find((item) => item.id === id)
          if (target) sendPointer(target)
        }
        return
      }
      const id = clickedProjectPlayTarget(activity, event.data)
      if (!id || roundFound.current.includes(id)) return
      roundFound.current = [...roundFound.current, id]
      // Depois da primeira vitória, brincar novamente não desfaz a conclusão
      // nem altera a tentativa que pode ainda estar sendo salva no servidor.
      if (projectPlayComplete(activity, current.current.answers)) return
      const next = { ...current.current.answers, foundTargets: roundFound.current }
      current.current.answers = next
      current.current.onChange(next)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [activity, sendPointer, round])

  useEffect(() => {
    if (!expanded) return
    // O iframe tem navegação de teclado própria. Inert impede que o Tab saia
    // dele e alcance controles da aula que ficaram escondidos sob o modo ampliado.
    const siblings = new Map<HTMLElement, boolean>()
    let node: HTMLElement | null = workspace.current
    while (node?.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== node) {
          siblings.set(sibling, sibling.inert)
          sibling.inert = true
        }
      }
      node = node.parentElement
    }
    return () => {
      for (const [sibling, inert] of siblings) sibling.inert = inert
    }
  }, [expanded, workspace])

  function restart() {
    roundFound.current = []
    readyWindow.current = null
    setReady(false)
    setFailed(false)
    setRound((value) => value + 1)
    if (
      activity.completion !== 'participation' &&
      !projectPlayComplete(activity, current.current.answers)
    ) {
      const next = { ...current.current.answers, foundTargets: [] }
      current.current.answers = next
      current.current.onChange(next)
    }
  }

  if (!project) return <p role="alert">Não foi possível abrir o jogo desta atividade.</p>

  return (
    // O espaçamento entre blocos pertence ao wrapper, não à seção fixa ampliada.
    <div style={{ minHeight: inlineHeight ?? undefined }}>
      <section
        ref={workspace}
        {...(expanded ? { role: 'dialog', 'aria-modal': true, tabIndex: -1 } : { role: 'region' })}
        aria-label={expanded ? 'Jogo ampliado' : 'Jogo pronto para brincar'}
        className={`sz-lesson-activity sz-project-play-workspace${expanded ? ' sz-activity-workspace--expanded' : ''}`}
      >
        <div className="sz-activity-workspace-card space-y-5">
          {header}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={!ready && !failed}
              onClick={restart}
            >
              <RotateCcw className="size-4" aria-hidden />
              Jogar de novo
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-expanded={expanded}
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true })
                setInlineHeight(expanded ? null : (workspace.current?.offsetHeight ?? 0))
              }}
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
            style={{ aspectRatio: `${activity.stage.width} / ${activity.stage.height}` }}
            className={
              expanded
                ? 'mx-auto w-full max-w-3xl shrink-0 overflow-hidden rounded-xl border border-border bg-card [@media(min-height:900px)]:max-w-5xl'
                : 'w-full overflow-hidden rounded-xl border border-border bg-card'
            }
          >
            <StudioProjectPlayer
              key={round}
              ref={iframe}
              tabIndex={0}
              project={project}
              title={project.name}
              onError={() => setFailed(true)}
              onReady={() => setReady(true)}
            />
          </div>
          {failed && (
            <p role="alert">
              Não foi possível carregar o jogo. Aperte Jogar de novo para tentar novamente.
            </p>
          )}
          {children}
        </div>
      </section>
    </div>
  )
}
