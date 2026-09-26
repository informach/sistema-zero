import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { isAiQuotaError } from '@sistemazero/core/ai-credits'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { editedAgo } from '../core/relativeTime'
import { splitSuggestions, stripStreamingSuggestions } from '../core/suggestions'
import { personName, TEAM_COPY } from '../core/teamCopy'
import type {
  PensaArtifactType,
  PensaArtifactView,
  PensaHostAdapter,
  PensaMascotPose,
  PensaProjectDetailView,
  PensaProjectListView,
  PensaStage,
  PensaStageView,
  PensaTaskView,
  PensaWorkStage,
  PensaZState,
} from '../core/types'
import { AiCreditsBadge, AiCreditsNotice } from './AiCredits'
import { ConfirmDialog } from './ConfirmDialog'
import { ArrowLeftIcon, HostBackLink, HostMenuButton, usePensaHostChrome } from './hostChrome'
import {
  ArrowRightIcon,
  BlocksIcon,
  CheckIcon,
  CircleCheckIcon,
  CubeIcon,
  EyeIcon,
  FlagIcon,
  LightbulbIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
  UsersIcon,
} from './icons'
import { TaskPlan } from './TaskPlan'
import { TeamDialog } from './TeamDialog'
import { DirtyContext, type DirtyRegistry, useUnsavedChanges } from './unsavedChanges'

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

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Algo deu errado. Tente novamente.'
}

/**
 * Acabar a ajuda de IA NÃO é falha: separar os dois estados é o que permite
 * mostrar cor, `role` e recado diferentes. Só o ramo técnico promete "tente de
 * novo" — insistir depois do limite não resolve nada e frustra a criança.
 */
type PensaFailure = { kind: 'quota' | 'technical'; text: string }

function failure(cause: unknown): PensaFailure {
  if (isAiQuotaError(cause)) return { kind: 'quota', text: errorMessage(cause) }
  return { kind: 'technical', text: errorMessage(cause) }
}

