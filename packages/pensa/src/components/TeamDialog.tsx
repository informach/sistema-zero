/**
 * A janela da EQUIPE do plano (26/09/2026). Abre pelo "Equipe · N" do cabeçalho do plano e
 * fala com o BFF pelo transporte do adapter (`/projects/:id/members`, `…/share`,
 * `…/members/:profileId`).
 *
 * Dono: o código do plano (criar, copiar, gerar outro, desligar), a lista de quem entrou com
 * "Tirar" em DOIS passos na própria linha, e "N de 5 lugares". Membro: "Este plano é de X", a
 * lista e "Sair da equipe" (também em dois passos). Nada de `window.prompt`/`confirm`: o
 * copiar que falha deixa o código selecionável, e a confirmação mora na linha.
 *
 * Erro NÃO fecha a janela: o recado entra em `role="alert"` e a criança tenta de novo. As
 * mensagens são as do servidor (`error.message`), que é a frase que ela precisa ler ("Só
 * quem criou o plano pode fazer isso.").
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { displayShareCode, personName, TEAM_COPY } from '../core/teamCopy'
import type {
  PensaProjectMembersView,
  PensaProjectRole,
  PensaShareView,
  PensaTeamPersonView,
  PensaTransport,
} from '../core/types'
import { useDialogFocus } from './dialogFocus'
import { CopyIcon, UsersIcon } from './icons'

type Pending = { kind: 'remove'; profileId: string } | { kind: 'leave' } | null

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Algo deu errado. Tente novamente.'
}

export function TeamDialog({
  open,
  projectId,
  projectName,
  role,
  transport,
  onClose,
  onLeft,
  onTeamChanged,
  returnFocusTo,
}: {
  open: boolean
  projectId: string
  projectName: string
  role: PensaProjectRole
  transport: PensaTransport
  onClose: () => void
  /** O membro saiu: o plano não é mais dele, e a tela volta para a home. */
  onLeft: () => void
  /** A contagem e o "código ligado" mudaram: o cabeçalho e o detalhe acompanham. */
  onTeamChanged: (team: { memberCount: number; shareEnabled: boolean }) => void
  returnFocusTo?: React.RefObject<HTMLElement | null>
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const codeId = useId()
  const [view, setView] = useState<PensaProjectMembersView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [copyState, setCopyState] = useState<'copied' | 'failed' | null>(null)
  const codeRef = useRef<HTMLOutputElement | null>(null)

  useDialogFocus({ open, cardRef, busy: busy !== null, onClose, returnFocusTo })

  const membersPath = `/projects/${encodeURIComponent(projectId)}/members`
  const sharePath = `/projects/${encodeURIComponent(projectId)}/share`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await transport.request<PensaProjectMembersView>(membersPath)
      setView(result)
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setLoading(false)
    }
  }, [transport, membersPath])

  useEffect(() => {
    if (!open) {
      setView(null)
      setError(null)
      setPending(null)
      setCopyState(null)
      return
    }
    void load()
  }, [open, load])

  const announce = (next: PensaProjectMembersView) => {
    setView(next)
    onTeamChanged({ memberCount: next.members.length, shareEnabled: next.shareCode !== null })
  }

  const act = async (key: string, action: () => Promise<void>) => {
    if (busy) return
    setBusy(key)
    setError(null)
    try {
      await action()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setBusy(null)
    }
  }

  const createCode = () =>
    act('share', async () => {
      const result = await transport.request<PensaShareView>(sharePath, { method: 'POST' })
      setCopyState(null)
      if (view) announce({ ...view, shareCode: result.code })
    })

  const disableCode = () =>
    act('unshare', async () => {
      await transport.request(sharePath, { method: 'DELETE' })
      setCopyState(null)
      if (view) announce({ ...view, shareCode: null })
    })

  const removeMember = (profileId: string) =>
    act(`remove:${profileId}`, async () => {
      await transport.request(`${membersPath}/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
      })
      setPending(null)
      if (view)
        announce({ ...view, members: view.members.filter((m) => m.profileId !== profileId) })
    })

  const leave = () =>
    act('leave', async () => {
      await transport.request(`${membersPath}/me`, { method: 'DELETE' })
      setPending(null)
      onLeft()
    })

  const copyCode = async (display: string) => {
    try {
      const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
      if (!clipboard?.writeText) throw new Error('sem área de transferência')
      await clipboard.writeText(display)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
      // Sem clipboard, a saída honesta: o código já selecionado para o Ctrl+C.
      const node = codeRef.current
      const selection = typeof window === 'undefined' ? null : window.getSelection?.()
      if (node && selection && typeof document.createRange === 'function') {
        const range = document.createRange()
        range.selectNodeContents(node)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  }

  if (!open) return null

  const isOwner = role === 'owner'
  const display = view?.shareCode ? displayShareCode(view.shareCode) : null
  const seats = view ? view.members.length : 0
  const max = view?.maxMembers ?? 5

  return (
    <div className="pensa-dialog-scrim">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pensa-dialog pensa-team"
      >
        <h2 id={titleId} className="pensa-dialog__title pensa-team__title">
          <UsersIcon size={20} />
          {TEAM_COPY.dialogTitle}
        </h2>
        <p className="pensa-dialog__body">
          {isOwner
            ? TEAM_COPY.ownerLead(projectName)
            : TEAM_COPY.memberLead(personName(view?.owner.firstName ?? null))}{' '}
          {TEAM_COPY.eachBuildsAlone}
        </p>

        {error ? (
          <p className="pensa-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        {loading && !view ? (
          <p className="pensa-team__status" role="status">
            {TEAM_COPY.loading}
          </p>
        ) : null}

        {view && isOwner ? (
          <section className="pensa-team__code" aria-labelledby={codeId}>
            <h3 id={codeId} className="pensa-team__subtitle">
              {TEAM_COPY.codeLabel}
            </h3>
            {display ? (
              <>
                <div className="pensa-team__code-row">
                  <output
                    ref={codeRef}
                    className="pensa-team-code"
                    aria-label={TEAM_COPY.codeLabel}
                  >
                    {display}
                  </output>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--primary"
                    onClick={() => void copyCode(display)}
                  >
                    <CopyIcon size={16} />
                    {TEAM_COPY.copy}
                  </button>
                </div>
                <p className="pensa-team__hint">{TEAM_COPY.codeHint}</p>
                <p className="pensa-team__status" role="status">
                  {copyState === 'copied'
                    ? TEAM_COPY.copied
                    : copyState === 'failed'
                      ? TEAM_COPY.copyFailed
                      : ''}
                </p>
                <div className="pensa-team__code-actions">
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--outline"
                    disabled={busy !== null}
                    onClick={() => void createCode()}
                  >
                    {busy === 'share' ? TEAM_COPY.working : TEAM_COPY.rotateCode}
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    disabled={busy !== null}
                    onClick={() => void disableCode()}
                  >
                    {busy === 'unshare' ? TEAM_COPY.working : TEAM_COPY.disableCode}
                  </button>
                </div>
                <p className="pensa-team__hint">{TEAM_COPY.rotateHint}</p>
              </>
            ) : (
              <>
                <p className="pensa-team__hint">{TEAM_COPY.noCode}</p>
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--primary"
                  disabled={busy !== null}
                  onClick={() => void createCode()}
                >
                  {busy === 'share' ? TEAM_COPY.working : TEAM_COPY.createCode}
                </button>
              </>
            )}
          </section>
        ) : null}

        {view ? (
          <section className="pensa-team__people" aria-label="Quem está na equipe">
            <p className="pensa-team__seats">{TEAM_COPY.seats(seats, max)}</p>
            <ul className="pensa-team-list">
              <TeamPerson
                person={view.owner}
                isViewer={view.owner.profileId === view.viewerProfileId}
                tag={TEAM_COPY.owner}
              />
              {view.members.map((person) => {
                const isViewer = person.profileId === view.viewerProfileId
                const confirming =
                  pending?.kind === 'remove' && pending.profileId === person.profileId
                return (
                  <TeamPerson key={person.profileId} person={person} isViewer={isViewer}>
                    {isOwner ? (
                      confirming ? (
                        <span className="pensa-team-member__confirm">
                          <span>{TEAM_COPY.removeConfirm(personName(person.firstName))}</span>
                          <button
                            type="button"
                            className="pensa-team-member__remove is-danger"
                            disabled={busy !== null}
                            onClick={() => void removeMember(person.profileId)}
                          >
                            {busy === `remove:${person.profileId}`
                              ? TEAM_COPY.working
                              : TEAM_COPY.removeYes}
                          </button>
                          <button
                            type="button"
                            className="pensa-team-member__remove"
                            disabled={busy !== null}
                            onClick={() => setPending(null)}
                          >
                            {TEAM_COPY.removeNo}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="pensa-team-member__remove"
                          aria-label={`${TEAM_COPY.remove} ${personName(person.firstName)} da equipe`}
                          disabled={busy !== null}
                          onClick={() =>
                            setPending({ kind: 'remove', profileId: person.profileId })
                          }
                        >
                          {TEAM_COPY.remove}
                        </button>
                      )
                    ) : null}
                  </TeamPerson>
                )
              })}
            </ul>
            {view.members.length === 0 ? (
              <p className="pensa-team__hint">{TEAM_COPY.emptyMembers}</p>
            ) : null}
          </section>
        ) : null}

        <div className="pensa-dialog__actions">
          {view && !isOwner ? (
            pending?.kind === 'leave' ? (
              <span className="pensa-team-member__confirm">
                <span>{TEAM_COPY.leaveConfirm}</span>
                <button
                  type="button"
                  className="sz-tool-pill pensa-dialog__danger"
                  disabled={busy !== null}
                  onClick={() => void leave()}
                >
                  {busy === 'leave' ? TEAM_COPY.working : TEAM_COPY.leaveYes}
                </button>
                <button
                  type="button"
                  className="sz-tool-pill sz-tool-pill--quiet"
                  disabled={busy !== null}
                  onClick={() => setPending(null)}
                >
                  {TEAM_COPY.leaveNo}
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--outline pensa-team__leave"
                disabled={busy !== null}
                onClick={() => setPending({ kind: 'leave' })}
              >
                {TEAM_COPY.leave}
              </button>
            )
          ) : null}
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--quiet"
            onClick={onClose}
            disabled={busy !== null}
          >
            {TEAM_COPY.close}
          </button>
        </div>
      </div>
    </div>
  )
}

function TeamPerson({
  person,
  isViewer,
  tag,
  children,
}: {
  person: PensaTeamPersonView
  isViewer: boolean
  tag?: string
  children?: React.ReactNode
}) {
  const name = personName(person.firstName)
  return (
    <li className="pensa-team-member">
      {person.photoUrl ? (
        <img className="pensa-team-member__face" src={person.photoUrl} alt="" />
      ) : (
        <span className="pensa-team-member__face pensa-team-member__initial" aria-hidden="true">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="pensa-team-member__name">
        {name}
        {isViewer ? <span className="pensa-chip is-you">{TEAM_COPY.you}</span> : null}
        {tag ? <span className="pensa-chip">{tag}</span> : null}
      </span>
      {children}
    </li>
  )
}
