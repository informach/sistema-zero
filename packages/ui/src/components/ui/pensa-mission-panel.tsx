'use client'

import { type ReactNode, useId, useRef, useState } from 'react'
import { PensaMissionContent } from './pensa-mission-content'
import type { PensaMissionSession } from './pensa-mission-session'

export function PensaMissionPanel({
  session,
  children,
  extensionName,
  aside = false,
  recovery,
}: {
  session: PensaMissionSession
  children?: ReactNode
  extensionName?: string
  aside?: boolean
  recovery?: ReactNode
}) {
  const contentId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [note, setNote] = useState(session.progress.resumeNote ?? '')
  const actionRef = useRef(false)
  const noticeRef = useRef<HTMLParagraphElement>(null)
  const done = session.progress.status === 'completed' && session.progress.validity === 'current'
  const status =
    session.progress.validity === 'needs_review'
      ? 'Conferir de novo'
      : done
        ? 'Pronta'
        : session.progress.status === 'in_progress'
          ? 'Fazendo'
          : 'Por fazer'
  async function run(action: () => void | Promise<void>, waiting: string, success = '') {
    if (actionRef.current) return
    actionRef.current = true
    setBusy(true)
    setError(null)
    setNotice(waiting)
    try {
      await action()
      setNotice(success)
      if (success) noticeRef.current?.focus()
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
  return (
    <aside
      className={`sz-tool-guide sz-tool-mission-panel${aside ? ' sz-tool-guide--aside sz-tool-mission-panel--aside' : ''}${session.collapsed ? ' is-collapsed' : ''}`}
      aria-label="Missão do Pensa"
    >
      <div className="sz-tool-guide__head">
        <h2>
          <button
            type="button"
            className="sz-tool-guide__toggle"
            aria-expanded={!session.collapsed}
            aria-controls={session.collapsed ? undefined : contentId}
            onClick={() => session.onCollapsedChange(!session.collapsed)}
          >
            {session.collapsed ? null : (
              <span className="sz-tool-guide__kicker">Pensa · minha missão</span>
            )}
            <span className="sz-tool-guide__title">{session.mission.title}</span>
          </button>
        </h2>
        <span className="sz-tool-guide__state">{status}</span>
      </div>
      {recovery ? (
        <div className="sz-tool-guide__alert sz-tool-guide__alert--warn">{recovery}</div>
      ) : null}
      {session.collapsed ? null : (
        <div id={contentId} className="sz-tool-guide__body">
          <PensaMissionContent
            mission={session.mission}
            extensionName={extensionName}
            renderListen={session.renderListen}
          />
          {children}
          {session.references.some((reference) => reference.href) ? (
            <details>
              <summary>Fases e ajuda para esta missão</summary>
              <ul>
                {session.references.map((reference) =>
                  reference.href ? (
                    <li key={`${reference.kind}:${reference.id}`}>
                      <a href={reference.href}>{reference.title}</a>
                    </li>
                  ) : null,
                )}
              </ul>
            </details>
          ) : null}
          <details>
            <summary>Onde parei</summary>
            <label>
              Uma nota para continuar depois
              <textarea
                value={note}
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={busy || Boolean(session.blockedReason)}
              onClick={() =>
                void run(() => session.onSaveNote(note), 'Guardando sua nota…', 'Nota guardada.')
              }
            >
              Guardar nota
            </button>
          </details>
          {session.blockedReason ? <p role="status">{session.blockedReason}</p> : null}
          <div className="sz-tool-guide__actions">
            {done ? (
              <>
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--primary"
                  aria-disabled={busy}
                  onClick={() => void run(session.onNextMission, 'Abrindo seu caminho…')}
                >
                  {session.nextMissionLabel}
                </button>
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--outline"
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
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--primary"
                disabled={Boolean(session.blockedReason)}
                aria-disabled={busy}
                aria-busy={busy}
                onClick={() =>
                  void run(session.onComplete, 'Guardando e conferindo…', 'Missão pronta!')
                }
              >
                {session.progress.validity === 'needs_review'
                  ? 'Conferi de novo'
                  : session.mission.kind === 'setup'
                    ? 'Já preparei'
                    : session.mission.kind === 'playtest'
                      ? 'Experimentei'
                      : 'Conferi e está pronto'}
              </button>
            )}
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={busy}
              onClick={() => void run(session.onNeedHelp, 'Abrindo a ajuda…')}
            >
              Preciso de ajuda
            </button>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--quiet"
              disabled={busy}
              onClick={() => void run(session.onReturnToPlan, 'Voltando ao plano…')}
            >
              Voltar ao plano
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p className="sz-tool-guide__alert" role="alert">
          {error}
        </p>
      ) : null}
      <p ref={noticeRef} role="status" tabIndex={-1}>
        {notice}
      </p>
    </aside>
  )
}
