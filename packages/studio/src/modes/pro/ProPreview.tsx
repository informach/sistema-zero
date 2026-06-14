import type { WebContainerProcess } from '@webcontainer/api'
import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '#ui'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import { useStudioConfig } from '../../studio/config'
import { useProWebContainer } from './ProWebContainerProvider'

type Phase = 'booting' | 'installing' | 'starting' | 'ready' | 'error'

const PHASE_LABEL: Partial<Record<Phase, string>> = {
  booting: 'Iniciando o ambiente (WebContainer)…',
  installing: 'Instalando dependências (npm install)…',
  starting: 'Subindo o servidor de desenvolvimento (Vite)…',
}

/**
 * Preview do MODO PROFISSIONAL: em vez do srcdoc, aponta o iframe para a URL do
 * dev-server (Vite) rodando DENTRO do WebContainer. Fluxo:
 * mount (via provider) → npm install → npm run dev → `server-ready` → iframe.
 * Exceções do app cross-origin chegam via `preview-message` e vão ao Console.
 */
export function ProPreview(): JSX.Element {
  const { ensureMounted, error: mountError, state: mountState } = useProWebContainer()
  // Espelho em ref para ler o estado de mount ATUAL dentro do efeito sem torná-lo
  // dependência (depender dele rerodaria boot/install/dev a cada transição).
  const mountStateRef = useRef(mountState)
  mountStateRef.current = mountState
  const projectId = useProjectStore((s) => s.project?.id ?? null)
  const devScript = useProjectStore((s) => s.project?.proMeta?.devScript ?? 'dev')
  const pushLog = useLogsStore((s) => s.push)
  const installTimeoutMs = useStudioConfig().previewSecurity.terminalProcessTimeoutMs

  const [phase, setPhase] = useState<Phase>('booting')
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logTail, setLogTail] = useState<string[]>([])
  const [attempt, setAttempt] = useState(0)
  const devProcessRef = useRef<WebContainerProcess | null>(null)

  // `attempt` é dep PROPOSITAL: o botão "Tentar de novo" o incrementa para
  // re-disparar o boot/install/dev. O biome não vê o uso (só `setAttempt`).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-trigger manual via attempt
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    let cleanup: () => void = () => {}

    const appendTail = (chunk: string) => {
      if (cancelled) return
      setLogTail((prev) => [...prev, ...chunk.split('\n').filter((l) => l.trim())].slice(-14))
    }

    const run = async () => {
      setPhase('booting')
      setError(null)
      setUrl(null)
      setLogTail([])

      const wc = await ensureMounted()
      if (cancelled) return
      if (!wc) {
        // FS singleton em uso por outra instância (clássica ou pro) nesta aba:
        // espelha a UI de "ocupado" do Terminal em vez do erro genérico.
        if (mountStateRef.current === 'busy') {
          setError(
            'O ambiente (WebContainer) já está em uso em outra instância nesta aba. ' +
              'Feche o editor/terminal da outra instância (ou troque o projeto dela) e tente de novo.',
          )
        } else {
          setError(mountError ?? 'Não foi possível iniciar o ambiente.')
        }
        setPhase('error')
        return
      }

      const unsubReady = wc.on('server-ready', (_port, readyUrl) => {
        if (cancelled) return
        setUrl(readyUrl)
        setPhase('ready')
      })
      const unsubPreview = wc.on('preview-message', (message) => {
        const text = 'message' in message ? message.message : 'Erro no console do preview'
        pushLog({
          source: 'sz-preview',
          kind: 'runtimeError',
          parts: [text],
          error: { message: text, stack: message.stack ?? undefined },
          timestamp: Date.now(),
        })
      })
      cleanup = () => {
        unsubReady()
        unsubPreview()
        try {
          devProcessRef.current?.kill()
        } catch {
          // processo já encerrado
        }
        devProcessRef.current = null
      }

      // npm install (NÃO-INTERATIVO → tem timeout; um install travado não pode
      // deixar o aluno preso para sempre).
      setPhase('installing')
      const install = await wc.spawn('npm', ['install'])
      void install.output
        .pipeTo(new WritableStream<string>({ write: appendTail }))
        .catch(() => undefined)
      let installTimer = 0
      const installCode = await Promise.race<number | 'timeout'>([
        install.exit,
        new Promise<'timeout'>((resolve) => {
          installTimer = window.setTimeout(() => resolve('timeout'), installTimeoutMs)
        }),
      ])
      window.clearTimeout(installTimer)
      if (cancelled) {
        // Desmontou/trocou de projeto durante o install: o cleanup só mata o
        // devProcessRef (ainda null aqui). Sem este kill, o `npm install` fica
        // órfão rodando no container singleton (espelha o dev-spawn abaixo).
        try {
          install.kill()
        } catch {
          // já encerrado
        }
        return
      }
      if (installCode === 'timeout') {
        try {
          install.kill()
        } catch {
          // já encerrado
        }
        setError(`npm install excedeu o tempo limite (${Math.round(installTimeoutMs / 1000)}s).`)
        setPhase('error')
        return
      }
      if (installCode !== 0) {
        setError(`npm install falhou (código ${installCode}).`)
        setPhase('error')
        return
      }

      // npm run dev
      setPhase('starting')
      const dev = await wc.spawn('npm', ['run', devScript])
      if (cancelled) {
        try {
          dev.kill()
        } catch {
          // ignore
        }
        return
      }
      devProcessRef.current = dev
      void dev.output
        .pipeTo(new WritableStream<string>({ write: appendTail }))
        .catch(() => undefined)
    }

    void run()
    return () => {
      cancelled = true
      cleanup()
    }
  }, [projectId, attempt, ensureMounted, devScript, pushLog, mountError, installTimeoutMs])

  if (phase === 'ready' && url) {
    return (
      <div className="h-full w-full bg-white">
        <iframe
          src={url}
          title="Pré-visualização (dev-server)"
          className="h-full w-full border-0"
        />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <ProPreviewOverlay>
        <p className="text-sz-error">Não foi possível iniciar o preview profissional.</p>
        {error && (
          <pre className="max-w-md whitespace-pre-wrap text-xs text-sz-fg-mute">{error}</pre>
        )}
        <LogTail lines={logTail} />
        <Button variant="ghost" size="sm" onClick={() => setAttempt((a) => a + 1)}>
          Tentar de novo
        </Button>
      </ProPreviewOverlay>
    )
  }

  return (
    <ProPreviewOverlay>
      <p className="text-sz-fg-soft">{PHASE_LABEL[phase] ?? 'Preparando…'}</p>
      <LogTail lines={logTail} />
      <p className="max-w-md text-sz-fg-mute">
        O servidor roda dentro do navegador (WebContainer). A primeira carga instala as dependências
        e pode levar alguns segundos.
      </p>
    </ProPreviewOverlay>
  )
}

function ProPreviewOverlay({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-sz-panel p-6 text-center text-xs">
      {children}
    </div>
  )
}

function LogTail({ lines }: { lines: string[] }): JSX.Element | null {
  if (lines.length === 0) return null
  return (
    <pre className="max-h-40 w-full max-w-md overflow-auto rounded bg-sz-bg p-2 text-left font-mono text-[10px] leading-tight text-sz-fg-mute">
      {lines.join('\n')}
    </pre>
  )
}
