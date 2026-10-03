'use client'

import type { StudioTier } from '@sistemazero/member-shell/lib/studio-tier'
import type {
  Project,
  StudioMoldaLibraryAdapter,
  StudioPintaLibraryAdapter,
  StudioShareAdapter,
  StudioTaskSession,
  StudioTutorConfig,
} from '@sistemazero/studio'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { reportClientError } from '@/lib/report-error'
import { useFocusMode } from './focus-mode'

type StudioModule = typeof import('@sistemazero/studio')
type EditorState =
  | { status: 'loading' }
  | { status: 'ready'; project: Project }
  | { status: 'not-found' }

/**
 * "Editar o desenho" nos assets vindos do Pinta: abre o Pinta em aba nova já
 * naquele desenho. O id viaja na URL porque `noopener` isola as duas abas.
 */
function openDrawingInPinta(drawingId: string): void {
  window.open(`/pinta?desenho=${encodeURIComponent(drawingId)}`, '_blank', 'noopener,noreferrer')
}

/**
 * "Editar a criação" nos modelos, céus e texturas vindos do Molda: abre o Molda em
 * aba nova já naquela criação (o `molda-client` lê `?criacao=` no 1º render).
 */
function openCreationInMolda(creationId: string): void {
  window.open(`/molda?criacao=${encodeURIComponent(creationId)}`, '_blank', 'noopener,noreferrer')
}

/**
 * Erro que o Estúdio CONTEVE sozinho vira telemetria (o mesmo beacon das error
 * boundaries do app → Sentry, com redação de PII). O `kind` distingue a falha
 * de persistência do crash de render segurado por uma boundary de seção.
 */
function reportStudioError(
  error:
    | { kind: 'persistence'; message: string }
    | { kind: 'render'; area: string; message: string; stack?: string },
): void {
  const failure = new Error(
    error.kind === 'render' ? `[studio:${error.area}] ${error.message}` : error.message,
  )
  failure.name = error.kind === 'render' ? 'StudioRenderError' : 'StudioPersistenceError'
  if (error.kind === 'render' && error.stack) failure.stack = error.stack
  reportClientError(failure)
}

