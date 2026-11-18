import type { JSX } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  asset3DManifest,
  assetManifest,
  assetMetaManifest,
  type ExtraFile,
  type InstalledExtension,
  type Project,
  type ProjectAsset,
  preloadCourseModels,
  soundManifest,
} from '#core'
import {
  extensionBootstrapContext,
  extensionBootstrapVariantsKey,
  loadExtensionBootstrapScripts,
  uniqueExtensionIds,
} from '#extensions'
import {
  isPreviewMessage,
  isPreviewSnapshotMessage,
  isPreviewStorageWriteMessage,
  PREVIEW_SNAPSHOT_REQUEST,
  sanitizePreviewStorageData,
} from '#preview'
import { Button } from '#ui'
import { javaScriptProject } from '../../core/editableProject'
import { resolveCoverAsset } from '../../cover/coverAsset'
import { rememberProjectSnapshot } from '../../cover/latestSnapshot'
import { useDebounced } from '../../hooks/useDebounced'
import { loadGameUiFont } from '../../official-extensions/gameUiFont'
import { resolveGameUiFontId } from '../../official-extensions/gameUiFonts/resolve'
import {
  buildJavaScriptClassicDocument,
  resolveJavaScriptClassicExtensions,
} from '../../runtime/javascript/classicDocument'
import { glossErrorMessage } from '../../state/errorGloss'
import { loadGameStorage, writeGameStorage } from '../../state/gameStorage'
import { useHighlightStoreApi } from '../../state/highlightStore'
import { previewErrorLocation, useLogsStore } from '../../state/logsStore'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { type ProRunActions, type ProRunState, useProRunApi } from '../../state/proRun'
import { usePendingEditorEdits, useStudioPersistence } from '../../state/studioStores'
import { useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { useT } from '../../studio/i18n'
import { useStudioExecution } from '../../studio/observation'
import { validateIsolatedPreviewUrl } from './playerOriginAdapter'
import { createRunPreparation } from './prepareRun'
import {
  estimatePreviewInputChars,
  PREVIEW_RENDER_INPUT_LIMIT_CHARS,
  type PreviewBudgetInput,
  shouldPausePreviewRender,
} from './previewBudget'
import {
  armRunTripwire,
  disarmRunTripwire,
  HEARTBEATS_TO_TRUST,
  wasRunInterrupted,
} from './runTripwire'
import {
  projectUsesKeyboardControls,
  useTouchInput,
  VirtualGamepad,
  type VirtualGamepadInput,
} from './VirtualGamepad'

const EMPTY_EXTRA_FILES: ExtraFile[] = []
const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []
const EMPTY_ASSETS: ProjectAsset[] = []

/** Espera antes da 1ª foto: o jogo precisa desenhar antes de valer a pena. */
const SNAPSHOT_FIRST_DELAY_MS = 2_500
/** Intervalo entre fotos. Longo de propósito: a capa não precisa ser ao vivo. */
const SNAPSHOT_INTERVAL_MS = 20_000

/**
 * Com capa ESCOLHIDA (e RESOLVIDA: a imagem existe no projeto) o preview não tira fotos, porque
 * a capa vem da imagem. Um nome pendurado (a imagem apagada por outro aparelho, um snapshot sem
 * os assets) NÃO segura as fotos: nesse caso o `resolveThumb` cai na foto automática, e ela
 * precisa existir.
 */
export function chosenCoverPausesSnapshots(
  project: Pick<Project, 'assets' | 'coverAssetName'> | null | undefined,
): boolean {
  return project ? resolveCoverAsset(project) !== null : false
}

export function PreviewIframe(): JSX.Element {
  const execution = useStudioExecution()
  const projectStore = useProjectStoreApi()
  const persistence = useStudioPersistence()
  const pendingEdits = usePendingEditorEdits()
  const [preparingRun, setPreparingRun] = useState(false)
  const [preparationError, setPreparationError] = useState<string | null>(null)
  const [sourceVersion, setSourceVersion] = useState(0)
  const fullProject = useProjectStore((s) => javaScriptProject(s.project))
  const { projectId, html, css, js, ir, installedExtensions, extraFiles, assets, hasChosenCover } =
    useProjectStore(
      useShallow((s) => ({
        projectId: javaScriptProject(s.project)?.id ?? null,
        hasChosenCover: chosenCoverPausesSnapshots(javaScriptProject(s.project)),
        html: javaScriptProject(s.project)?.files['index.html'] ?? '',
        css: javaScriptProject(s.project)?.files['style.css'] ?? '',
        js: javaScriptProject(s.project)?.files['script.js'] ?? '',
        ir: javaScriptProject(s.project)?.ir ?? null,
        installedExtensions:
          javaScriptProject(s.project)?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
        extraFiles: javaScriptProject(s.project)?.extraFiles ?? EMPTY_EXTRA_FILES,
        assets: javaScriptProject(s.project)?.assets ?? EMPTY_ASSETS,
      })),
    )
  const runIdentity = useMemo(
    () => ({
      projectId,
      editingAccess: execution.editingAccess,
      writerEpoch: execution.writerEpoch,
    }),
    [projectId, execution.editingAccess, execution.writerEpoch],
  )
  const preparation = useMemo(
    () =>
      createRunPreparation({
        project: () => {
          const project = projectStore.getState().project
          return runIdentity.editingAccess === 'author' && project?.id === runIdentity.projectId
            ? project
            : null
        },
        dirty: () => projectStore.getState().isDirty,
        flush: () => pendingEdits?.flush(),
        save: () => persistence.save(),
        pending: setPreparingRun,
        error: setPreparationError,
      }),
    [projectStore, runIdentity, persistence, pendingEdits],
  )
  const pushLog = useLogsStore((s) => s.push)
  const previewSecurity = useStudioConfig().previewSecurity
  const previewRunning = useUIStore((s) => s.previewRunning)
  const setPreviewRunning = useUIStore((s) => s.setPreviewRunning)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const touchInput = useTouchInput()
  const usesKeyboardControls = useMemo(() => projectUsesKeyboardControls(ir), [ir])
  const sendVirtualGamepadInput = useCallback((input: VirtualGamepadInput) => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'sz:gamepad', ...input }, '*')
  }, [])
  // Quando o aluno clica EXPLICITAMENTE em Reproduzir/Atualizar, focamos o iframe
  // assim que ele recarrega — senão o foco fica no botão (no parent) e as setas do
  // teclado nunca chegam ao jogo (o iframe sandbox só recebe teclado com FOCO no
  // conteúdo). Só em ação explícita: um reload por auto-debounce durante a edição
  // NÃO rouba o foco do editor de blocos.
  const focusOnLoadRef = useRef(false)
  // Watchdog de heartbeat (Camada B): se o thread do iframe travar num cálculo
  // síncrono, o interceptor para de emitir heartbeats e mostramos o aviso.
  const lastHeartbeatRef = useRef(0)
  const [previewStalled, setPreviewStalled] = useState(false)
  // A "geração" do iframe (a `key` dele). Um jogo preso num cálculo sem fim segura o processo
  // da prévia, e trocar o `srcDoc` do MESMO iframe só vale quando o cálculo termina (medido:
  // 19 s para um travamento de 20 s). Um iframe NOVO no lugar roda na hora (20 ms), porque o
  // navegador descarta o processo preso junto com o iframe antigo. Por isso a geração sobe ao
  // PARAR e ao Rodar de novo com a prévia sem responder, e só aí: no caminho normal o iframe é
  // o mesmo de sempre (remontá-lo a cada edição deixava a prévia em branco de vez em quando).
  const [frameGeneration, setFrameGeneration] = useState(0)
  // Intervalo SEM iframe na troca de um jogo preso (18/11/2026). No Chromium completo os iframes
  // com sandbox da mesma página dividem UM processo: o iframe novo, criado no mesmo instante em que
  // o antigo sai, cai no processo ainda ocupado e só anda quando o travamento acaba (visto no
  // Windows, Chromium 148: o conserto não rodava em 15 s). Sem nenhum iframe por um instante, o
  // processo fica sem página e o navegador o descarta; o próximo iframe nasce num processo novo.
  // O tempo que o navegador leva para descartar não é documentado: cada tentativa espera mais.
  const [frameAbsent, setFrameAbsent] = useState(false)
  const frameGapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frameGapStepRef = useRef(0)
  const swapFrame = useCallback((stuck: boolean) => {
    if (!stuck) {
      setFrameGeneration((n) => n + 1)
      return
    }
    const step = Math.min(frameGapStepRef.current, FRAME_GAPS_MS.length - 1)
    frameGapStepRef.current += 1
    setFrameAbsent(true)
    if (frameGapTimerRef.current) clearTimeout(frameGapTimerRef.current)
    frameGapTimerRef.current = setTimeout(() => {
      frameGapTimerRef.current = null
      setFrameGeneration((n) => n + 1)
      setFrameAbsent(false)
    }, FRAME_GAPS_MS[step])
  }, [])
  useEffect(
    () => () => {
      if (frameGapTimerRef.current) clearTimeout(frameGapTimerRef.current)
    },
    [],
  )
  const wasRunningRef = useRef(false)
  // Incrementado quando o preview precisa executar/reexecutar o documento atual
  // mesmo que o HTML/CSS/JS gerado seja idêntico.
  const [renderNonce, setRenderNonce] = useState(0)
  // O erro que parou o jogo da vez (redesenho do clássico, 11/2026): o primeiro erro de execução
  // do documento atual. Vira a fase `error` no `proRun` (o cartão "Opa" do palco e a aba
  // Problemas) e o sinal vermelho no bloco. Um documento novo (Rodar, Rodar de novo, edição) zera.
  const [gameError, setGameError] = useState<{
    text: string
    line?: number
    column?: number
  } | null>(null)
  const autoStartedProjectId = useRef<string | null>(null)
  const [loadedSrcDoc, setLoadedSrcDoc] = useState<string | null>(null)
  // Quando o documento da vez entrou (ver o filtro dos erros no ouvinte de mensagens).
  const docStartedAtRef = useRef(0)
  const [renderLargePreviewForInput, setRenderLargePreviewForInput] =
    useState<PreviewBudgetInput | null>(null)
  // Mirror em memória do `localStorage` persistido do projeto (blocos
  // "guardar/ler"). É SEMEADO no doc do preview a cada build (lido como ref, NÃO
  // como dependência — senão cada escrita reconstruiria o doc e RECARREGARIA o
  // preview, zerando o programa que acabou de salvar). As mutações chegam por
  // postMessage do bridge e são persistidas (debounced) no IndexedDB.
  const gameStorageRef = useRef<Record<string, string>>({})
  const projectIdRef = useRef<string | null>(projectId)
  projectIdRef.current = projectId
  // Throttle de gravação. O bridge posta o store INTEIRO a cada mutação (pode ser
  // muitas por segundo). Guardamos só o ÚLTIMO payload e o processamos (sanitiza +
  // mirror + persiste) na BORDA DE SUBIDA e no máximo a cada STORAGE_FLUSH_MS:
  // limita o custo de sanitização na main-thread e impede que um programa que
  // escreve em laço ASSÍNCRONO (fora do alcance do loopGuard) resete um debounce
  // pra sempre e nunca persista. O payload mais recente sempre vence (última
  // escrita preservada).
  const latestStoragePayload = useRef<Record<string, string> | null>(null)
  const storageFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastStorageFlushAt = useRef(0)
  // Cap de taxa de mensagens (defesa contra flood). O handler abaixo faz
  // structured-clone + validação em TODA mensagem; um programa do aluno (ou um
  // Worker/microtask) que poste em rajada degradaria o thread do host. Mantemos um
  // contador por janela de 1s e DESCARTAMOS o excedente ANTES da validação pesada.
  // O teto é generoso (acomoda heartbeat 1/s + escritas de jogo em laço), só corta
  // abuso real.
  const messageWindowStartRef = useRef(0)
  const messageWindowCountRef = useRef(0)
  // Gate da primeira execução: só liberamos o doc AO VIVO depois de hidratar o
  // estado salvo. Sem isso, um Play disparado antes da leitura do IndexedDB
  // semearia o preview vazio e o primeiro setItem do programa (ex.: fome=100)
  // sobrescreveria a fome salva — perda de dado no 1º run.
  const [storageReady, setStorageReady] = useState(false)

  // Processa o payload pendente DO PROJETO ATUAL: atualiza o mirror (para o
  // próximo build semear fresco) e persiste no IndexedDB.
  const processStorageNow = useCallback(() => {
    if (storageFlushTimer.current) {
      clearTimeout(storageFlushTimer.current)
      storageFlushTimer.current = null
    }
    const raw = latestStoragePayload.current
    if (raw == null) return
    latestStoragePayload.current = null
    lastStorageFlushAt.current = Date.now()
    const data = sanitizePreviewStorageData(raw)
    gameStorageRef.current = data
    const id = projectIdRef.current
    if (id) void writeGameStorage(id, data)
  }, [])

  const scheduleStorageFlush = useCallback(() => {
    if (storageFlushTimer.current) return // trailing já agendado — coalesce
    const sinceLast = Date.now() - lastStorageFlushAt.current
    if (sinceLast >= STORAGE_FLUSH_MS) {
      processStorageNow() // borda de subida: persiste já a 1ª escrita ociosa
    } else {
      storageFlushTimer.current = setTimeout(processStorageNow, STORAGE_FLUSH_MS - sinceLast)
    }
  }, [processStorageNow])

  useEffect(() => {
    if (!projectId) {
      autoStartedProjectId.current = null
    }
  }, [projectId])

  // Hidrata o mirror ao abrir/trocar de projeto; ao sair, descarrega o payload
  // pendente do projeto que estava aberto (não some com a última jogada).
  useEffect(() => {
    let cancelled = false
    gameStorageRef.current = {}
    setStorageReady(false)
    if (projectId) {
      void loadGameStorage(projectId).then((data) => {
        if (cancelled) return
        gameStorageRef.current = data
        setStorageReady(true)
      })
    } else {
      setStorageReady(true)
    }
    const previousProjectId = projectId
    return () => {
      cancelled = true
      // Persiste o pendente NO PROJETO QUE ESTAVA ABERTO. projectIdRef já aponta
      // para o NOVO projeto após a troca, então usamos previousProjectId explícito
      // (processStorageNow gravaria no projeto errado aqui).
      if (storageFlushTimer.current) {
        clearTimeout(storageFlushTimer.current)
        storageFlushTimer.current = null
      }
      const raw = latestStoragePayload.current
      latestStoragePayload.current = null
      if (raw != null && previousProjectId) {
        void writeGameStorage(previousProjectId, sanitizePreviewStorageData(raw))
      }
    }
  }, [projectId])

  /**
   * O jogo da vez parou de dar sinal de vida: o aviso de travado já apareceu, ou os batimentos
   * (um por segundo) faltam há mais de `UNRESPONSIVE_AFTER_MS`. Com a aba escondida o navegador
   * segura os batimentos, e a falta deles não quer dizer nada.
   */
  const previewIsUnresponsive = () => {
    if (!previewRunning || loadedSrcDoc === null || loadedSrcDoc === PAUSED_PREVIEW_DOC)
      return false
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false
    return previewStalled || Date.now() - lastHeartbeatRef.current > UNRESPONSIVE_AFTER_MS
  }

  const markCurrentProjectStarted = () => {
    if (projectId) autoStartedProjectId.current = projectId
  }

  const rerenderPreview = () => {
    // Rodar de novo com o jogo preso: sem iframe novo, o documento novo esperaria o travamento.
    if (previewIsUnresponsive()) swapFrame(true)
    setRenderNonce((n) => n + 1)
  }

  const handleTogglePreviewRunning = () => {
    if (execution.editingAccess === 'observer') return
    if (previewRunning) {
      preparation.cancel()
      setPreviewRunning(false)
      return
    }
    handleRefresh()
  }

  const handleRefresh = () => {
    if (execution.editingAccess === 'observer') return
    void preparation.run(() => {
      processStorageNow()
      markCurrentProjectStarted()
      setSourceVersion((version) => version + 1)
      setPreviewRunning(true)
      focusOnLoadRef.current = true
      rerenderPreview()
    })
  }

  useEffect(() => {
    setPreparationError(null)
    return () => preparation.cancel()
  }, [preparation])

  const installedIds = uniqueExtensionIds(
    installedExtensions.map((extension) => extension.id),
  ).join(',')

  const sourceIdentity = `${projectId}:${sourceVersion}`
  const debouncedHtml = useDebounced(html, 800, sourceIdentity)
  const debouncedCss = useDebounced(css, 800, sourceIdentity)
  const debouncedJs = useDebounced(js, 800, sourceIdentity)
  const debouncedIds = useDebounced(installedIds, 800, sourceIdentity)
  const debouncedExtraFiles = useDebounced(extraFiles, 800, sourceIdentity)

  const [runtimeAttempt, setRuntimeAttempt] = useState(0)
  const [extensionRuntimeState, setExtensionRuntimeState] = useState<{
    key: string
    status: 'loading' | 'ready' | 'error'
    scripts: string[]
  }>({ key: '', status: 'ready', scripts: [] })

  const extensionContext = useMemo(
    () => resolveJavaScriptClassicExtensions(debouncedIds ? debouncedIds.split(',') : []),
    [debouncedIds],
  )

  // O código do aluno decide a VARIANTE de cada runtime (o Jogo 3D sem o Kit Plataforma, por
  // exemplo). O mesmo contexto da capa e do export; os runtimes só recarregam quando a variante
  // muda (`runtimeKey`), não a cada tecla. O efeito lê o contexto pelo ref: ele muda a cada
  // edição, e a variante que ele produz já está na chave.
  const bootstrapContext = useMemo(
    () =>
      extensionBootstrapContext({
        html: debouncedHtml,
        js: debouncedJs,
        extraFiles: debouncedExtraFiles,
      }),
    [debouncedHtml, debouncedJs, debouncedExtraFiles],
  )
  const bootstrapContextRef = useRef(bootstrapContext)
  bootstrapContextRef.current = bootstrapContext
  const runtimeKey = useMemo(
    () =>
      `${debouncedIds}|${extensionBootstrapVariantsKey(extensionContext.extensions, bootstrapContext)}`,
    [debouncedIds, extensionContext, bootstrapContext],
  )

  useEffect(() => {
    void runtimeAttempt
    const { extensions } = extensionContext
    if (extensions.length === 0) {
      setExtensionRuntimeState({ key: runtimeKey, status: 'ready', scripts: [] })
      return
    }
    let active = true
    setExtensionRuntimeState({ key: runtimeKey, status: 'loading', scripts: [] })
    void loadExtensionBootstrapScripts(extensions, bootstrapContextRef.current).then(
      (scripts) => {
        if (active) setExtensionRuntimeState({ key: runtimeKey, status: 'ready', scripts })
      },
      () => {
        if (active) setExtensionRuntimeState({ key: runtimeKey, status: 'error', scripts: [] })
      },
    )
    return () => {
      active = false
    }
  }, [runtimeKey, runtimeAttempt, extensionContext])

  // ⚠️ A escolha sai do JS JÁ DEBOUNCED, não da IR: varrer a árvore do Reino Zero
  // (32 grades) a cada tecla seria caro, e o script gerado é a mesma verdade — o
  // resolvedor tem justamente esse caminho de leitura.
  const gameUiFontId = resolveGameUiFontId({ files: { 'script.js': debouncedJs } })
  const [gameUiFontState, setGameUiFontState] = useState<{
    key: string
    bundle: { id: string; family: string; css: string } | null
  }>({ key: '', bundle: null })

  useEffect(() => {
    if (!debouncedIds) {
      setGameUiFontState({ key: `${debouncedIds}|${gameUiFontId}`, bundle: null })
      return
    }
    let active = true
    void loadGameUiFont(gameUiFontId).then((bundle) => {
      if (active) setGameUiFontState({ key: `${debouncedIds}|${gameUiFontId}`, bundle })
    })
    return () => {
      active = false
    }
  }, [debouncedIds, gameUiFontId])

  const gameUiFontReady = gameUiFontState.key === `${debouncedIds}|${gameUiFontId}`

  const extensionRuntimesReady =
    extensionRuntimeState.key === runtimeKey && extensionRuntimeState.status === 'ready'
  const extensionRuntimesLoading =
    extensionRuntimeState.key === runtimeKey && extensionRuntimeState.status === 'loading'
  const extensionScripts = extensionRuntimesReady ? extensionRuntimeState.scripts : []

  const { extensionImports, installedPermissions } = extensionContext

  // Manifesto de assets (nome → dataUrl) semeado no preview. Recomputa só quando a
  // lista de assets muda (add/remover/renomear) — não a cada tecla. Não entra no
  // orçamento de render: assets são dados PASSIVOS (decode de imagem), não custo de
  // CPU do código do aluno, então não devem disparar o "preview pausado".
  const assetsManifest = useMemo(() => assetManifest(assets), [assets])
  // Metadados de preview (mapa de tiles do Pinta/fatiador) — mesmo ciclo de vida
  // do manifesto; ENTRA nas deps do doc: reenviar um mapa alterado tem que
  // atualizar o preview sem reload manual.
  const assetsMeta = useMemo(
    () => assetMetaManifest(assets, bootstrapContext),
    [assets, bootstrapContext],
  )
  // Manifesto de sons (nome → dataUrl de áudio) — mesmo ciclo de vida do de imagem.
  const soundsManifest = useMemo(() => soundManifest(assets), [assets])
  // Binários 3D (modelo GLB / céu HDR) — canal próprio (o de imagem os filtraria).
  // Uma falha de modelo não pode virar uma cena vazia apresentada como jogo pronto.
  const courseModelRequest = useMemo(
    () => ({ assets, code: debouncedJs, attempt: renderNonce }),
    [assets, debouncedJs, renderNonce],
  )
  const [courseModelState, setCourseModelState] = useState<{
    request: typeof courseModelRequest
    manifest: ReturnType<typeof asset3DManifest> | null
    error: string | null
  } | null>(null)
  useEffect(() => {
    let active = true
    void preloadCourseModels(courseModelRequest.assets, courseModelRequest.code).then(
      () => {
        if (active)
          setCourseModelState({
            request: courseModelRequest,
            manifest: asset3DManifest(courseModelRequest.assets),
            error: null,
          })
      },
      (error: unknown) => {
        if (active)
          setCourseModelState({
            request: courseModelRequest,
            manifest: null,
            error:
              error instanceof Error
                ? error.message
                : 'Não consegui carregar os modelos do jogo. Tente de novo.',
          })
      },
    )
    return () => {
      active = false
    }
  }, [courseModelRequest])
  const courseModelsReady =
    courseModelState?.request === courseModelRequest && courseModelState.manifest !== null
  const courseModelError =
    courseModelState?.request === courseModelRequest ? courseModelState.error : null
  const models3dManifest = courseModelsReady ? courseModelState!.manifest! : undefined

  const previewBudgetInput = useMemo(
    () => ({
      html: debouncedHtml,
      css: debouncedCss,
      js: debouncedJs,
      extensionScripts,
      gameUiFont: gameUiFontState.bundle ?? undefined,
      extraFiles: debouncedExtraFiles,
    }),
    [
      debouncedHtml,
      debouncedCss,
      debouncedJs,
      extensionScripts,
      gameUiFontState.bundle,
      debouncedExtraFiles,
    ],
  )
  const previewInputChars = useMemo(
    () => estimatePreviewInputChars(previewBudgetInput),
    [previewBudgetInput],
  )
  const previewPaused =
    shouldPausePreviewRender(previewBudgetInput) &&
    renderLargePreviewForInput !== previewBudgetInput
  const currentProjectHasRun =
    projectId !== null && autoStartedProjectId.current === projectId && renderNonce > 0

  useEffect(() => {
    if (!projectId || !previewRunning || previewPaused) return
    if (!execution.autoRun || execution.editingAccess === 'observer') return
    if (autoStartedProjectId.current === projectId) return
    if (loadedSrcDoc !== PAUSED_PREVIEW_DOC) return
    autoStartedProjectId.current = projectId
    // A última execução deste projeto nunca deu sinal de vida (a aba congelou ou caiu com o
    // jogo rodando): desta vez a prévia espera o Rodar em vez de rodar sozinha.
    if (wasRunInterrupted(projectId)) {
      disarmRunTripwire(projectId)
      setPreviewRunning(false)
      return
    }
    setRenderNonce((n) => n + 1)
  }, [
    projectId,
    previewRunning,
    previewPaused,
    loadedSrcDoc,
    execution.autoRun,
    execution.editingAccess,
    setPreviewRunning,
  ])

  useEffect(() => {
    if (renderLargePreviewForInput && renderLargePreviewForInput !== previewBudgetInput) {
      setRenderLargePreviewForInput(null)
    }
  }, [previewBudgetInput, renderLargePreviewForInput])

  // ⭐ Foto do card tirada do preview que JÁ está rodando (ver `snapshotBridge`).
  //
  // Substitui o print da SAÍDA, que abria um iframe novo e dependia de o
  // navegador continuar entregando quadros justamente quando a criança está
  // saindo — ele não entrega, e o resultado era "não é toda vez que tira, e
  // quando sai é só o fundo". Aqui o jogo está desenhando na tela, na aba ativa.
  //
  // ⚠️ Custo mantido baixo de propósito: o pedido só sai com o preview RODANDO e
  // a aba VISÍVEL, no máximo um a cada `SNAPSHOT_INTERVAL_MS`, e o bridge devolve
  // a imagem já reduzida ao tamanho do card (JPEG ~15 KB). Aba escondida não
  // recebe quadros, então pedir ali só renderia uma foto velha.
  useEffect(() => {
    if (!projectId || !previewRunning || previewPaused || hasChosenCover) return
    const pedir = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      iframeRef.current?.contentWindow?.postMessage(
        { type: PREVIEW_SNAPSHOT_REQUEST },
        // Origem opaca do sandbox: não há origem específica para mirar. O bridge
        // do outro lado confere que o remetente é o próprio parent.
        '*',
      )
    }
    // A primeira espera o jogo desenhar; as seguintes mantêm a capa fresca.
    const primeira = setTimeout(pedir, SNAPSHOT_FIRST_DELAY_MS)
    const timer = setInterval(pedir, SNAPSHOT_INTERVAL_MS)
    return () => {
      clearTimeout(primeira)
      clearInterval(timer)
    }
    // ⚠️ `loadedSrcDoc` fica FORA das dependências de propósito. O preview
    // recarrega a cada edição (debounce), e reiniciar o ciclo a cada recarga
    // dispararia uma foto poucos segundos depois de CADA mudança — exatamente o
    // custo que este desenho evita. O ritmo é o do intervalo, e o bridge do doc
    // novo responde ao próximo pedido normalmente.
  }, [projectId, previewRunning, previewPaused, hasChosenCover])

  const candidateDoc = useMemo(() => {
    if (execution.editingAccess === 'observer') return PAUSED_PREVIEW_DOC
    // Parar (Play desligado): esvazia o iframe → mata setInterval/timers em execução.
    if (!previewRunning) return PAUSED_PREVIEW_DOC
    if (previewPaused) return PAUSED_PREVIEW_DOC
    if (!currentProjectHasRun) return PAUSED_PREVIEW_DOC
    if (!extensionRuntimesReady) return PAUSED_PREVIEW_DOC
    if (!gameUiFontReady) return PAUSED_PREVIEW_DOC
    if (!courseModelsReady) return PAUSED_PREVIEW_DOC
    // Aguarda hidratar o estado salvo antes do 1º build (ver storageReady acima).
    if (projectId && !storageReady) return PAUSED_PREVIEW_DOC
    const base = buildJavaScriptClassicDocument({
      html: debouncedHtml,
      css: debouncedCss,
      js: debouncedJs,
      resources: {
        extensionScripts,
        extensionImports,
        installedPermissions,
        gameUiFont: gameUiFontState.bundle ?? undefined,
      },
      extraFiles: debouncedExtraFiles,
      parentOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
      fetchAllowedOrigins: previewSecurity.fetchAllowedOrigins,
      loopBudgetMs: previewSecurity.loopBudgetMs,
      // Semeia o estado salvo (lido do ref: deliberadamente FORA das deps do memo
      // — uma escrita não deve reconstruir o doc e recarregar o preview).
      localStorageSnapshot: gameStorageRef.current,
      storageProjectId: projectId ?? undefined,
      // Manifesto de assets: ESTE entra nas deps (adicionar/remover imagem deve
      // reconstruir o doc para o sprite aparecer/sumir no preview).
      assets: assetsManifest,
      assetsMeta,
      sounds: soundsManifest,
      models3d: models3dManifest,
    })
    // O botão "Atualizar" muda `renderNonce`. Embutimos o nonce no próprio documento
    // para que o `srcDoc` mude e o iframe recarregue (re-executando o código) mesmo
    // quando o conteúdo é idêntico. Fazemos isso em vez de remontar o iframe via
    // `key`, porque remontar um iframe `srcDoc` corre com o load do navegador e
    // deixava o preview branco de forma intermitente.
    return `${base}\n<!-- r:${renderNonce} -->`
  }, [
    previewRunning,
    previewPaused,
    currentProjectHasRun,
    extensionRuntimesReady,
    gameUiFontReady,
    courseModelsReady,
    gameUiFontState.bundle,
    projectId,
    storageReady,
    debouncedHtml,
    debouncedCss,
    debouncedJs,
    extensionScripts,
    debouncedExtraFiles,
    installedPermissions,
    extensionImports,
    assetsManifest,
    assetsMeta,
    soundsManifest,
    models3dManifest,
    previewSecurity,
    renderNonce,
    execution.editingAccess,
  ])

  // An automatic source debounce must not bypass an explicit run awaiting a save.
  // Retain the committed game during preparation; Stop still installs the blank doc.
  const committedDoc = useRef({ projectId, document: PAUSED_PREVIEW_DOC })
  const doc =
    previewRunning &&
    (preparingRun || preparationError !== null) &&
    committedDoc.current.projectId === projectId
      ? committedDoc.current.document
      : candidateDoc
  useLayoutEffect(() => {
    committedDoc.current = { projectId, document: doc }
  }, [doc, projectId])

  const [remoteDocument, setRemoteDocument] = useState<{
    document: string
    url: string | null
    error: string | null
  } | null>(null)
  const originAdapter = execution.originAdapter
  const projectForOrigin = useRef(fullProject)
  projectForOrigin.current = fullProject
  useEffect(() => {
    if (!originAdapter || doc === PAUSED_PREVIEW_DOC || !projectForOrigin.current) return
    const project = projectForOrigin.current
    const controller = new AbortController()
    let active = true
    let publishedUrl: string | null = null
    const release = (url: string) => {
      void Promise.resolve(originAdapter.releasePreviewUrl?.(url)).catch(() => {})
    }
    const publishTimer = setTimeout(() => {
      void originAdapter
        .createPreviewUrl({
          project,
          document: doc,
          signal: controller.signal,
        })
        .then(
          (url) => {
            publishedUrl = url
            if (!active) {
              release(url)
              return
            }
            try {
              const validated = validateIsolatedPreviewUrl(url, window.location.origin)
              setRemoteDocument({ document: doc, url: validated, error: null })
            } catch (error) {
              release(url)
              publishedUrl = null
              setRemoteDocument({
                document: doc,
                url: null,
                error:
                  error instanceof Error ? error.message : 'Não foi possível abrir o jogo isolado.',
              })
            }
          },
          (error: unknown) => {
            if (active)
              setRemoteDocument({
                document: doc,
                url: null,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Não foi possível abrir o jogo isolado. Tente reproduzir novamente.',
              })
          },
        )
    }, 250)
    return () => {
      active = false
      clearTimeout(publishTimer)
      controller.abort()
      if (publishedUrl) release(publishedUrl)
    }
  }, [doc, originAdapter])
  const isolatedUrl = remoteDocument?.document === doc ? remoteDocument.url : null
  const requiresRemoteDocument = Boolean(originAdapter) || execution.requireIsolatedPreview
  const effectiveDoc = requiresRemoteDocument ? PAUSED_PREVIEW_DOC : doc
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'sz:audio', muted: execution.muted }, '*')
  }, [execution.muted])

  const docIsLive = doc !== PAUSED_PREVIEW_DOC

  // Documento novo que não entra: o `srcDoc` mudou e o iframe não deu `load` dele em
  // `SWAP_STUCK_AFTER_MS`. É o jogo anterior preso segurando o processo (por exemplo: a criança
  // conserta o código logo depois de rodar o que trava). Um iframe novo carrega na hora. Uma vez
  // por documento: num aparelho lento, um jogo grande que só demora a carregar não entra em laço.
  // Até `FRAME_GAPS_MS.length` tentativas por documento, cada uma com um intervalo sem iframe maior.
  const swapRescueRef = useRef<{ doc: string; count: number } | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `frameGeneration` e `frameAbsent` são gatilhos (iframe novo que também não entra pede outra tentativa)
  useEffect(() => {
    if (isolatedUrl || frameAbsent || loadedSrcDoc === null || loadedSrcDoc === effectiveDoc) return
    const rescued = swapRescueRef.current?.doc === effectiveDoc ? swapRescueRef.current.count : 0
    if (rescued >= FRAME_GAPS_MS.length) return
    const timer = setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      swapRescueRef.current = { doc: effectiveDoc, count: rescued + 1 }
      swapFrame(true)
    }, SWAP_STUCK_AFTER_MS)
    return () => clearTimeout(timer)
  }, [effectiveDoc, loadedSrcDoc, isolatedUrl, frameGeneration, frameAbsent, swapFrame])

  // PARAR troca o iframe por um novo (ver `frameGeneration`): é o que tira da frente um jogo
  // preso, por qualquer caminho que o Parar tenha vindo (a barra, o cartão de travado, o host).
  // ⚠️ Este efeito precisa ficar ANTES do que zera o relógio dos batimentos (logo abaixo): é o
  // relógio do jogo que acabou de parar que diz se ele estava preso.
  // biome-ignore lint/correctness/useExhaustiveDependencies: só a virada de `previewRunning` dispara; o resto é lido na hora
  useEffect(() => {
    if (wasRunningRef.current && !previewRunning) {
      const visible = typeof document === 'undefined' || document.visibilityState === 'visible'
      const stuck =
        visible &&
        loadedSrcDoc !== null &&
        loadedSrcDoc !== PAUSED_PREVIEW_DOC &&
        (previewStalled || Date.now() - lastHeartbeatRef.current > UNRESPONSIVE_AFTER_MS)
      swapFrame(stuck)
    }
    wasRunningRef.current = previewRunning
  }, [previewRunning])

  // Reseta o relógio do heartbeat sempre que o documento muda (novo render):
  // dá ao iframe a janela completa antes de considerar travado. `doc` é o
  // GATILHO (não lido no corpo), por isso fica na lista de propósito.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `doc` é o gatilho do reset, não uma dependência lida
  useEffect(() => {
    lastHeartbeatRef.current = Date.now()
    setPreviewStalled(false)
  }, [doc])

  // A marca de execução (ver `runTripwire.ts`): posta quando um jogo começa a rodar, tirada
  // quando ele dá sinal de vida, quando para e quando o editor fecha direito.
  const tripwireRef = useRef<{ projectId: string; heartbeats: number } | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: `doc` é o gatilho (cada documento novo recomeça a contagem)
  useEffect(() => {
    // Só o jogo RODANDO põe a marca. Parado (inclusive na abertura), nada mexe nela: é a marca
    // deixada por uma aba que congelou que a abertura seguinte precisa encontrar.
    if (!projectId || !docIsLive) return
    armRunTripwire(projectId)
    tripwireRef.current = { projectId, heartbeats: 0 }
    // Recarregar ou sair com a página VIVA também tira a marca (a desmontagem do React não roda
    // nessa hora). Numa aba congelada este aviso nunca chega a rodar, e a marca fica.
    const leaving = () => disarmRunTripwire(projectId)
    window.addEventListener('pagehide', leaving)
    return () => {
      window.removeEventListener('pagehide', leaving)
      disarmRunTripwire(projectId)
      tripwireRef.current = null
    }
  }, [doc, docIsLive, projectId])

  // Loop do watchdog: marca travado se nenhum heartbeat chegar dentro do timeout.
  //
  // ⚠️ Medido em 17/11/2026 (`scripts/measure-preview-isolation.mjs`): no Chromium de mesa o
  // iframe srcdoc com sandbox JÁ roda em outro processo, e o host não trava com ele. O texto
  // abaixo segue valendo para os navegadores ainda não medidos (Firefox, Safari, Android), e o
  // que o Parar faz com o jogo preso está em `frameGeneration`.
  // LIMITAÇÃO CONHECIDA do sandbox de MESMA THREAD: o iframe srcdoc
  // null-origin compartilha a thread principal do host. O loopGuard (Camada A)
  // corta laços síncronos instrumentados, mas trabalho síncrono NÃO-laço — p.ex.
  // `Array.from({ length: 1e10 })`, um `JSON.parse` gigante, ReDoS ou recursão
  // profunda — congela a thread compartilhada. Este watchdog só consegue
  // DETECTAR o congelamento (pela ausência de heartbeats), não INTERROMPÊ-LO: o
  // próprio `setPreviewRunning` fica enfileirado na thread travada e só roda
  // quando ela destrava. O remédio definitivo é mover o preview para
  // CROSS-ORIGIN/CROSS-PROCESS (iframe servido de outra origem isolada, com
  // process/site isolation do navegador dando uma thread própria que pode ser
  // morta) — fora do escopo desta camada. Ver docs/embedding.md.
  useEffect(() => {
    if (!docIsLive) return
    const id = setInterval(() => {
      // Aba em segundo plano: o navegador ESTRANGULA o setInterval do heartbeat
      // (e este também), então a ausência de heartbeats é esperada e NÃO indica
      // travamento — só consideramos travado com a aba visível, evitando o falso
      // positivo de "preview travado" ao voltar para uma aba que ficou de lado.
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (Date.now() - lastHeartbeatRef.current > previewSecurity.heartbeatTimeoutMs) {
        setPreviewStalled(true)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [docIsLive, previewSecurity.heartbeatTimeoutMs])

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      // Autenticação da mensagem: `ev.source === contentWindow` é a verificação
      // pretendida e SUFICIENTE — a identidade do `source` (referência ao Window
      // do nosso próprio iframe) é estritamente mais forte que `ev.origin`.
      // O iframe é sandbox SEM `allow-same-origin`, então sua origem é "null" e
      // ele não pode forjar essa referência. `allow-same-origin` NUNCA pode ser
      // adicionado ao sandbox (daria ao iframe a nossa origem). A checagem de
      // origem abaixo é só defesa em profundidade — "null" do sandbox, ou a
      // própria origem caso o navegador a reporte.
      const source = iframeRef.current?.contentWindow
      if (!source || ev.source !== source) return
      if (ev.origin !== 'null' && ev.origin !== window.location.origin) return
      // Cap de taxa: depois da autenticação barata (referência + origem) e ANTES
      // da validação/structured-clone caras. Conta mensagens por janela de 1s e
      // descarta o excedente — uma rajada (Worker/microtask) não derruba o host.
      const nowTs = Date.now()
      if (nowTs - messageWindowStartRef.current >= MESSAGE_RATE_WINDOW_MS) {
        messageWindowStartRef.current = nowTs
        messageWindowCountRef.current = 0
      }
      messageWindowCountRef.current += 1
      if (messageWindowCountRef.current > MESSAGE_RATE_MAX_PER_WINDOW) return
      // Escrita no armazenamento persistente do programa do aluno (guardar/ler).
      if (isPreviewStorageWriteMessage(ev.data)) {
        // Descarta escrita de um doc de OUTRO projeto: na janela de troca de
        // projeto, o programa ANTIGO (iframe ainda vivo) não pode gravar no
        // projeto NOVO. O carimbo projectId vem do doc que produziu a mensagem.
        if (ev.data.projectId !== projectIdRef.current) return
        // Guarda só o último payload; o throttle sanitiza/persiste (ver acima).
        latestStoragePayload.current = ev.data.data
        scheduleStorageFlush()
        return
      }
      if (isPreviewSnapshotMessage(ev.data)) {
        // Mesma cerca do storageWrite: o iframe ANTIGO não pode carimbar foto no
        // projeto NOVO durante a troca.
        if (ev.data.projectId !== projectIdRef.current) return
        const id = projectIdRef.current
        if (id && typeof ev.data.dataUrl === 'string') {
          rememberProjectSnapshot(id, ev.data.dataUrl)
        }
        return
      }
      if (!isPreviewMessage(ev.data)) return
      // Heartbeat NÃO é log: alimenta o watchdog e não vai para o console.
      if (ev.data.kind === 'heartbeat') {
        lastHeartbeatRef.current = Date.now()
        setPreviewStalled((stalled) => (stalled ? false : stalled))
        const tripwire = tripwireRef.current
        if (tripwire && ++tripwire.heartbeats === HEARTBEATS_TO_TRUST)
          disarmRunTripwire(tripwire.projectId)
        return
      }
      pushLog(ev.data)
      if (
        (ev.data.kind === 'runtimeError' || ev.data.kind === 'unhandledRejection') &&
        // O iframe guarda a mesma janela entre um `srcDoc` e outro: o erro que o documento
        // ANTERIOR mandou (num laço de jogo, um por quadro) ainda chega depois da troca e
        // marcaria o jogo novo com a linha velha. Só conta o que nasceu depois da troca.
        ev.data.timestamp >= docStartedAtRef.current
      ) {
        const text = ev.data.parts.join(' ').slice(0, 2_000)
        const at = previewErrorLocation(ev.data)
        // O PRIMEIRO erro manda: num laço de jogo o mesmo erro repete a cada quadro.
        setGameError((current) => current ?? { text, line: at?.line, column: at?.column })
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [pushLog, scheduleStorageFlush])

  // Descarrega o estado salvo pendente quando a aba/IDE fecha — a última jogada
  // antes de um F5 não pode se perder na janela do throttle. (O unmount/troca de
  // projeto é coberto pela limpeza do efeito de hidratação acima.)
  useEffect(() => {
    const flush = () => processStorageNow()
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [processStorageNow])

  // Rodar / Parar / Atualizar moram FORA da prévia desde o redesenho do clássico (11/2026): na
  // barra de cima (`ProRunControls`) e no cabeçalho do palco (`ClassicStage`). A prévia publica
  // a fase e as ações no `proRun` da instância, como as prévias do Pro. As ações leem os
  // handlers do render mais recente pelo ref (eles fecham sobre o estado do momento).
  const proRun = useProRunApi()
  const observer = execution.editingAccess === 'observer'
  const handlersRef = useRef({ toggle: handleTogglePreviewRunning, refresh: handleRefresh })
  handlersRef.current = { toggle: handleTogglePreviewRunning, refresh: handleRefresh }
  const runningRef = useRef(previewRunning)
  runningRef.current = previewRunning
  const runActions = useMemo<ProRunActions>(
    () => ({
      run: () =>
        runningRef.current ? handlersRef.current.refresh() : handlersRef.current.toggle(),
      stop: () => {
        preparation.cancel()
        setPreparationError(null)
        if (runningRef.current) handlersRef.current.toggle()
      },
      reload: () => handlersRef.current.refresh(),
    }),
    [preparation],
  )
  const extensionRuntimeFailed =
    extensionRuntimeState.key === runtimeKey && extensionRuntimeState.status === 'error'
  const gameErrorHint = gameError ? (glossErrorMessage(gameError.text) ?? undefined) : undefined
  const runState = useMemo<ProRunState>(() => {
    if (preparingRun)
      return {
        phase: 'preparing',
        canRun: false,
        canStop: !observer,
        detail: 'Guardando o projeto…',
      }
    if (preparationError)
      return { phase: 'error', canRun: !observer, canStop: !observer, error: preparationError }
    if (!previewRunning) return { phase: 'idle', canRun: !observer, canStop: false }
    if (extensionRuntimeFailed || courseModelError)
      return {
        phase: 'error',
        canRun: !observer,
        canStop: !observer,
        error: courseModelError ?? undefined,
      }
    if (gameError)
      return {
        phase: 'error',
        canRun: !observer,
        canStop: !observer,
        error: gameError.text,
        errorKind: 'runtime',
        errorHint: gameErrorHint,
        errorAt:
          gameError.line !== undefined
            ? { file: 'script.js', line: gameError.line, column: gameError.column }
            : undefined,
      }
    if (extensionRuntimesLoading || !courseModelsReady)
      return { phase: 'preparing', step: { index: 1, total: 1 }, canRun: false, canStop: !observer }
    return { phase: 'running', canRun: !observer, canStop: !observer }
  }, [
    preparingRun,
    preparationError,
    previewRunning,
    observer,
    extensionRuntimeFailed,
    courseModelError,
    extensionRuntimesLoading,
    courseModelsReady,
    gameError,
    gameErrorHint,
  ])
  useEffect(() => {
    proRun.getState().publish(runState, runActions)
  }, [proRun, runState, runActions])
  useEffect(() => () => proRun.getState().publish(null, null), [proRun])

  // Um documento novo é um jogo novo: o erro do anterior (e o sinal no bloco) sai. `doc` carrega
  // o nonce do render, então Rodar, Rodar de novo e cada edição contam.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `doc` é só o GATILHO
  useLayoutEffect(() => {
    // Na mesma passada em que o `srcdoc` novo entra no DOM, antes de o documento novo rodar.
    docStartedAtRef.current = Date.now()
  }, [doc])
  // biome-ignore lint/correctness/useExhaustiveDependencies: `doc` é só o GATILHO
  useEffect(() => {
    setGameError(null)
  }, [doc])
  // O sinal vermelho no bloco que parou: o editor de blocos acha o bloco pela linha.
  const t = useT()
  const highlight = useHighlightStoreApi()
  useEffect(() => {
    if (!gameError || gameError.line === undefined) {
      if (highlight.getState().runtimeMark?.file === 'script.js')
        highlight.getState().setRuntimeMark(null)
      return
    }
    highlight.getState().setRuntimeMark({
      file: 'script.js',
      line: gameError.line,
      column: gameError.column ?? null,
      message: [t('stage.errorMark'), gameErrorHint].filter(Boolean).join(' '),
    })
  }, [gameError, gameErrorHint, highlight, t])
  useEffect(() => () => highlight.getState().setRuntimeMark(null), [highlight])

  return (
    <div className="relative flex h-full flex-col bg-sz-bg">
      {frameAbsent ? (
        <div className="h-full w-full flex-1 bg-white" data-sz-preview-gap="" />
      ) : (
        <iframe
          key={frameGeneration}
          ref={iframeRef}
          title="Pré-visualização"
          src={isolatedUrl ?? undefined}
          srcDoc={isolatedUrl ? undefined : effectiveDoc}
          onLoad={() => {
            setLoadedSrcDoc(iframeRef.current?.getAttribute('srcdoc') ?? null)
            frameGapStepRef.current = 0
            lastHeartbeatRef.current = Date.now()
            setPreviewStalled(false)
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'sz:audio', muted: execution.muted },
              '*',
            )
            // Foca o jogo após um Play/Atualizar explícito, para que as setas do
            // teclado cheguem ao iframe sem o aluno precisar clicar no canvas. Só
            // após ação explícita (a flag não é setada em reload por edição).
            if (focusOnLoadRef.current) {
              focusOnLoadRef.current = false
              iframeRef.current?.focus()
            }
          }}
          // `allow-pointer-lock` permite que a câmera FPS capture o mouse após um clique.
          // Mantemos o iframe sem `allow-same-origin` para preservar o isolamento do preview.
          sandbox="allow-scripts allow-modals allow-pointer-lock"
          // Libera a Fullscreen API DENTRO do iframe (blocos de "tela cheia"). Sem
          // isso requestFullscreen() é rejeitado silenciosamente. Não afeta o sandbox.
          // Só `allow` (o `allowFullScreen` booleano é redundante e gera warning no console).
          allow="fullscreen"
          className="h-full w-full flex-1 bg-white"
        />
      )}
      {doc !== PAUSED_PREVIEW_DOC && requiresRemoteDocument && !isolatedUrl && (
        <p role="status" className="absolute inset-x-0 bottom-0 bg-sz-panel p-3 text-sm text-sz-fg">
          {!originAdapter
            ? 'O ambiente de execução desta sala ainda não está configurado.'
            : remoteDocument?.document === doc && remoteDocument.error
              ? remoteDocument.error
              : 'Preparando o jogo no ambiente isolado…'}
        </p>
      )}
      {previewRunning && !courseModelsReady && extensionRuntimesReady && (
        <div
          role={courseModelError ? 'alert' : 'status'}
          className="absolute inset-0 flex items-center justify-center bg-sz-panel/95 p-6 text-center"
        >
          <div className="max-w-sm rounded-md border border-sz-border bg-sz-bg p-4 shadow-lg">
            <p className="text-sm font-semibold text-sz-fg">
              {courseModelError
                ? 'Os modelos do jogo não carregaram'
                : 'Carregando os modelos do jogo…'}
            </p>
            {courseModelError && (
              <>
                <p className="mt-2 text-xs text-sz-fg-soft">{courseModelError}</p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="primary"
                  onClick={() => setRenderNonce((n) => n + 1)}
                >
                  Tentar de novo
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {previewRunning && extensionRuntimesLoading && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 flex items-center justify-center bg-sz-panel/95 p-6 text-center"
        >
          <div className="max-w-sm rounded-md border border-sz-border bg-sz-bg p-4 shadow-lg">
            <p className="text-sm font-semibold text-sz-fg">Carregando o motor do jogo…</p>
            <p className="mt-2 text-xs text-sz-fg-soft">
              O preview começa assim que a extensão estiver pronta.
            </p>
          </div>
        </div>
      )}
      {extensionRuntimeState.key === runtimeKey && extensionRuntimeState.status === 'error' && (
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-sz-panel/95 p-6 text-center"
        >
          <div className="max-w-sm rounded-md border border-sz-border bg-sz-bg p-4 shadow-lg">
            <p className="text-sm font-semibold text-sz-fg">
              Não consegui carregar o motor do jogo
            </p>
            <p className="mt-2 text-xs text-sz-fg-soft">
              O projeto ficou parado para não executar sem a extensão instalada.
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="primary"
              onClick={() => setRuntimeAttempt((attempt) => attempt + 1)}
            >
              Tentar de novo
            </Button>
          </div>
        </div>
      )}
      {touchInput && usesKeyboardControls && previewRunning && !previewPaused && (
        <VirtualGamepad onInput={sendVirtualGamepadInput} />
      )}
      {previewPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-sz-panel/95 p-6 text-center">
          <div className="max-w-sm rounded-md border border-sz-border bg-sz-bg p-4 shadow-lg">
            <p className="text-sm font-semibold text-sz-fg">Preview pausado</p>
            <p className="mt-2 text-xs text-sz-fg-soft">
              O projeto tem {formatPreviewSize(previewInputChars)} de conteúdo renderizável. A
              atualização automática pausa acima de{' '}
              {formatPreviewSize(PREVIEW_RENDER_INPUT_LIMIT_CHARS)}
              para manter a IDE responsiva.
            </p>
            <Button
              className="mt-3"
              size="sm"
              variant="primary"
              onClick={() => setRenderLargePreviewForInput(previewBudgetInput)}
            >
              Renderizar uma vez
            </Button>
          </div>
        </div>
      )}
      {previewStalled && !previewPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-sz-panel/95 p-6 text-center">
          <div className="max-w-sm rounded-md border border-sz-border bg-sz-bg p-4 shadow-lg">
            <p className="text-sm font-semibold text-sz-fg">O preview parece travado</p>
            <p className="mt-2 text-xs text-sz-fg-soft">
              O código pode estar preso em um cálculo muito longo. Você pode parar a execução ou
              continuar esperando se for algo demorado de propósito.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button size="sm" variant="primary" onClick={() => setPreviewRunning(false)}>
                Parar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  lastHeartbeatRef.current = Date.now()
                  setPreviewStalled(false)
                }}
              >
                Continuar esperando
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const PAUSED_PREVIEW_DOC = '<!doctype html><html lang="pt-BR"><body></body></html>'

// Intervalo do throttle de persistência do estado salvo (guardar/ler).
const STORAGE_FLUSH_MS = 500

/** Sem batimento (um por segundo) há mais que isto, o jogo da vez é tratado como preso. */
const UNRESPONSIVE_AFTER_MS = 2500
/** Um documento novo que não carregou neste tempo está esperando um jogo preso. */
const SWAP_STUCK_AFTER_MS = 3000
/** Intervalos sem iframe na troca de um jogo preso; cada nova tentativa espera mais. */
const FRAME_GAPS_MS = [200, 1200, 3500] as const

// Cap de taxa de mensagens vindas do iframe (anti-flood). Janela de 1s e teto
// generoso: heartbeat (1/s) + escritas de jogo em laço cabem; só corta abuso.
const MESSAGE_RATE_WINDOW_MS = 1000
const MESSAGE_RATE_MAX_PER_WINDOW = 240

function formatPreviewSize(chars: number): string {
  if (chars >= 1_000_000) return `${(chars / 1_000_000).toFixed(1)} M caracteres`
  return `${Math.ceil(chars / 1_000)} mil caracteres`
}

// Casa o PRIMEIRO `<title>` (qualquer atributo, qualquer caixa, conteúdo em
// múltiplas linhas) — espelha o que `document.querySelector('title')` pegaria
// (primeiro em ordem de documento). `<title>` é elemento de TEXTO BRUTO no HTML:
// entidades são decodificadas, mas tags internas ficam literais — exatamente o
// que `textContent` devolveria.
// `<title>` ou `<title ...atributos>` (exige limite de tag real após o nome —
// não casa `<titlexyz>`, igual a `querySelector('title')`).
const TITLE_TAG_RE = /<title(?:\s[^>]*)?>([\s\S]*?)<\/title\s*>/i
// Pré-filtro barato e CASE-INSENSITIVE (`<TITLE>` é válido): só dispara o regex
// completo quando a abertura existe — evita rodar o casamento no HTML sem título.
const TITLE_OPEN_RE = /<title[\s>]/i

function decodeHtmlEntities(raw: string): string {
  // Sem entidades não há o que decodificar — evita até tocar no DOM.
  if (!raw.includes('&')) return raw
  if (typeof DOMParser === 'undefined') return raw
  // Decodifica via documento INERTE do DOMParser (sem browsing context): NÃO
  // executa script nem CARREGA subrecursos. Antes era `<textarea>.innerHTML = raw`
  // num nó VIVO do documento do EDITOR — um título forjado como
  // `</textarea><img src=x onerror=...>` quebrava o RCDATA do textarea e o <img>
  // disparava fetch/onerror na origem 1ª-parte do editor. Parsear só o fragmento
  // do título é barato e inerte (um <img> aqui não carrega nada).
  const doc = new DOMParser().parseFromString(`<title>${raw}</title>`, 'text/html')
  return doc.querySelector('title')?.textContent ?? raw
}

/**
 * Lê o conteúdo do `<title>` do HTML sem construir uma árvore de DOM completa.
 * Devolve o título com `trim`, ou `null` quando não há `<title>` (o chamador cai
 * no nome do projeto). Mesma saída de `querySelector('title')?.textContent?.trim()`,
 * porém sem o custo de parsear o documento inteiro só para uma tag. Exportada para
 * teste de paridade.
 */
export function extractDocumentTitle(html: string): string | null {
  // Pré-checagem barata: sem a abertura `<title` nem rodamos o regex completo
  // (caso comum de HTML sem `<title>`, onde o parser antigo montava o documento
  // todo à toa).
  if (!TITLE_OPEN_RE.test(html)) return null
  const match = TITLE_TAG_RE.exec(html)
  if (!match) return null
  const title = decodeHtmlEntities(match[1] ?? '').trim()
  return title ? title : null
}
