import type { JSX } from 'react'
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { modesForKind, type Project, setLocale } from '#core'
import { ErrorBoundary } from '#ui'
import { RootErrorFallback } from '../components/layout/ErrorViews'
import { Shell } from '../components/layout/Shell'
import { captureAndStoreProjectThumb } from '../cover/thumbCapture'
import { useChecksStoreApi } from '../state/checksStore'
import { sanitizeProjectForHost, useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { useSettingsStore } from '../state/settingsStore'
import { StudioStoresContext } from '../state/storesContext'
import { createStudioStores, useStudioPersistence } from '../state/studioStores'
import { useUIStore } from '../state/uiStore'
import { StudioActivityProvider } from './activity'
import { StudioCloudSyncProvider } from './cloud-sync'
import {
  type ResolvedStudioConfig,
  resolveLearning,
  resolvePreviewSecurity,
  resolveStudioConfig,
  StudioConfigProvider,
} from './config'
import { StudioEditDrawingProvider } from './edit-drawing'
import { StudioExamplesVisibleProvider } from './examples-visibility'
import { StudioPintaLibraryProvider } from './pinta-library'
import { StudioProRuntimeProvider } from './pro-runtime'
import { disallowedProjectExtensions } from './project-access'
import { StudioShareDisabledProvider, StudioShareProvider } from './share'
import { TaskGuidePanel } from './TaskGuidePanel'
import { StudioThemeProvider } from './theme'
import { StudioTutorProvider } from './tutor'
import type { StudioCoreProps, StudioHandle } from './types'

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
  // 1x por instância; StrictMode-safe (re-render descarta a duplicata).
  // `persistence` e `limits` são estáticos por instância (lidos só aqui).
  const [stores] = useState(() =>
    createStudioStores({
      persistence: props.persistence,
      limits: props.limits,
      proBuildLimits: props.proRuntime?.limits,
    }),
  )
  return (
    <StudioStoresContext.Provider value={stores}>
      <StudioCoreBody {...props} />
    </StudioStoresContext.Provider>
  )
}

