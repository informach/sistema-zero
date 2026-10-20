'use client'

import type { PensaDestination } from '@sistemazero/core/pensa'
import { type CSSProperties, type ReactNode, useId, useRef, useState } from 'react'
import { PensaMissionContent } from './pensa-mission-content'
import type { PensaMissionSession } from './pensa-mission-session'

const WORKSHOP: Record<PensaDestination, string> = {
  studio: 'Estúdio',
  pinta: 'Pinta',
  molda: 'Molda',
}

/*
 * Without a mission the layout is a plain height chain, written inline: hosts without
 * `tool-chrome.css` (a lesson block, the admin) never mount a panel and still get the same
 * flex chain. With a mission the sheet owns the layout (the host that mounts a panel imports
 * it): a column with the panel BELOW the workshop, and a row with the panel docked on the RIGHT
 * when the workshop area is at least 1100px wide. Inline styles would beat the sheet, so they
 * are dropped as soon as a panel exists; the elements themselves stay the same.
 */
const OUTER: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minWidth: 0,
  minHeight: 0,
  height: '100%',
}
const ROW: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minWidth: 0,
  minHeight: 0,
}
const WORK: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minWidth: 0,
  minHeight: 0,
}

/**
 * The workshop and its Pensa mission side by side. The panel never covers the workshop: it is
 * a column of its own (or a band below it on narrow screens), and the workshop resizes into the
 * space that is left. The tree is the same with or without a panel, so the editor never remounts
 * when a mission arrives or leaves.
 */
export function PensaMissionLayout({
  panel,
  children,
}: {
  panel?: ReactNode
  children: ReactNode
}) {
  const docked = Boolean(panel)
  return (
    <div
      className={`sz-tool-mission-layout${docked ? ' has-panel' : ''}`}
      style={docked ? undefined : OUTER}
    >
      <div className="sz-tool-mission-layout__row" style={docked ? undefined : ROW}>
        <div className="sz-tool-mission-layout__work" style={docked ? undefined : WORK}>
          {children}
        </div>
        {panel}
      </div>
    </div>
  )
}

function LampIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="sz-tool-mission-panel__chevron"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/**
 * The Pensa mission inside Estúdio, Pinta and Molda. Open, it is the amber header that
 * collapses it, the brief, the workshop controls (`children`, inside "Para esta missão") and the
 * actions. Collapsed, it is a 64px rail on the right edge (or a one-line bar on narrow screens)
 * that opens it again. Problems never hide: errors and `recovery` stay visible when collapsed.
 */
