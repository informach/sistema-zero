import type { PensaProjectListItem } from '@sistemazero/core/pensa'
import { useId, useRef, useState } from 'react'
import { editedAgo } from '../../core/relativeTime'
import { usePensaUi } from '../context'
import { PlusIcon, UsersIcon } from '../icons'
import { Chip, type ChipTone, CreditsChip, Mascot, ProgressBar } from '../ui'
import { ScreenHeader } from './ScreenHeader'

const COVERS = ['studio', 'molda', 'pinta'] as const

function status(item: PensaProjectListItem): { label: string; tone: ChipTone } {
  if (item.project.status === 'archived') return { label: 'Guardado', tone: 'white' }
  if (item.project.paused) return { label: 'Pausado', tone: 'white' }
  if (item.lifecycle === 'defining') return { label: 'Plano para conferir', tone: 'yellow' }
  if (item.lifecycle === 'completed') return { label: 'Pronto', tone: 'mint' }
  if (item.lifecycle === 'reviewing' || item.needsReview > 0)
    return { label: 'Conferir de novo', tone: 'yellow' }
  return { label: 'Fazendo', tone: 'action' }
}

/**
 * Meus jogos (Canvas "Meus jogos" e "No celular"): abas Em andamento e Guardados, o cartão de
 * nova ideia, os cartões dos jogos e "Entrar no jogo de um amigo". O cartão não é clicável:
 * quem abre é o botão.
 */
