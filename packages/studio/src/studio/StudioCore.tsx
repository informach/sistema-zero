import { PensaMissionLayout } from '@sistemazero/ui/pensa-mission-panel'
import type { JSX } from 'react'
import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { type IDEMode, modesForKind } from '#core'
import { ErrorBoundary } from '#ui'
import { RootErrorFallback } from '../components/layout/ErrorViews'
import { Shell } from '../components/layout/Shell'
import { isPythonProject, type EditableStudioProject as Project } from '../core/editableProject'
import { captureAndStoreProjectThumb } from '../cover/thumbCapture'
import { createCodeObservationRegistry } from '../monaco/codeObservation'
import { snapshotProjectWithCurrentAuthority } from '../state/bridgeAuthority'
import { prepareEditableStudioProject } from '../state/editableProjectValidation'
import { flushProjectOperations } from '../state/projectOperations'
import { useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { useSettingsStore } from '../state/settingsStore'
import { StudioStoresContext } from '../state/storesContext'
import {
  createStudioStores,
  usePendingEditorEdits,
  useStudioPersistence,
  useStudioRuntimeCapture,
} from '../state/studioStores'
import { useUIStore } from '../state/uiStore'
import { StudioCloudSyncProvider } from './cloud-sync'
import { StudioCodeObservationProvider, useStudioCodeObservation } from './code-observation'
import {
  type ResolvedStudioConfig,
  resolveLearning,
  resolvePreviewSecurity,
  resolveStudioConfig,
  StudioConfigProvider,
} from './config'
import { StudioEditCreationProvider } from './edit-creation'
import { StudioEditDrawingProvider } from './edit-drawing'
import { StudioExamplesVisibleProvider } from './examples-visibility'
import { StudioI18nProvider } from './i18n'
import { StudioMoldaLibraryProvider } from './molda-library'
import { StudioExecutionProvider } from './observation'
import { StudioPintaLibraryProvider } from './pinta-library'
import { ProBuilderDeletionReconciler } from './pro-builder-deletion'
import { StudioProCandidatePreviewProvider } from './pro-candidate-preview'
import { StudioProRuntimeProvider } from './pro-runtime'
import { disallowedProjectExtensions } from './project-access'
import { StudioRuntimeEnvironmentProvider } from './runtime-environment'
import { StudioShareDisabledProvider, StudioShareProvider } from './share'
import { TaskGuidePanel } from './TaskGuidePanel'
import { withSaveBeforeTaskActions } from './taskSessionSave'
import { StudioTeamLibraryProvider } from './team-library'
import { StudioThemeProvider } from './theme'
import { StudioTutorProvider } from './tutor'
import type { StudioCoreProps, StudioHandle } from './types'

/** Host curation applies both on opening and on every observed document. */
function projectInAllowedMode(
  project: Project,
  allowedModes: readonly IDEMode[],
  initialMode?: IDEMode,
): Project {
  const kindModes = modesForKind(project.kind)
  const allowed =
    project.kind === 'pro' ? kindModes : kindModes.filter((mode) => allowedModes.includes(mode))
  let mode = initialMode ?? project.mode
  if (!allowed.includes(mode)) mode = allowed[0] ?? project.mode
  if (mode === project.mode) return project
  if (isPythonProject(project)) {
    if (project.kind === 'pro') return project
    return { ...project, mode: mode === 'bridge' ? 'bridge' : 'blocks' }
  }
  return { ...project, mode }
}

/**
 * Motor compartilhado do Sistema Zero Studio (modos Blocos/Ponte/Código) — base
 * dos dois componentes públicos `<StudioEditor>` (editor completo independente)
 * e `<StudioLesson>` (bloco de aula configurável). Os wrappers só passam props
 * cruas e definem DEFAULTS; toda a resolução de config + memoização fica AQUI
 * (mover para os wrappers duplicaria a memoização frágil de chaves primitivas
 * abaixo e arriscaria re-hidratar por cima das edições não salvas do aluno).
 *
 * Cada instância cria o próprio conjunto de stores (projeto/ui/console/
 * highlight/sourcemap) + serviço de persistência via StudioStoresContext —
 * duas instâncias na mesma página não compartilham estado, e cada montagem
 * nasce limpa. As configurações (tema/fonte/chave de IA) são preferência do
 * usuário e continuam compartilhadas.
 *
 * Dados: uncontrolled — `initialProject` hidrata, `onChange` entrega snapshots
 * no debounce do autosave, `persistence` decide onde salvar ('local' |
 * 'none' | adapter). Acesso imperativo via `ref` (StudioHandle).
 *
 * Renderizar SOMENTE no client (Monaco/Blockly/IndexedDB não existem no
 * server): `next/dynamic(..., { ssr: false })` no Next, `client:only="react"`
 * no Astro.
 */
export function StudioCore(props: StudioCoreProps): JSX.Element {
  const [codeObservation] = useState(createCodeObservationRegistry)
  // 1x por instância; StrictMode-safe (re-render descarta a duplicata).
  // `persistence` e `limits` são estáticos por instância (lidos só aqui).
  const [stores] = useState(() =>
    createStudioStores({
      persistence: props.persistence,
      workspacePreferences: props.workspacePreferences,
      limits: props.limits,
      proBuildLimits: props.proRuntime?.limits,
      locale: props.locale,
    }),
  )
  return (
    <StudioI18nProvider locale={props.locale}>
      <StudioStoresContext.Provider value={stores}>
        <StudioRuntimeEnvironmentProvider value={props.runtimeEnvironment ?? null}>
          <StudioCodeObservationProvider value={codeObservation}>
            <StudioCoreBody {...props} />
          </StudioCodeObservationProvider>
        </StudioRuntimeEnvironmentProvider>
      </StudioStoresContext.Provider>
    </StudioI18nProvider>
  )
}

/** Corpo do Studio — DENTRO do provider, para os hooks lerem as stores da instância. */
function StudioCoreBody({
  initialProject,
  editingAccess = 'author',
  writerEpoch,
  onRevisionApplied,
  autoRun = true,
  previewOriginAdapter,
  requireIsolatedPreview = false,
  projectMuted = false,
  features,
  allowedModes,
  initialMode,
  limits,
  level,
  pythonLevel,
  allowBlocks,
  grantedBlockIds,
  allowExtensions,
  allowCategories,
  allowLevelReveal,
  tutor,
  taskSession,
  share,
  shareDisabledReason,
  onCloudSync,
  onEditDrawing,
  onEditCreation,
  pintaLibrary,
  moldaLibrary,
  teamLibrary,
  showExamples,
  onChange,
  onSave,
  onError,
  onModeChange,
  onReady,
  onProjectOpeningSettled,
  theme,
  onExit,
  onPromoteToPro,
  proRuntime,
  prepareProDependencies,
  blockUnloadWhenDirty = true,
  className,
  style,
  ref,
}: StudioCoreProps): JSX.Element {
  const codeObservation = useStudioCodeObservation()
  const runtimeCapture = useStudioRuntimeCapture()
  // Somente o StudioEditor oferece tutor. Adapter estático por instância, como share.
  const [tutorValue] = useState(() => tutor ?? null)

  // Adapter de compartilhar latcha uma vez por instância: `share={{…}}` inline do host muda de referência a cada render,
  // mas o valor entregue ao provider fica estável. Default `null` → sem botão.
  const [shareValue] = useState(() => share ?? null)

  // Callback "Trazer o que eu enviei" — latcha uma vez por instância (igual ao
  // share); o host fornece uma referência estável (useCallback). `null` → sem item.
  const [cloudSyncValue] = useState(() => onCloudSync ?? null)

  // "Editar o desenho no Pinta" — mesmo latch: o host passa uma referência
  // estável e a janela dos materiais decide se mostra o botão. `null` → sem botão.
  const [editDrawingValue] = useState(() => onEditDrawing ?? null)

  // "Editar a criação no Molda": o gêmeo do Pinta, mesmo latch. `null` → sem botão.
  const [editCreationValue] = useState(() => onEditCreation ?? null)

  // Perfil/posse podem mudar sem remontar o editor. A modal cancela o owner antigo.
  const pintaLibraryValue = pintaLibrary ?? null

  // "Trazer do Molda" — valor inicial; a janela dos materiais mostra o botão e
  // a modal das criações 3D quando presente. `null` → nada.
  const [moldaLibraryValue] = useState(() => moldaLibrary ?? null)

  // "Trazer da equipe" — SEM latch, de propósito: o host só descobre se o plano do Pensa
  // tem equipe e arte entregue DEPOIS de abrir o jogo, e o botão precisa aparecer quando a
  // resposta chega (latchar congelaria o `undefined` da montagem). O host passa uma
  // referência estável (memo), então o Provider só muda quando a disponibilidade muda.
  const teamLibraryValue = teamLibrary ?? null

  // A autoridade do host pode trocar sem remontar o editor.
  // Ausente mantém o WebContainer local do Estúdio Completo.
  const proRuntimeValue = proRuntime ?? null

  // Visibilidade dos exemplos prontos — latcha uma vez por instância. Default
  // `false`: só o playground/admin de teste liga (ver examples-visibility.ts).
  const [examplesVisible] = useState(() => showExamples ?? false)

  // `features` e `allowedModes` chegam como literais inline do host
  // (`features={{ extensions: false }}`) — nova REFERÊNCIA a cada render, mesmo
  // conteúdo. `resolveStudioConfig` é puro e barato; resolvê-lo a cada render e
  // memoizar o resultado pela sua forma SERIALIZADA mantém a IDENTIDADE de
  // `baseConfig` (e do `config` do contexto) ESTÁVEL entre re-renders do host que
  // não mudam features/modos — senão os ~17 consumidores de `useStudioConfig`
  // re-renderizavam à toa. A chave já cobre `allowedModes` (entra no resultado),
  // dispensando uma chave separada. NÃO re-hidrata: o sourceProject depende de
  // `resolvedModesKey` (abaixo), não da identidade de `config`.
  const resolvedBaseConfig = resolveStudioConfig(features, allowedModes)
  const baseConfigKey = JSON.stringify(resolvedBaseConfig)
  // biome-ignore lint/correctness/useExhaustiveDependencies: baseConfigKey é a forma estável (serializada) de resolvedBaseConfig (resolveStudioConfig é puro)
  const baseConfig = useMemo(() => resolvedBaseConfig, [baseConfigKey])
  // `limits` é estático por instância (lido só na criação das stores). Resolve a
  // política de segurança do preview UMA vez para não re-derivar o config a cada
  // render do host (o que re-sanitizaria/re-hidrataria o projeto — ver acima).
  const [previewSecurity] = useState(() => resolvePreviewSecurity(limits))
  // Perfil de aprendizado também é estático por instância (fixado pelo professor).
  const [curation] = useState(() =>
    resolveLearning({
      level,
      pythonLevel,
      allowBlocks,
      allowExtensions,
      allowCategories,
      allowLevelReveal,
    }),
  )
  // Course/extension authority can change without replacing the learner's document.
  // Lesson level and curation keep their existing per-instance lifetime.
  const learning = useMemo(
    () => ({ ...curation, grantedBlockIds, allowExtensions }),
    [curation, grantedBlockIds, allowExtensions],
  )
  // `previewSecurity`/`learning` saem de fora do BaseStudioConfig de propósito
  // (ver config.ts) e são anexados SÓ aqui — a anotação ResolvedStudioConfig
  // torna os dois obrigatórios neste call site.
  const config = useMemo(
    (): ResolvedStudioConfig => ({ ...baseConfig, previewSecurity, learning }),
    [baseConfig, previewSecurity, learning],
  )

  // `replaceProject` (handle) troca o projeto sem mexer na prop.
  const [replacedProject, setReplacedProject] = useState<Project | null>(null)
  const [handoffFrozen, setHandoffFrozen] = useState(false)
  const [observationViewVersion, setObservationViewVersion] = useState(0)
  const observedRevision = useRef<number | null>(null)
  const observationGeneration = useRef(0)
  const isObserver = editingAccess === 'observer' || handoffFrozen
  const sourceProject = replacedProject ?? initialProject
  const projectStoreApi = useProjectStoreApi()
  const persistence = useStudioPersistence()
  const preparationGeneration = useRef(0)
  const [preparationLimits] = useState(() => proRuntime?.limits)
  const preparationErrorHandler = useRef(onError)
  const openingSettledHandler = useRef(onProjectOpeningSettled)
  useEffect(() => {
    preparationErrorHandler.current = onError
    openingSettledHandler.current = onProjectOpeningSettled
  }, [onError, onProjectOpeningSettled])
  const [prepared, setPrepared] = useState<{
    source: Project
    project: Project | null
    error: string | null
    generation: number
    settleOpening: (status: 'ready' | 'blocked' | 'error') => void
  } | null>(null)
  useEffect(() => {
    let active = true
    const generation = ++preparationGeneration.current
    const lifetime = new AbortController()
    const releaseOpening = persistence.beginOpening(sourceProject.id, { signal: lifetime.signal })
    const notifySettled = openingSettledHandler.current
    let settled = false
    const settleOpening = (status: 'ready' | 'blocked' | 'error') => {
      releaseOpening()
      if (!active || settled) return
      settled = true
      notifySettled?.({ projectId: sourceProject.id, status })
    }
    void prepareEditableStudioProject(sourceProject, { proBuildLimits: preparationLimits }).then(
      (project) => {
        if (!project) settleOpening('error')
        if (active)
          setPrepared({
            source: sourceProject,
            project,
            error: project ? null : 'Este projeto não pôde ser aberto.',
            generation,
            settleOpening,
          })
      },
      (cause: unknown) => {
        settleOpening('error')
        if (active)
          setPrepared({
            source: sourceProject,
            project: null,
            error: cause instanceof Error ? cause.message : 'Não foi possível abrir este projeto.',
            generation,
            settleOpening,
          })
      },
    )
    return () => {
      active = false
      lifetime.abort()
      releaseOpening()
    }
  }, [sourceProject, preparationLimits, persistence])
  const preparedProject = prepared?.source === sourceProject ? prepared.project : null
  const preparationError = prepared?.source === sourceProject ? prepared.error : null
  useEffect(() => {
    if (preparationError)
      preparationErrorHandler.current?.({ kind: 'persistence', message: preparationError })
  }, [preparationError])
  // Chave primitiva estável dos modos RESOLVIDOS (não da prop): flipa exatamente
  // quando `config.allowedModes` muda — inclusive ao ligar `professional` numa
  // instância montada (que força ['code']). Keyar pela prop `allowedModesKey`
  // não recomputaria a coerção nesse caso, deixando a aba ativa fora dos modos
  // permitidos. NÃO depender do array cru (referência muda a cada render).
  const resolvedModesKey = config.allowedModes.join('|')
  // Dep é a chave primitiva estável `resolvedModesKey` em vez de `config.allowedModes`
  // (array que muda de referência a cada render do host com allowedModes inline).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver acima — depende de resolvedModesKey, não do array config.allowedModes
  const sanitized = useMemo(() => {
    const project = preparedProject
    if (!project) return null
    // Abertura não é edição: a curadoria não marca o projeto como sujo.
    return projectInAllowedMode(project, config.allowedModes, initialMode)
  }, [preparedProject, initialMode, resolvedModesKey])
  const disallowedExtensions = useMemo(
    () => (sanitized ? disallowedProjectExtensions(sanitized, learning.allowExtensions) : []),
    [sanitized, learning.allowExtensions],
  )
  const projectAccessBlocked = disallowedExtensions.length > 0

  // O guia v2 GRAVA o jogo antes de concluir, continuar e pedir ajuda (ver o módulo). Memoizado
  // pela sessão: o `taskSession` NÃO é latchado (o `collapsed` do host precisa chegar vivo).
  const sessaoDoGuia = useMemo(
    () =>
      taskSession ? withSaveBeforeTaskActions(taskSession, () => persistence.save()) : undefined,
    [taskSession, persistence],
  )
  const pendingEditorEdits = usePendingEditorEdits()
  const hydrateProject = useProjectStore((s) => s.hydrateProject)
  const unloadProject = useProjectStore((s) => s.unloadProject)
  const isDirty = useProjectStore((s) => s.isDirty)
  const hasProject = useProjectStore((s) => Boolean(s.project))
  const setPreviewRunning = useUIStore((s) => s.setPreviewRunning)
  const loadSettings = useSettingsStore((s) => s.load)
  const settingsTheme = useSettingsStore((s) => s.theme)
  const effectiveTheme = theme ?? settingsTheme
  useLayoutEffect(() => {
    projectStoreApi.getState().setEditingAccess(isObserver ? 'observer' : 'author')
    if (isObserver) {
      persistence.suspend()
      setPreviewRunning(false)
    } else persistence.resume()
  }, [isObserver, persistence, projectStoreApi, setPreviewRunning])

  // Callbacks do host mudam por render — o serviço lê sempre a versão atual.
  useEffect(() => {
    persistence.handlers = { onChange, onSave, onError }
  }, [persistence, onChange, onSave, onError])

  useImperativeHandle(
    ref,
    (): StudioHandle => ({
      getCodeCursorAnchor: (x, y) => codeObservation?.anchorAt(x, y) ?? Promise.resolve(null),
      getCodeCursorPosition: (anchor) =>
        codeObservation?.positionOf(anchor) ?? Promise.resolve(null),
      onCodeCursorChange: (listener) => codeObservation?.subscribe(listener) ?? (() => {}),
      getProject: () => {
        pendingEditorEdits?.flush()
        const project = projectStoreApi.getState().project
        return project ? snapshotProjectWithCurrentAuthority(project) : null
      },
      onProjectChange: (listener) =>
        projectStoreApi.subscribe((next, previous) => {
          if (next.project !== previous.project || next.editingAccess !== previous.editingAccess)
            listener()
        }),
      save: () => persistence.save(),
      replaceProject: (project) => setReplacedProject(project),
      prepareHandoff: async () => {
        pendingEditorEdits?.flush()
        await flushProjectOperations(projectStoreApi)
        projectStoreApi.getState().setEditingAccess('observer')
        persistence.suspend()
        setPreviewRunning(false)
        setHandoffFrozen(true)
        const project = projectStoreApi.getState().project
        if (!project) throw new Error('O projeto ainda não está pronto.')
        return snapshotProjectWithCurrentAuthority(project)
      },
      applyObservedRevision: async (project, revision) => {
        if (
          !Number.isSafeInteger(revision) ||
          revision < 0 ||
          (observedRevision.current !== null && revision < observedRevision.current)
        )
          throw new Error('Revisão de observação inválida.')
        if (projectStoreApi.getState().editingAccess !== 'observer')
          throw new Error('Pause a autoria antes de observar uma revisão.')
        const generation = ++observationGeneration.current
        const prepared = await prepareEditableStudioProject(project, {
          proBuildLimits: preparationLimits,
        })
        if (!prepared) throw new Error('O projeto recebido não pôde ser aberto.')
        if (generation !== observationGeneration.current)
          throw new Error('Revisão substituída por uma mais recente.')
        persistence.suspend()
        setPreviewRunning(false)
        // Dispose the old editor workers, undo stacks and delayed Blockly callbacks
        // before acknowledging a remotely-authored document. A new canvas loads the
        // saved layout instead of preserving positions from the preceding writer.
        flushSync(() => {
          projectStoreApi
            .getState()
            .hydrateProject(projectInAllowedMode(prepared, config.allowedModes))
          setObservationViewVersion(generation)
        })
        observedRevision.current = revision
        onRevisionApplied?.(revision)
      },
      resumeAuthorship: (revision) => {
        if (observedRevision.current !== revision)
          throw new Error('A revisão confirmada ainda não foi aplicada.')
        observationGeneration.current++
        setHandoffFrozen(false)
        if (editingAccess === 'author') {
          projectStoreApi.getState().setEditingAccess('author')
          persistence.resume()
        }
      },
      setMode: (mode) => projectStoreApi.getState().setMode(mode),
      isDirty: () => projectStoreApi.getState().isDirty,
    }),
    [
      codeObservation,
      projectStoreApi,
      persistence,
      pendingEditorEdits,
      setPreviewRunning,
      preparationLimits,
      onRevisionApplied,
      editingAccess,
      config.allowedModes,
    ],
  )

  // Document lifetime belongs to its preparation, never to mutable authority/curation.
  // A denied first opening can hydrate later; a loaded document survives revocation.
  const hydratedPreparation = useRef<typeof prepared>(null)
  useEffect(() => {
    if (!prepared || prepared.source !== sourceProject) return
    return () => {
      hydratedPreparation.current = null
      unloadProject()
    }
  }, [prepared, sourceProject, unloadProject])

  useEffect(() => {
    if (
      !sanitized ||
      prepared?.source !== sourceProject ||
      prepared.generation !== preparationGeneration.current
    )
      return
    try {
      if (projectAccessBlocked) {
        setPreviewRunning(false)
        prepared.settleOpening('blocked')
        return
      }
      if (hydratedPreparation.current === prepared) {
        const current = projectStoreApi.getState().project
        if (current) {
          const curated = projectInAllowedMode(current, config.allowedModes)
          if (curated !== current) projectStoreApi.setState({ project: curated })
        }
        setPreviewRunning(autoRun && projectStoreApi.getState().editingAccess === 'author')
        return
      }
      hydrateProject(sanitized)
      hydratedPreparation.current = prepared
      // Projeto trocado pelo HOST (`handle.replaceProject`, o "Trazer o que eu enviei" da aula) é a
      // versão que deve ficar guardada: entra como edição, e o autosave grava por cima do rascunho
      // do aparelho. Antes isso acontecia por acaso, na regravação que o editor fazia ao abrir, e
      // abrir deixou de regravar (abrir não é editar, e não muda o "Atualizado em").
      if (replacedProject !== null)
        projectStoreApi.setState((state) =>
          state.project ? { project: { ...state.project }, isDirty: true } : {},
        )
      // Restaura, EM SEGUNDO PLANO, o `blocksState` pesado que a abertura rápida
      // (shell load) omitiu — sem isto o editor abria com o workspace VAZIO (os
      // blocos só voltavam ao forçar um reparse na Ponte). No-op quando o projeto já
      // veio com blocksState (host passou o projeto completo) ou sem adapter.
      persistence.hydrateAfterLoad(sanitized)
      setPreviewRunning(autoRun && projectStoreApi.getState().editingAccess === 'author')
    } catch (cause) {
      prepared.settleOpening('error')
      throw cause
    } finally {
      // Release this preparation, even for same-id replacements. onReady is only an id latch.
      prepared.settleOpening('ready')
    }
  }, [
    sanitized,
    projectAccessBlocked,
    hydrateProject,
    setPreviewRunning,
    persistence,
    replacedProject,
    projectStoreApi,
    autoRun,
    prepared,
    sourceProject,
    config.allowedModes,
  ])

  useEffect(() => {
    const detach = persistence.attach()
    void loadSettings()
    return detach
  }, [persistence, loadSettings])

  // onReady: 1x POR PROJETO carregado. O ref re-arma quando a identidade do
  // projeto muda (ex.: handle.replaceProject() → unload+re-hidrata), senão um
  // novo projeto carregado nunca dispararia onReady de novo.
  const readyFiredRef = useRef(false)
  const readyFiredForIdRef = useRef<string | null>(null)
  const sanitizedId = sanitized?.id ?? null
  useEffect(() => {
    if (readyFiredForIdRef.current !== sanitizedId) {
      readyFiredForIdRef.current = sanitizedId
      readyFiredRef.current = false
    }
    if (
      !hasProject ||
      !sanitizedId ||
      projectStoreApi.getState().project?.id !== sanitizedId ||
      readyFiredRef.current
    )
      return
    readyFiredRef.current = true
    onReady?.()
  }, [hasProject, onReady, sanitizedId, projectStoreApi])

  // onModeChange: observa o modo do projeto na store da instância.
  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange
  useEffect(() => {
    return projectStoreApi.subscribe((state, prev) => {
      const mode = state.project?.mode
      const prevMode = prev.project?.mode
      if (mode && prevMode && mode !== prevMode && state.project?.id === prev.project?.id) {
        onModeChangeRef.current?.(mode)
      }
    })
  }, [projectStoreApi])

  const lastProjectRef = useRef<Project | null>(null)
  const studioRootRef = useRef<HTMLDivElement>(null)

  // ⭐ A capa do card é tirada AO SAIR do editor, por QUALQUER caminho.
  //
  // Até 08/2026 o ÚNICO gatilho era o clique no botão da marca (Topbar). Ele
  // ficou órfão quando o Estúdio virou uma SEÇÃO da comunidade: com a sidebar do
  // kids sempre à vista, a criança passou a voltar pela navegação do host ou
  // pelo botão voltar, e aí o `onExit` do editor nunca é chamado — a miniatura
  // simplesmente nunca era tirada, e o card ficava só com nome e data.
  //
  // O unmount cobre esses caminhos: a captura roda num iframe PRÓPRIO no
  // `document.body`, que sobrevive à desmontagem do React (é o caso das
  // navegações client-side do Next). Recarregar/fechar a aba continua perdendo a
  // foto — best-effort de propósito, nada aqui pode atrasar a saída.
  useEffect(() => {
    // O React 19 valida efeitos em StrictMode desmontando e remontando seus
    // efeitos sem remover o DOM. Guardamos o nó visto na instalação do efeito:
    // numa saída real ele estará desconectado; na validação do StrictMode,
    // continuará conectado e não deve disparar uma captura em iframe.
    const studioRoot = studioRootRef.current
    // ⚠️ Guardar o projeto num REF é load-bearing: no unmount a store já foi
    // limpa por outro cleanup (medido — `project` chega null lá), então ler dela
    // na hora de capturar não devolvia nada e a capa nunca era tirada.
    const unsubscribe = projectStoreApi.subscribe((state) => {
      if (state.project) lastProjectRef.current = state.project
    })
    const atual = projectStoreApi.getState().project
    if (atual) lastProjectRef.current = atual
    return () => {
      unsubscribe()
      if (studioRoot?.isConnected) return
      if (!persistence.hasAdapter) return
      if (requireIsolatedPreview || projectStoreApi.getState().editingAccess === 'observer') return
      const project = lastProjectRef.current
      if (project) void captureAndStoreProjectThumb(project, runtimeCapture)
    }
  }, [persistence, projectStoreApi, requireIsolatedPreview, runtimeCapture])

  useEffect(() => {
    if (!blockUnloadWhenDirty || !isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [blockUnloadWhenDirty, isDirty])

  return (
    <StudioTutorProvider value={tutorValue}>
      <ProBuilderDeletionReconciler />
      <StudioProRuntimeProvider
        value={proRuntimeValue}
        prepareDependencies={prepareProDependencies}
      >
        <StudioShareProvider value={shareValue}>
          <StudioCloudSyncProvider value={cloudSyncValue}>
            <StudioEditDrawingProvider value={editDrawingValue}>
              <StudioEditCreationProvider value={editCreationValue}>
                <StudioPintaLibraryProvider value={pintaLibraryValue}>
                  <StudioMoldaLibraryProvider value={moldaLibraryValue}>
                    <StudioTeamLibraryProvider value={teamLibraryValue}>
                      <StudioShareDisabledProvider value={shareDisabledReason ?? null}>
                        <StudioExamplesVisibleProvider value={examplesVisible}>
                          <StudioConfigProvider value={config}>
                            <StudioThemeProvider value={effectiveTheme}>
                              <StudioExecutionProvider
                                value={{
                                  editingAccess: isObserver ? 'observer' : 'author',
                                  autoRun,
                                  originAdapter: previewOriginAdapter,
                                  requireIsolatedPreview,
                                  muted: projectMuted,
                                  writerEpoch,
                                }}
                              >
                                <StudioProCandidatePreviewProvider>
                                  <div
                                    ref={studioRootRef}
                                    data-editing-access={isObserver ? 'observer' : 'author'}
                                    data-sz-theme={effectiveTheme}
                                    className={['h-full min-h-0', className]
                                      .filter(Boolean)
                                      .join(' ')}
                                    // `isolation` cerca os z-index INTERNOS do editor (o Blockly injeta
                                    // `.blocklyToolbox { z-index: 70 }`) — sem a cerca, a paleta vazava por
                                    // cima de modais do HOST (overlay `z-50` do Dialog, sem portal). O que
                                    // precisa flutuar sobre o host (menus da Topbar, dropdowns do Blockly)
                                    // é PORTALADO pro document.body — fora da cerca, segue intacto.
                                    style={{
                                      fontFamily: 'var(--font-family-sans)',
                                      isolation: 'isolate',
                                      ...style,
                                    }}
                                  >
                                    {sanitized === null ? (
                                      <div className="flex h-full flex-col items-center justify-center gap-2 bg-sz-bg text-sz-fg-soft">
                                        <p className="text-sm">
                                          {preparationError ?? 'Preparando seu projeto…'}
                                        </p>
                                        {preparationError && onExit ? (
                                          <button
                                            type="button"
                                            className="rounded-lg bg-sz-accent px-4 py-2 font-semibold text-sm text-white"
                                            onClick={onExit}
                                          >
                                            Voltar
                                          </button>
                                        ) : null}
                                      </div>
                                    ) : projectAccessBlocked ? (
                                      <div className="flex h-full flex-col items-center justify-center gap-3 bg-sz-bg px-6 text-center text-sz-fg-soft">
                                        <p className="text-base font-semibold text-sz-fg">
                                          Este projeto usa ferramentas que você ainda vai conquistar
                                        </p>
                                        <p className="max-w-md text-sm">
                                          Continue avançando na Jornada do Criador. O projeto ficou
                                          guardado e abrirá normalmente quando essas ferramentas
                                          forem liberadas.
                                        </p>
                                        {onExit ? (
                                          <button
                                            type="button"
                                            className="rounded-lg bg-sz-accent px-4 py-2 font-semibold text-sm text-white"
                                            onClick={onExit}
                                          >
                                            Voltar
                                          </button>
                                        ) : null}
                                      </div>
                                    ) : hasProject ? (
                                      <ErrorBoundary
                                        fallback={(p) => (
                                          <RootErrorFallback {...p} onExit={onExit} />
                                        )}
                                        resetKeys={[sanitizedId]}
                                        label="Studio"
                                      >
                                        <div
                                          inert={isObserver}
                                          className="flex h-full min-h-0 flex-col"
                                        >
                                          {/* A missão do Pensa é uma coluna PRÓPRIA à direita (ou
                                              uma faixa embaixo, na tela estreita): nunca cobre o
                                              editor, e o editor se mede no espaço que sobra. */}
                                          <PensaMissionLayout
                                            panel={
                                              sessaoDoGuia ? (
                                                <TaskGuidePanel session={sessaoDoGuia} />
                                              ) : null
                                            }
                                          >
                                            <div className="min-h-0 min-w-0 flex-1">
                                              <Shell
                                                key={observationViewVersion}
                                                onExit={onExit}
                                                onPromoteToPro={onPromoteToPro}
                                                canToggleTheme={theme === undefined}
                                                onRenderError={(area, error) =>
                                                  onError?.({
                                                    kind: 'render',
                                                    area,
                                                    message: error.message,
                                                    ...(error.stack ? { stack: error.stack } : {}),
                                                  })
                                                }
                                              />
                                            </div>
                                          </PensaMissionLayout>
                                        </div>
                                      </ErrorBoundary>
                                    ) : null}
                                  </div>
                                </StudioProCandidatePreviewProvider>
                              </StudioExecutionProvider>
                            </StudioThemeProvider>
                          </StudioConfigProvider>
                        </StudioExamplesVisibleProvider>
                      </StudioShareDisabledProvider>
                    </StudioTeamLibraryProvider>
                  </StudioMoldaLibraryProvider>
                </StudioPintaLibraryProvider>
              </StudioEditCreationProvider>
            </StudioEditDrawingProvider>
          </StudioCloudSyncProvider>
        </StudioShareProvider>
      </StudioProRuntimeProvider>
    </StudioTutorProvider>
  )
}
