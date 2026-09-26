'use client'

import type { LearningAnswers, ProjectPlayActivity } from '@sistemazero/core/learning'
import { StudioProjectPlayer } from '@sistemazero/studio/player'
import { sanitizeProjectForHost } from '@sistemazero/studio/project-validation'
import { Button } from '@sistemazero/ui/button'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Expand, Minimize2, RotateCcw } from 'lucide-react'
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
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [round, setRound] = useState(0)
  const roundFound = useRef<string[]>([])
  const readyWindow = useRef<MessageEventSource | null>(null)
  const workspace = useModalA11y({ open: expanded, onClose: () => setExpanded(false) })
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
      if (typeof event.data !== 'object' || event.data === null || !('type' in event.data)) return
      if (event.data.type === 'sz:escape') {
        setExpanded(false)
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
      if (foundIds(activity, current.current.answers).length === activity.targets.length) return
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
    if (foundIds(activity, current.current.answers).length < activity.targets.length) {
      const next = { ...current.current.answers, foundTargets: [] }
      current.current.answers = next
      current.current.onChange(next)
    }
  }

  if (!project) return <p role="alert">Não foi possível abrir o jogo desta atividade.</p>

  return (
    <section
      ref={workspace}
      {...(expanded ? { role: 'dialog', 'aria-modal': true, tabIndex: -1 } : { role: 'region' })}
      aria-label={expanded ? 'Jogo ampliado' : 'Jogo pronto para brincar'}
      className={
        expanded
          ? 'fixed inset-0 z-80 flex flex-col gap-4 overflow-y-auto bg-background p-4 sm:p-6'
          : 'space-y-4'
      }
    >
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
            setExpanded((value) => !value)
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
        className={
          expanded
            ? 'mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card [@media(min-height:900px)]:max-w-5xl'
            : 'aspect-video w-full overflow-hidden rounded-xl border border-border bg-card'
        }
      >
        <StudioProjectPlayer
          key={round}
          ref={iframe}
          tabIndex={0}
          project={project}
          title={project.name}
          onError={() => setFailed(true)}
        />
      </div>
      {failed && (
        <p role="alert">
          Não foi possível carregar o jogo. Aperte Jogar de novo para tentar novamente.
        </p>
      )}
    </section>
  )
}
