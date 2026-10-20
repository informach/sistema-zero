import {
  type PensaIdea,
  type PensaMission,
  type PensaMissionAvailability,
  type PensaPendingChoice,
  type PensaProjectRevision,
  type PensaProjectView,
  pensaZeroPresentation,
} from '@sistemazero/core/pensa'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
import { DESTINATION_NAMES, missionState, personName } from '../../core/copy'
import { isFinalTest, missionNumber } from '../../core/planView'
import { CareMenu, type CareMenuItem } from '../CareMenu'
import { ChatPanel, type Composer } from '../ChatPanel'
import { usePensaUi } from '../context'
import { GameCard, GameCardSummary } from '../GameCard'
import { HostMenuButton, usePensaHostChrome } from '../hostChrome'
import {
  ArrowLeftIcon,
  CardIcon,
  ChatIcon,
  LockIcon,
  MapIcon,
  PencilIcon,
  PlayIcon,
} from '../icons'
import { MissionBrief, type RenderListen } from '../MissionBrief'
import { MissionMap, MissionMapCompact } from '../MissionMap'
import { Avatar, Chip, CreditsChip, DestinationChip, PensaMark, ZeroTrail } from '../ui'
import { ClarifyQuestion } from './Clarify'
import { Finished } from './Finished'

export type ProjectTab = 'plano' | 'conversa' | 'carta'

const TABS: Array<{ id: ProjectTab; label: string; icon: ReactNode }> = [
  { id: 'plano', label: 'Plano', icon: <MapIcon size={20} /> },
  { id: 'conversa', label: 'Conversa', icon: <ChatIcon size={20} /> },
  { id: 'carta', label: 'Carta do jogo', icon: <CardIcon size={20} /> },
]

export interface ProjectWorkspaceProps {
  view: PensaProjectView
  revision: PensaProjectRevision
  owner: boolean
  busy: boolean
  narrow: boolean
  tab: ProjectTab
  onTab(tab: ProjectTab): void
  composer: Composer
  nextMission: PensaMission | null
  banners: ReactNode
  /** A mudança pronta para conferir (abre a tela "Mudar uma parte"). */
  changeReady: boolean
  changeChoice: PensaPendingChoice | null
  lastAssistantText: string | null
  exhausted: boolean
  exhaustedCard: ReactNode
  careItems: CareMenuItem[]
  teamButtonRef: RefObject<HTMLButtonElement | null>
  renderListen?: RenderListen
  /** A narração da carta do jogo (no Kids, quando o host liga a voz). */
  definitionListen?: ReactNode
  onBack(): void
  onRename(name: string): void
  onTeam(): void
  onOpenGame(): void
  onOpenMission(mission: PensaMission): void
  onPreview(mission: PensaMission, opener: HTMLElement | null): void
  onHelp(): void
  onAskChange(): void
  onClearHelp(): void
  onChoose(choice: PensaPendingChoice, option: { id: string; label: string }): void
  onCancelOperation(): void
  onRetryOperation(): void
  onReviewChange(): void
  onOpenCarta(opener: HTMLElement | null): void
  onUseIdea(idea: PensaIdea): void
  onNewGame(): void
}

/**
 * O projeto em andamento (Canvas "Projeto em andamento" e "No celular"): a próxima missão em
 * destaque, o mapa por etapa, a carta do jogo, as ideias para depois e a conversa ao lado. No
 * celular, Plano, Conversa e Carta do jogo viram abas no pé da tela.
 */