export function PensaMissionPanel({
  session,
  children,
  extensionName,
  recovery,
  note: noteMode = 'inline',
  hint,
}: {
  session: PensaMissionSession
  /** Workshop controls, shown inside "Para esta missão". */
  children?: ReactNode
  extensionName?: string
  /** A recovery message (warning tone). Stays visible when the panel is collapsed. */
  recovery?: ReactNode
  /** "Onde parei" as an open field (Estúdio) or folded behind its title (Pinta, Molda). */
  note?: 'inline' | 'folded'
  /** Overrides the line under the main action. */
  hint?: string
}) {
  const mainId = useId()
  const noteId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [note, setNote] = useState(session.progress.resumeNote ?? '')
  const actionRef = useRef(false)
  const noticeRef = useRef<HTMLParagraphElement>(null)
  const doneRef = useRef<HTMLParagraphElement>(null)
  const { mission, progress, order, nextMission, handoffTo, collapsed } = session
  const done = progress.status === 'completed' && progress.validity === 'current'
  const status =
    progress.validity === 'needs_review'
      ? 'Conferir de novo'
      : done
        ? 'Pronta'
        : progress.status === 'in_progress'
          ? 'Fazendo'
          : 'Por fazer'
  const stateKey = done ? 'done' : progress.validity === 'needs_review' ? 'review' : 'open'
  const workshop = WORKSHOP[mission.destination]
  const kicker = [
    'Pensa',
    session.project.name,
    order ? `missão ${order.index} de ${order.total}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const fraction = order ? `${order.index}/${order.total}` : null
  const teamHandoff = mission.kind === 'asset' && handoffTo ? handoffTo : null
  const doneText = nextMission
    ? `Missão pronta. A próxima é ${nextMission.title}${
        nextMission.destination === mission.destination
          ? ''
          : `, no ${WORKSHOP[nextMission.destination]}`
      }.`
    : 'Missão pronta.'
  const primaryHint =
    hint ??
    (progress.validity === 'needs_review'
      ? 'A missão volta a ficar pronta.'
      : teamHandoff
        ? `Depois de conferir, ${teamHandoff.name} encontra esta arte no Estúdio.`
        : 'A missão fica pronta e a próxima aparece aqui.')
  const hasAlert = Boolean(error || recovery)
  const links = session.references.filter((reference) => reference.href)

  async function run(
    action: () => void | Promise<void>,
    waiting: string,
    success = '',
    focus: 'notice' | 'done' = 'notice',
  ) {
    if (actionRef.current) return
    actionRef.current = true
    setBusy(true)
    setError(null)
    setNotice(waiting)
    try {
      await action()
      setNotice(success)
      // The finished state renders after the host applies the server answer.
      if (focus === 'done') setTimeout(() => doneRef.current?.focus(), 0)
      else if (success) noticeRef.current?.focus()
    } catch (cause) {
      const childMessage =
        cause && typeof cause === 'object' && 'childMessage' in cause ? cause.childMessage : null
      setNotice('')
      setError(
        typeof childMessage === 'string'
          ? childMessage
          : 'Não consegui guardar esta mudança. Tente novamente.',
      )
    } finally {
      actionRef.current = false
      setBusy(false)
    }
  }

  const noteField = (
    <>
      <textarea
        id={noteId}
        rows={2}
        value={note}
        maxLength={2000}
        placeholder="Uma nota para continuar depois"
        onChange={(event) => setNote(event.target.value)}
      />
      <button
        type="button"
        className="sz-tool-mission-panel__btn sz-tool-mission-panel__btn--small"
        disabled={busy || Boolean(session.blockedReason)}
        onClick={() =>
          void run(() => session.onSaveNote(note), 'Guardando sua nota…', 'Nota guardada.')
        }
      >
        Guardar nota
      </button>
    </>
  )

  return (
    <aside
      className={`sz-tool-guide sz-tool-mission-panel${collapsed ? ' is-collapsed' : ''}${
        hasAlert ? ' has-alert' : ''
      }`}
      aria-label="Missão do Pensa"
      data-workshop={mission.destination}
    >
      <h2 className="sz-tool-mission-panel__heading">
        {/* ONE button in both states: the node survives the toggle, and so does the focus. */}
        <button
          type="button"
          className={collapsed ? 'sz-tool-mission-panel__rail' : 'sz-tool-mission-panel__head'}
          aria-expanded={!collapsed}
          aria-controls={collapsed ? undefined : mainId}
          title={collapsed ? undefined : 'Recolher a missão'}
          onClick={() => session.onCollapsedChange(!collapsed)}
        >
          <span className="sz-tool-mission-panel__lamp">
            <LampIcon />
          </span>
          {collapsed ? (
            <>
              {fraction ? (
                <span className="sz-tool-mission-panel__fraction" aria-hidden="true">
                  {fraction}
                </span>
              ) : null}
              <span className="sz-tool-mission-panel__rail-text">Ver missão · {mission.title}</span>
              <span className="sz-tool-mission-panel__bar-text">
                Missão{fraction ? ` ${fraction}` : ''} · {mission.title}
              </span>
              <span className="sz-tool-mission-panel__state" data-state={stateKey}>
                {status}
              </span>
            </>
          ) : (
            <>
              <span className="sz-tool-mission-panel__head-text">
                <span className="sz-tool-mission-panel__kicker">{kicker}</span>
                <span className="sz-tool-guide__title sz-tool-mission-panel__title">
                  {mission.title}
                </span>
              </span>
              <span className="sz-tool-mission-panel__chips">
                <span
                  className={`sz-tool-mission-panel__chip sz-tool-mission-panel__chip--${mission.destination}`}
                >
                  {workshop}
                </span>
                <span className="sz-tool-mission-panel__state" data-state={stateKey}>
                  {status}
                </span>
              </span>
            </>
          )}
          <ChevronIcon />
        </button>
      </h2>
      {recovery ? (
        <div className="sz-tool-guide__alert sz-tool-guide__alert--warn">{recovery}</div>
      ) : null}
      {collapsed ? null : (
        <div id={mainId} className="sz-tool-mission-panel__main">
          <div className="sz-tool-mission-panel__body">
            {teamHandoff ? (
              <p className="sz-tool-mission-panel__team">
                <span className="sz-tool-mission-panel__avatar" aria-hidden="true">
                  {teamHandoff.name.trim().charAt(0).toLocaleUpperCase('pt-BR')}
                </span>
                <span>
                  Você faz as artes. <strong>{teamHandoff.name} programa</strong> e recebe o que
                  você criar nesta missão.
                </span>
              </p>
            ) : null}
            <PensaMissionContent
              variant="panel"
              mission={mission}
              extensionName={extensionName}
              renderListen={session.renderListen}
            >
              {children}
              {noteMode === 'inline' ? (
                <div className="sz-tool-mission-content__item sz-tool-mission-panel__note">
                  <label htmlFor={noteId}>Onde parei</label>
                  {noteField}
                </div>
              ) : (
                <details className="sz-tool-mission-content__item sz-tool-mission-panel__note">
                  <summary>Onde parei</summary>
                  <label htmlFor={noteId} className="sz-tool-mission-panel__sr">
                    Onde parei
                  </label>
                  {noteField}
                </details>
              )}
            </PensaMissionContent>
            {links.length ? (
              <details className="sz-tool-mission-panel__help">
                <summary>Ajuda para esta missão</summary>
                <ul>
                  {links.map((reference) => (
                    <li key={`${reference.kind}:${reference.id}`}>
                      <a href={reference.href ?? undefined}>{reference.title}</a>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
          <div className="sz-tool-mission-panel__foot">
            {session.blockedReason ? (
              <p className="sz-tool-mission-panel__blocked" role="status">
                {session.blockedReason}
              </p>
            ) : null}
            {done ? (
              <>
                <p ref={doneRef} tabIndex={-1} className="sz-tool-mission-panel__done">
                  <CheckIcon />
                  <span>{doneText}</span>
                </p>
                <button
                  type="button"
                  className="sz-tool-mission-panel__btn sz-tool-mission-panel__btn--primary"
                  aria-disabled={busy}
                  onClick={() => void run(session.onNextMission, 'Abrindo seu caminho…')}
                >
                  {session.nextMissionLabel}
                </button>
                <button
                  type="button"
                  className="sz-tool-mission-panel__btn"
                  disabled={busy || Boolean(session.blockedReason)}
                  onClick={() =>
                    void run(
                      session.onReopen,
                      'Reabrindo a missão…',
                      'Você pode continuar esta missão.',
                    )
                  }
                >
                  Quero mexer de novo
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="sz-tool-mission-panel__btn sz-tool-mission-panel__btn--primary"
                  disabled={Boolean(session.blockedReason)}
                  aria-disabled={busy}
                  aria-busy={busy}
                  onClick={() =>
                    void run(session.onComplete, 'Guardando e conferindo…', '', 'done')
                  }
                >
                  {progress.validity === 'needs_review'
                    ? 'Conferi de novo'
                    : mission.kind === 'setup'
                      ? 'Já preparei'
                      : mission.kind === 'playtest'
                        ? 'Experimentei'
                        : 'Conferi e está pronto'}
                </button>
                <p className="sz-tool-mission-panel__hint">{primaryHint}</p>
              </>
            )}
            <div className="sz-tool-mission-panel__row">
              <button
                type="button"
                className="sz-tool-mission-panel__btn sz-tool-mission-panel__btn--compact"
                disabled={busy}
                onClick={() => void run(session.onNeedHelp, 'Abrindo a ajuda…')}
              >
                Preciso de ajuda
              </button>
              <button
                type="button"
                className="sz-tool-mission-panel__link"
                disabled={busy}
                onClick={() => void run(session.onReturnToPlan, 'Voltando ao plano…')}
              >
                Voltar ao plano
              </button>
            </div>
          </div>
        </div>
      )}
      {error ? (
        <p className="sz-tool-guide__alert" role="alert">
          {error}
        </p>
      ) : null}
      <p ref={noticeRef} role="status" tabIndex={-1} className="sz-tool-mission-panel__notice">
        {notice}
      </p>
    </aside>
  )
}
