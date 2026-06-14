import type { WebContainer, WebContainerProcess } from '@webcontainer/api'
import type { JSX } from 'react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { ExtraFile } from '#core'
import { Button } from '#ui'
import '@xterm/xterm/css/xterm.css'
import type { FitAddon } from '@xterm/addon-fit'
import type { Terminal as XTerm } from '@xterm/xterm'
import { useShallow } from 'zustand/react/shallow'
import { useProjectStore } from '../../state/projectStore'
import {
  buildTerminalFileContents,
  buildTerminalFileTree,
  type TerminalProjectSnapshot,
} from './terminalProjectFiles'
import { getWebContainer, resetWebContainerFs } from './webContainerClient'

type Status = 'idle' | 'loading' | 'ready' | 'error'
const TERMINAL_SYNC_DELAY_MS = 150

interface TerminalRuntime {
  webcontainer: WebContainer
  term: XTerm
  fit: FitAddon
  shell: WebContainerProcess
  input: WritableStreamDefaultWriter<string>
  outputAbort: AbortController
  dataSubscription: { dispose(): void }
  onResize: () => void
  resizeObserver: ResizeObserver
}

const EMPTY_EXTRA_FILES: ExtraFile[] = []

export function Terminal(): JSX.Element {
  const project = useProjectStore(
    useShallow(
      (s): TerminalProjectSnapshot => ({
        id: s.project?.id ?? null,
        name: s.project?.name ?? 'sz-project',
        files: s.project?.files ?? null,
        extraFiles: s.project?.extraFiles ?? EMPTY_EXTRA_FILES,
        kind: s.project?.kind === 'pro' ? 'pro' : undefined,
        tree: s.project?.tree,
      }),
    ),
  )
  const projectId = project?.id
  const containerRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<TerminalRuntime | null>(null)
  const syncedFilesRef = useRef<Map<string, string>>(new Map())
  const loadSeqRef = useRef(0)
  const syncSeqRef = useRef(0)
  const syncChainRef = useRef<Promise<void>>(Promise.resolve())
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const cleanupRuntime = useCallback(() => {
    const runtime = runtimeRef.current
    runtimeRef.current = null
    syncedFilesRef.current = new Map()
    syncSeqRef.current += 1
    syncChainRef.current = Promise.resolve()
    if (!runtime) return

    runtime.resizeObserver.disconnect()
    window.removeEventListener('resize', runtime.onResize)
    runtime.dataSubscription.dispose()
    runtime.outputAbort.abort()
    try {
      runtime.input.releaseLock()
    } catch {
      // O writer pode já ter sido liberado se o shell encerrou.
    }
    try {
      runtime.shell.kill()
    } catch {
      // Processo já encerrado.
    }
    runtime.term.dispose()
  }, [])

  const handleLoad = useCallback(async () => {
    cleanupRuntime()
    setStatus('loading')
    setError(null)

    let loadId = 0
    try {
      loadId = ++loadSeqRef.current
      const [{ Terminal: TerminalCtor }, { FitAddon: FitAddonCtor }, webcontainer] =
        await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit'), getWebContainer()])
      if (loadSeqRef.current !== loadId) return

      const term = new TerminalCtor({
        theme: { background: '#11172a', foreground: '#e6e9f5' },
        fontFamily: '"JetBrains Mono", Consolas, monospace',
        fontSize: 12,
        cursorBlink: true,
        convertEol: true,
      })
      const fit = new FitAddonCtor()
      term.loadAddon(fit)

      const container = containerRef.current
      if (!container) {
        // O term recém-criado ainda não está no runtimeRef, então cleanupRuntime
        // não o descartaria — dispose explícito antes de lançar evita o leak.
        term.dispose()
        throw new Error('Área do terminal não está disponível.')
      }

      container.replaceChildren()
      term.open(container)
      fit.fit()

      // No modo profissional o FS é montado/sincronizado pelo ProWebContainerProvider
      // (escritor ÚNICO). O Terminal só abre o shell sobre o FS já montado — dois
      // sincronizadores no mesmo container singleton corromperiam os arquivos.
      if (project.kind !== 'pro') {
        // Isolamento por projeto: o container é singleton por aba, então arquivos
        // de um projeto anterior (ou de um projeto pro) ficariam no FS. Limpa
        // tudo (preservando node_modules p/ não reinstalar) antes de montar.
        await resetWebContainerFs(webcontainer)
        if (loadSeqRef.current !== loadId) {
          term.dispose()
          return
        }
        await webcontainer.mount(buildTerminalFileTree(project))
        syncedFilesRef.current = new Map(Object.entries(buildTerminalFileContents(project)))
      }
      if (loadSeqRef.current !== loadId) {
        term.dispose()
        return
      }
      const shell = await webcontainer.spawn('jsh', {
        terminal: { cols: term.cols, rows: term.rows },
      })
      if (loadSeqRef.current !== loadId) {
        shell.kill()
        term.dispose()
        return
      }
      const outputAbort = new AbortController()
      void shell.output
        .pipeTo(
          new WritableStream<string>({
            write(data) {
              term.write(data)
            },
          }),
          { signal: outputAbort.signal },
        )
        .catch(() => undefined)

      const input = shell.input.getWriter()
      const dataSubscription = term.onData((data: string) => {
        void input.write(data)
      })
      const onResize = () => {
        fit.fit()
        shell.resize({ cols: term.cols, rows: term.rows })
      }
      window.addEventListener('resize', onResize)
      // O split inferior usa um PanelResizeHandle: arrastá-lo redimensiona o
      // container SEM disparar 'resize' na window, deixando linhas/colunas do
      // xterm e do PTY defasadas. O ResizeObserver pega esse caso.
      const resizeObserver = new ResizeObserver(() => {
        onResize()
      })
      resizeObserver.observe(container)

      runtimeRef.current = {
        webcontainer,
        term,
        fit,
        shell,
        input,
        outputAbort,
        dataSubscription,
        onResize,
        resizeObserver,
      }
      term.writeln('Sistema Zero Studio terminal')
      term.writeln('Arquivos do projeto montados no WebContainer.')
      setStatus('ready')
    } catch (err) {
      cleanupRuntime()
      if (loadSeqRef.current !== loadId) return
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setStatus('error')
    }
  }, [cleanupRuntime, project])

  useEffect(() => {
    return () => {
      loadSeqRef.current += 1
      cleanupRuntime()
    }
  }, [cleanupRuntime])

  useEffect(() => {
    if (!projectId) return
    loadSeqRef.current += 1
    cleanupRuntime()
    setStatus('idle')
    setError(null)
  }, [cleanupRuntime, projectId])

  useEffect(() => {
    if (status !== 'ready') return
    // Pro: o sync é do ProWebContainerProvider (escritor único). Ver handleLoad.
    if (project.kind === 'pro') return
    const runtime = runtimeRef.current
    if (!runtime) return
    const contents = buildTerminalFileContents(project)
    const nextNames = new Set(Object.keys(contents))
    const currentFiles = syncedFilesRef.current
    const filesToWrite = Object.entries(contents).filter(
      ([name, content]) => currentFiles.get(name) !== content,
    )
    const filesToRemove = [...currentFiles.keys()].filter((name) => !nextNames.has(name))
    if (filesToWrite.length === 0 && filesToRemove.length === 0) return

    const syncId = ++syncSeqRef.current
    let cancelled = false
    const timer = window.setTimeout(() => {
      const sync = syncChainRef.current.then(async () => {
        if (cancelled || syncSeqRef.current !== syncId || runtimeRef.current !== runtime) return
        await Promise.all(
          filesToWrite.map(([name, content]) => runtime.webcontainer.fs.writeFile(name, content)),
        )
        await Promise.all(
          filesToRemove.map((name) => runtime.webcontainer.fs.rm(name, { force: true })),
        )
        if (!cancelled && syncSeqRef.current === syncId && runtimeRef.current === runtime) {
          syncedFilesRef.current = new Map(Object.entries(contents))
        }
      })
      syncChainRef.current = sync.catch(() => undefined)
      sync.catch((err) => {
        if (cancelled || syncSeqRef.current !== syncId || runtimeRef.current !== runtime) return
        const message = err instanceof Error ? err.message : String(err)
        cleanupRuntime()
        setError(`Não foi possível sincronizar arquivos: ${message}`)
        setStatus('error')
      })
    }, TERMINAL_SYNC_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [cleanupRuntime, project, status])

  return (
    <div className="relative h-full bg-sz-panel">
      <div ref={containerRef} className="h-full w-full" />

      {status === 'ready' && (
        // O shell interativo (jsh) NUNCA é morto por timeout; só por aqui (ou
        // pela troca de projeto). Reiniciar remonta o FS e abre um novo shell.
        <button
          type="button"
          onClick={handleLoad}
          title="Reiniciar terminal"
          className="absolute right-2 top-2 z-10 rounded border border-sz-border bg-sz-panel/80 px-2 py-1 text-xs text-sz-fg-soft hover:text-sz-accent"
        >
          Reiniciar
        </button>
      )}

      {status === 'idle' && (
        <TerminalOverlay>
          <p className="max-w-md text-sz-fg-soft">
            O terminal real usa <strong className="text-sz-fg">WebContainers</strong>: um runtime
            Node.js isolado dentro do navegador.
          </p>
          <p className="max-w-md text-sz-fg-mute">
            O ambiente é carregado sob demanda e exige isolamento COOP/COEP configurado no servidor
            da IDE.
          </p>
          <Button variant="primary" size="md" onClick={handleLoad}>
            Carregar terminal real
          </Button>
        </TerminalOverlay>
      )}

      {status === 'loading' && (
        <TerminalOverlay>
          <p className="text-sz-fg-soft">Carregando WebContainers...</p>
        </TerminalOverlay>
      )}

      {status === 'error' && (
        <TerminalOverlay>
          <p className="text-sz-error">Não foi possível iniciar o terminal real.</p>
          <pre className="max-w-md whitespace-pre-wrap text-xs text-sz-fg-mute">{error}</pre>
          <p className="text-sz-fg-mute">
            Verifique se <code>@webcontainer/api</code> está instalado e se o servidor envia
            COOP/COEP com <code>credentialless</code>.
          </p>
          <Button variant="ghost" size="sm" onClick={handleLoad}>
            Tentar novamente
          </Button>
        </TerminalOverlay>
      )}
    </div>
  )
}

function TerminalOverlay({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sz-panel p-6 text-center text-xs">
      {children}
    </div>
  )
}
