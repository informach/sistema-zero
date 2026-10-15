/**
 * A janela da EQUIPE no Pensa v2 (14/10/2026), no molde da `TeamDialog` do plano clássico: o
 * mesmo foco (`useDialogFocus`), o código (criar, copiar, gerar outro, desligar), a lista de
 * pessoas com "Tirar"/"Sair" em DOIS passos na própria linha, e erro que NÃO fecha a janela.
 * Fala com o BFF da jornada (`/v2/projects/:id/team|share|members|roles`).
 *
 * O que é novo: a seção **Funções**. Quem programa (o Estúdio, UMA pessoa: rádio) e quem faz as
 * artes (Pinta e Molda: caixas; nenhuma marcada = quem programa também desenha). Só a dona
 * edita; as outras leem. Com o jogo já começado no Estúdio (`codeLocked`), o rádio tranca com a
 * frase do servidor. Tirar quem programa avisa que o jogo fica no Estúdio dela.
 * As regras (papéis efetivos) são do core (`effectivePensaRoles`): a janela não as reescreve.
 */
import {
  effectivePensaRoles,
  type PensaJourneyTeamView,
  type PensaJourneyView,
  type PensaTeamPerson,
} from '@sistemazero/core/pensa'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { editableArt, joinNames } from '../core/journeyTeam'
import {
  JOURNEY_TEAM_COPY as COPY,
  displayShareCode,
  personName,
  TEAM_COPY,
} from '../core/teamCopy'
import type { PensaShareView, PensaTransport } from '../core/types'
import { useDialogFocus } from './dialogFocus'
import { CopyIcon, UsersIcon } from './icons'

type Pending = { kind: 'remove'; profileId: string } | { kind: 'leave' } | null
type RolesDraft = { code: string; art: string[] }

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Algo deu errado. Tente novamente.'
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id) => b.includes(id))

/** Dois "João" na equipe: o nome diz qual ("João (2º da lista)"). */
function spokenName(person: PensaTeamPerson, people: readonly PensaTeamPerson[]): string {
  const name = personName(person.firstName)
  const index = people.indexOf(person)
  const repeated = people.some((other) => other !== person && personName(other.firstName) === name)
  return repeated ? `${name} (${index + 1}º da lista)` : name
}

/** "você" no começo da resposta vira "Você" (a lista de leitura é uma resposta, não uma frase). */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** A dona primeiro, depois quem entrou na ordem do servidor. */
const ordered = (people: readonly PensaTeamPerson[]) => [
  ...people.filter((person) => person.owner),
  ...people.filter((person) => !person.owner),
]

