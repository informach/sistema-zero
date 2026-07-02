/**
 * Card FECHADO do kanban: título (botão que abre a missão), resumo e o botão
 * de ESTADO (caminho primário, funciona em touch e desktop): backlog "Começar"
 * → doing "Já funciona? Teste!" → review "Consegui!" → done (selo). O primeiro
 * card do backlog ganha o destaque de "próxima recomendada".
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import type { PensaTaskView } from '../../core/types'
import { usePensaApp } from '../appContext'

export function MissionCard({
  task,
  recommended,
  busy,
  onOpen,
  onAction,
}: {
  task: PensaTaskView
  /** Primeira do backlog: destaque "Próxima!". */
  recommended: boolean
  /** Movimento em voo: desabilita o botão de estado. */
  busy: boolean
  onOpen: () => void
  /** Ação do botão de estado (ausente na coluna done). */
  onAction: () => void
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageR

  const actionLabel =
    task.column === 'backlog'
      ? c.cardStart
      : task.column === 'doing'
        ? c.cardTest
        : task.column === 'review'
          ? c.cardFinish
          : null

  return (
    <article
      data-task-id={task.id}
      data-column={task.column}
      className={clsx(
        'flex flex-col gap-2 rounded-2xl border-2 bg-pz-surface p-3',
        recommended ? 'border-pz-accent' : 'border-pz-border',
      )}
    >
      {recommended ? (
        <span className="self-start rounded-full bg-pz-accent/15 px-2.5 py-0.5 text-xs font-bold text-pz-accent">
          <span aria-hidden="true">⭐ </span>
          {c.nextUp}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${c.openMission}: ${task.title}`}
        className="min-h-11 rounded-xl text-left transition hover:bg-pz-bg"
      >
        <span className="block leading-snug font-bold break-words text-pz-text">{task.title}</span>
        {task.summary ? (
          <span className="mt-0.5 block text-sm leading-snug text-pz-muted">{task.summary}</span>
        ) : null}
      </button>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          disabled={busy}
          className="min-h-11 rounded-2xl bg-pz-accent px-4 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel}
        </button>
      ) : (
        <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-pz-ok font-bold text-pz-ok">
          <span aria-hidden="true">✓</span>
          {c.cardDoneBadge}
        </span>
      )}
    </article>
  )
}