export function GameList({
  projects,
  counts,
  archived,
  onArchived,
  onOpen,
  onNew,
  onJoin,
  joinError,
  joining,
}: {
  projects: PensaProjectListItem[]
  counts: { active: number; archived: number } | null
  archived: boolean
  onArchived(archived: boolean): void
  onOpen(projectId: string): void
  onNew(): void
  onJoin(code: string): void
  joinError: string | null
  joining: boolean
}) {
  const { readOnly, copy } = usePensaUi()
  const [code, setCode] = useState('')
  const codeId = useId()
  const tabs = useRef<HTMLDivElement>(null)
  const tabList: Array<{ id: 'active' | 'archived'; label: string; count?: number }> = [
    { id: 'active', label: 'Em andamento', count: counts?.active },
    { id: 'archived', label: 'Guardados', count: counts?.archived },
  ]
  return (
    <div className="pz-screen pz-list">
      <ScreenHeader
        size="lg"
        hostBack
        kicker="Pensa · onde o jogo vira missões"
        title="Meus jogos"
        actions={<CreditsChip />}
      />
      <div className="pz-list__body">
        <p className="pz-lead">
          Conte o jogo que está na sua cabeça. O Zappy ajuda a dividir em missões, e você constrói
          uma de cada vez no Estúdio, no Pinta e no Molda.
        </p>
        <div
          className="pz-tabs"
          role="tablist"
          aria-label="Seus jogos"
          ref={tabs}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
            event.preventDefault()
            onArchived(!archived)
            requestAnimationFrame(() =>
              tabs.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus(),
            )
          }}
        >
          {tabList.map((tab) => {
            const selected = (tab.id === 'archived') === archived
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`pz-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls="pz-games"
                tabIndex={selected ? 0 : -1}
                className="pz-tab"
                onClick={() => onArchived(tab.id === 'archived')}
              >
                {tab.label}
                {typeof tab.count === 'number' ? ` · ${tab.count}` : ''}
              </button>
            )
          })}
        </div>
        <section
          id="pz-games"
          role="tabpanel"
          aria-labelledby={archived ? 'pz-tab-archived' : 'pz-tab-active'}
          className="pz-games"
        >
          {!archived ? (
            <article className="pz-new-card">
              <div className="pz-new-card__top">
                <span className="pz-mark pz-mark--plus" aria-hidden="true">
                  <PlusIcon size={28} />
                </span>
                <Mascot pose="happy" size={84} />
              </div>
              <h2 className="pz-title pz-title--card">Nova ideia de jogo</h2>
              <p>Conte o jogo para o Zappy. Ele monta o plano das missões com você.</p>
              <button
                type="button"
                className="pz-btn pz-btn--action pz-self-start pz-push"
                disabled={readOnly}
                title={readOnly ? copy.readOnlyHint : undefined}
                onClick={onNew}
              >
                Começar um jogo
              </button>
            </article>
          ) : null}
          {projects.map((item, index) => {
            const chip = status(item)
            const total = item.totalMissions
            const percent = total ? Math.round((item.completedMissions / total) * 100) : 0
            const cover = COVERS[index % COVERS.length]
            const defining = item.lifecycle === 'defining'
            return (
              <article key={item.project.id} className="pz-card pz-game">
                <div className={`pz-game__cover is-${cover}`} aria-hidden="true">
                  <span className="pz-game__shape is-a" />
                  <span className="pz-game__shape is-b" />
                  <span className="pz-game__shape is-c" />
                  <Chip tone={chip.tone} className="pz-game__status">
                    {chip.label}
                  </Chip>
                </div>
                <div className="pz-game__body">
                  <div className="pz-game__meta-top">
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                    <span className="pz-game__edited">{editedAgo(item.project.updatedAt)}</span>
                  </div>
                  <h2 className="pz-title pz-title--card">{item.project.name}</h2>
                  {item.summary ? <p className="pz-game__summary">{item.summary}</p> : null}
                  {defining ? (
                    <p className="pz-game__line">
                      O plano ainda não foi aceito. Falta você conferir.
                    </p>
                  ) : total ? (
                    <div className="pz-game__progress">
                      <div className="pz-game__progress-text">
                        <span>
                          {item.completedMissions} de {total} missões prontas
                        </span>
                        <span className="pz-amber-text">{percent}%</span>
                      </div>
                      <ProgressBar value={item.completedMissions} total={total} />
                    </div>
                  ) : null}
                  {item.needsReview > 0 ? (
                    <p className="pz-game__line">
                      {item.needsReview === 1
                        ? '1 missão para conferir de novo'
                        : `${item.needsReview} missões para conferir de novo`}
                    </p>
                  ) : null}
                  {item.memberCount > 0 ? (
                    <p className="pz-game__line pz-game__team">
                      <UsersIcon size={16} /> Em equipe · {item.memberCount + 1} pessoas
                    </p>
                  ) : null}
                  <div className="pz-game__foot">
                    <span className="pz-game__edited">{editedAgo(item.project.updatedAt)}</span>
                    <button
                      type="button"
                      className="pz-btn pz-btn--action"
                      aria-label={`${defining ? 'Conferir o plano' : 'Continuar'} ${item.project.name}`}
                      onClick={() => onOpen(item.project.id)}
                    >
                      {defining ? 'Conferir o plano' : 'Continuar'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
          {archived && projects.length === 0 ? (
            <p className="pz-card pz-empty">
              Nenhum jogo em Guardados. Pelo botão de três pontos de um jogo, dá para guardar.
            </p>
          ) : null}
        </section>
        <form
          className="pz-card pz-join"
          onSubmit={(event) => {
            event.preventDefault()
            if (code.trim()) onJoin(code.trim())
          }}
        >
          <span className="pz-tile is-blue" aria-hidden="true">
            <UsersIcon size={24} />
          </span>
          <div className="pz-join__text">
            <h2 className="pz-title pz-title--sm">Entrar no jogo de um amigo</h2>
            <span>Digite o código que o seu amigo mandou.</span>
          </div>
          <label htmlFor={codeId} className="pz-sr-only">
            Código do jogo
          </label>
          <input
            id={codeId}
            className="pz-input pz-join__input"
            value={code}
            placeholder="ZAP-ABC123"
            autoComplete="off"
            aria-describedby={joinError ? `${codeId}-error` : undefined}
            onChange={(event) => setCode(event.target.value)}
          />
          <button
            type="submit"
            className="pz-btn pz-btn--card"
            disabled={joining || readOnly || !code.trim()}
          >
            Entrar
          </button>
          {joinError ? (
            <p id={`${codeId}-error`} role="alert" className="pz-alert-text pz-join__error">
              {joinError}
            </p>
          ) : null}
        </form>
      </div>
      {!archived ? (
        <div className="pz-list__sticky">
          <button
            type="button"
            className="pz-btn pz-btn--action pz-btn--lg pz-btn--block"
            disabled={readOnly}
            onClick={onNew}
          >
            <PlusIcon size={18} />
            Nova ideia de jogo
          </button>
        </div>
      ) : null}
    </div>
  )
}