export function PensaApp({
  adapter,
  initialProjectId = null,
  onWorkspaceChange,
  teamPollMs = 30_000,
}: {
  adapter: PensaHostAdapter
  initialProjectId?: string | null
  /** O compasso do "alguém da equipe mexeu no plano" (o teste injeta um curto; 0 desliga). */
  teamPollMs?: number
  /** Informa ao host quando um plano está aberto, sem acoplar o Pensa ao menu externo. */
  onWorkspaceChange?: (active: boolean) => void
}) {
  const [projects, setProjects] = useState<PensaProjectListView[]>([])
  const [detail, setDetail] = useState<PensaProjectDetailView | null>(null)
  const projectOpen = detail !== null
  useLayoutEffect(() => {
    onWorkspaceChange?.(projectOpen)
    return () => onWorkspaceChange?.(false)
  }, [projectOpen, onWorkspaceChange])
  const [stage, setStage] = useState<PensaStageView | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Equipe (26/09/2026): a janela "Equipe · N", quem a abriu (para o foco voltar) e o aviso de
  // que outro membro mexeu no plano enquanto este estava aberto.
  const [teamOpen, setTeamOpen] = useState(false)
  const teamOpenerRef = useRef<HTMLElement | null>(null)
  const [changedRemotely, setChangedRemotely] = useState(false)
  const busyRef = useRef<string | null>(null)
  useEffect(() => {
    busyRef.current = busy
  }, [busy])
  // "Coisa sem guardar": cada editor sujo (cartão, tarefa, o rascunho do chat) segura uma posse
  // aqui pelo `useUnsavedChanges`; o "Atualizar" da faixa pergunta antes de recarregar por cima.
  const dirtyHolds = useRef(0)
  const dirtyRegistry = useMemo<DirtyRegistry>(
    () => ({
      hold: () => {
        dirtyHolds.current += 1
        let released = false
        return () => {
          if (released) return
          released = true
          dirtyHolds.current -= 1
        }
      },
      isDirty: () => dirtyHolds.current > 0,
    }),
    [],
  )
  const [reloadAsk, setReloadAsk] = useState(false)
  const reloadButtonRef = useRef<HTMLButtonElement | null>(null)
  // "Sair da equipe" leva à home sem ninguém para o foco voltar (o "Equipe" e a janela já se
  // foram): a home nasce com o foco no h1 quando esta bandeira está de pé (consumida ao montar).
  const homeFocusRef = useRef(false)
  const takeTitleFocus = useCallback(() => {
    const wanted = homeFocusRef.current
    homeFocusRef.current = false
    return wanted
  }, [])
  // "Peek": rever uma etapa CONCLUÍDA em modo leitura, sem sair do agora.
  const [peek, setPeek] = useState<PensaWorkStage | null>(null)
  const [peekView, setPeekView] = useState<PensaStageView | null>(null)
  const [peekError, setPeekError] = useState<string | null>(null)
  const peekRef = useRef<PensaWorkStage | null>(null)
  // "Ver os Cartões de Criação" (a faixa lilás do plano aprovado): fecha o peek e, DEPOIS que o
  // "Meu plano" volta à tela, rola até a lista dos cartões e leva o foco para ela. O contador é o
  // pedido; o efeito roda depois da renderização que remonta a lista.
  const cardsRef = useRef<HTMLDivElement | null>(null)
  const [cardsRequest, setCardsRequest] = useState(0)
  useEffect(() => {
    if (!cardsRequest) return
    const target = cardsRef.current
    if (!target) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    target.focus({ preventScroll: true })
  }, [cardsRequest])

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
      setTeamOpen(false)
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
          `/projects/${encodeURIComponent(projectId)}`,
        )
        const project = result.project
        const stageResult = await adapter.transport.request<PensaStageView>(
          `/cycles/${project.currentCycle.id}/stages/${project.currentCycle.stage}`,
        )
        setDetail(project)
        setStage(stageResult)
        setChangedRemotely(false)
        setReloadAsk(false)
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
    if (initialProjectId) void loadProject(initialProjectId)
    else void loadProjects()
  }, [loadProjects, loadProject, initialProjectId])

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

  // Renomear o plano (26/09/2026): OTIMISTA (o título troca na hora), fora do `run` para não
  // travar o `busy` global; o erro restaura o nome e vai para o aviso da faixa creme. O lápis
  // não some nem trava enquanto grava: é para onde o foco volta, e um botão escondido ou
  // desabilitado não recebe foco.
  const renameProject = useCallback(
    async (name: string) => {
      const current = detail
      if (!current) return
      const previous = current.name
      setError(null)
      setDetail({ ...current, name })
      try {
        const result = await adapter.transport.request<{ project: PensaProjectDetailView }>(
          `/projects/${encodeURIComponent(current.id)}`,
          { method: 'PATCH', body: { name } },
        )
        setDetail((now) =>
          now && now.id === current.id
            ? { ...now, name: result.project.name, updatedAt: result.project.updatedAt }
            : now,
        )
      } catch (cause) {
        setDetail((now) => (now && now.id === current.id ? { ...now, name: previous } : now))
        setError(errorMessage(cause))
      }
    },
    [adapter.transport, detail],
  )

  // A janela da equipe mexeu no projeto (gerar/desligar o código, tirar alguém): o members grava
  // o `updatedAt` do projeto, então o app puxa o detalhe de novo SÓ para o `detail` (sem
  // `loading`, sem recarregar a etapa: o `StageWorkspace` não desmonta e nada que a criança
  // escreve se perde). Sem isso o compasso acusaria a própria criança em até 30 s.
  const syncDetail = useCallback(
    async (projectId: string) => {
      try {
        const result = await adapter.transport.request<{ project: PensaProjectDetailView }>(
          `/projects/${encodeURIComponent(projectId)}`,
        )
        setDetail((now) => (now && now.id === projectId ? result.project : now))
      } catch {
        // O espelho otimista da janela já está na tela; o próximo tique do compasso confere.
      }
    },
    [adapter.transport],
  )

  // "Alguém da equipe mexeu no plano" (26/09/2026): com equipe, um compasso leve pergunta o
  // `updatedAt` do plano e, se mudou, mostra a faixa com "Atualizar" em vez de recarregar por
  // cima do que a criança está escrevendo. Só com a aba visível e sem ação em voo; toda ação
  // própria termina em `refresh`, então o `updatedAt` daqui já é o do servidor.
  const memberCount = detail?.team?.memberCount ?? 0
  const detailId = detail?.id ?? null
  const detailUpdatedAt = detail?.updatedAt ?? null
  useEffect(() => {
    setChangedRemotely(false)
    if (!detailId || !detailUpdatedAt || memberCount === 0 || teamPollMs <= 0) return
    let alive = true
    const tick = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      if (busyRef.current) return
      try {
        const result = await adapter.transport.request<{ project: PensaProjectDetailView }>(
          `/projects/${encodeURIComponent(detailId)}`,
        )
        if (alive && result.project.updatedAt !== detailUpdatedAt) setChangedRemotely(true)
      } catch {
        // Rede caiu no compasso: o próximo tique tenta de novo, sem assustar ninguém.
      }
    }
    const timer = setInterval(() => void tick(), teamPollMs)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [adapter.transport, detailId, detailUpdatedAt, memberCount, teamPollMs])

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
          takeTitleFocus={takeTitleFocus}
          onOpen={(id) => void loadProject(id)}
          onJoin={async (code) => {
            // Sem `run`: o recado fica NO formulário do código, ao lado do campo.
            const result = await adapter.transport.request<{ project: PensaProjectDetailView }>(
              '/projects/join',
              { method: 'POST', body: { code } },
            )
            await loadProject(result.project.id)
          }}
          onCreate={(name) =>
            run('create', async () => {
              const result = await adapter.transport.request<{ project: PensaProjectDetailView }>(
                '/projects',
                { method: 'POST', body: { name } },
              )
              await loadProject(result.project.id)
            })
          }
          onRemove={async (id) => {
            // Sem `run`: o erro tem que aparecer NA JANELA, que fica aberta para a
            // criança tentar de novo, e não no aviso lá do alto da lista.
            await adapter.transport.request(`/projects/${encodeURIComponent(id)}`, {
              method: 'DELETE',
            })
            // ⚠️ E sem `loadProjects()`: ele acende o "Preparando seu mapa de criação…",
            // que DESMONTA a lista (e a janela aberta) no meio do gesto — a tela pisca e
            // o foco se perde. O servidor já confirmou; tirar o cartão da lista basta.
            setProjects((current) => current.filter((project) => project.id !== id))
          }}
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
  const approved = detail.currentCycle.stage === 'done'
  const seeCards = () => {
    closePeek()
    setCardsRequest((value) => value + 1)
  }
  // A tela do plano nas faixas das telas-modelo (11/09/2026): creme com o cabeçalho, o mapa ZERO
  // e o aviso de "revendo"; céu com a etapa (ou o "Meu plano"); lilás com o "Plano aprovado!"
  // quando as quatro etapas estão vencidas.
  return (
    <Shell theme={adapter.theme}>
      <DirtyContext.Provider value={dirtyRegistry}>
        <div className="pensa-plan sz-tool-bands">
          <header className="sz-tool-band sz-tool-band--creme">
            <div className="sz-tool-band__inner pensa-plan-top">
              <ProjectHeader
                detail={detail}
                credits={stage?.credits}
                onBack={() => void loadProjects()}
                canRename={detail.role !== 'member'}
                onRename={renameProject}
                memberCount={memberCount}
                onTeam={(opener) => {
                  teamOpenerRef.current = opener
                  setTeamOpen(true)
                }}
              />
              {error ? <Alert>{error}</Alert> : null}
              {changedRemotely ? (
                <div className="pensa-changed-banner" role="status">
                  <UsersIcon size={18} />
                  <span>{TEAM_COPY.changed}</span>
                  <button
                    ref={reloadButtonRef}
                    type="button"
                    className="sz-tool-pill sz-tool-pill--outline"
                    onClick={() => {
                      // Recarregar DESMONTA a etapa: com um editor sujo, a janela pergunta antes.
                      if (dirtyRegistry.isDirty()) setReloadAsk(true)
                      else void refresh()
                    }}
                  >
                    {TEAM_COPY.reload}
                  </button>
                </div>
              ) : null}
              <CreationMap
                current={detail.currentCycle.stage}
                peek={peek}
                onPeek={openPeek}
                onExitPeek={closePeek}
              />
              {peek ? (
                <PeekBanner
                  label={approved ? 'Voltar para o meu plano' : 'Voltar para a etapa atual'}
                  onClose={closePeek}
                />
              ) : null}
            </div>
          </header>
          <div className="sz-tool-band sz-tool-band--ceu">
            <div className="sz-tool-band__inner">
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
                />
              ) : stage ? (
                <StageWorkspace
                  adapter={adapter}
                  detail={detail}
                  stage={stage}
                  busy={busy}
                  run={run}
                  refresh={refresh}
                  cardsRef={cardsRef}
                />
              ) : (
                <Status>Carregando esta parte do plano…</Status>
              )}
            </div>
          </div>
          {approved && stage ? <ApprovedBand tasks={stage.tasks} onSeeCards={seeCards} /> : null}
        </div>
      </DirtyContext.Provider>
      {/* A janela fica FORA das faixas (o mesmo motivo da janela de apagar). */}
      <TeamDialog
        open={teamOpen}
        projectId={detail.id}
        projectName={detail.name}
        role={detail.role ?? 'owner'}
        transport={adapter.transport}
        onClose={() => setTeamOpen(false)}
        onLeft={() => {
          setTeamOpen(false)
          homeFocusRef.current = true
          void loadProjects()
        }}
        onTeamChanged={(team) => {
          // O espelho otimista (o botão do cabeçalho acompanha na hora) e, atrás dele, o
          // detalhe do servidor com o `updatedAt` novo, para o compasso não acusar a criança.
          setDetail((now) => (now && now.id === detail.id ? { ...now, team } : now))
          void syncDetail(detail.id)
        }}
        returnFocusTo={teamOpenerRef}
      />
      <ConfirmDialog
        open={reloadAsk}
        title="Atualizar o plano?"
        body="Você tem coisa sem guardar. Atualizar mesmo?"
        confirmLabel={TEAM_COPY.reload}
        cancelLabel="Continuar aqui"
        onConfirm={() => {
          setReloadAsk(false)
          void refresh()
        }}
        onClose={() => setReloadAsk(false)}
        returnFocusTo={reloadButtonRef}
      />
    </Shell>
  )
}

