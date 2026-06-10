import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ExtraFile, InstalledExtension } from '#core'
import { findExtension } from '#official-extensions'
import { buildPreviewDoc, isPreviewMessage } from '#preview'
import { Button } from '#ui'
import { useDebounced } from '../../hooks/useDebounced'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'
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
  const previewRunning = useUIStore((s) => s.previewRunning)
  const setPreviewRunning = useUIStore((s) => s.setPreviewRunning)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Incrementado quando o preview precisa executar/reexecutar o documento atual
  // mesmo que o HTML/CSS/JS gerado seja idêntico.
  const [renderNonce, setRenderNonce] = useState(0)
  const autoStartedProjectId = useRef<string | null>(null)
  const [loadedSrcDoc, setLoadedSrcDoc] = useState<string | null>(null)
  const [renderLargePreviewForInput, setRenderLargePreviewForInput] =
    useState<PreviewBudgetInput | null>(null)

  useEffect(() => {
    if (!projectId) {
      autoStartedProjectId.current = null
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
    markCurrentProjectStarted()
    setPreviewRunning(true)
    rerenderPreview()
  }

  const handleRefresh = () => {
    // Atualizar implica executar: se estava parado, religa o Play.
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
    const base = buildPreviewDoc({
      html: debouncedHtml,
      css: debouncedCss,
      js: debouncedJs,
      extensionScripts,
      extraFiles: debouncedExtraFiles,
      parentOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
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
    debouncedHtml,
    debouncedCss,
    debouncedJs,
    extensionScripts,
    debouncedExtraFiles,
    renderNonce,
  ])

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      const source = iframeRef.current?.contentWindow
      if (!source || ev.source !== source) return
      if (!isPreviewMessage(ev.data)) return
      pushLog(ev.data)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [pushLog])

  return (
    <div className="relative flex h-full flex-col bg-sz-bg">
      <div className="flex items-center gap-1 border-b border-sz-border bg-sz-panel px-2 py-1">
        <Button
          size="sm"
          variant={previewRunning ? 'ghost' : 'primary'}
          onClick={handleTogglePreviewRunning}
          title={previewRunning ? 'Parar a execução do preview' : 'Executar o preview'}
        >
          {previewRunning ? '⏹ Parar' : '▶ Reproduzir'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          title="Re-executar o código atual"
        >
          ⟳ Atualizar
        </Button>
        {documentTitle && (
          <span className="ml-2 truncate text-xs font-medium text-sz-fg-soft" title={documentTitle}>
            {documentTitle}
          </span>
        )}
        <span className="ml-auto whitespace-nowrap pl-2 text-xs text-sz-fg-soft">
          {previewRunning ? 'Executando' : 'Parado'}
        </span>
      </div>
      <iframe
        ref={iframeRef}
        title="Pré-visualização"
        srcDoc={doc}
        onLoad={() => setLoadedSrcDoc(iframeRef.current?.getAttribute('srcdoc') ?? null)}
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
    </div>
  )
}

const PAUSED_PREVIEW_DOC = '<!doctype html><html lang="pt-BR"><body></body></html>'

function formatPreviewSize(chars: number): string {
  if (chars >= 1_000_000) return `${(chars / 1_000_000).toFixed(1)} M caracteres`
  return `${Math.ceil(chars / 1_000)} mil caracteres`
}
