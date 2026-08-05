import { useCallback, useEffect, useRef, useState } from 'react'
import { splitSuggestions, stripStreamingSuggestions } from '../core/suggestions'
import type {
  PensaArtifactType,
  PensaArtifactView,
  PensaHostAdapter,
  PensaMascotPose,
  PensaProjectDetailView,
  PensaProjectListView,
  PensaStage,
  PensaStageView,
  PensaWorkStage,
  PensaZState,
} from '../core/types'
import { TaskPlan } from './TaskPlan'

const STAGES: Array<{ id: PensaWorkStage; letter: string; title: string; description: string }> = [
  {
    id: 'z',
    letter: 'Z',
    title: 'Zerar a Bagunça',
    description: 'Ideia, objetivo, controles, vitória, derrota e 2D/3D',
  },
  {
    id: 'e',
    letter: 'E',
    title: 'Enxergar o Jogo',
    description: 'Loop, cenas, telas e Bíblia Visual',
  },
  {
    id: 'r',
    letter: 'R',
    title: 'Roteirizar a Criação',
    description: 'Cartões pequenos na ordem certa',
  },
  {
    id: 'o',
    letter: 'O',
    title: 'Organizar a Criação',
    description: 'Auditoria, revisão e aprovação do plano',
  },
]

const ARTIFACT_LABELS: Record<PensaArtifactType, string> = {
  idea: 'Carta da Ideia',
  game_design: 'Visão do Jogo',
  visual_direction: 'Bíblia Visual',
  task_plan: 'Plano de Tarefas',
  plan_review: 'Revisão do Plano',
}

type JsonRecord = Record<string, unknown>
const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
const asText = (value: unknown): string => (typeof value === 'string' ? value : '')
const asTextList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const asRecordList = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : []
const lines = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
const draftId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

function useUnsavedChanges(active: boolean) {
  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Algo deu errado. Tente novamente.'
}

export function PensaApp({ adapter }: { adapter: PensaHostAdapter }) {
  const [projects, setProjects] = useState<PensaProjectListView[]>([])
  const [detail, setDetail] = useState<PensaProjectDetailView | null>(null)
  const [stage, setStage] = useState<PensaStageView | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // "Peek": rever uma etapa CONCLUÍDA em modo leitura, sem sair do agora.
  const [peek, setPeek] = useState<PensaWorkStage | null>(null)
  const [peekView, setPeekView] = useState<PensaStageView | null>(null)
  const [peekError, setPeekError] = useState<string | null>(null)
  const peekRef = useRef<PensaWorkStage | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adapter.transport.request<{ projects: PensaProjectListView[] }>(
        '/projects',
      )
      setProjects(result.projects)
      setDetail(null)
      setStage(null)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [adapter.transport])

  const loadProject = useCallback(
    async (projectId: string) => {
      setLoading(true)
      setError(null)
      try {
        const result = await adapter.transport.request<{ project: PensaProjectDetailView }>(
          `/projects/${projectId}`,
        )
        const project = result.project
        const stageResult = await adapter.transport.request<PensaStageView>(
          `/cycles/${project.currentCycle.id}/stages/${project.currentCycle.stage}`,
        )
        setDetail(project)
        setStage(stageResult)
        // Abrir/recarregar um projeto sempre volta ao "agora" (peek fechado).
        peekRef.current = null
        setPeek(null)
        setPeekView(null)
        setPeekError(null)
      } catch (cause) {
        setError(errorMessage(cause))
      } finally {
        setLoading(false)
      }
    },
    [adapter.transport],
  )

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const run = useCallback(async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await action()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(null)
    }
  }, [])

  if (loading)
    return (
      <Shell theme={adapter.theme}>
        <Status>Preparando seu mapa de criação…</Status>
      </Shell>
    )
  if (!detail) {
    return (
      <Shell theme={adapter.theme}>
        <ProjectList
          projects={projects}
          busy={busy}
          error={error}
          mascot={adapter.mascotImages}
          onOpen={(id) => void loadProject(id)}
          onCreate={(name) =>
            run('create', async () => {
              const result = await adapter.transport.request<{ project: PensaProjectDetailView }>(
                '/projects',
                { method: 'POST', body: { name } },
              )
              await loadProject(result.project.id)
            })
          }
        />
      </Shell>
    )
  }

  const refresh = () => loadProject(detail.id)
  const closePeek = () => {
    peekRef.current = null
    setPeek(null)
    setPeekView(null)
    setPeekError(null)
  }
  const openPeek = (stageId: PensaWorkStage) => {
    // Clicar a etapa atual (ou re-clicar a revisada) fecha o peek.
    if (stageId === detail.currentCycle.stage || peek === stageId) {
      closePeek()
      return
    }
    peekRef.current = stageId
    setPeek(stageId)
    setPeekView(null)
    setPeekError(null)
    void adapter.transport
      .request<PensaStageView>(`/cycles/${detail.currentCycle.id}/stages/${stageId}`)
      .then(
        (view) => {
          // Guarda de corrida: só aplica se este ainda é o peek pedido.
          if (peekRef.current === stageId) setPeekView(view)
        },
        (cause) => {
          if (peekRef.current === stageId) setPeekError(errorMessage(cause))
        },
      )
  }
  return (
    <Shell theme={adapter.theme}>
      <ProjectHeader detail={detail} onBack={() => void loadProjects()} />
      {error ? <Alert>{error}</Alert> : null}
      <CreationMap
        current={detail.currentCycle.stage}
        peek={peek}
        onPeek={openPeek}
        onExitPeek={closePeek}
      />
      {peek ? (
        <StagePeek
          adapter={adapter}
          detail={detail}
          stageId={peek}
          view={peekView}
          error={peekError}
          busy={busy}
          run={run}
          refresh={refresh}
          onClose={closePeek}
        />
      ) : stage ? (
        <StageWorkspace
          adapter={adapter}
          detail={detail}
          stage={stage}
          busy={busy}
          run={run}
          refresh={refresh}
        />
      ) : (
        <Status>Carregando esta parte do plano…</Status>
      )}
    </Shell>
  )
}