/**
 * O aviso de que a criança está REVENDO uma etapa vencida (no fim da faixa creme, como na
 * imagem-modelo). O `role="status"`, o texto e o nome do botão são os de antes: o leitor de tela e
 * os testes contam com eles.
 */
function PeekBanner({ label, onClose }: { label: string; onClose(): void }) {
  return (
    <div className="pensa-peek-banner" role="status">
      <EyeIcon size={18} />
      <span>Você está revendo uma etapa que já foi concluída.</span>
      <button
        type="button"
        className="sz-tool-pill sz-tool-pill--outline pensa-peek-back"
        onClick={onClose}
      >
        {label}
      </button>
    </div>
  )
}

/** As oficinas na ordem da faixa lilás, com o ícone de cada uma. */
const DESTINATIONS: Array<{
  id: PensaTaskView['destination']
  name: string
  Icon: (props: { size?: number }) => React.ReactElement
}> = [
  { id: 'studio', name: 'Estúdio', Icon: BlocksIcon },
  { id: 'pinta', name: 'Pinta', Icon: PaletteIcon },
  { id: 'molda', name: 'Molda', Icon: CubeIcon },
]

/**
 * A faixa lilás do plano APROVADO (a imagem-modelo): o recado, quantos cartões foram para cada
 * oficina (contados dos cartões do plano; oficina sem cartão não aparece) e o "Ver os Cartões de
 * Criação", que fecha o peek e rola até a lista.
 */