export function JourneyTeamDialog({
  open,
  projectId,
  projectName,
  transport,
  onClose,
  onLeft,
  onTeamChanged,
  onRolesSaved,
  onLoaded,
  returnFocusTo,
}: {
  open: boolean
  projectId: string
  projectName: string
  transport: PensaTransport
  onClose: () => void
  /** Quem entrou saiu: o jogo não é mais dela, e a tela volta para a lista. */
  onLeft: () => void
  /** A contagem ou o código mudaram: o cabeçalho acompanha e a tela relê o jogo. */
  onTeamChanged: (team: { memberCount: number; shareEnabled: boolean }) => void
  /** As funções foram guardadas: a resposta do `PUT …/roles` é o jogo atualizado. */
  onRolesSaved: (view: PensaJourneyView) => void
  /** A equipe chegou (nomes e fotos): a tela do jogo usa os nomes nas missões. */
  onLoaded?: (team: PensaJourneyTeamView) => void
  returnFocusTo?: React.RefObject<HTMLElement | null>
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const codeId = useId()
  const rolesId = useId()
  const radioName = useId()
  const codeHintId = useId()
  const artHintId = useId()
  const [team, setTeam] = useState<PensaJourneyTeamView | null>(null)
  const [draft, setDraft] = useState<RolesDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [copyState, setCopyState] = useState<'copied' | 'failed' | null>(null)
  const [rolesSaved, setRolesSaved] = useState(false)
  const codeRef = useRef<HTMLOutputElement | null>(null)
  // O foco dos dois passos: o botão que a criança apertou DESMONTA (como na janela clássica).
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const leaveRef = useRef<HTMLButtonElement | null>(null)
  const seatsRef = useRef<HTMLParagraphElement | null>(null)
  const removeRefs = useRef(new Map<string, HTMLButtonElement>())
  const pendingBefore = useRef<Pending>(null)
  // Token do pedido: a resposta de uma abertura anterior não repõe a equipe por cima da atual.
  const loadSeq = useRef(0)
  const onLoadedRef = useRef(onLoaded)
  // Atualizado no commit, nunca durante o render (a mesma regra do `useDialogFocus`).
  useLayoutEffect(() => {
    onLoadedRef.current = onLoaded
  })

  useDialogFocus({ open, cardRef, busy: busy !== null, onClose, returnFocusTo })

  const base = `/v2/projects/${encodeURIComponent(projectId)}`

  /** `keepArt`: depois de um 409 da trava, só o rádio volta; as caixas marcadas ficam. */
  const load = useCallback(
    async (keepArt = false) => {
      loadSeq.current += 1
      const seq = loadSeq.current
      setLoading(true)
      setError((current) => (keepArt ? current : null))
      try {
        const result = await transport.request<PensaJourneyTeamView>(`${base}/team`)
        if (seq !== loadSeq.current) return
        setTeam(result)
        setDraft((current) => {
          const ids = result.people.map((person) => person.profileId)
          return keepArt && current
            ? { code: result.roles.code, art: current.art.filter((id) => ids.includes(id)) }
            : { code: result.roles.code, art: editableArt(result.roles) }
        })
        onLoadedRef.current?.(result)
      } catch (cause) {
        if (seq !== loadSeq.current) return
        setError(errorText(cause))
      } finally {
        if (seq === loadSeq.current) setLoading(false)
      }
    },
    [transport, base],
  )

  useEffect(() => {
    if (!open) {
      loadSeq.current += 1
      setTeam(null)
      setDraft(null)
      setError(null)
      setPending(null)
      setCopyState(null)
      setRolesSaved(false)
      return
    }
    // Reabrir começa do zero: a equipe da abertura anterior não fica à vista até o GET voltar.
    setTeam(null)
    void load()
  }, [open, load])

  useEffect(() => {
    const before = pendingBefore.current
    pendingBefore.current = pending
    if (!open) return
    if (pending) {
      confirmRef.current?.focus()
      return
    }
    if (!before) return
    if (before.kind === 'leave') {
      leaveRef.current?.focus()
      return
    }
    const back = removeRefs.current.get(before.profileId)
    if (back?.isConnected) back.focus()
    else seatsRef.current?.focus()
  }, [open, pending])

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

  const announce = (next: PensaJourneyTeamView) => {
    setTeam(next)
    onTeamChanged({
      memberCount: next.people.filter((person) => !person.owner).length,
      shareEnabled: next.shareCode !== null,
    })
  }

  const createCode = () =>
    act('share', async () => {
      const result = await transport.request<PensaShareView>(`${base}/share`, { method: 'POST' })
      setCopyState(null)
      if (team) announce({ ...team, shareCode: result.code })
    })

  const disableCode = () =>
    act('unshare', async () => {
      await transport.request(`${base}/share`, { method: 'DELETE' })
      setCopyState(null)
      if (team) announce({ ...team, shareCode: null })
    })

  const removePerson = (profileId: string) =>
    act(`remove:${profileId}`, async () => {
      await transport.request(`${base}/members/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
      })
      setPending(null)
      if (!team) return
      // O servidor apaga as funções de quem saiu; quem programava devolve a função à dona.
      const people = team.people.filter((person) => person.profileId !== profileId)
      const ownerId = people.find((person) => person.owner)?.profileId ?? team.viewerProfileId
      const roles = effectivePensaRoles({
        ownerProfileId: ownerId,
        memberProfileIds: people.filter((person) => !person.owner).map((p) => p.profileId),
        code: team.roles.code === profileId ? null : team.roles.code,
        art: editableArt(team.roles).filter((id) => id !== profileId),
      })
      setDraft((current) =>
        current
          ? {
              code: current.code === profileId ? roles.code : current.code,
              art: current.art.filter((id) => id !== profileId),
            }
          : current,
      )
      announce({ ...team, people, roles })
    })

  const leave = () =>
    act('leave', async () => {
      await transport.request(`${base}/members/me`, { method: 'DELETE' })
      setPending(null)
      onLeft()
    })

  const saveRoles = () =>
    act('roles', async () => {
      if (!draft || !team) return
      setRolesSaved(false)
      try {
        const next = await transport.request<PensaJourneyView>(`${base}/roles`, {
          method: 'PUT',
          body: { code: draft.code, art: draft.art },
        })
        const people = team.people
        const roles =
          next.team?.roles ??
          effectivePensaRoles({
            ownerProfileId: people.find((person) => person.owner)?.profileId ?? draft.code,
            memberProfileIds: people.filter((person) => !person.owner).map((p) => p.profileId),
            code: draft.code,
            art: draft.art,
          })
        setTeam({ ...team, roles })
        setDraft({ code: roles.code, art: editableArt(roles) })
        setRolesSaved(true)
        onRolesSaved(next)
      } catch (cause) {
        // 409 `PENSA_CODE_LOCKED`: o jogo começou enquanto a janela estava aberta. Relê a
        // equipe para o rádio aparecer trancado, sem perder as caixas marcadas.
        if ((cause as { status?: number }).status === 409) void load(true)
        throw cause
      }
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

  const isOwner = team?.role === 'owner'
  const people = team ? ordered(team.people) : []
  const owner = people.find((person) => person.owner) ?? null
  const display = team?.shareCode ? displayShareCode(team.shareCode) : null
  const seats = people.filter((person) => !person.owner).length
  const max = team?.maxMembers ?? 5
  const nameOf = (profileId: string) => {
    if (profileId === team?.viewerProfileId) return COPY.you
    return personName(people.find((person) => person.profileId === profileId)?.firstName ?? null)
  }
  const firstNameOf = (profileId: string) =>
    people.find((person) => person.profileId === profileId)?.firstName?.trim() || null
  const savedArt = team ? editableArt(team.roles) : []
  const rolesDirty = Boolean(
    team && draft && (draft.code !== team.roles.code || !sameSet(draft.art, savedArt)),
  )

  return (
    <div className="pensa-dialog-scrim">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pensa-dialog pensa-team pensa-journey-team"
      >
        <h2 id={titleId} className="pensa-dialog__title pensa-team__title">
          <UsersIcon size={20} />
          {COPY.dialogTitle}
        </h2>
        {team ? (
          <p className="pensa-dialog__body">
            {isOwner
              ? COPY.ownerLead(projectName)
              : COPY.memberLead(owner?.firstName?.trim() || null)}
          </p>
        ) : null}

        {error ? (
          <p className="pensa-dialog__error" role="alert">
            {error}
          </p>
        ) : null}

        {loading && !team ? (
          <p className="pensa-team__status" role="status">
            {TEAM_COPY.loading}
          </p>
        ) : null}

        {team && isOwner ? (
          <section className="pensa-team__code" aria-labelledby={codeId}>
            <h3 id={codeId} className="pensa-team__subtitle">
              {TEAM_COPY.codeLabel}
            </h3>
            {display ? (
              <>
                <div className="pensa-team__code-row">
                  <output ref={codeRef} className="pensa-team-code" aria-labelledby={codeId}>
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
                <p className="pensa-team__hint">{COPY.codeShareHint}</p>
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

        {team ? (
          <section className="pensa-team__people" aria-label="Quem está na equipe">
            {/* `tabIndex={-1}`: é onde o foco pousa depois de tirar alguém (a linha sumiu). */}
            <p ref={seatsRef} className="pensa-team__seats" tabIndex={-1}>
              {TEAM_COPY.seats(seats, max)}
            </p>
            <ul className="pensa-team-list">
              {people.map((person) => {
                const isViewer = person.profileId === team.viewerProfileId
                const confirming =
                  pending?.kind === 'remove' && pending.profileId === person.profileId
                const name = personName(person.firstName)
                const programs = person.profileId === team.roles.code
                return (
                  <li className="pensa-team-member" key={person.profileId}>
                    {person.photoUrl ? (
                      <img className="pensa-team-member__face" src={person.photoUrl} alt="" />
                    ) : (
                      <span
                        className="pensa-team-member__face pensa-team-member__initial"
                        aria-hidden="true"
                      >
                        {name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="pensa-team-member__name">
                      {name}
                      {isViewer ? <span className="pensa-chip is-you">{TEAM_COPY.you}</span> : null}
                      {person.owner ? <span className="pensa-chip">{TEAM_COPY.owner}</span> : null}
                    </span>
                    {isOwner && !person.owner ? (
                      confirming ? (
                        <span className="pensa-team-member__confirm">
                          <span>{TEAM_COPY.removeConfirm(name)}</span>
                          {programs ? (
                            <span className="pensa-journey-team__warn">
                              {COPY.removeProgrammer(person.firstName?.trim() || null)}
                            </span>
                          ) : null}
                          <button
                            ref={confirmRef}
                            type="button"
                            className="pensa-team-member__remove is-danger"
                            disabled={busy !== null}
                            onClick={() => void removePerson(person.profileId)}
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
                          ref={(node) => {
                            if (node) removeRefs.current.set(person.profileId, node)
                            else removeRefs.current.delete(person.profileId)
                          }}
                          type="button"
                          className="pensa-team-member__remove"
                          aria-label={`${TEAM_COPY.remove} ${spokenName(
                            person,
                            people.filter((p) => !p.owner),
                          )} da equipe`}
                          disabled={busy !== null}
                          onClick={() =>
                            setPending({ kind: 'remove', profileId: person.profileId })
                          }
                        >
                          {TEAM_COPY.remove}
                        </button>
                      )
                    ) : null}
                  </li>
                )
              })}
            </ul>
            {seats === 0 ? <p className="pensa-team__hint">{TEAM_COPY.emptyMembers}</p> : null}
          </section>
        ) : null}

        {team && draft ? (
          <section className="pensa-journey-team__roles" aria-labelledby={rolesId}>
            <h3 id={rolesId} className="pensa-team__subtitle">
              {COPY.rolesTitle}
            </h3>
            {isOwner && people.length < 2 ? (
              <p className="pensa-team__hint">{COPY.rolesSolo}</p>
            ) : isOwner ? (
              <>
                {/* O `disabled` vai em CADA rádio (não só no fieldset): é o que o `.disabled`
                    do campo e o leitor de tela anunciam como trancado. */}
                <fieldset className="pensa-journey-team__group" aria-describedby={codeHintId}>
                  <legend className="pensa-journey-team__legend">{COPY.codeLegend}</legend>
                  <div className="pensa-journey-team__options">
                    {people.map((person) => (
                      <label className="pensa-journey-team__option" key={person.profileId}>
                        <input
                          type="radio"
                          className="pensa-journey-team__input"
                          name={radioName}
                          value={person.profileId}
                          disabled={team.codeLocked || busy !== null}
                          checked={draft.code === person.profileId}
                          onChange={() => {
                            setRolesSaved(false)
                            setDraft({ ...draft, code: person.profileId })
                          }}
                        />
                        <span>
                          {spokenName(person, people)}
                          {person.profileId === team.viewerProfileId ? ` (${COPY.you})` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p
                    id={codeHintId}
                    className={`pensa-team__hint${team.codeLocked ? ' pensa-journey-team__locked' : ''}`}
                  >
                    {team.codeLocked ? COPY.codeLocked : COPY.codeHint}
                  </p>
                </fieldset>
                <fieldset className="pensa-journey-team__group" aria-describedby={artHintId}>
                  <legend className="pensa-journey-team__legend">{COPY.artLegend}</legend>
                  <div className="pensa-journey-team__options">
                    {people.map((person) => (
                      <label className="pensa-journey-team__option" key={person.profileId}>
                        <input
                          type="checkbox"
                          className="pensa-journey-team__input"
                          value={person.profileId}
                          disabled={busy !== null}
                          checked={draft.art.includes(person.profileId)}
                          onChange={(event) => {
                            setRolesSaved(false)
                            setDraft({
                              ...draft,
                              art: event.target.checked
                                ? [...draft.art, person.profileId]
                                : draft.art.filter((id) => id !== person.profileId),
                            })
                          }}
                        />
                        <span>
                          {spokenName(person, people)}
                          {person.profileId === team.viewerProfileId ? ` (${COPY.you})` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p id={artHintId} className="pensa-team__hint">
                    {COPY.artHint}
                  </p>
                </fieldset>
                <div className="pensa-journey-team__save">
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--primary"
                    disabled={!rolesDirty || busy !== null}
                    onClick={() => void saveRoles()}
                  >
                    {busy === 'roles' ? TEAM_COPY.working : COPY.saveRoles}
                  </button>
                  <p className="pensa-team__status" role="status">
                    {rolesSaved ? COPY.rolesSaved : ''}
                  </p>
                </div>
              </>
            ) : (
              <>
                <dl className="pensa-journey-team__read">
                  <div>
                    <dt className="pensa-journey-team__term">{COPY.codeLegend}</dt>
                    <dd className="pensa-journey-team__value">
                      {capitalize(nameOf(team.roles.code))}
                    </dd>
                  </div>
                  <div>
                    <dt className="pensa-journey-team__term">{COPY.artLegend}</dt>
                    <dd className="pensa-journey-team__value">
                      {editableArt(team.roles).length
                        ? capitalize(joinNames(team.roles.art.map(nameOf)))
                        : COPY.artNobody(
                            team.roles.code === team.viewerProfileId
                              ? 'Você'
                              : (firstNameOf(team.roles.code) ?? 'Quem programa'),
                          )}
                    </dd>
                  </div>
                </dl>
                <p className="pensa-team__hint">{COPY.rolesReadOnly}</p>
              </>
            )}
          </section>
        ) : null}

        <div className="pensa-dialog__actions">
          {team && !isOwner ? (
            pending?.kind === 'leave' ? (
              <span className="pensa-team-member__confirm">
                <span>{TEAM_COPY.leaveConfirm}</span>
                {team.roles.code === team.viewerProfileId ? (
                  <span className="pensa-journey-team__warn">{COPY.leaveProgrammer}</span>
                ) : null}
                <button
                  ref={confirmRef}
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
                ref={leaveRef}
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
