import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ExtraFile, InstalledExtension } from '#core'
import type { ExtensionPermission } from '#extensions'
import { findExtension } from '#official-extensions'
import {
  buildPreviewDoc,
  isPreviewMessage,
  isPreviewStorageWriteMessage,
  sanitizePreviewStorageData,
} from '#preview'
import { Button } from '#ui'
import { useDebounced } from '../../hooks/useDebounced'
import { loadGameStorage, writeGameStorage } from '../../state/gameStorage'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioLayout } from '../../studio/layoutContext'
import {
  estimatePreviewInputChars,
  PREVIEW_RENDER_INPUT_LIMIT_CHARS,
  type PreviewBudgetInput,
  shouldPausePreviewRender,
} from './previewBudget'

const EMPTY_EXTRA_FILES: ExtraFile[] = []
const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []

export function PreviewIframe(): JSX.Element {
  const { projectId, html, css, js, projectName, installedExtensions, extraFiles } =
    useProjectStore(
      useShallow((s) => ({
        projectId: s.project?.id ?? null,
        html: s.project?.files['index.html'] ?? '',
        css: s.project?.files['style.css'] ?? '',
        js: s.project?.files['script.js'] ?? '',
        projectName: s.project?.name ?? '',
        installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
        extraFiles: s.project?.extraFiles ?? EMPTY_EXTRA_FILES,
      })),
    )
  const pushLog = useLogsStore((s) => s.push)
  const previewSecurity = useStudioConfig().previewSecurity
  const previewRunning = useUIStore((s) => s.previewRunning)
  const setPreviewRunning = useUIStore((s) => s.setPreviewRunning)
  const { isNarrow } = useStudioLayout()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Watchdog de heartbeat (Camada B): se o thread do iframe travar num cálculo
  // síncrono, o interceptor para de emitir heartbeats e mostramos o aviso.
  const lastHeartbeatRef = useRef(0)
  const [previewStalled, setPreviewStalled] = useState(false)
  // Incrementado quando o preview precisa executar/reexecutar o documento atual
  // mesmo que o HTML/CSS/JS gerado seja idêntico.
  const [renderNonce, setRenderNonce] = useState(0)
  const autoStartedProjectId = useRef<string | null>(null)
  const [loadedSrcDoc, setLoadedSrcDoc] = useState<string | null>(null)
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

  const markCurrentProjectStarted = () => {
    if (projectId) autoStartedProjectId.current = projectId
  }

  const rerenderPreview = () => {
    setRenderNonce((n) => n + 1)
  }

  const handleTogglePreviewRunning = () => {
    if (previewRunning) {
      setPreviewRunning(false)
      return
    }
    // Garante que o mirror reflete a última escrita ANTES de reconstruir o doc.
    processStorageNow()
    markCurrentProjectStarted()
    setPreviewRunning(true)
    rerenderPreview()
  }

  const handleRefresh = () => {
    // Atualizar implica executar: se estava parado, religa o Play.
    // Descarrega a última escrita ao mirror antes de o doc ser reconstruído.
    processStorageNow()
    markCurrentProjectStarted()
    if (!previewRunning) setPreviewRunning(true)
    rerenderPreview()
  }

  const installedIds = installedExtensions.map((e) => e.id).join(',')

  const debouncedHtml = useDebounced(html, 800)
  const debouncedCss = useDebounced(css, 800)
  const debouncedJs = useDebounced(js, 800)
  const debouncedIds = useDebounced(installedIds, 800)
  const debouncedExtraFiles = useDebounced(extraFiles, 800)

  // Título do documento (tag <title> do index.html), exibido no cabeçalho do
  // preview — é o mesmo nome que apareceria na guia do navegador. Cai para o
  // nome do projeto quando o HTML não tem <title>.
  const documentTitle = useMemo(() => {
    try {
      const parsed = new DOMParser().parseFromString(debouncedHtml, 'text/html')
      const title = parsed.querySelector('title')?.textContent?.trim()
      if (title) return title
    } catch {
      // HTML malformado: ignora e usa o fallback.
    }
    return projectName
  }, [debouncedHtml, projectName])

  const extensionScripts = useMemo(() => {
    const ids = debouncedIds ? debouncedIds.split(',') : []
    return ids
      .map((id) => findExtension(id)?.runtime.bootstrapScript)
      .filter((s): s is string => Boolean(s))
  }, [debouncedIds])

  // Módulos ESM declarados pelas extensões instaladas (specifier → URL pinada,
  // ex.: three via CDN). Entram no importmap; as origens vão para o script-src.
  const extensionImports = useMemo(() => {
    const ids = debouncedIds ? debouncedIds.split(',') : []
    const imports: Record<string, string> = {}
    for (const id of ids) {
      const ext = findExtension(id)
      if (ext?.runtime.esmImports) Object.assign(imports, ext.runtime.esmImports)
    }
    return imports
  }, [debouncedIds])

  // União das permissions declaradas pelas extensões instaladas — o
  // permissionGuard usa isto + a baseline do aluno para liberar/travar rede.
  const installedPermissions = useMemo(() => {
    const ids = debouncedIds ? debouncedIds.split(',') : []
    const perms = new Set<ExtensionPermission>()
    for (const id of ids) {
      const ext = findExtension(id)
      if (ext) for (const p of ext.manifest.permissions) perms.add(p)
    }
    return Array.from(perms)
  }, [debouncedIds])

  const previewBudgetInput = useMemo(
    () => ({
      html: debouncedHtml,
      css: debouncedCss,
      js: debouncedJs,
      extensionScripts,
      extraFiles: debouncedExtraFiles,
    }),
    [debouncedHtml, debouncedCss, debouncedJs, extensionScripts, debouncedExtraFiles],
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
    if (autoStartedProjectId.current === projectId) return
    if (loadedSrcDoc !== PAUSED_PREVIEW_DOC) return
    autoStartedProjectId.current = projectId
    setRenderNonce((n) => n + 1)
  }, [projectId, previewRunning, previewPaused, loadedSrcDoc])

  useEffect(() => {
    if (renderLargePreviewForInput && renderLargePreviewForInput !== previewBudgetInput) {
      setRenderLargePreviewForInput(null)
    }
  }, [previewBudgetInput, renderLargePreviewForInput])

  const doc = useMemo(() => {
    // Parar (Play desligado): esvazia o iframe → mata setInterval/timers em execução.
    if (!previewRunning) return PAUSED_PREVIEW_DOC
    if (previewPaused) return PAUSED_PREVIEW_DOC
    if (!currentProjectHasRun) return PAUSED_PREVIEW_DOC
    // Aguarda hidratar o estado salvo antes do 1º build (ver storageReady acima).
    if (projectId && !storageReady) return PAUSED_PREVIEW_DOC
    const base = buildPreviewDoc({
      html: debouncedHtml,
      css: debouncedCss,
      js: debouncedJs,
      extensionScripts,
      extraFiles: debouncedExtraFiles,
      parentOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
      installedPermissions,
      fetchAllowedOrigins: previewSecurity.fetchAllowedOrigins,
      loopBudgetMs: previewSecurity.loopBudgetMs,
      extensionImports,
      // Semeia o estado salvo (lido do ref: deliberadamente FORA das deps do memo
      // — uma escrita não deve reconstruir o doc e recarregar o preview).
      localStorageSnapshot: gameStorageRef.current,
      storageProjectId: projectId ?? undefined,
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
    projectId,
    storageReady,
    debouncedHtml,
    debouncedCss,
    debouncedJs,
    extensionScripts,
    debouncedExtraFiles,
    installedPermissions,
    extensionImports,
    previewSecurity,
    renderNonce,
  ])

  const docIsLive = doc !== PAUSED_PREVIEW_DOC

  // Reseta o relógio do heartbeat sempre que o documento muda (novo render):
  // dá ao iframe a janela completa antes de considerar travado. `doc` é o
  // GATILHO (não lido no corpo), por isso fica na lista de propósito.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `doc` é o gatilho do reset, não uma dependência lida
  useEffect(() => {
    lastHeartbeatRef.current = Date.now()
    setPreviewStalled(false)
  }, [doc])

  // Loop do watchdog: marca travado se nenhum heartbeat chegar dentro do timeout.
  //
  // ⚠️ LIMITAÇÃO CONHECIDA do sandbox de MESMA THREAD: o iframe srcdoc
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
      if (!isPreviewMessage(ev.data)) return
      // Heartbeat NÃO é log: alimenta o watchdog e não vai para o console.
      if (ev.data.kind === 'heartbeat') {
        lastHeartbeatRef.current = Date.now()
        setPreviewStalled((stalled) => (stalled ? false : stalled))
        return
      }
      pushLog(ev.data)
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

  return (
    <div className="relative flex h-full flex-col bg-sz-bg">
      <div className="flex items-center gap-1 border-b border-sz-border bg-sz-panel px-2 py-1">
        <Button
          size="sm"
          variant={previewRunning ? 'ghost' : 'primary'}
          onClick={handleTogglePreviewRunning}
          title={previewRunning ? 'Parar a execução do preview' : 'Reproduzir o preview'}
          aria-label={previewRunning ? 'Parar a execução do preview' : 'Reproduzir o preview'}
        >
          {previewRunning ? (isNarrow ? '⏹' : '⏹ Parar') : isNarrow ? '▶' : '▶ Reproduzir'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          title="Re-executar o código atual"
          aria-label="Atualizar o preview"
        >
          {isNarrow ? '⟳' : '⟳ Atualizar'}
        </Button>
        {documentTitle && (
          <span
            className="ml-2 min-w-0 flex-1 truncate text-xs font-medium text-sz-fg-soft"
            title={documentTitle}
          >
            {documentTitle}
          </span>
        )}
        {!isNarrow && (
          <span className="ml-auto whitespace-nowrap pl-2 text-xs text-sz-fg-soft">
            {previewRunning ? 'Executando' : 'Parado'}
          </span>
        )}
      </div>
      <iframe
        ref={iframeRef}
        title="Pré-visualização"
        srcDoc={doc}
        onLoad={() => {
          setLoadedSrcDoc(iframeRef.current?.getAttribute('srcdoc') ?? null)
          lastHeartbeatRef.current = Date.now()
          setPreviewStalled(false)
        }}
        sandbox="allow-scripts allow-modals"
        className="h-full w-full flex-1 bg-white"
      />
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

// Cap de taxa de mensagens vindas do iframe (anti-flood). Janela de 1s e teto
// generoso: heartbeat (1/s) + escritas de jogo em laço cabem; só corta abuso.
const MESSAGE_RATE_WINDOW_MS = 1000
const MESSAGE_RATE_MAX_PER_WINDOW = 240

function formatPreviewSize(chars: number): string {
  if (chars >= 1_000_000) return `${(chars / 1_000_000).toFixed(1)} M caracteres`
  return `${Math.ceil(chars / 1_000)} mil caracteres`
}