function ApprovedBand({ tasks, onSeeCards }: { tasks: PensaTaskView[]; onSeeCards(): void }) {
  const counts = DESTINATIONS.map((item) => ({
    ...item,
    count: tasks.filter((task) => task.destination === item.id).length,
  })).filter((item) => item.count > 0)
  return (
    <section aria-labelledby="pensa-approved-title" className="sz-tool-band sz-tool-band--lilas">
      <div className="sz-tool-band__inner">
        <div className="sz-tool-cta-card pensa-approved-cta">
          <span className="sz-tool-tile sz-tool-tile--ok" aria-hidden="true">
            <CircleCheckIcon size={24} />
          </span>
          <div className="sz-tool-cta-card__body">
            <h2 id="pensa-approved-title" className="sz-tool-cta-card__title">
              Plano aprovado! Agora é só construir.
            </h2>
            <p className="sz-tool-cta-card__text">
              As quatro etapas do método ZERO estão concluídas. Os Cartões de Criação já foram
              separados por oficina.
            </p>
            {counts.length ? (
              <ul className="pensa-destination-chips">
                {counts.map(({ id, name, count, Icon }) => (
                  <li key={id} data-destination={id}>
                    <Icon size={14} />
                    {name} · {count}
                    <span className="pensa-sr-only">{count === 1 ? ' cartão' : ' cartões'}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button type="button" className="sz-tool-pill sz-tool-pill--primary" onClick={onSeeCards}>
            Ver os Cartões de Criação
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </section>
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

/**
 * As oficinas para onde vão os Cartões de Criação (a faixa lilás da home, 11/09/2026):
 * cartões INFORMATIVOS, sem link (quem abre a oficina é o cartão do plano, com o guia). O selo
 * "3 cartões" da imagem-modelo ficou de fora: a lista de planos não traz a contagem.
 */
const WORKSHOPS: Array<{
  id: 'estudio' | 'pinta' | 'molda'
  name: string
  text: string
  Icon: (props: { size?: number }) => React.ReactElement
}> = [
  {
    id: 'estudio',
    name: 'Estúdio',
    text: 'Os cartões de jogo viram blocos e telas no Estúdio.',
    Icon: BlocksIcon,
  },
  {
    id: 'pinta',
    name: 'Pinta',
    text: 'Os cartões de arte viram personagens e cenários no Pinta.',
    Icon: PaletteIcon,
  },
  {
    id: 'molda',
    name: 'Molda',
    text: 'Os cartões de mundo viram modelos e texturas no Molda.',
    Icon: CubeIcon,
  },
]

/**
 * A home no desenho das telas-modelo (11/09/2026), o MESMO das galerias do Estúdio e do Pinta:
 * três faixas de borda a borda que rolam juntas. Creme com o cabeçalho ([menu][voltar] + o selo
 * do Pensa + título, e o "+ Novo plano" que abre o campo de criar logo abaixo), céu com os planos
 * e o cartão "Novo plano" no FIM da grade, lilás com as oficinas para onde os cartões vão. As
 * receitas `sz-tool-*` vêm de `@sistemazero/ui/tool-chrome.css` (o kids importa).
 */
function ProjectList(props: {
  projects: PensaProjectListView[]
  busy: string | null
  error: string | null
  mascot?: Partial<Record<PensaMascotPose, string>>
  onOpen(id: string): void
  onCreate(name: string): void
  /** Apaga o plano DE VEZ. Rejeita = a janela fica aberta com o recado. */
  onRemove(id: string): Promise<void>
  /** Entrar num plano pelo código de um colega. Rejeita = o recado fica no formulário. */
  onJoin(code: string): Promise<void>
  /**
   * A home deve nascer com o foco no h1? (Depois de "Sair da equipe" não sobra ninguém para o
   * foco voltar.) Lido UMA vez ao montar; quem responde `true` consome o pedido.
   */
  takeTitleFocus?(): boolean
}) {
  const [name, setName] = useState('')
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const { takeTitleFocus } = props
  useEffect(() => {
    if (takeTitleFocus?.()) titleRef.current?.focus()
  }, [takeTitleFocus])
  // Apagar um plano: a janela pergunta antes, e o alvo é o plano inteiro (não há
  // desfazer do outro lado).
  const [removeTarget, setRemoveTarget] = useState<PensaProjectListView | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  // A lixeira que abriu a janela — e, quando o plano é apagado, ela some com o cartão:
  // aí o foco passa para o "+ Novo plano", que é o ponto estável da tela.
  const removeOpenerRef = useRef<HTMLElement | null>(null)
  // O campo de criar nasce FECHADO quando já há planos e ABERTO no primeiro uso (a criança
  // nova não paga um clique a mais, e o vazio "Dê um nome ao jogo..." continua verdadeiro).
  const [creating, setCreating] = useState(() => props.projects.length === 0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const newButtonRef = useRef<HTMLButtonElement | null>(null)
  // Quem abriu o campo (o botão do cabeçalho ou o cartão "Novo plano"): é para ele que o foco
  // volta ao cancelar.
  const openerRef = useRef<HTMLElement | null>(null)
  const focusOnOpen = useRef(false)
  // "Entrar com um código" (equipe, 26/09/2026): o irmão do criar, na mesma faixa creme. Abrir
  // um fecha o outro; o erro do servidor (código inválido, sem Pensa, equipe cheia) fica ao
  // lado do campo, com a frase que ele mandou.
  const [joining, setJoining] = useState(false)
  const [code, setCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinBusy, setJoinBusy] = useState(false)
  const joinInputRef = useRef<HTMLInputElement | null>(null)
  const joinButtonRef = useRef<HTMLButtonElement | null>(null)
  const focusJoinOnOpen = useRef(false)
  useEffect(() => {
    if (joining && focusJoinOnOpen.current) {
      focusJoinOnOpen.current = false
      joinInputRef.current?.focus()
    }
  }, [joining])
  const openJoin = () => {
    if (joining) {
      joinInputRef.current?.focus()
      return
    }
    setCreating(false)
    setJoinError(null)
    focusJoinOnOpen.current = true
    setJoining(true)
  }
  const cancelJoin = () => {
    if (joinBusy) return
    setJoining(false)
    setCode('')
    setJoinError(null)
    // No primeiro uso (0 planos) abrir o código fechou o criar: cancelar devolve o campo, senão
    // o vazio "Dê um nome ao jogo…" fica sem campo nenhum à vista.
    if (props.projects.length === 0) setCreating(true)
    joinButtonRef.current?.focus()
  }
  const submitJoin = async () => {
    const trimmed = code.trim()
    if (trimmed.length < 4 || joinBusy) return
    setJoinBusy(true)
    setJoinError(null)
    try {
      await props.onJoin(trimmed)
    } catch (cause) {
      setJoinError(errorMessage(cause))
    } finally {
      setJoinBusy(false)
    }
  }
  const hostChrome = usePensaHostChrome()
  useEffect(() => {
    if (creating && focusOnOpen.current) {
      focusOnOpen.current = false
      inputRef.current?.focus()
    }
  }, [creating])
  const openCreate = (opener: HTMLElement) => {
    openerRef.current = opener
    setJoining(false)
    // Já aberto (o cartão do fim da grade, com o campo lá em cima): só leva o foco até ele.
    if (creating) {
      inputRef.current?.focus()
      return
    }
    focusOnOpen.current = true
    setCreating(true)
  }
  const cancelCreate = () => {
    if (props.busy === 'create') return
    setCreating(false)
    setName('')
    const opener = openerRef.current?.isConnected ? openerRef.current : newButtonRef.current
    opener?.focus()
  }
  const askRemove = (project: PensaProjectListView, opener: HTMLElement) => {
    removeOpenerRef.current = opener
    setRemoveError(null)
    setRemoveTarget(project)
  }
  const closeRemove = () => {
    if (removing) return
    setRemoveTarget(null)
    setRemoveError(null)
  }
  const confirmRemove = async () => {
    if (!removeTarget || removing) return
    setRemoving(true)
    setRemoveError(null)
    const eraOUltimo = props.projects.length === 1
    try {
      await props.onRemove(removeTarget.id)
      // O cartão (e a lixeira dele) saem da tela agora: o foco precisa de outro pouso.
      removeOpenerRef.current = newButtonRef.current
      setRemoveTarget(null)
      // Apagou o último: a tela do vazio nasce com o campo ABERTO (a mesma regra do
      // primeiro acesso). Sem isto ela ficava com o convite "dê um nome ao jogo" e
      // nenhum campo à vista — o `creating` só olhava a lista na PRIMEIRA renderização.
      if (eraOUltimo) setCreating(true)
    } catch (cause) {
      setRemoveError(errorMessage(cause))
    } finally {
      setRemoving(false)
    }
  }
  const count = props.projects.length
  return (
    <>
      <div className="pensa-home sz-tool-bands">
        <header className="sz-tool-band sz-tool-band--creme">
          <div className="sz-tool-band__inner pensa-home-top">
            <div className="pensa-home-header sz-tool-header">
              {/* `pensa-home-lead` fica como âncora do teste do host: menu ANTES do h1. */}
              <div className="pensa-home-lead sz-tool-header__lead">
                {hostChrome?.menu || hostChrome?.back ? (
                  <div className="sz-tool-header__nav">
                    {hostChrome.menu ? <HostMenuButton menu={hostChrome.menu} /> : null}
                    {hostChrome.back ? <HostBackLink back={hostChrome.back} /> : null}
                  </div>
                ) : null}
                <div className="sz-tool-header__title">
                  <p className="pensa-home-chip">
                    <LightbulbIcon size={16} />
                    Pensa · sua oficina de planos
                  </p>
                  <h1 ref={titleRef} className="sz-tool-title" tabIndex={-1}>
                    Meus projetos
                  </h1>
                  <p className="sz-tool-subtitle">
                    Use o método ZERO para criar um plano claro e mandar cada Cartão de Criação ao
                    lugar certo.
                  </p>
                </div>
              </div>
              <div className="sz-tool-header__actions">
                <button
                  ref={newButtonRef}
                  type="button"
                  className="sz-tool-pill sz-tool-pill--primary"
                  aria-expanded={creating}
                  aria-controls="pensa-create"
                  onClick={(event) => openCreate(event.currentTarget)}
                >
                  + Novo plano
                </button>
                <button
                  ref={joinButtonRef}
                  type="button"
                  className="sz-tool-pill sz-tool-pill--outline"
                  aria-expanded={joining}
                  aria-controls="pensa-join"
                  onClick={openJoin}
                >
                  <UsersIcon size={16} />
                  {TEAM_COPY.joinButton}
                </button>
              </div>
            </div>
            {creating ? (
              <form
                id="pensa-create"
                className="pensa-create"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (name.trim().length >= 2) props.onCreate(name.trim())
                }}
                onKeyDown={(event) => {
                  // No FORMULÁRIO, não no campo: o Esc vale também com o foco nos botões.
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelCreate()
                  }
                }}
              >
                <label htmlFor="pensa-project-name">Nome do novo jogo</label>
                <div>
                  <input
                    ref={inputRef}
                    id="pensa-project-name"
                    value={name}
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex.: Guardiões da Lua"
                  />
                  <button
                    type="submit"
                    className="sz-tool-pill sz-tool-pill--primary"
                    disabled={props.busy === 'create' || name.trim().length < 2}
                  >
                    Criar meu plano
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    disabled={props.busy === 'create'}
                    onClick={cancelCreate}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : null}
            {joining ? (
              <form
                id="pensa-join"
                className="pensa-create pensa-join"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitJoin()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    cancelJoin()
                  }
                }}
              >
                <label htmlFor="pensa-join-code">{TEAM_COPY.joinLabel}</label>
                <div>
                  <input
                    ref={joinInputRef}
                    id="pensa-join-code"
                    value={code}
                    maxLength={16}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={TEAM_COPY.joinPlaceholder}
                  />
                  <button
                    type="submit"
                    className="sz-tool-pill sz-tool-pill--primary"
                    disabled={joinBusy || code.trim().length < 4}
                  >
                    {joinBusy ? TEAM_COPY.joinBusy : TEAM_COPY.joinSubmit}
                  </button>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    disabled={joinBusy}
                    onClick={cancelJoin}
                  >
                    Cancelar
                  </button>
                </div>
                {joinError ? (
                  <p className="pensa-inline-error" role="alert">
                    {joinError}
                  </p>
                ) : null}
              </form>
            ) : null}
          </div>
        </header>

        <section aria-labelledby="pensa-plans-title" className="sz-tool-band sz-tool-band--ceu">
          <div className="sz-tool-band__inner">
            {/* O heading da seção segue para o leitor de tela; visualmente o título da página já
              diz tudo, e o contador fica no rodapé (par do "Mostrando N de M" do Estúdio). */}
            <h2 id="pensa-plans-title" className="pensa-sr-only">
              Meus planos
            </h2>
            {props.error ? <Alert>{props.error}</Alert> : null}
            {count === 0 ? (
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
              <>
                <div className="pensa-project-grid">
                  {props.projects.map((project) => (
                    <PlanCard
                      key={project.id}
                      project={project}
                      onOpen={props.onOpen}
                      onRemove={(target, opener) => askRemove(target, opener)}
                    />
                  ))}
                  {/* O cartão "Novo plano" FECHA a grade (a imagem-modelo): abre o MESMO campo do
                    "+ Novo plano" lá em cima, e o foco volta para ele ao cancelar. */}
                  <button
                    type="button"
                    className="sz-tool-card sz-tool-card--new pensa-new-plan-card"
                    aria-controls="pensa-create"
                    aria-expanded={creating}
                    onClick={(event) => openCreate(event.currentTarget)}
                  >
                    <span className="sz-tool-new-dot" aria-hidden="true">
                      <PlusIcon />
                    </span>
                    <span className="sz-tool-card-title pensa-new-plan-card__title">
                      Novo plano
                    </span>
                    <span className="pensa-new-plan-card__hint">
                      Comece pela etapa Z e siga o método.
                    </span>
                  </button>
                </div>
                <p className="pensa-home-footer">
                  {count === 1 ? 'Mostrando 1 plano' : `Mostrando ${count} planos`}
                </p>
              </>
            )}
          </div>
        </section>

        <section
          aria-labelledby="pensa-workshops-title"
          className="sz-tool-band sz-tool-band--lilas"
        >
          <div className="sz-tool-band__inner">
            <h2 id="pensa-workshops-title" className="sz-tool-section-title">
              Cada Cartão de Criação vai para o lugar certo
            </h2>
            <p className="sz-tool-section-text">
              Quando o plano fica pronto, o Pensa manda cada cartão para a oficina que vai construir
              aquela parte.
            </p>
            <ul className="pensa-workshops">
              {WORKSHOPS.map(({ id, name, text, Icon }) => (
                <li key={id} className="pensa-workshop">
                  <span className={`sz-tool-tile sz-tool-tile--${id}`} aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <h3 className="sz-tool-card-title">{name}</h3>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      {/* A janela fica FORA das faixas: dentro delas as pílulas ganhariam o relevo 3D
        das galerias, que é desenho de grade, não de diálogo. */}
      <ConfirmDialog
        open={removeTarget !== null}
        title="Apagar este plano?"
        body={
          removeTarget
            ? `O plano "${removeTarget.name}" vai sumir: a conversa com o Zappy, a carta da ideia, as telinhas e os Cartões de Criação. O que você já fez no Estúdio, no Pinta e no Molda continua guardado lá. Não dá para desfazer.`
            : ''
        }
        confirmLabel="Apagar"
        busyLabel="Apagando…"
        busy={removing}
        error={removeError}
        onConfirm={() => void confirmRemove()}
        onClose={closeRemove}
        returnFocusTo={removeOpenerRef}
      />
    </>
  )
}

/**
 * O cartão de um plano (a imagem-modelo): o alvo e o nome, os selos da versão e da etapa, a
 * trilha Z-E-R-O em ladrilhos (concluída cheia, atual com o fio, futura apagada; o nome de cada
 * etapa só para o leitor de tela), a linha do andamento e o rodapé com "Editado há…" e o
 * "Continuar". O nome acessível do botão leva o nome do plano: "Continuar" sozinho repetido na
 * grade não diria qual.
 *
 * ⚠️⚠️ O cartão NÃO é clicável (19/09/2026, decisão dela). O "Continuar" já teve um `::after` que
 * esticava a área clicável até a borda do cartão; ela saiu junto com a mãozinha do `<article>`,
 * porque a mãozinha tem de aparecer só onde de fato se clica. Quem abre o plano é este botão e
 * quem apaga é a lixeira — os dois únicos alvos do cartão. Ver o comentário do
 * `.pensa-project-card` no `pensa.css`, que guarda o porquê inteiro.
 */
function PlanCard({
  project,
  onOpen,
  onRemove,
}: {
  project: PensaProjectListView
  onOpen(id: string): void
  onRemove(project: PensaProjectListView, opener: HTMLElement): void
}) {
  const done = project.stage === 'done'
  const currentIndex = done ? STAGES.length : STAGES.findIndex((item) => item.id === project.stage)
  // Equipe: "De <dono>" no plano em que entrei (sem lixeira: apagar é do dono) e
  // "Em equipe · N" no meu plano com gente dentro. Sem `role` (members antigo) = só meu.
  const role = project.role ?? 'owner'
  const members = project.team?.memberCount ?? 0
  const current = STAGES[currentIndex]
  return (
    <article className="pensa-project-card">
      <div className="pensa-project-card__head">
        <span className="pensa-project-orbit" aria-hidden="true">
          <TargetIcon size={22} />
        </span>
        <h3 className="sz-tool-card-title pensa-project-card__name">{project.name}</h3>
      </div>
      <div className="pensa-project-card__chips">
        <span className="pensa-chip">Versão {project.cycleNumber}</span>
        {done ? (
          <span className="pensa-chip is-approved">Plano aprovado</span>
        ) : (
          <span className="pensa-chip is-stage">Etapa {project.stage.toUpperCase()}</span>
        )}
        {role === 'member' ? (
          <span className="pensa-chip is-team">
            {TEAM_COPY.chipFrom(personName(project.team?.ownerFirstName ?? null))}
          </span>
        ) : members > 0 ? (
          <span className="pensa-chip is-team">{TEAM_COPY.chipTeam(members)}</span>
        ) : null}
      </div>
      <ol className="pensa-zero-track">
        {STAGES.map((item, index) => {
          const state =
            index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'next'
          return (
            <li key={item.id} className={`is-${state}`}>
              <span aria-hidden="true">{item.letter}</span>
              <span className="pensa-sr-only">
                {item.title}
                {state === 'complete'
                  ? ' (concluída)'
                  : state === 'current'
                    ? ' (etapa atual)'
                    : ' (ainda não)'}
              </span>
            </li>
          )
        })}
      </ol>
      <p className={`pensa-project-card__progress${done ? ' is-done' : ''}`}>
        <FlagIcon size={16} />
        {done ? 'Todas as 4 etapas concluídas' : `Etapa atual: ${current?.title ?? ''}`}
      </p>
      <div className="pensa-project-card__foot">
        <span className="pensa-project-card__edited">{editedAgo(project.updatedAt)}</span>
        <div className="pensa-project-card__actions">
          {role === 'member' ? null : (
            <button
              type="button"
              className="pensa-project-card__remove"
              aria-label={`Apagar o plano ${project.name}`}
              title="Apagar"
              onClick={(event) => onRemove(project, event.currentTarget)}
            >
              <TrashIcon size={18} />
            </button>
          )}
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--primary pensa-project-card__open"
            aria-label={`Continuar o plano ${project.name}`}
            onClick={() => onOpen(project.id)}
          >
            Continuar
            <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}

/**
 * O nome do plano com o lápis (26/09/2026), no molde do `ProjectNameField` do Estúdio: clicar
 * troca o título pelo campo "Nome do plano" (texto selecionado); Enter ou sair do campo grava,
 * Esc desiste, e o foco volta ao lápis. Nome igual ao atual ou com menos de 2 letras só fecha.
 * ⚠️ O lápis é IRMÃO do h1, não filho: dentro dele entraria no nome acessível do título.
 */
function ProjectNameTitle({
  name,
  canRename,
  onRename,
}: {
  name: string
  canRename: boolean
  onRename(name: string): Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Esc desiste: um `blur` que chegue depois (a remoção do campo) não pode gravar o rascunho.
  const cancelledRef = useRef(false)
  const returnFocusRef = useRef(false)

  useEffect(() => {
    if (!editing) setDraft(name)
  }, [editing, name])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else if (returnFocusRef.current) {
      returnFocusRef.current = false
      buttonRef.current?.focus()
    }
  }, [editing])

  function commit(): void {
    const next = draft.trim()
    setEditing(false)
    if (next.length < 2 || next === name) return
    void onRename(next)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="pensa-title-input"
        aria-label="Nome do plano"
        autoComplete="off"
        maxLength={120}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (cancelledRef.current) return
          commit()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            returnFocusRef.current = true
            event.currentTarget.blur()
          }
          if (event.key === 'Escape') {
            cancelledRef.current = true
            returnFocusRef.current = true
            setDraft(name)
            setEditing(false)
          }
        }}
      />
    )
  }
  return (
    <div className="pensa-project-title__row">
      <h1 className="sz-tool-title">{name}</h1>
      {canRename ? (
        <button
          ref={buttonRef}
          type="button"
          className="sz-tool-icon-btn pensa-title-rename"
          aria-label={`Renomear o plano ${name}`}
          onClick={() => {
            cancelledRef.current = false
            setDraft(name)
            setEditing(true)
          }}
        >
          <PencilIcon />
        </button>
      ) : null}
    </div>
  )
}

function ProjectHeader({
  detail,
  credits,
  onBack,
  canRename,
  onRename,
  memberCount,
  onTeam,
}: {
  detail: PensaProjectDetailView
  credits?: AiCreditsView | null
  onBack(): void
  canRename: boolean
  onRename(name: string): Promise<void>
  memberCount: number
  onTeam(opener: HTMLElement): void
}) {
  const hostChrome = usePensaHostChrome()
  const approved = detail.currentCycle.stage === 'done'
  return (
    // O cabeçalho das galerias (`.sz-tool-header`): [menu][voltar] + "VERSÃO N" e o nome à
    // esquerda; os créditos e a pílula do andamento à direita (menta quando aprovado).
    <header className="pensa-project-header sz-tool-header">
      <div className="sz-tool-header__lead">
        {/* Menu da comunidade (host) e voltar: o MESMO quadrado das galerias, o menu primeiro. */}
        <div className="sz-tool-header__nav">
          {hostChrome?.menu ? <HostMenuButton menu={hostChrome.menu} /> : null}
          <button
            type="button"
            className="sz-tool-icon-btn"
            onClick={onBack}
            aria-label="Voltar aos meus planos"
          >
            <ArrowLeftIcon />
          </button>
        </div>
        <div className="pensa-project-title sz-tool-header__title">
          <p className="sz-tool-kicker">VERSÃO {detail.currentCycle.number}</p>
          <ProjectNameTitle name={detail.name} canRename={canRename} onRename={onRename} />
        </div>
      </div>
      <div className="sz-tool-header__actions">
        {/* "Equipe · N" abre a janela da equipe (dono e membro; N = quem entrou). */}
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline pensa-team-button"
          aria-haspopup="dialog"
          onClick={(event) => onTeam(event.currentTarget)}
        >
          <UsersIcon size={16} />
          {/* O "·" é desenho: o leitor de tela falaria "ponto médio". O nome acessível vem
            INTEIRO do texto invisível ("Equipe, N na equipe"); o visível fica fora dele. */}
          <span aria-hidden="true">
            {TEAM_COPY.button} · {memberCount}
          </span>
          <span className="pensa-sr-only">
            {TEAM_COPY.button}, {memberCount} na equipe
          </span>
        </button>
        <AiCreditsBadge credits={credits} />
        <p className={`sz-tool-status pensa-plan-status${approved ? ' sz-tool-status--ok' : ''}`}>
          <span className="pensa-plan-status__dot" aria-hidden="true" />
          {approved ? 'Plano aprovado' : 'Planejando'}
        </p>
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
            <span aria-hidden={complete ? true : undefined}>
              {complete ? <CheckIcon size={18} /> : item.letter}
            </span>
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
}) {
  const config = STAGES.find((item) => item.id === props.stageId)
  if (!config) return null
  return (
    <section className="pensa-workspace pensa-peek">
      <StageTitle config={config} />
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
  /** A lista dos cartões do "Meu plano" (o "Ver os Cartões de Criação" rola até ela). */
  cardsRef?: React.RefObject<HTMLDivElement | null>
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
      <StageTitle config={config} />
      {current === 'z' ? <StageZ {...props} onAdvance={advance} /> : null}
      {current === 'e' ? <StageE {...props} onAdvance={advance} /> : null}
      {current === 'r' ? <StageR {...props} onAdvance={advance} /> : null}
      {current === 'o' ? <StageO {...props} onAdvance={advance} /> : null}
    </section>
  )
}

/** O título da etapa: o ladrilho azul com a letra e o nome no h2 da régua das galerias. */
function StageTitle({ config }: { config: (typeof STAGES)[number] }) {
  return (
    <div className="pensa-stage-title">
      <span aria-hidden="true">{config.letter}</span>
      <div>
        <h2 className="sz-tool-section-title">{config.title}</h2>
        <p>{config.description}</p>
      </div>
    </div>
  )
}

type StageProps = Omit<Parameters<typeof StageWorkspace>[0], 'cardsRef'> & { onAdvance(): void }

function StageZ(props: StageProps) {
  const [message, setMessage] = useState('')
  const [streaming, setStreaming] = useState('')
  const [chatError, setChatError] = useState<PensaFailure | null>(null)
  const abortRef = useRef<null | (() => void)>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  // O rascunho da conversa também é "coisa sem guardar": o "Atualizar" pergunta antes de apagar.
  useUnsavedChanges(message.trim().length > 0)
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
          setChatError(failure(cause))
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
          <AiCreditsBadge credits={props.stage.credits} />
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
        {chatError?.kind === 'quota' ? (
          <AiCreditsNotice>{chatError.text}</AiCreditsNotice>
        ) : chatError ? (
          <p className="pensa-inline-error" role="alert">
            {chatError.text} Sua mensagem ficou aqui para tentar de novo.
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
          <span>Cada cartão abre com seu guia na ferramenta indicada.</span>
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
          <small>
            A criação acontece no Pinta, no Molda e no Estúdio. O Pensa acompanha o caminho.
          </small>
        </div>
        <Zappy
          pose="celebrating"
          images={props.adapter.mascotImages}
          className="pensa-approved-zappy"
        />
      </div>
      {/* A âncora do "Ver os Cartões de Criação": foco programático (`tabIndex={-1}`), sem entrar
          na ordem do Tab. */}
      <div ref={props.cardsRef} tabIndex={-1} className="pensa-cards-anchor">
        <TaskPlan {...props} editable />
      </div>
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
