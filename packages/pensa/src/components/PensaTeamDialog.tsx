import type { PensaProjectView } from '@sistemazero/core/pensa'
import { type RefObject, useEffect, useId, useRef, useState } from 'react'
import { personName } from '../core/copy'
import type { PensaTransport } from '../core/types'
import { usePensaUi } from './context'
import { useDialogFocus } from './dialogFocus'
import { CloseIcon, UsersIcon } from './icons'
import { Avatar, Chip } from './ui'

/**
 * A equipe do jogo (Canvas "Equipe"): o código para chamar um amigo, quem está no jogo e as
 * funções. Quem decide dono, convites e quem programa é o servidor; a janela só pede.
 */
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
  const { readOnly, notify, copy } = usePensaUi()
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
  const [rolesRevision, setRolesRevision] = useState(view.project.teamRevision)
  // As funções que esta janela acabou de guardar não contam como "a equipe mudou".
  const ownSave = useRef(false)
  useEffect(() => {
    if (!ownSave.current) return
    ownSave.current = false
    setRolesRevision(view.project.teamRevision)
  }, [view.project.teamRevision])
  const rolesChanged = rolesRevision !== view.project.teamRevision
  const owner = view.team.viewerProfileId === view.team.ownerProfileId
  const canEdit = owner && !readOnly
  const base = `/projects/${view.project.id}`
  const people = view.team.people
  const ownerPerson = people.find((person) => person.owner)
  const programmerPerson = people.find(
    (person) => person.profileId === view.team.programmerProfileId,
  )
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
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não consegui guardar. Tente de novo.')
      return false
    } finally {
      acting.current = false
      setBusy(false)
    }
  }
  return (
    <div className="pz-scrim">
      <div
        className="pz-dialog pz-team"
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="pz-dialog__head">
          <span className="pz-tile is-blue" aria-hidden="true">
            <UsersIcon size={24} />
          </span>
          <h2 id={titleId} className="pz-title pz-title--md">
            Equipe do {view.project.name}
          </h2>
          <button
            type="button"
            className="pz-icon-btn is-quiet"
            aria-label="Fechar a equipe"
            disabled={busy}
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </button>
        </div>
        {owner ? (
          <section className="pz-team__code" aria-labelledby={`${titleId}-code`}>
            <div className="pz-team__code-text">
              <h3 id={`${titleId}-code`} className="pz-title pz-title--sm">
                Chame um amigo com este código
              </h3>
              <p>Quem entrar precisa ter o Pensa liberado.</p>
            </div>
            {view.team.shareCode ? (
              <output className="pz-team__code-value" aria-label="Código do jogo">
                {view.team.shareCode}
              </output>
            ) : null}
            <div className="pz-team__code-actions">
              {view.team.shareCode ? (
                <button
                  type="button"
                  className="pz-btn pz-btn--action"
                  onClick={() => {
                    if (!navigator.clipboard) {
                      setNotice('Selecione e copie o código.')
                      return
                    }
                    void navigator.clipboard
                      .writeText(view.team.shareCode ?? '')
                      .then(() => notify('Código copiado.'))
                      .catch(() => setNotice('Selecione e copie o código.'))
                  }}
                >
                  Copiar código
                </button>
              ) : null}
              <button
                type="button"
                className={`pz-btn ${view.team.shareCode ? 'pz-btn--card' : 'pz-btn--action'}`}
                disabled={busy || !canEdit}
                title={readOnly ? copy.readOnlyHint : undefined}
                onClick={() => void action('/share', 'POST', { requestId: crypto.randomUUID() })}
              >
                {view.team.shareCode ? 'Gerar outro código' : 'Gerar código'}
              </button>
              {view.team.shareCode ? (
                <button
                  type="button"
                  className="pz-text-btn is-amber"
                  disabled={busy || !canEdit}
                  onClick={() => void action('/share', 'DELETE')}
                >
                  Desligar código
                </button>
              ) : null}
            </div>
          </section>
        ) : (
          <p className="pz-team__member-note">
            Este jogo é de {personName(ownerPerson?.firstName)}. Vocês mexem no mesmo plano.
          </p>
        )}
        <section className="pz-team__people" aria-labelledby={`${titleId}-people`}>
          <h3 id={`${titleId}-people`} className="pz-title pz-title--sm">
            Quem está no jogo
          </h3>
          <ul>
            {people.map((person, index) => {
              const name = personName(person.firstName)
              return (
                <li key={person.profileId}>
                  <Avatar person={person} index={index} />
                  <span className="pz-team__name">
                    <strong>{name}</strong>
                    {person.profileId === view.team.viewerProfileId ? ' · você' : ''}
                    {person.owner ? ' · criou o jogo' : ''}
                  </span>
                  {person.profileId === view.team.programmerProfileId ? (
                    <Chip tone="action">Programa</Chip>
                  ) : null}
                  {view.team.artistProfileIds.includes(person.profileId) ? (
                    <Chip tone="red">Artes</Chip>
                  ) : null}
                  {canEdit && !person.owner ? (
                    confirm === person.profileId ? (
                      <span className="pz-team__confirm">
                        <button
                          type="button"
                          className="pz-text-btn is-danger"
                          disabled={busy}
                          onClick={() => void action(`/members/${person.profileId}`, 'DELETE')}
                        >
                          Tirar mesmo
                        </button>
                        <button
                          type="button"
                          className="pz-text-btn"
                          onClick={() => setConfirm(null)}
                        >
                          Deixar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="pz-text-btn is-danger"
                        aria-label={`Tirar ${name} da equipe`}
                        onClick={() => setConfirm(person.profileId)}
                      >
                        Tirar da equipe
                      </button>
                    )
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
        <div className="pz-team__roles">
          <fieldset disabled={!canEdit || busy || rolesChanged}>
            <legend className="pz-title pz-title--xs">Quem programa</legend>
            {people.map((person) => (
              <label
                key={person.profileId}
                className={`pz-choice${programmer === person.profileId ? ' is-on is-blue' : ''}`}
              >
                <input
                  type="radio"
                  name={`${titleId}-programmer`}
                  disabled={view.team.codeLocked}
                  checked={programmer === person.profileId}
                  onChange={() => setProgrammer(person.profileId)}
                />
                <span>{personName(person.firstName)}</span>
              </label>
            ))}
            {view.team.codeLocked ? (
              <p className="pz-small">
                O jogo já começou no Estúdio de {personName(programmerPerson?.firstName)}, então
                quem programa continua o mesmo.
              </p>
            ) : null}
          </fieldset>
          <fieldset disabled={!canEdit || busy || rolesChanged}>
            <legend className="pz-title pz-title--xs">Quem faz as artes</legend>
            {people.map((person) => (
              <label
                key={person.profileId}
                className={`pz-choice${artists.includes(person.profileId) ? ' is-on is-red' : ''}`}
              >
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
                <span>{personName(person.firstName)}</span>
              </label>
            ))}
          </fieldset>
        </div>
        {rolesChanged ? (
          <p role="status" className="pz-small">
            A equipe mudou. Feche e abra esta janela para escolher as funções de agora.
          </p>
        ) : null}
        {!owner && !readOnly ? (
          confirm === 'leave' ? (
            <p className="pz-team__leave">
              <span>Sair desta equipe?</span>
              <button
                type="button"
                className="pz-text-btn is-danger"
                disabled={busy}
                onClick={() =>
                  void action(`/members/${view.team.viewerProfileId}`, 'DELETE', undefined, true)
                }
              >
                Sair mesmo
              </button>
              <button type="button" className="pz-text-btn" onClick={() => setConfirm(null)}>
                Ficar
              </button>
            </p>
          ) : (
            <button
              type="button"
              className="pz-text-btn is-danger pz-self-start"
              onClick={() => setConfirm('leave')}
            >
              Sair da equipe
            </button>
          )
        ) : null}
        {error ? (
          <p role="alert" className="pz-alert-text">
            {error}
          </p>
        ) : null}
        <p role="status" className={notice ? 'pz-small' : 'pz-sr-only'}>
          {notice}
        </p>
        <div className="pz-dialog__actions">
          <button type="button" className="pz-btn pz-btn--card" disabled={busy} onClick={onClose}>
            Fechar
          </button>
          {canEdit ? (
            <button
              type="button"
              className="pz-btn pz-btn--action"
              disabled={busy || rolesChanged}
              onClick={() => {
                ownSave.current = true
                void action('/roles', 'PUT', {
                  requestId: crypto.randomUUID(),
                  expectedTeamRevision: rolesRevision,
                  programmerProfileId: programmer,
                  artistProfileIds: artists,
                }).then((saved) => {
                  if (saved) notify('Funções guardadas.')
                  else ownSave.current = false
                })
              }}
            >
              Guardar funções
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