export function ProjectWorkspace(props: ProjectWorkspaceProps) {
  const { view, revision, narrow, tab } = props
  const zero = pensaZeroPresentation({
    revision,
    draft: view.draft,
    progress: view.progress,
    availability: view.availability,
  })
  const plan = <PlanColumn {...props} zero={zero} />
  const chat = <ProjectChat {...props} />
  const carta = (
    <div className="pz-stack">
      <GameCard
        definition={revision.definition}
        plan={revision.plan}
        listen={props.definitionListen}
      />
      <IdeasForLater ideas={revision.definition.futureIdeas} onChange={props.onAskChange} />
    </div>
  )
  return (
    <div className={`pz-screen pz-project${narrow ? ' is-narrow' : ''}`}>
      <ProjectHeader {...props} />
      {narrow ? (
        <>
          <div
            className="pz-project__panel"
            role="tabpanel"
            id={`pz-panel-${tab}`}
            aria-labelledby={`pz-tabbtn-${tab}`}
          >
            {props.banners}
            {tab === 'plano' ? plan : tab === 'conversa' ? chat : carta}
          </div>
          <div className="pz-tabbar" role="tablist" aria-label="Partes do projeto">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`pz-tabbtn-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={tab === item.id ? `pz-panel-${item.id}` : undefined}
                tabIndex={tab === item.id ? 0 : -1}
                className="pz-tabbar__tab"
                onClick={() => props.onTab(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                  event.preventDefault()
                  const index = TABS.findIndex((entry) => entry.id === tab)
                  const next =
                    TABS[
                      (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length
                    ]!
                  props.onTab(next.id)
                  requestAnimationFrame(() =>
                    document.getElementById(`pz-tabbtn-${next.id}`)?.focus(),
                  )
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="pz-project__cols">
          <div className="pz-project__main">
            {props.banners}
            {plan}
          </div>
          {chat}
        </div>
      )}
    </div>
  )
}

function ProjectHeader(props: ProjectWorkspaceProps) {
  const { view, owner, narrow, careItems, teamButtonRef, onBack, onTeam, onOpenGame, onRename } =
    props
  const { readOnly } = usePensaUi()
  const chrome = usePensaHostChrome()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(view.project.name)
  const pencil = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  // O Esc e o Enter fecham o campo; o blur que vem depois não pode guardar de novo (nem
  // guardar o que o Esc desistiu).
  const finished = useRef(false)
  useEffect(() => {
    if (renaming) {
      finished.current = false
      input.current?.select()
    }
  }, [renaming])
  function finish(save: boolean) {
    if (finished.current) return
    finished.current = true
    const value = name.trim()
    setRenaming(false)
    if (save && value.length >= 2 && value !== view.project.name) onRename(value)
    requestAnimationFrame(() => pencil.current?.focus())
  }
  const people = view.team.people
  return (
    <header className="pz-head pz-head--project">
      <div className="pz-head__lead">
        {chrome?.menu ? <HostMenuButton menu={chrome.menu} /> : null}
        <button
          type="button"
          className="pz-btn pz-btn--card pz-btn--square"
          aria-label="Voltar aos meus jogos"
          disabled={props.composer.voiceBusy}
          onClick={onBack}
        >
          <ArrowLeftIcon size={20} />
        </button>
        {narrow ? null : <PensaMark size="md" />}
        <div className="pz-head__title">
          {renaming ? (
            <form
              className="pz-rename"
              onSubmit={(event) => {
                event.preventDefault()
                finish(true)
              }}
            >
              <label htmlFor="pz-rename" className="pz-sr-only">
                Nome do jogo
              </label>
              <input
                id="pz-rename"
                ref={input}
                className="pz-input pz-rename__input"
                value={name}
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    finish(false)
                  }
                }}
                onBlur={() => finish(true)}
              />
            </form>
          ) : (
            <h1 className="pz-title pz-title--head">{view.project.name}</h1>
          )}
        </div>
        {owner && !readOnly && !renaming ? (
          <button
            ref={pencil}
            type="button"
            className="pz-icon-btn is-quiet"
            aria-label="Renomear o jogo"
            onClick={() => {
              setName(view.project.name)
              setRenaming(true)
            }}
          >
            <PencilIcon size={18} />
          </button>
        ) : null}
      </div>
      <div className="pz-head__actions">
        {narrow ? null : (
          <>
            <CreditsChip compact />
            <button
              ref={teamButtonRef}
              type="button"
              className="pz-btn pz-btn--card pz-team-btn"
              aria-haspopup="dialog"
              aria-label={`Equipe, ${people.length} ${people.length === 1 ? 'pessoa' : 'pessoas'}`}
              onClick={onTeam}
            >
              <span className="pz-avatars" aria-hidden="true">
                {people.slice(0, 3).map((person, index) => (
                  <Avatar key={person.profileId} person={person} index={index} size="sm" />
                ))}
              </span>
              Equipe
            </button>
            <button type="button" className="pz-btn pz-btn--card" onClick={onOpenGame}>
              <PlayIcon size={16} />
              Abrir meu jogo
            </button>
          </>
        )}
        <CareMenu items={careItems} narrow={narrow} />
      </div>
    </header>
  )
}

function PlanColumn(
  props: ProjectWorkspaceProps & { zero: ReturnType<typeof pensaZeroPresentation> },
) {
  const { view, revision, narrow, zero } = props
  const next = view.nextAction
  const completed = next.type === 'completed'
  const applicable = revision.plan.missions.filter(
    (mission) =>
      missionState(
        view.progress.find((item) => item.missionId === mission.id),
        view.availability.find((item) => item.missionId === mission.id),
      ) !== 'skip',
  )
  const done = applicable.filter(
    (mission) =>
      missionState(
        view.progress.find((item) => item.missionId === mission.id),
        undefined,
      ) === 'done',
  ).length
  const mapProps = {
    plan: revision.plan,
    progress: view.progress,
    availability: view.availability,
    currentMissionId: props.nextMission?.id ?? null,
    onOpen: (mission: PensaMission) =>
      props.onPreview(
        mission,
        document.activeElement instanceof HTMLElement ? document.activeElement : null,
      ),
  }
  return (
    <div className="pz-stack">
      {narrow ? null : <ZeroTrail stage={zero} />}
      {props.changeChoice ? (
        <section className="pz-card pz-inline-clarify" aria-label="Pergunta do Zappy">
          <ClarifyQuestion
            choice={props.changeChoice}
            assistantText={props.lastAssistantText}
            composer={props.composer}
            disabled={props.composer.blocked}
            onAnswerInChat={props.onAskChange}
            onChoose={(option) => props.onChoose(props.changeChoice!, option)}
          />
        </section>
      ) : null}
      {props.changeReady ? (
        <div className="pz-banner is-blue" role="status">
          <span>O Zappy preparou uma mudança no jogo para você conferir.</span>
          <button
            type="button"
            className="pz-btn pz-btn--action pz-btn--sm"
            onClick={props.onReviewChange}
          >
            Ver o que muda
          </button>
        </div>
      ) : null}
      {next.type === 'waiting' ? <WaitingTeam {...props} /> : null}
      {completed ? (
        <Finished
          name={view.project.name}
          done={done}
          total={applicable.length}
          ideas={revision.definition.futureIdeas}
          onOpenGame={props.onOpenGame}
          onChange={props.onAskChange}
          onUseIdea={props.onUseIdea}
          onNewGame={props.onNewGame}
        />
      ) : props.nextMission && next.type === 'mission' ? (
        <NextMission
          {...props}
          mission={props.nextMission}
          mode={next.mode}
          access={view.availability.find((item) => item.missionId === props.nextMission!.id)}
        />
      ) : null}
      {narrow ? <MissionMapCompact {...mapProps} /> : <MissionMap {...mapProps} />}
      {narrow ? null : (
        <div className="pz-project__pair">
          <GameCardSummary
            definition={revision.definition}
            onOpen={() =>
              props.onOpenCarta(
                document.activeElement instanceof HTMLElement ? document.activeElement : null,
              )
            }
          />
          {completed ? null : (
            <IdeasForLater ideas={revision.definition.futureIdeas} onChange={props.onAskChange} />
          )}
        </div>
      )}
    </div>
  )
}

function NextMission({
  view,
  revision,
  mission,
  mode,
  access,
  narrow,
  renderListen,
  onOpenMission,
  onHelp,
}: ProjectWorkspaceProps & {
  mission: PensaMission
  mode: 'build' | 'reconfirm'
  access?: PensaMissionAvailability
}) {
  const { readOnly, copy } = usePensaUi()
  const number = missionNumber(revision.plan, mission.id)
  const total = revision.plan.missions.length
  const where = DESTINATION_NAMES[mission.destination]
  // Executar segue a disponibilidade do servidor; a frase é dele, com uma reserva se faltar.
  const blocked =
    access && !access.available ? (access.message ?? 'Esta missão ainda não abre.') : null
  const note = view.progress.find((item) => item.missionId === mission.id)?.resumeNote
  const label = `${mode === 'reconfirm' ? 'Conferir' : 'Continuar'} no ${where}`
  return (
    <article
      className={`pz-card pz-next is-${mission.destination}`}
      aria-labelledby="pz-next-title"
    >
      <div className="pz-next__band">
        <span>
          {mode === 'reconfirm' ? 'Vamos conferir de novo' : 'Sua próxima missão'} · {number} de{' '}
          {total}
        </span>
        <DestinationChip destination={mission.destination} soft />
      </div>
      <div className="pz-next__body">
        <h2 id="pz-next-title" className="pz-title pz-title--next">
          {mission.title}
        </h2>
        {narrow ? (
          <p className="pz-next__objective">{mission.objective}</p>
        ) : (
          <MissionBrief
            mission={mission}
            variant="tiles"
            extensionName={
              mission.kind === 'setup'
                ? (revision.technical.extensions.find(
                    (item) => item.id === mission.setup.runtimeExtensionId,
                  )?.name ?? null)
                : null
            }
            renderListen={renderListen}
          />
        )}
        {note ? (
          <p className="pz-next__note">
            <strong>Onde você parou:</strong> {note}
          </p>
        ) : null}
        {blocked ? (
          <p className="pz-note is-yellow" role="status">
            <LockIcon size={20} />
            <span>{blocked}</span>
          </p>
        ) : null}
        <div className="pz-next__actions">
          <button
            type="button"
            className={`pz-btn pz-btn--lg ${blocked || readOnly ? 'pz-btn--locked' : 'pz-btn--action'}`}
            disabled={Boolean(blocked) || readOnly}
            title={readOnly ? copy.readOnlyHint : undefined}
            onClick={() => onOpenMission(mission)}
          >
            {label}
          </button>
          {readOnly ? null : (
            <button type="button" className="pz-btn pz-btn--card pz-btn--lg" onClick={onHelp}>
              Preciso de ajuda
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function WaitingTeam({ view, revision, onTeam, onHelp }: ProjectWorkspaceProps) {
  const { readOnly } = usePensaUi()
  const next = view.nextAction
  if (next.type !== 'waiting') return null
  const mission = next.missionId
    ? revision.plan.missions.find((item) => item.id === next.missionId)
    : undefined
  const assigneeId = mission
    ? view.progress.find((item) => item.missionId === mission.id)?.assigneeProfileId
    : null
  const index = view.team.people.findIndex((person) => person.profileId === assigneeId)
  const person = index >= 0 ? view.team.people[index] : undefined
  const viewerIndex = view.team.people.findIndex(
    (item) => item.profileId === view.team.viewerProfileId,
  )
  const title = person
    ? `${personName(person.firstName)} está ${mission?.destination === 'studio' ? 'programando' : 'criando'} esta parte`
    : 'Esta parte está com a equipe'
  return (
    <section className="pz-card pz-state" aria-labelledby="pz-waiting">
      <div className="pz-avatars pz-avatars--lg" aria-hidden="true">
        {person ? <Avatar person={person} index={index} /> : null}
        {viewerIndex >= 0 ? (
          <Avatar person={view.team.people[viewerIndex]!} index={viewerIndex} />
        ) : null}
      </div>
      <Chip tone="lilac" className="pz-self-start">
        Esperando a equipe
      </Chip>
      <h2 id="pz-waiting" className="pz-title pz-title--md">
        {title}
      </h2>
      <p>{next.reason}</p>
      {mission ? (
        <p className="pz-small">
          A missão {missionNumber(revision.plan, mission.id)}, {mission.title}, abre quando ela
          ficar pronta.
        </p>
      ) : null}
      <div className="pz-row">
        {readOnly ? null : (
          <button type="button" className="pz-btn pz-btn--card" onClick={onHelp}>
            Preciso de ajuda
          </button>
        )}
        <button type="button" className="pz-link-btn" onClick={onTeam}>
          Ver a equipe
        </button>
      </div>
    </section>
  )
}

function IdeasForLater({ ideas, onChange }: { ideas: readonly PensaIdea[]; onChange(): void }) {
  const { readOnly } = usePensaUi()
  return (
    <article className="pz-card pz-ideas" aria-labelledby="pz-ideas-title">
      <h2 id="pz-ideas-title" className="pz-title pz-title--sm">
        Ideias para depois
      </h2>
      {ideas.length ? (
        <ul className="pz-dots-list">
          {ideas.map((idea) => (
            <li key={idea.id}>{idea.text}</li>
          ))}
        </ul>
      ) : (
        <p className="pz-muted">
          Quando surgir uma ideia que fica para outra hora, ela aparece aqui.
        </p>
      )}
      {readOnly ? null : (
        <button type="button" className="pz-link-btn pz-self-start pz-push" onClick={onChange}>
          Mudar uma parte do jogo
        </button>
      )}
    </article>
  )
}

function ProjectChat(props: ProjectWorkspaceProps) {
  const { view, revision, narrow, nextMission, composer } = props
  const number = nextMission ? missionNumber(revision.plan, nextMission.id) : 0
  const final = nextMission ? isFinalTest(nextMission) : false
  return (
    <ChatPanel
      projectId={view.project.id}
      messages={view.messages}
      composer={composer}
      operation={view.operation}
      busy={props.busy}
      exhausted={props.exhausted}
      exhaustedCard={props.exhaustedCard}
      changeReady={props.changeReady}
      narrow={narrow}
      stripLabel={
        nextMission ? `Missão ${number}${final ? ' (final)' : ''} · ${nextMission.title}` : null
      }
      onAskHelp={nextMission ? props.onHelp : null}
      onAskChange={props.onAskChange}
      onClearHelp={props.onClearHelp}
      onCancelOperation={props.onCancelOperation}
      onRetryOperation={props.onRetryOperation}
      onReviewChange={props.onReviewChange}
    />
  )
}