/** Carrega o projeto local e concentra apenas o ciclo de vida do editor aberto. */
export function StudioFullEditor({
  mod,
  projectId,
  onExit,
  share,
  tutor,
  theme,
  tier,
  showExamples,
  professional,
  taskSession,
  pintaLibrary,
  moldaLibrary,
}: {
  mod: StudioModule
  projectId: string
  onExit: () => void
  share: StudioShareAdapter
  tutor: StudioTutorConfig | undefined
  theme: 'light' | 'dark'
  tier: StudioTier
  showExamples: boolean
  professional: boolean
  taskSession: StudioTaskSession | undefined
  pintaLibrary: StudioPintaLibraryAdapter | undefined
  moldaLibrary: StudioMoldaLibraryAdapter | undefined
}) {
  const adapter = useMemo(() => mod.createLocalPersistenceAdapter(), [mod])
  const [state, setState] = useState<EditorState>({ status: 'loading' })
  const { setWorkspaceActive } = useFocusMode()
  const workspaceActive = state.status === 'ready' && state.project.kind !== 'pro'
  useLayoutEffect(() => {
    setWorkspaceActive(workspaceActive)
    return () => setWorkspaceActive(false)
  }, [setWorkspaceActive, workspaceActive])
  const router = useRouter()
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])
  const activityBeaconedRef = useRef(false)
  // O XP de criar já foi gravado e falta só a barra (foguinho/XP) mostrar: isso fica para
  // quando o editor SAI da tela.
  const refreshOnLeaveRef = useRef(false)
  const mountedRef = useRef(true)

  const handleActivity = useCallback(
    (project: Project, ctx?: { reason: 'autosave' | 'flush' }) => {
      if (ctx?.reason !== 'autosave') return
      if (taskSession) {
        void taskSession
          .onProgress({
            outputRef: {
              kind: 'studio_project',
              projectId: project.id,
              saveRevision: String(project.updatedAt),
            },
          })
          .catch(() => {})
      }
      if (activityBeaconedRef.current) return
      activityBeaconedRef.current = true
      fetch('/api/studio/activity', { method: 'POST' })
        .then((response) => {
          if (!response.ok) return
          // Se o editor já saiu antes da resposta, não há jogo aberto a perder: atualiza agora.
          if (mountedRef.current) refreshOnLeaveRef.current = true
          else routerRef.current.refresh()
        })
        .catch(() => {})
    },
    [taskSession],
  )

  // ⚠️⚠️ NUNCA `router.refresh()` com o editor aberto. O jogo aberto vive só na memória do
  // host (a URL é `/estudio`), e o Next troca o refresh por um RECARREGAMENTO da página
  // quando a resposta não serve: o servidor foi atualizado depois que a aba abriu (build
  // diferente) ou a ida falhou. A criança caía em "Meus Jogos" no meio do que estava
  // fazendo, e a primeira edição real (instalar o Jogo 2D, por exemplo) era justamente o
  // gatilho. Saindo do editor (de volta à lista ou para outra página) não há nada a perder.
  // ⚠️ O editor também desmonta sem a criança sair do `/estudio` (o "Tentar de novo" da tarefa
  // do Pensa e o "Recriar projeto" mostram a tela de carregamento no lugar dele). Ali o refresh
  // ainda pode recarregar a página; é raro (pede XP gravado + essa troca + servidor novo) e a
  // aba volta para a mesma tarefa.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (refreshOnLeaveRef.current) routerRef.current.refresh()
    }
  }, [])

  const handlePromoteToPro = useCallback((project: Project) => {
    window.location.assign(`/estudio/pro/${encodeURIComponent(project.id)}`)
  }, [])

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    adapter
      .load(projectId)
      .then((project) => {
        if (!active) return
        setState(project ? { status: 'ready', project } : { status: 'not-found' })
      })
      .catch(() => {
        if (active) setState({ status: 'not-found' })
      })
    return () => {
      active = false
    }
  }, [adapter, projectId])

  useEffect(() => {
    if (state.status !== 'not-found') return
    const timer = setTimeout(onExit, 1_200)
    return () => clearTimeout(timer)
  }, [state.status, onExit])

  // O modo Pro precisa de uma navegação de documento completa para receber COOP/COEP.
  useEffect(() => {
    if (state.status === 'ready' && state.project.kind === 'pro') {
      window.location.assign(`/estudio/pro/${state.project.id}`)
    }
  }, [state])

  if (state.status === 'loading') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Carregando projeto…
      </div>
    )
  }
  if (state.status === 'not-found') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Projeto não encontrado. Voltando à lista…
      </div>
    )
  }
  if (state.project.kind === 'pro') {
    return (
      <div className="grid h-full place-items-center text-muted-foreground text-sm">
        Abrindo o modo Código…
      </div>
    )
  }

  return (
    <mod.StudioEditor
      initialProject={state.project}
      persistence="local"
      onExit={onExit}
      onChange={handleActivity}
      // Erro que o editor CONTEVE sozinho (ex.: o painel do Zappy caindo na sua
      // própria boundary). Sem este fio ele morria num console.error e a
      // próxima ocorrência voltava a ser adivinhação — foi exatamente o que
      // aconteceu com o tutor derrubando a IDE em 08/2026.
      onError={reportStudioError}
      share={share}
      tutor={tutor}
      theme={theme}
      level={tier.level}
      allowBlocks={tier.allowBlocks}
      allowExtensions={tier.allowedExtensions}
      allowedModes={tier.allowedModes}
      allowLevelReveal={tier.allowLevelReveal}
      features={{ professional }}
      onPromoteToPro={handlePromoteToPro}
      // Só com posse do Pinta e do Molda (produtos vendidos à parte): sem o adapter, sem botão.
      // Antes o "Editar o desenho" ia sempre e levava quem não tem o Pinta a uma tela bloqueada.
      {...(pintaLibrary ? { onEditDrawing: openDrawingInPinta } : {})}
      {...(moldaLibrary ? { onEditCreation: openCreationInMolda } : {})}
      pintaLibrary={pintaLibrary}
      moldaLibrary={moldaLibrary}
      showExamples={showExamples}
      taskSession={taskSession}
    />
  )
}
