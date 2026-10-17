import type { PensaProjectView } from '@sistemazero/core/pensa'
import { type RefObject, useId, useRef, useState } from 'react'
import type { PensaTransport } from '../core/types'
import { useDialogFocus } from './dialogFocus'

export function PensaTeamDialog({
  view,
  transport,
  onClose,
  onChanged,
  onLeft,
  returnFocusTo,
}: {
  view: PensaProjectView
  transport: PensaTransport
  onClose(): void
  onChanged(): Promise<void>
  onLeft(): void
  returnFocusTo: RefObject<HTMLElement | null>
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const acting = useRef(false)
  const pending = useRef<{ key: string; requestId: string } | null>(null)
  const titleId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const [programmer, setProgrammer] = useState(view.team.programmerProfileId)
  const [artists, setArtists] = useState(view.team.artistProfileIds)
  const [rolesRevision] = useState(view.project.teamRevision)
  const rolesChanged = rolesRevision !== view.project.teamRevision
  const owner = view.team.viewerProfileId === view.team.ownerProfileId
  const base = `/projects/${view.project.id}`
  useDialogFocus({ open: true, cardRef, busy, onClose, returnFocusTo })
  async function action(
    path: string,
    method: 'POST' | 'DELETE' | 'PUT',
    body?: Record<string, unknown>,
    leave = false,
  ) {
    if (acting.current) return
    acting.current = true
    setBusy(true)
    setError(null)
    const { requestId: _requestId, ...values } = body ?? {}
    const key = JSON.stringify({ path, method, values })
    if (pending.current?.key !== key) pending.current = { key, requestId: crypto.randomUUID() }
    try {
      await transport.request(`${base}${path}`, {
        method,
        body: { ...values, requestId: pending.current.requestId },
      })
      if (leave) onLeft()
      else await onChanged()
      pending.current = null
      setConfirm(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não consegui guardar. Tente novamente.')
    } finally {
      acting.current = false
      setBusy(false)
    }
  }
  return (
    <div className="pensa-dialog-scrim">
      <div
        className="pensa-dialog pensa-functional-team"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId}>Equipe de {view.project.name}</h2>
        {owner ? (
          <section>
            <h3>Convide pelo código</h3>
            {view.team.shareCode ? (
              <>
                <output aria-label="Código do jogo">{view.team.shareCode}</output>
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--outline"
                  onClick={() => {
                    if (!navigator.clipboard) {
                      setNotice('Selecione e copie o código.')
                      return
                    }
                    void navigator.clipboard
                      .writeText(view.team.shareCode ?? '')
                      .then(() => setNotice('Código copiado.'))
                      .catch(() => setNotice('Selecione e copie o código.'))
                  }}
                >
                  Copiar código
                </button>
              </>
            ) : (
              <p>Quem entrar precisa ter acesso ao Pensa.</p>
            )}
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={busy}
              onClick={() => void action('/share', 'POST', { requestId: crypto.randomUUID() })}
            >
              {view.team.shareCode ? 'Gerar outro código' : 'Gerar código'}
            </button>
            {view.team.shareCode ? (
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--quiet"
                disabled={busy}
                onClick={() => void action('/share', 'DELETE')}
              >
                Desligar código
              </button>
            ) : null}
          </section>
        ) : null}
        <ul>
          {view.team.people.map((person) => (
            <li key={person.profileId}>
              <span>
                {person.firstName ?? 'Colega'}
                {person.profileId === view.team.viewerProfileId ? ' · você' : ''}
                {person.owner ? ' · dona do jogo' : ''}
              </span>
              {owner && !person.owner ? (
                confirm === person.profileId ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void action(`/members/${person.profileId}`, 'DELETE')}
                    >
                      Tirar mesmo
                    </button>
                    <button type="button" onClick={() => setConfirm(null)}>
                      Deixar
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirm(person.profileId)}>
                    Tirar da equipe
                  </button>
                )
              ) : null}
            </li>
          ))}
        </ul>
        <fieldset disabled={!owner || busy || rolesChanged}>
          <legend>Quem programa</legend>
          {view.team.codeLocked ? (
            <p>
              O jogo já começou no Estúdio de quem programa. Essa função fica com a mesma pessoa.
            </p>
          ) : null}
          {view.team.people.map((person) => (
            <label key={person.profileId}>
              <input
                type="radio"
                name="pensa-programmer"
                disabled={view.team.codeLocked}
                checked={programmer === person.profileId}
                onChange={() => setProgrammer(person.profileId)}
              />
              {person.firstName ?? 'Colega'}
            </label>
          ))}
        </fieldset>
        <fieldset disabled={!owner || busy || rolesChanged}>
          <legend>Quem faz as artes</legend>
          {view.team.people.map((person) => (
            <label key={person.profileId}>
              <input
                type="checkbox"
                checked={artists.includes(person.profileId)}
                onChange={(event) =>
                  setArtists(
                    event.target.checked
                      ? [...artists, person.profileId]
                      : artists.filter((id) => id !== person.profileId),
                  )
                }
              />
              {person.firstName ?? 'Colega'}
            </label>
          ))}
          {owner ? (
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--primary"
              onClick={() =>
                void action('/roles', 'PUT', {
                  requestId: crypto.randomUUID(),
                  expectedTeamRevision: rolesRevision,
                  programmerProfileId: programmer,
                  artistProfileIds: artists,
                })
              }
            >
              Guardar funções
            </button>
          ) : null}
        </fieldset>
        {rolesChanged ? (
          <p role="status">
            A equipe mudou. Feche e abra esta janela para escolher as funções atuais.
          </p>
        ) : null}
        {!owner ? (
          confirm === 'leave' ? (
            <>
              <p>Sair desta equipe?</p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void action(`/members/${view.team.viewerProfileId}`, 'DELETE', undefined, true)
                }
              >
                Sair mesmo
              </button>
              <button type="button" onClick={() => setConfirm(null)}>
                Ficar
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm('leave')}>
              Sair da equipe
            </button>
          )
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        <p role="status">{notice}</p>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={busy}
          onClick={onClose}
        >
          Fechar equipe
        </button>
      </div>
    </div>
  )
}