/** Corpo do Studio — DENTRO do provider, para os hooks lerem as stores da instância. */
function StudioCoreBody({
  initialProject,
  features,
  allowedModes,
  initialMode,
  limits,
  level,
  allowBlocks,
  allowExtensions,
  allowCategories,
  allowLevelReveal,
  activity,
  tutor,
  taskSession,
  share,
  shareDisabledReason,
  onCloudSync,
  onEditDrawing,
  pintaLibrary,
  showExamples,
  onChange,
  onSave,
  onError,
  onModeChange,
  onReady,
  theme,
  locale,
  onExit,
  onPromoteToPro,
  proRuntime,
  blockUnloadWhenDirty = true,
  className,
  style,
  ref,
}: StudioCoreProps): JSX.Element {
  // Locale é estático por instância e precisa valer ANTES do primeiro render
  // dos filhos (há `t()` avaliado em escopo de módulo nos chunks lazy).
  useState(() => {
    if (locale) setLocale(locale)
  })

  // Atividade é estática por instância (fixada pelo professor): latcha uma vez
  // para o provider entregar valor estável — re-render do host com `activity`
  // inline não re-renderiza o painel. Default `null` (sem atividade).
  const [activityValue] = useState(() => activity ?? null)
  // Somente o StudioEditor oferece tutor. Adapter estático por instância, como share.
  const [tutorValue] = useState(() => tutor ?? null)

  // Adapter de compartilhar também latcha uma vez por instância (igual à
  // atividade): `share={{…}}` inline do host muda de referência a cada render,
  // mas o valor entregue ao provider fica estável. Default `null` → sem botão.
  const [shareValue] = useState(() => share ?? null)

  // Callback "Sincronizar com o enviado" — latcha uma vez por instância (igual ao
  // share); o host fornece uma referência estável (useCallback). `null` → sem item.
  const [cloudSyncValue] = useState(() => onCloudSync ?? null)

  // "Editar o desenho no Pinta" — mesmo latch: o host passa uma referência
  // estável e o painel de Imagens decide se mostra o botão. `null` → sem botão.
  const [editDrawingValue] = useState(() => onEditDrawing ?? null)

  // "Trazer do Pinta" — mesmo latch; o painel de Imagens mostra o botão e a
  // modal quando presente (e esconde a seção "Meus desenhos"). `null` → nada.
  const [pintaLibraryValue] = useState(() => pintaLibrary ?? null)

  // Runtime Pro da aula é um adapter estático, como os demais contratos de I/O
  // do host. Ausente mantém o WebContainer local do Estúdio Completo.
  const [proRuntimeValue] = useState(() => proRuntime ?? null)

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
  const [learning] = useState(() =>
    resolveLearning({ level, allowBlocks, allowExtensions, allowCategories, allowLevelReveal }),
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
  const sourceProject = replacedProject ?? initialProject
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
    const project = sanitizeProjectForHost(sourceProject, {
      proBuildLimits: proRuntime?.limits,
    })
    if (!project) return null
    // Coerção de modo (D2): os modos dependem do TIPO do projeto (modesForKind)
    // intersectados com a allowlist do host — pro = só Código; básico = Blocos/
    // Ponte. initialMode sobrepõe o salvo; fora dos permitidos cai no primeiro.
    // Não marca sujo (é abertura, não edição).
    const kindModes = modesForKind(project.kind)
    const allowed =
      project.kind === 'pro' ? kindModes : kindModes.filter((m) => config.allowedModes.includes(m))
    let mode = initialMode ?? project.mode
    if (!allowed.includes(mode)) mode = allowed[0] ?? project.mode
    return mode === project.mode ? project : { ...project, mode }
  }, [sourceProject, initialMode, resolvedModesKey])
  const disallowedExtensions = useMemo(
    () => (sanitized ? disallowedProjectExtensions(sanitized, learning.allowExtensions) : []),
    [sanitized, learning.allowExtensions],
  )
  const projectAccessBlocked = disallowedExtensions.length > 0

  const projectStoreApi = useProjectStoreApi()
  const checksStoreApi = useChecksStoreApi()
  const persistence = useStudioPersistence()
  const hydrateProject = useProjectStore((s) => s.hydrateProject)
  const unloadProject = useProjectStore((s) => s.unloadProject)
  const isDirty = useProjectStore((s) => s.isDirty)
  const hasProject = useProjectStore((s) => Boolean(s.project))
  const setPreviewRunning = useUIStore((s) => s.setPreviewRunning)
  const loadSettings = useSettingsStore((s) => s.load)
  const settingsTheme = useSettingsStore((s) => s.theme)
  const effectiveTheme = theme ?? settingsTheme

  // Callbacks do host mudam por render — o serviço lê sempre a versão atual.
  useEffect(() => {
    persistence.handlers = { onChange, onSave, onError }
  }, [persistence, onChange, onSave, onError])

  useImperativeHandle(
    ref,
    (): StudioHandle => ({
      getProject: () => projectStoreApi.getState().project,
      save: () => persistence.save(),
      replaceProject: (project) => setReplacedProject(project),
      setMode: (mode) => projectStoreApi.getState().setMode(mode),
      isDirty: () => projectStoreApi.getState().isDirty,
      getActivityResult: () => checksStoreApi.getState().lastResult,
    }),
    [projectStoreApi, checksStoreApi, persistence],
  )

  useEffect(() => {
    if (!sanitized || projectAccessBlocked) return
    hydrateProject(sanitized)
    // Restaura, EM SEGUNDO PLANO, o `blocksState` pesado que a abertura rápida
    // (shell load) omitiu — sem isto o editor abria com o workspace VAZIO (os
    // blocos só voltavam ao forçar um reparse na Ponte). No-op quando o projeto já
    // veio com blocksState (host passou o projeto completo) ou sem adapter.
    persistence.hydrateAfterLoad(sanitized)
    setPreviewRunning(true)
    // Resultado da auto-correção é POR PROJETO: ao (re)hidratar — inclusive via
    // handle.replaceProject() / carregar a próxima aula da cadeia — o último
    // resultado não vale mais. Sem isto, getActivityResult() devolveria a nota de
    // um projeto anterior e o host a anexaria no envio do novo (6º review, D).
    checksStoreApi.getState().setResult(null)
    return () => {
      unloadProject()
      checksStoreApi.getState().setResult(null)
    }
  }, [
    sanitized,
    projectAccessBlocked,
    hydrateProject,
    unloadProject,
    setPreviewRunning,
    checksStoreApi,
    persistence,
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
    if (!hasProject || readyFiredRef.current) return
    readyFiredRef.current = true
    onReady?.()
  }, [hasProject, onReady, sanitizedId])

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
      if (!persistence.hasAdapter) return
      const project = lastProjectRef.current
      if (project) void captureAndStoreProjectThumb(project)
    }
  }, [persistence, projectStoreApi])

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
      <StudioProRuntimeProvider value={proRuntimeValue}>
        <StudioShareProvider value={shareValue}>
          <StudioCloudSyncProvider value={cloudSyncValue}>
            <StudioEditDrawingProvider value={editDrawingValue}>
              <StudioPintaLibraryProvider value={pintaLibraryValue}>
                <StudioShareDisabledProvider value={shareDisabledReason ?? null}>
                  <StudioExamplesVisibleProvider value={examplesVisible}>
                    <StudioActivityProvider value={activityValue}>
                      <StudioConfigProvider value={config}>
                        <StudioThemeProvider value={effectiveTheme}>
                          <div
                            data-sz-theme={effectiveTheme}
                            className={['h-full min-h-0', className].filter(Boolean).join(' ')}
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
                                  Projeto inválido — confira o initialProject passado ao Studio.
                                </p>
                              </div>
                            ) : projectAccessBlocked ? (
                              <div className="flex h-full flex-col items-center justify-center gap-3 bg-sz-bg px-6 text-center text-sz-fg-soft">
                                <p className="text-base font-semibold text-sz-fg">
                                  Este projeto usa ferramentas que você ainda vai conquistar
                                </p>
                                <p className="max-w-md text-sm">
                                  Continue avançando na Carreira do Criador. O projeto ficou
                                  guardado e abrirá normalmente quando essas ferramentas forem
                                  liberadas.
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
                                fallback={(p) => <RootErrorFallback {...p} onExit={onExit} />}
                                resetKeys={[sanitizedId]}
                                label="Studio"
                              >
                                <div className="flex h-full min-h-0 flex-col lg:flex-row">
                                  {taskSession ? <TaskGuidePanel session={taskSession} /> : null}
                                  <div className="min-h-0 min-w-0 flex-1">
                                    <Shell
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
                                </div>
                              </ErrorBoundary>
                            ) : null}
                          </div>
                        </StudioThemeProvider>
                      </StudioConfigProvider>
                    </StudioActivityProvider>
                  </StudioExamplesVisibleProvider>
                </StudioShareDisabledProvider>
              </StudioPintaLibraryProvider>
            </StudioEditDrawingProvider>
          </StudioCloudSyncProvider>
        </StudioShareProvider>
      </StudioProRuntimeProvider>
    </StudioTutorProvider>
  )
}
