import type { WebContainerProcess } from '@webcontainer/api'
import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '#ui'
import { canBootWebContainer } from '../../components/terminal/webContainerClient'
import { useMeasuredWidth } from '../../hooks/useMeasuredWidth'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import { useStudioConfig } from '../../studio/config'
import { useStudioProRuntime } from '../../studio/pro-runtime'
import { useProWebContainer } from './ProWebContainerProvider'
import { buildProConsoleBridgeScript, isProConsoleMessage } from './proConsoleBridge'
import { RemoteProPreview } from './RemoteProPreview'

type Phase = 'booting' | 'installing' | 'starting' | 'ready' | 'error' | 'unsupported'

// Espelha o limiar do preview clássico (responsividade POR SEÇÃO, não pela
// página): abaixo disto o botão da barra vira só ícone.
const PRO_TOOLBAR_COMPACT_MAX_PX = 400

const PHASE_LABEL: Partial<Record<Phase, string>> = {
  booting: 'Iniciando o ambiente (WebContainer)…',
  installing: 'Instalando dependências (npm install)…',
  starting: 'Subindo o servidor de desenvolvimento (Vite)…',
}

/**
 * Teto de tamanho para mensagem/stack vindas do app do preview antes de irem ao
 * Console. Um erro com payload gigante (string enorme serializada no message ou
 * um stack recursivo) inflaria o store de logs e a UI. 4KB cobre stacks reais.
 */
const MAX_LOG_STRING = 4096

function capLogString(value: string): string {
  return value.length > MAX_LOG_STRING ? `${value.slice(0, MAX_LOG_STRING)}… (truncado)` : value
}

/**
 * Preview do MODO PROFISSIONAL: em vez do srcdoc, aponta o iframe para a URL do
 * dev-server (Vite) rodando DENTRO do WebContainer. Fluxo:
 * mount (via provider) → npm install → npm run dev → `server-ready` → iframe.
 * Exceções do app cross-origin chegam via `preview-message` e vão ao Console.
 */
export function ProPreview(): JSX.Element {
  const remoteRuntime = useStudioProRuntime()
  return remoteRuntime ? <RemoteProPreview runtime={remoteRuntime} /> : <WebContainerProPreview />
}

