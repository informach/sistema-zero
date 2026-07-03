/**
 * Card FECHADO do kanban: título (botão que abre a missão), resumo e o botão
 * de ESTADO (caminho primário, funciona em touch e desktop): backlog "Começar"
 * → doing "Já funciona? Teste!" → review "Consegui!" → done (selo). O primeiro
 * card do backlog ganha o destaque de "próxima recomendada". Com `author`, a
 * criança edita/apaga/reordena o card e escreve uma anotação (autoria manual).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useState } from 'react'
import type { PensaTaskView } from '../../core/types'
import { usePensaApp } from '../appContext'

/** Callbacks de autoria manual (ausente = card só-leitura, como antes). */
export interface MissionCardAuthor {
  onEdit: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  onNotesSave: (notes: string | null) => void
}

export function MissionCard({
  task,
  recommended,
  busy,
  onOpen,
  onAction,
  author,
}: {
  task: PensaTaskView
  /** Primeira do backlog: destaque "Próxima!". */
  recommended: boolean
  /** Movimento em voo: desabilita o botão de estado. */
  busy: boolean
  onOpen: () => void
  /** Ação do botão de estado (ausente na coluna done). */
  onAction: () => void
  author?: MissionCardAuthor
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageR
  const a = c.author
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState(task.notes ?? '')

  const actionLabel =
    task.column === 'backlog'
      ? c.cardStart
      : task.column === 'doing'
        ? c.cardTest
        : task.column === 'review'
          ? c.cardFinish
          : null

  const commitNotes = (): void => {
    const next = noteDraft.trim()
    const prev = task.notes ?? ''
    if (next !== prev) author?.onNotesSave(next.length > 0 ? next : null)
    setNotesOpen(false)
  }

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

      {author ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5 border-t-2 border-pz-bg pt-2">
            <IconButton label={a.editMission} glyph="✏️" onClick={author.onEdit} disabled={busy} />
            <IconButton
              label={a.moveUp}
              glyph="↑"
              onClick={author.onMoveUp}
              disabled={busy || !author.canMoveUp}
            />
            <IconButton
              label={a.moveDown}
              glyph="↓"
              onClick={author.onMoveDown}
              disabled={busy || !author.canMoveDown}
            />
            <button
              type="button"
              onClick={() => {
                setNoteDraft(task.notes ?? '')
                setNotesOpen((v) => !v)
              }}
              aria-expanded={notesOpen}
              className={clsx(
                'ml-auto flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs font-bold transition',
                task.notes
                  ? 'text-pz-accent hover:bg-pz-bg'
                  : 'text-pz-muted hover:bg-pz-bg hover:text-pz-text',
              )}
            >
              <span aria-hidden="true">📝</span>
              {a.notesLabel}
            </button>
            <IconButton
              label={a.deleteMission}
              glyph="🗑️"
              onClick={author.onDelete}
              disabled={busy}
              danger
            />
          </div>
          {notesOpen ? (
            <textarea
              value={noteDraft}
              maxLength={2000}
              rows={2}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={commitNotes}
              placeholder={a.notesPlaceholder}
              aria-label={a.notesLabel}
              className="w-full resize-none rounded-2xl border-2 border-pz-border bg-pz-bg px-3 py-2 text-sm text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
            />
          ) : task.notes ? (
            <p className="rounded-2xl bg-pz-bg px-3 py-1.5 text-sm text-pz-muted">
              <span aria-hidden="true">📝 </span>
              {task.notes}
            </p>
          ) : null}
        </>
      ) : null}
    </article>
  )
}

function IconButton({
  label,
  glyph,
  onClick,
  disabled,
  danger,
}: {
  label: string
  glyph: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(
        'flex size-9 items-center justify-center rounded-xl border-2 border-pz-border text-pz-muted transition disabled:cursor-not-allowed disabled:opacity-40',
        danger
          ? 'hover:border-pz-warn hover:text-pz-warn'
          : 'hover:border-pz-accent hover:text-pz-accent',
      )}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  )
}