function Shell({
  theme = 'light',
  children,
}: {
  theme?: 'light' | 'dark'
  children: React.ReactNode
}) {
  return <main className={`pensa-planner pensa-theme-${theme}`}>{children}</main>
}

/** Mascote da comunidade kids. Some quando o host não passa o sprite da pose
 *  (degrade — padrão do pacote; playground standalone não tem sprites). */
function Zappy({
  pose,
  images,
  className,
}: {
  pose: PensaMascotPose
  images?: Partial<Record<PensaMascotPose, string>>
  className?: string
}) {
  const src = images?.[pose]
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`pensa-zappy${className ? ` ${className}` : ''}`}
    />
  )
}

function ProjectList(props: {
  projects: PensaProjectListView[]
  busy: string | null
  error: string | null
  mascot?: Partial<Record<PensaMascotPose, string>>
  onOpen(id: string): void
  onCreate(name: string): void
}) {
  const [name, setName] = useState('')
  return (
    <section className="pensa-home">
      <div className="pensa-hero">
        <Zappy pose="happy" images={props.mascot} className="pensa-hero-zappy" />
        <span className="pensa-kicker">PLANEJADOR DE JOGOS</span>
        <h1>
          Primeiro a ideia ganha forma.
          <br />
          Depois o jogo ganha vida.
        </h1>
        <p>
          Use o método ZERO para criar um plano claro e mandar cada Cartão de Criação ao lugar
          certo.
        </p>
        <form
          className="pensa-create"
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim().length >= 2) props.onCreate(name.trim())
          }}
        >
          <label htmlFor="pensa-project-name">Nome do novo jogo</label>
          <div>
            <input
              id="pensa-project-name"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Guardiões da Lua"
            />
            <button type="submit" disabled={props.busy === 'create' || name.trim().length < 2}>
              Criar meu plano
            </button>
          </div>
        </form>
      </div>
      {props.error ? <Alert>{props.error}</Alert> : null}
      <div className="pensa-section-heading">
        <h2>Meus planos</h2>
        <span>{props.projects.length}</span>
      </div>
      {props.projects.length === 0 ? (
        <div className="pensa-empty">
          {props.mascot?.happy ? (
            <Zappy pose="happy" images={props.mascot} className="pensa-empty-zappy" />
          ) : (
            <span>✦</span>
          )}
          <h3>Seu primeiro mundo começa aqui</h3>
          <p>Dê um nome ao jogo e vamos organizar a ideia juntos.</p>
        </div>
      ) : (
        <div className="pensa-project-grid">
          {props.projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="pensa-project-card"
              onClick={() => props.onOpen(project.id)}
            >
              <span className="pensa-project-orbit" aria-hidden="true">
                ◉
              </span>
              <strong>{project.name}</strong>
              <span>
                Versão {project.cycleNumber} ·{' '}
                {project.stage === 'done'
                  ? 'Plano aprovado'
                  : `Etapa ${project.stage.toUpperCase()}`}
              </span>
              <i>Continuar →</i>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ProjectHeader({ detail, onBack }: { detail: PensaProjectDetailView; onBack(): void }) {
  return (
    <header className="pensa-project-header">
      <button type="button" onClick={onBack} aria-label="Voltar aos meus planos">
        ←
      </button>
      <div>
        <span>VERSÃO {detail.currentCycle.number}</span>
        <h1>{detail.name}</h1>
      </div>
      <div className="pensa-plan-status">
        <span aria-hidden="true">●</span>
        {detail.currentCycle.stage === 'done' ? 'Plano aprovado' : 'Planejando'}
      </div>
    </header>
  )
}

function CreationMap(props: {
  current: PensaStage
  peek: PensaWorkStage | null
  onPeek(stage: PensaWorkStage): void
  onExitPeek(): void
}) {
  const currentIndex =
    props.current === 'done' ? STAGES.length : STAGES.findIndex((item) => item.id === props.current)
  return (
    <nav className="pensa-map" aria-label="Mapa da metodologia ZERO">
      {STAGES.map((item, index) => {
        const complete = index < currentIndex
        const isCurrent = index === currentIndex
        const viewing = props.peek === item.id
        const className = `pensa-map-node ${complete ? 'is-complete' : ''} ${isCurrent ? 'is-current' : ''} ${viewing ? 'is-viewing' : ''}`
        const inner = (
          <>
            <span>{complete ? '✓' : item.letter}</span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </div>
          </>
        )
        // Etapa vencida = botão de rever (toggle); a atual só vira botão
        // enquanto há um peek aberto (clique = voltar); futuras seguem inertes.
        if (complete)
          return (
            <button
              key={item.id}
              type="button"
              className={className}
              aria-pressed={viewing}
              aria-label={`Rever a etapa ${item.title} (concluída)`}
              onClick={() => props.onPeek(item.id)}
            >
              {inner}
            </button>
          )
        if (isCurrent && props.peek)
          return (
            <button
              key={item.id}
              type="button"
              className={className}
              aria-current="step"
              aria-label={`Voltar para a etapa atual (${item.title})`}
              onClick={props.onExitPeek}
            >
              {inner}
            </button>
          )
        return (
          <div key={item.id} className={className} aria-current={isCurrent ? 'step' : undefined}>
            {inner}
          </div>
        )
      })}
    </nav>
  )
}

/** Transcrição do chat — compartilhada entre a etapa Z (viva) e o peek (leitura).
 *  A linha SUGESTÕES: nunca renderiza crua (vira chips na etapa viva). */
function ChatTranscript({
  messages,
  streamingText,
}: {
  messages: PensaStageView['conversation']['messages']
  streamingText?: string
}) {
  const streamingBody = streamingText ? stripStreamingSuggestions(streamingText) : ''
  return (
    <div className="pensa-messages" aria-live="polite">
      {messages.map((item) => (
        <p key={`${item.at}-${item.role}-${item.content}`} className={item.role}>
          <b>{item.role === 'user' ? 'Você' : 'Zappy'}</b>
          {item.role === 'assistant' ? splitSuggestions(item.content).body : item.content}
        </p>
      ))}
      {streamingBody ? (
        <p className="assistant">
          <b>Zappy</b>
          {streamingBody}
        </p>
      ) : null}
    </div>
  )
}

function screenNamesFrom(designContent: unknown): Record<string, string> {
  const names: Record<string, string> = {}
  for (const item of asRecordList(asRecord(designContent).screens)) {
    const id = asText(item.id)
    const name = asText(item.name)
    if (id && name) names[id] = name
  }
  return names
}

/** Casca do artefato SEM ações — o ArtifactEditor não serve para etapa passada
 *  (save/validate miram a etapa ATUAL do ciclo). */
function ReadOnlyArtifact(props: {
  type: PensaArtifactType
  artifact?: PensaArtifactView
  screenNames?: Record<string, string>
  compact?: boolean
}) {
  if (!props.artifact)
    return (
      <div className="pensa-artifact-empty">
        <span>◇</span>
        <p>{ARTIFACT_LABELS[props.type]} ainda não criada.</p>
      </div>
    )
  return (
    <article className={`pensa-artifact ${props.compact ? 'is-compact' : ''}`}>
      <header>
        <div>
          <span>{props.artifact.status === 'validated' ? 'APROVADO' : 'RASCUNHO'}</span>
          <h3>{ARTIFACT_LABELS[props.type]}</h3>
        </div>
      </header>
      <ArtifactPreview
        type={props.type}
        content={props.artifact.content}
        screenNames={props.screenNames}
      />
    </article>
  )
}

function ReviewFindings({ content }: { content: unknown }) {
  const findings = asRecordList(asRecord(content).findings)
  if (!findings.length) return null
  return (
    <ul className="pensa-findings">
      {findings.map((finding) => (
        <li
          key={`${asText(finding.severity)}-${asText(finding.message)}`}
          data-severity={asText(finding.severity)}
        >
          {asText(finding.message)}
        </li>
      ))}
    </ul>
  )
}

function StagePeek(props: {
  adapter: PensaHostAdapter
  detail: PensaProjectDetailView
  stageId: PensaWorkStage
  view: PensaStageView | null
  error: string | null
  busy: string | null
  run(key: string, action: () => Promise<void>): Promise<void>
  refresh(): Promise<void>
  onClose(): void
}) {
  const config = STAGES.find((item) => item.id === props.stageId)
  if (!config) return null
  const backLabel =
    props.detail.currentCycle.stage === 'done'
      ? 'Voltar para o meu plano'
      : 'Voltar para a etapa atual'
  return (
    <section className="pensa-workspace pensa-peek">
      <div className="pensa-peek-banner" role="status">
        <span>Você está revendo uma etapa que já foi concluída.</span>
        <button type="button" onClick={props.onClose}>
          {backLabel}
        </button>
      </div>
      <div className="pensa-stage-title">
        <span>{config.letter}</span>
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
      </div>
      {props.error ? (
        <Alert>{props.error}</Alert>
      ) : props.view ? (
        <PeekContent {...props} view={props.view} />
      ) : (
        <Status>Abrindo a etapa concluída…</Status>
      )}
    </section>
  )
}

function PeekContent(props: {
  adapter: PensaHostAdapter
  stageId: PensaWorkStage
  view: PensaStageView
  busy: string | null
  run(key: string, action: () => Promise<void>): Promise<void>
  refresh(): Promise<void>
}) {
  const view = props.view
  if (props.stageId === 'z') {
    const idea = view.artifacts.find((item) => item.type === 'idea')
    return (
      <div className="pensa-two-column">
        <div className="pensa-panel pensa-chat">
          <h3>Conversa com o Zappy</h3>
          <ChatTranscript messages={view.conversation.messages} />
        </div>
        <div className="pensa-stack">
          <ReadOnlyArtifact type="idea" artifact={idea} />
        </div>
      </div>
    )
  }
  if (props.stageId === 'e') {
    const design = view.artifacts.find((item) => item.type === 'game_design')
    const visual = view.artifacts.find((item) => item.type === 'visual_direction')
    return (
      <div className="pensa-two-column">
        <ReadOnlyArtifact type="game_design" artifact={design} />
        <ReadOnlyArtifact
          type="visual_direction"
          artifact={visual}
          screenNames={screenNamesFrom(design?.content)}
        />
      </div>
    )
  }
  if (props.stageId === 'r') {
    const plan = view.artifacts.find((item) => item.type === 'task_plan')
    return (
      <div className="pensa-stack">
        <TaskPlan
          adapter={props.adapter}
          stage={view}
          busy={props.busy}
          editable={false}
          run={props.run}
          refresh={props.refresh}
        />
        <ReadOnlyArtifact type="task_plan" artifact={plan} compact />
      </div>
    )
  }
  const review = view.artifacts.find((item) => item.type === 'plan_review')
  return (
    <div className="pensa-stack">
      <ReadOnlyArtifact type="plan_review" artifact={review} />
      <ReviewFindings content={review?.content} />
    </div>
  )
}

function StageWorkspace(props: {
  adapter: PensaHostAdapter
  detail: PensaProjectDetailView
  stage: PensaStageView
  busy: string | null
  run(key: string, action: () => Promise<void>): Promise<void>
  refresh(): Promise<void>
}) {
  const current = props.detail.currentCycle.stage
  if (current === 'done') return <MyPlan {...props} />
  const config = STAGES.find((item) => item.id === current)!
  const advance = () =>
    props.run('advance', async () => {
      await props.adapter.transport.request(`/cycles/${props.detail.currentCycle.id}/advance`, {
        method: 'POST',
        body: { from: current },
      })
      await props.refresh()
    })
  return (
    <section className="pensa-workspace">
      <div className="pensa-stage-title">
        <span>{config.letter}</span>
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
      </div>
      {current === 'z' ? <StageZ {...props} onAdvance={advance} /> : null}
      {current === 'e' ? <StageE {...props} onAdvance={advance} /> : null}
      {current === 'r' ? <StageR {...props} onAdvance={advance} /> : null}
      {current === 'o' ? <StageO {...props} onAdvance={advance} /> : null}
    </section>
  )
}

type StageProps = Parameters<typeof StageWorkspace>[0] & { onAdvance(): void }

function StageZ(props: StageProps) {
  const [message, setMessage] = useState('')
  const [streaming, setStreaming] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const abortRef = useRef<null | (() => void)>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(
    () => () => {
      abortRef.current?.()
      abortRef.current = null
    },
    [],
  )
  const state = props.stage.state as unknown as Partial<PensaZState>
  const artifact = props.stage.artifacts.find((item) => item.type === 'idea')
  const decisions = state.answered ?? {
    idea: false,
    objective: false,
    controls: false,
    outcome: false,
    dimension: false,
  }
  const sendText = (raw: string) => {
    if (!raw.trim() || abortRef.current) return
    const text = raw.trim()
    setMessage('')
    setStreaming('')
    setChatError(null)
    abortRef.current = props.adapter.transport.streamChat(
      {
        projectId: props.detail.id,
        cycleId: props.detail.currentCycle.id,
        stage: 'z',
        message: text,
      },
      {
        onDelta: (delta) => setStreaming((value) => value + delta),
        onDone: () => {
          abortRef.current = null
          setStreaming('')
          void props.refresh()
        },
        onError: (cause) => {
          abortRef.current = null
          setStreaming('')
          setMessage(text)
          setChatError(errorMessage(cause))
        },
      },
    )
  }
  const send = () => sendText(message)
  // Sugestões clicáveis: só as da ÚLTIMA resposta do Zappy respondem à
  // pergunta atual; o clique PREENCHE o campo (a criança revisa e envia).
  const lastMessage = props.stage.conversation.messages.at(-1)
  const suggestions =
    lastMessage?.role === 'assistant' ? splitSuggestions(lastMessage.content).suggestions : []
  const pickSuggestion = (suggestion: string) => {
    setMessage(suggestion)
    textareaRef.current?.focus()
  }
  return (
    <div className="pensa-two-column">
      <div className="pensa-panel pensa-chat">
        <div className="pensa-chat-head">
          <Zappy pose="thinking" images={props.adapter.mascotImages} className="pensa-chat-zappy" />
          <h3>Converse com o Zappy</h3>
        </div>
        <fieldset className="pensa-decisions">
          <legend>Decisões da ideia</legend>
          <div className="pensa-decision-chips">
            {Object.entries(decisions).map(([key, done]) => (
              <span key={key} className={done ? 'is-done' : ''}>
                {done ? '✓' : '○'}{' '}
                {
                  (
                    {
                      idea: 'Ideia',
                      objective: 'Objetivo',
                      controls: 'Controles',
                      outcome: 'Vitória e derrota',
                      dimension: '2D ou 3D',
                    } as Record<string, string>
                  )[key]
                }
              </span>
            ))}
          </div>
        </fieldset>
        <ChatTranscript messages={props.stage.conversation.messages} streamingText={streaming} />
        {suggestions.length > 0 && !streaming && !abortRef.current ? (
          <fieldset className="pensa-suggestion-chips">
            <legend className="pensa-sr-only">Sugestões do Zappy</legend>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={!!abortRef.current}
                onClick={() => pickSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </fieldset>
        ) : null}
        <div className="pensa-chat-input">
          <label className="pensa-sr-only" htmlFor="pensa-chat-message">
            Mensagem para o Zappy
          </label>
          <textarea
            id="pensa-chat-message"
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') send()
            }}
            placeholder="Conte sua ideia…"
            maxLength={2000}
          />
          <button type="button" onClick={send} disabled={!message.trim() || !!abortRef.current}>
            Enviar
          </button>
        </div>
        {chatError ? (
          <p className="pensa-inline-error" role="alert">
            {chatError} Sua mensagem ficou aqui para tentar de novo.
          </p>
        ) : null}
      </div>
      <div className="pensa-stack">
        <ArtifactEditor {...props} type="idea" artifact={artifact} />
        {!artifact && state.ready ? (
          <GenerateButton {...props} type="idea">
            Criar a Carta da Ideia
          </GenerateButton>
        ) : null}
        {artifact?.status === 'validated' ? (
          <PrimaryButton busy={props.busy === 'advance'} onClick={props.onAdvance}>
            Ir para Enxergar o Jogo →
          </PrimaryButton>
        ) : null}
      </div>
    </div>
  )
}

function StageE(props: StageProps) {
  const design = props.stage.artifacts.find((item) => item.type === 'game_design')
  const visual = props.stage.artifacts.find((item) => item.type === 'visual_direction')
  const screenNames = screenNamesFrom(design?.content)
  return (
    <div className="pensa-stack">
      <div className="pensa-two-column">
        <div className="pensa-stack">
          <ArtifactEditor {...props} type="game_design" artifact={design} />
          {!design ? (
            <GenerateButton {...props} type="game_design">
              Criar loop, cenas e telas
            </GenerateButton>
          ) : null}
        </div>
        <div className="pensa-stack">
          <ArtifactEditor
            {...props}
            type="visual_direction"
            artifact={visual}
            screenNames={screenNames}
          />
          {!visual ? (
            <GenerateButton {...props} type="visual_direction">
              Cocriar a Bíblia Visual
            </GenerateButton>
          ) : null}
        </div>
      </div>
      {design?.status === 'validated' && visual?.status === 'validated' ? (
        <PrimaryButton busy={props.busy === 'advance'} onClick={props.onAdvance}>
          Roteirizar a criação →
        </PrimaryButton>
      ) : null}
    </div>
  )
}

function StageR(props: StageProps) {
  const plan = props.stage.artifacts.find((item) => item.type === 'task_plan')
  return (
    <div className="pensa-stack">
      <div className="pensa-ribbon">
        <div>
          <strong>Cartões de Criação</strong>
          <span>Cada cartão vai abrir com o mesmo guia no Pinta ou Estúdio.</span>
        </div>
        <GenerateButton {...props} type="task_plan">
          {props.stage.tasks.length ? 'Recriar plano' : 'Criar plano de tarefas'}
        </GenerateButton>
      </div>
      <TaskPlan {...props} editable />
      {props.stage.tasks.length ? (
        <ArtifactEditor {...props} type="task_plan" artifact={plan} compact />
      ) : null}
      {plan?.status === 'validated' && props.stage.tasks.length ? (
        <PrimaryButton busy={props.busy === 'advance'} onClick={props.onAdvance}>
          Auditar o plano →
        </PrimaryButton>
      ) : null}
    </div>
  )
}

function StageO(props: StageProps) {
  const review = props.stage.artifacts.find((item) => item.type === 'plan_review')
  const content = review?.content as
    | { approved?: boolean; findings?: Array<{ severity: string; message: string }> }
    | undefined
  return (
    <div className="pensa-stack">
      <TaskPlan {...props} editable />
      <div className="pensa-audit">
        <div>
          <span aria-hidden="true">◎</span>
          <div>
            <h3>Auditoria ZERO</h3>
            <p>Confere ordem, dependências, guias e referências do catálogo oficial.</p>
          </div>
        </div>
        <GenerateButton {...props} type="plan_review" extra={{ approved: true }}>
          Revisar e aprovar
        </GenerateButton>
      </div>
      <ReviewFindings content={review?.content} />
      {review?.status === 'validated' && content?.approved ? (
        <PrimaryButton busy={props.busy === 'advance'} onClick={props.onAdvance}>
          Aprovar meu plano ✓
        </PrimaryButton>
      ) : null}
    </div>
  )
}

function ArtifactEditor(
  props: StageProps & {
    type: PensaArtifactType
    artifact?: PensaArtifactView
    compact?: boolean
    screenNames?: Record<string, string>
  },
) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<JsonRecord>(() => asRecord(props.artifact?.content))
  useEffect(() => setDraft(asRecord(props.artifact?.content)), [props.artifact?.content])
  const changed = JSON.stringify(draft) !== JSON.stringify(asRecord(props.artifact?.content))
  useUnsavedChanges(editing && changed)
  if (!props.artifact)
    return (
      <div className="pensa-artifact-empty">
        <span>◇</span>
        <p>{ARTIFACT_LABELS[props.type]} ainda não criada.</p>
      </div>
    )
  const canEdit =
    props.type === 'idea' || props.type === 'game_design' || props.type === 'visual_direction'
  const save = () =>
    props.run(`save-${props.type}`, async () => {
      await props.adapter.transport.request(`/cycles/${props.detail.currentCycle.id}/artifacts`, {
        method: 'POST',
        body: { stage: props.detail.currentCycle.stage, type: props.type, content: draft },
      })
      setEditing(false)
      await props.refresh()
    })
  const validate = () =>
    props.run(`validate-${props.type}`, async () => {
      await props.adapter.transport.request(
        `/cycles/${props.detail.currentCycle.id}/artifacts/${props.type}/validate`,
        { method: 'POST' },
      )
      await props.refresh()
    })
  return (
    <article className={`pensa-artifact ${props.compact ? 'is-compact' : ''}`}>
      <header>
        <div>
          <span>{props.artifact.status === 'validated' ? 'APROVADO' : 'RASCUNHO'}</span>
          <h3>{ARTIFACT_LABELS[props.type]}</h3>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              if (editing && changed && !window.confirm('Descartar as mudanças deste cartão?'))
                return
              setDraft(asRecord(props.artifact?.content))
              setEditing((state) => !state)
            }}
          >
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        ) : null}
      </header>
      {editing ? (
        <ArtifactForm type={props.type} value={draft} onChange={setDraft} />
      ) : (
        <ArtifactPreview
          type={props.type}
          content={props.artifact.content}
          screenNames={props.screenNames}
        />
      )}
      <footer>
        {editing ? (
          <button
            type="button"
            onClick={save}
            disabled={props.busy === `save-${props.type}` || !changed}
          >
            Salvar nova versão
          </button>
        ) : null}
        {props.artifact.status === 'draft' && !editing ? (
          <button
            type="button"
            className="primary"
            onClick={validate}
            disabled={props.busy === `validate-${props.type}`}
          >
            Está do meu jeito ✓
          </button>
        ) : null}
      </footer>
    </article>
  )
}