function WebContainerProPreview(): JSX.Element {
  const { ensureMounted, error: mountError, state: mountState } = useProWebContainer()
  // Espelho em ref para ler o estado de mount ATUAL dentro do efeito sem torná-lo
  // dependência (depender dele rerodaria boot/install/dev a cada transição).
  const mountStateRef = useRef(mountState)
  mountStateRef.current = mountState
  const projectId = useProjectStore((s) => s.project?.id ?? null)
  const projectName = useProjectStore((s) => s.project?.name ?? '')
  const devScript = useProjectStore((s) => s.project?.proMeta?.devScript ?? 'dev')
  const pushLog = useLogsStore((s) => s.push)
  const installTimeoutMs = useStudioConfig().previewSecurity.terminalProcessTimeoutMs

  const [phase, setPhase] = useState<Phase>('booting')
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logTail, setLogTail] = useState<string[]>([])
  const [attempt, setAttempt] = useState(0)
  const devProcessRef = useRef<WebContainerProcess | null>(null)
  // Recarrega o APP sem tocar no servidor: o iframe do dev-server é
  // cross-origin (*.webcontainer-api.io) — não dá para chamar location.reload()
  // lá dentro; trocar a `key` remonta o iframe e o navegador refaz a navegação.
  const [reloadNonce, setReloadNonce] = useState(0)
  // Origem do dev-server CORRENTE (setada no server-ready): o listener de
  // console só aceita mensagens vindas exatamente dela.
  const previewOriginRef = useRef<string | null>(null)
  // A barra compacta conforme o PRÓPRIO contêiner (padrão do preview clássico):
  // em split apertado o botão vira só ícone e o título ganha o espaço.
  const toolbarRef = useRef<HTMLDivElement>(null)
  const toolbarWidth = useMeasuredWidth(toolbarRef)
  const compactToolbar = toolbarWidth > 0 && toolbarWidth < PRO_TOOLBAR_COMPACT_MAX_PX

  // `attempt` é dep PROPOSITAL: "Tentar de novo" (fase de erro) e "⏻ Reiniciar"
  // (barra do ready) o incrementam para re-disparar o boot/install/dev — a
  // cleanup mata o dev-server atual e o ciclo recomeça. O Reiniciar NÃO pula o
  // `npm install` de propósito: morno (node_modules já populado) ele é rápido e
  // é o que garante que uma dependência recém-adicionada ao package.json entre
  // no ar; a URL pode mudar de porta e o `server-ready` cuida disso. O biome
  // não vê o uso (só `setAttempt`).
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
      // Origem antiga não autoriza mais nada (troca de projeto/reinício).
      previewOriginRef.current = null

      // Gate de capacidade ANTES do import pesado do runtime: sem cross-origin
      // isolation (host sem COOP/COEP) o boot é fútil. Mostra uma mensagem
      // amigável em vez do erro cru / do download de megabytes à toa.
      if (!canBootWebContainer()) {
        setPhase('unsupported')
        return
      }

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

      // Ponte de console do app → Console da IDE (ver proConsoleBridge.ts):
      // injetada em toda página que o dev-server servir DEPOIS deste ponto —
      // o iframe só carrega no server-ready, então chega a tempo. Best-effort:
      // sem a ponte o preview segue funcionando (só o console fica mudo).
      try {
        await wc.setPreviewScript(buildProConsoleBridgeScript(window.location.origin))
      } catch (err) {
        console.warn('[studio] preview PRO: ponte de console não pôde ser injetada', err)
      }
      if (cancelled) return

      // Marca que o dev-server chegou a 'pronto': desarma o monitor de saída
      // prematura abaixo (um dev-server vivo PODE encerrar/reiniciar depois sem ser
      // erro de boot).
      let serverReady = false
      const unsubReady = wc.on('server-ready', (_port, readyUrl) => {
        if (cancelled) return
        serverReady = true
        // Origem autorizada do console: SÓ o dev-server corrente.
        try {
          previewOriginRef.current = new URL(readyUrl).origin
        } catch {
          previewOriginRef.current = null
        }
        setUrl(readyUrl)
        setPhase('ready')
      })
      const unsubPreview = wc.on('preview-message', (message) => {
        // Mesmo guard do `server-ready`: sem ele um erro de runtime do app do
        // projeto ANTERIOR (o unsub roda no cleanup, mas pode haver mensagem em
        // voo) sangraria para o Console do projeto novo.
        if (cancelled) return
        const rawText = 'message' in message ? message.message : 'Erro no console do preview'
        const text = capLogString(rawText)
        const stack = 'stack' in message && message.stack ? capLogString(message.stack) : undefined
        pushLog({
          source: 'sz-preview',
          kind: 'runtimeError',
          parts: [text],
          error: { message: text, stack },
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
      // Atribui o ref ANTES de checar `cancelled`: se o cancelamento pousar entre
      // o check e a atribuição, o `cleanup()` já teria rodado lendo um ref ainda
      // nulo e deixaria o dev-server órfão no container singleton. Atribuindo
      // primeiro, o cleanup que vier depois encontra o processo e o mata; e
      // rechecamos aqui para o caso de o cleanup já ter rodado.
      devProcessRef.current = dev
      if (cancelled) {
        try {
          dev.kill()
        } catch {
          // ignore
        }
        devProcessRef.current = null
        return
      }
      void dev.output
        .pipeTo(new WritableStream<string>({ write: appendTail }))
        .catch(() => undefined)
      // Monitora a SAÍDA do dev-server. Ao contrário do `npm install` (não-
      // interativo, com timeout), o `npm run dev` é de longa duração e NÃO leva
      // timeout — mas se ele MORRE na largada (vite.config inválido, erro de
      // sintaxe recusado no boot, porta ocupada, script `dev` inexistente no
      // template), o `server-ready` nunca dispara e a fase ficaria presa em
      // 'starting' PARA SEMPRE, sem mensagem acionável. Se o exit resolver ANTES do
      // 'server-ready', vamos para 'error' com o código. (Não há timeout: um
      // dev-server saudável fica vivo indefinidamente.)
      void dev.exit.then((code) => {
        if (cancelled || serverReady) return
        setError(
          code === 0
            ? 'O servidor de desenvolvimento encerrou antes de ficar pronto.'
            : `O servidor de desenvolvimento encerrou (código ${code}). Veja o terminal/console para o erro.`,
        )
        setPhase('error')
      })
    }

    void run()
    return () => {
      cancelled = true
      cleanup()
    }
  }, [projectId, attempt, ensureMounted, devScript, pushLog, mountError, installTimeoutMs])

  // Recebe o console espelhado pelo bridge (postMessage do iframe do
  // dev-server) e o encaminha ao Console da IDE. Dupla validação: a ORIGEM tem
  // que ser exatamente a do dev-server corrente e a FORMA passa pelo guard —
  // o logsStore ainda trunca cada parte e aplica o rate limit.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const allowed = previewOriginRef.current
      if (!allowed || event.origin !== allowed) return
      if (!isProConsoleMessage(event.data)) return
      pushLog({
        source: 'sz-preview',
        kind: event.data.kind,
        parts: event.data.parts,
        timestamp: Date.now(),
      })
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [pushLog])

  if (phase === 'ready' && url) {
    return (
      <div className="flex h-full w-full flex-col bg-sz-bg">
        <div
          ref={toolbarRef}
          className="flex items-center gap-1 border-b border-sz-border bg-sz-panel px-2 py-1"
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setReloadNonce((n) => n + 1)}
            title="Recarregar o app (o servidor continua rodando)"
            aria-label="Atualizar o preview"
          >
            {compactToolbar ? '⟳' : '⟳ Atualizar'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAttempt((a) => a + 1)}
            title="Reiniciar o servidor de desenvolvimento (npm install + dev de novo)"
            aria-label="Reiniciar o servidor"
          >
            {compactToolbar ? '⏻' : '⏻ Reiniciar'}
          </Button>
          {projectName && (
            // Nome do PROJETO, não o <title> vivo do app: o iframe do dev-server
            // é cross-origin — diferente do srcdoc clássico, o título de dentro
            // não é legível daqui.
            <span
              className="ml-2 min-w-0 flex-1 truncate text-xs font-medium text-sz-fg-soft"
              title={projectName}
            >
              {projectName}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 bg-white">
          <iframe
            key={reloadNonce}
            src={url}
            title="Pré-visualização (dev-server)"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    )
  }

  if (phase === 'unsupported') {
    return (
      <ProPreviewOverlay>
        <p className="text-sz-fg-soft">
          O modo Código roda um servidor de verdade dentro do navegador, e isso precisa de um
          computador com um navegador compatível (Chrome ou Edge no desktop).
        </p>
        <p className="max-w-md text-sz-fg-mute">
          Abra este projeto no computador para programar no modo Código. No celular ou tablet você
          ainda pode usar os projetos de blocos.
        </p>
      </ProPreviewOverlay>
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