function TextField(props: {
  label: string
  value: string
  onChange(value: string): void
  multiline?: boolean
}) {
  const id = `artifact-${props.label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <label className="pensa-form-field" htmlFor={id}>
      <span>{props.label}</span>
      {props.multiline ? (
        <textarea
          id={id}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
        />
      )}
    </label>
  )
}

function LineListField(props: {
  label: string
  value: string[]
  onChange(value: string[]): void
  help?: string
}) {
  const id = `artifact-${props.label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <label className="pensa-form-field" htmlFor={id}>
      <span>{props.label}</span>
      <textarea
        id={id}
        value={props.value.join('\n')}
        onChange={(event) => props.onChange(lines(event.target.value))}
      />
      <small>{props.help ?? 'Escreva um item por linha.'}</small>
    </label>
  )
}

function NamedPurposeRows(props: {
  label: string
  value: JsonRecord[]
  idKey: 'id' | 'screenId'
  onChange(value: JsonRecord[]): void
}) {
  const update = (index: number, patch: JsonRecord) =>
    props.onChange(
      props.value.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  return (
    <fieldset className="pensa-form-group">
      <legend>{props.label}</legend>
      {props.value.map((item, index) => (
        <div className="pensa-form-row" key={asText(item[props.idKey]) || index}>
          <input
            aria-label={`${props.label}: nome ${index + 1}`}
            value={asText(item.name ?? item.screenId)}
            onChange={(event) =>
              update(
                index,
                props.idKey === 'screenId'
                  ? { screenId: event.target.value }
                  : { name: event.target.value },
              )
            }
          />
          <input
            aria-label={`${props.label}: propósito ${index + 1}`}
            value={asText(item.purpose ?? item.description)}
            onChange={(event) =>
              update(
                index,
                'description' in item
                  ? { description: event.target.value }
                  : { purpose: event.target.value },
              )
            }
          />
          <button
            type="button"
            onClick={() => props.onChange(props.value.filter((_, i) => i !== index))}
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          props.onChange([
            ...props.value,
            props.idKey === 'screenId'
              ? { screenId: draftId('tela'), description: '' }
              : { id: draftId('item'), name: '', purpose: '' },
          ])
        }
      >
        Adicionar
      </button>
    </fieldset>
  )
}

function ArtifactForm(props: {
  type: PensaArtifactType
  value: JsonRecord
  onChange(value: JsonRecord): void
}) {
  const set = (key: string, value: unknown) => props.onChange({ ...props.value, [key]: value })
  if (props.type === 'idea') {
    return (
      <div className="pensa-structured-form">
        <TextField
          label="Título"
          value={asText(props.value.title)}
          onChange={(value) => set('title', value)}
        />
        <TextField
          label="Ideia do jogo"
          multiline
          value={asText(props.value.idea)}
          onChange={(value) => set('idea', value)}
        />
        <TextField
          label="Objetivo"
          multiline
          value={asText(props.value.objective)}
          onChange={(value) => set('objective', value)}
        />
        <LineListField
          label="Controles"
          value={asTextList(props.value.controls)}
          onChange={(value) => set('controls', value)}
        />
        <TextField
          label="Como vence"
          value={asText(props.value.victory)}
          onChange={(value) => set('victory', value)}
        />
        <TextField
          label="Como perde"
          value={asText(props.value.defeat)}
          onChange={(value) => set('defeat', value)}
        />
        <label className="pensa-form-field">
          <span>Dimensão</span>
          <select
            value={asText(props.value.dimension)}
            onChange={(event) => set('dimension', event.target.value)}
          >
            <option value="2d">2D</option>
            <option value="3d">3D</option>
          </select>
        </label>
      </div>
    )
  }
  if (props.type === 'game_design') {
    return (
      <div className="pensa-structured-form">
        <LineListField
          label="Loop principal"
          value={asTextList(props.value.coreLoop)}
          onChange={(value) => set('coreLoop', value)}
        />
        <TextField
          label="Câmera"
          value={asText(props.value.camera)}
          onChange={(value) => set('camera', value)}
        />
        <NamedPurposeRows
          label="Cenas"
          idKey="id"
          value={asRecordList(props.value.scenes)}
          onChange={(value) => set('scenes', value)}
        />
        <NamedPurposeRows
          label="Telas"
          idKey="id"
          value={asRecordList(props.value.screens)}
          onChange={(value) => set('screens', value)}
        />
      </div>
    )
  }
  if (props.type === 'visual_direction') {
    const palette = asRecordList(props.value.palette)
    const assets = asRecordList(props.value.assets)
    return (
      <div className="pensa-structured-form">
        <TextField
          label="Estilo"
          multiline
          value={asText(props.value.style)}
          onChange={(value) => set('style', value)}
        />
        <TextField
          label="Câmera"
          value={asText(props.value.camera)}
          onChange={(value) => set('camera', value)}
        />
        <TextField
          label="Clima"
          value={asText(props.value.mood)}
          onChange={(value) => set('mood', value)}
        />
        <TextField
          label="Linguagem de formas"
          multiline
          value={asText(props.value.shapeLanguage)}
          onChange={(value) => set('shapeLanguage', value)}
        />
        <fieldset className="pensa-form-group">
          <legend>Paleta e papéis</legend>
          {palette.map((color, index) => (
            <div
              className="pensa-form-row pensa-color-row"
              key={`${asText(color.role)}-${asText(color.color)}`}
            >
              <input
                aria-label={`Papel da cor ${index + 1}`}
                value={asText(color.role)}
                onChange={(event) =>
                  set(
                    'palette',
                    palette.map((item, i) =>
                      i === index ? { ...item, role: event.target.value } : item,
                    ),
                  )
                }
              />
              <input
                aria-label={`Cor ${index + 1}`}
                type="color"
                value={asText(color.color) || '#000000'}
                onChange={(event) =>
                  set(
                    'palette',
                    palette.map((item, i) =>
                      i === index ? { ...item, color: event.target.value } : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    'palette',
                    palette.filter((_, i) => i !== index),
                  )
                }
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set('palette', [...palette, { role: '', color: '#000000' }])}
          >
            Adicionar cor
          </button>
        </fieldset>
        <LineListField
          label="Regras visuais"
          value={asTextList(props.value.visualRules)}
          onChange={(value) => set('visualRules', value)}
        />
        <NamedPurposeRows
          label="Aparência das telas"
          idKey="screenId"
          value={asRecordList(props.value.screens)}
          onChange={(value) => set('screens', value)}
        />
        <fieldset className="pensa-form-group">
          <legend>Inventário de assets</legend>
          {assets.map((asset, index) => (
            <div className="pensa-asset-form" key={asText(asset.id) || index}>
              <input
                aria-label={`Nome do asset ${index + 1}`}
                value={asText(asset.name)}
                onChange={(event) =>
                  set(
                    'assets',
                    assets.map((item, i) =>
                      i === index ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
              <select
                aria-label={`Tipo do asset ${index + 1}`}
                value={asText(asset.kind)}
                onChange={(event) =>
                  set(
                    'assets',
                    assets.map((item, i) =>
                      i === index ? { ...item, kind: event.target.value } : item,
                    ),
                  )
                }
              >
                {['sprite', 'background', 'tileset', 'tilemap', 'model', 'world', 'material'].map(
                  (kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ),
                )}
              </select>
              <textarea
                aria-label={`Aparência do asset ${index + 1}`}
                value={asText(asset.appearance)}
                onChange={(event) =>
                  set(
                    'assets',
                    assets.map((item, i) =>
                      i === index ? { ...item, appearance: event.target.value } : item,
                    ),
                  )
                }
              />
              <textarea
                aria-label={`Uso do asset ${index + 1}`}
                value={asText(asset.usage)}
                onChange={(event) =>
                  set(
                    'assets',
                    assets.map((item, i) =>
                      i === index ? { ...item, usage: event.target.value } : item,
                    ),
                  )
                }
              />
              <input
                aria-label={`Animações do asset ${index + 1}`}
                value={asTextList(asset.animations).join(', ')}
                onChange={(event) =>
                  set(
                    'assets',
                    assets.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            animations: event.target.value
                              .split(',')
                              .map((part) => part.trim())
                              .filter(Boolean),
                          }
                        : item,
                    ),
                  )
                }
              />
              <input
                aria-label={`Estados do asset ${index + 1}`}
                value={asTextList(asset.states).join(', ')}
                onChange={(event) =>
                  set(
                    'assets',
                    assets.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            states: event.target.value
                              .split(',')
                              .map((part) => part.trim())
                              .filter(Boolean),
                          }
                        : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    'assets',
                    assets.filter((_, i) => i !== index),
                  )
                }
              >
                Remover asset
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set('assets', [
                ...assets,
                {
                  id: draftId('asset'),
                  name: '',
                  kind: 'sprite',
                  appearance: '',
                  animations: [],
                  states: [],
                  usage: '',
                },
              ])
            }
          >
            Adicionar asset
          </button>
        </fieldset>
      </div>
    )
  }
  return <ArtifactPreview type={props.type} content={props.value} />
}

function ArtifactPreview({
  type,
  content,
  screenNames,
}: {
  type: PensaArtifactType
  content: unknown
  /** Nome amigável por screenId do game_design (a Bíblia só carrega o id). */
  screenNames?: Record<string, string>
}) {
  const record = asRecord(content)
  if (type === 'idea') {
    return (
      <div className="pensa-artifact-preview">
        <h4>{asText(record.title)}</h4>
        <p>{asText(record.idea)}</p>
        <dl>
          <div>
            <dt>Objetivo</dt>
            <dd>{asText(record.objective)}</dd>
          </div>
          <div>
            <dt>Controles</dt>
            <dd>{asTextList(record.controls).join(' · ')}</dd>
          </div>
          <div>
            <dt>Vitória</dt>
            <dd>{asText(record.victory)}</dd>
          </div>
          <div>
            <dt>Derrota</dt>
            <dd>{asText(record.defeat)}</dd>
          </div>
          <div>
            <dt>Formato</dt>
            <dd>{asText(record.dimension).toUpperCase()}</dd>
          </div>
        </dl>
      </div>
    )
  }
  if (type === 'game_design') {
    return (
      <div className="pensa-artifact-preview">
        <h4>Loop principal</h4>
        <ol className="pensa-loop">
          {asTextList(record.coreLoop).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p>
          <strong>Câmera:</strong> {asText(record.camera)}
        </p>
        <div className="pensa-preview-columns">
          <section>
            <h4>Cenas</h4>
            {asRecordList(record.scenes).map((item) => (
              <p key={asText(item.id)}>
                <strong>{asText(item.name)}</strong>
                <small>{asText(item.purpose)}</small>
              </p>
            ))}
          </section>
          <section>
            <h4>Telas</h4>
            {asRecordList(record.screens).map((item) => (
              <p key={asText(item.id)}>
                <strong>{asText(item.name)}</strong>
                <small>{asText(item.purpose)}</small>
              </p>
            ))}
          </section>
        </div>
      </div>
    )
  }
  if (type === 'visual_direction') {
    const palette = asRecordList(record.palette)
    const rules = asTextList(record.visualRules)
    const screens = asRecordList(record.screens)
    const assets = asRecordList(record.assets)
    const PINTA_KINDS = new Set(['sprite', 'background', 'tileset', 'tilemap'])
    return (
      <div className="pensa-artifact-preview pensa-bible">
        <dl>
          <div>
            <dt>Estilo</dt>
            <dd>{asText(record.style)}</dd>
          </div>
          <div>
            <dt>Clima</dt>
            <dd>{asText(record.mood)}</dd>
          </div>
          <div>
            <dt>Câmera</dt>
            <dd>{asText(record.camera)}</dd>
          </div>
          <div>
            <dt>Formas</dt>
            <dd>{asText(record.shapeLanguage)}</dd>
          </div>
        </dl>
        {palette.length ? (
          <>
            <h4>Paleta de cores</h4>
            <ul className="pensa-bible-palette">
              {palette.map((entry) => {
                const role = asText(entry.role)
                const color = asText(entry.color)
                return (
                  <li key={`${role}-${color}`}>
                    <span style={{ background: color }} aria-hidden="true" />
                    <strong>{role}</strong>
                    <small>{color.toUpperCase()}</small>
                  </li>
                )
              })}
            </ul>
          </>
        ) : null}
        {rules.length ? (
          <>
            <h4>Regras visuais</h4>
            <ul className="pensa-loop pensa-bible-rules">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </>
        ) : null}
        {screens.length ? (
          <>
            <h4>Aparência das telas</h4>
            <div className="pensa-bible-screens">
              {screens.map((item) => {
                const screenId = asText(item.screenId)
                return (
                  <p key={screenId}>
                    <strong>{screenNames?.[screenId] ?? screenId}</strong>
                    <small>{asText(item.description)}</small>
                  </p>
                )
              })}
            </div>
          </>
        ) : null}
        {assets.length ? (
          <>
            <h4>Inventário de assets</h4>
            <ul className="pensa-bible-assets">
              {assets.map((asset) => {
                const kind = asText(asset.kind)
                const usage = asText(asset.usage)
                const chips = [
                  ...asTextList(asset.animations).map((item) => `🎬 ${item}`),
                  ...asTextList(asset.states).map((item) => `✨ ${item}`),
                ]
                return (
                  <li key={asText(asset.id) || `${asText(asset.name)}-${kind}`}>
                    <header>
                      <strong>{asText(asset.name)}</strong>
                      <span
                        className="pensa-bible-kind"
                        data-tool={PINTA_KINDS.has(kind) ? 'pinta' : 'studio'}
                      >
                        {kind}
                      </span>
                    </header>
                    <small>{asText(asset.appearance)}</small>
                    {usage ? (
                      <small>
                        <strong>Uso:</strong> {usage}
                      </small>
                    ) : null}
                    {chips.length ? (
                      <div className="pensa-bible-chips">
                        {chips.map((chip) => (
                          <span key={chip}>{chip}</span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </>
        ) : null}
      </div>
    )
  }
  if (type === 'task_plan') {
    return (
      <div className="pensa-artifact-preview">
        <p>
          <strong>{asTextList(record.taskIds).length} cartões</strong> verificados contra o catálogo
          oficial.
        </p>
        <small>
          Plano gerado em {new Date(asText(record.generatedAt)).toLocaleString('pt-BR')}
        </small>
      </div>
    )
  }
  const findings = asRecordList(record.findings)
  return (
    <div className="pensa-artifact-preview">
      <p>
        <strong>
          {record.approved ? 'Plano aprovado pela auditoria' : 'O plano precisa de ajustes'}
        </strong>
      </p>
      <p>
        {findings.length
          ? `${findings.length} ponto(s) encontrado(s).`
          : 'Nenhum problema encontrado.'}
      </p>
    </div>
  )
}

function GenerateButton(
  props: StageProps & {
    type: PensaArtifactType
    extra?: Record<string, unknown>
    children: React.ReactNode
  },
) {
  const key = `generate-${props.type}`
  return (
    <button
      type="button"
      className="pensa-generate"
      disabled={props.busy === key}
      onClick={() =>
        props.run(key, async () => {
          await props.adapter.transport.request(
            `/cycles/${props.detail.currentCycle.id}/artifacts/generate`,
            {
              method: 'POST',
              body: { type: props.type, projectId: props.detail.id, ...props.extra },
            },
          )
          await props.refresh()
        })
      }
    >
      {props.busy === key ? 'Organizando…' : props.children}
    </button>
  )
}

function MyPlan(props: Parameters<typeof StageWorkspace>[0]) {
  const [newVersionOpen, setNewVersionOpen] = useState(false)
  const [goal, setGoal] = useState('')
  return (
    <section className="pensa-workspace pensa-my-plan">
      <div className="pensa-approved">
        <span>✓</span>
        <div>
          <p>PLANO APROVADO</p>
          <h2>Meu plano</h2>
          <small>A criação acontece no Pinta e no Estúdio. O Pensa acompanha o caminho.</small>
        </div>
        <Zappy
          pose="celebrating"
          images={props.adapter.mascotImages}
          className="pensa-approved-zappy"
        />
      </div>
      <TaskPlan {...props} editable />
      <div className="pensa-next-summary">
        {props.stage.nextTaskId
          ? 'A próxima tarefa pronta para começar está destacada.'
          : props.stage.tasks.every((task) => task.progress.status === 'completed')
            ? 'Todas as tarefas desta versão foram concluídas!'
            : 'Conclua as dependências para liberar a próxima tarefa.'}
      </div>
      <button type="button" className="pensa-new-version" onClick={() => setNewVersionOpen(true)}>
        Planejar uma nova versão +
      </button>
      {newVersionOpen ? (
        <form
          className="pensa-new-version-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (!goal.trim()) return
            void props.run('new-cycle', async () => {
              await props.adapter.transport.request(`/projects/${props.detail.id}/cycles`, {
                method: 'POST',
                body: { goal: goal.trim() },
              })
              setGoal('')
              setNewVersionOpen(false)
              await props.refresh()
            })
          }}
        >
          <label htmlFor="pensa-version-goal">O que você quer acrescentar nesta versão?</label>
          <textarea
            id="pensa-version-goal"
            maxLength={500}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
          />
          <div>
            <button
              type="button"
              onClick={() => {
                setGoal('')
                setNewVersionOpen(false)
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="primary"
              disabled={!goal.trim() || props.busy === 'new-cycle'}
            >
              Começar nova versão
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function PrimaryButton({
  busy,
  onClick,
  children,
}: {
  busy: boolean
  onClick(): void
  children: React.ReactNode
}) {
  return (
    <button type="button" className="pensa-primary-action" onClick={onClick} disabled={busy}>
      {busy ? 'Conferindo…' : children}
    </button>
  )
}
function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="pensa-alert" role="alert">
      {children}
    </div>
  )
}
function Status({ children }: { children: React.ReactNode }) {
  return (
    <div className="pensa-status" role="status">
      {children}
    </div>
  )
}
