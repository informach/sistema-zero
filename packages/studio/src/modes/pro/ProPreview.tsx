import { studioProDigest } from '@sistemazero/core/studio/pro-revision'
import { buildProRuntimeBridgeScript } from '@sistemazero/core/studio/pro-runtime-bridge'
import type { WebContainerProcess } from '@webcontainer/api'
import { type JSX, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '#ui'
import { ProStageState } from '../../components/preview/ProStageState'
import { canBootWebContainer } from '../../components/terminal/webContainerClient'
import { javaScriptProject } from '../../core/editableProject'
import { updateLegacyProToolchainManifest } from '../../core/proToolchain'
import { useLogsStore } from '../../state/logsStore'
import { flushProjectOperations } from '../../state/projectOperations'
import { PRO_APPLICATION_LIMITS } from '../../state/projectStorageCoordinator'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { type ProRunActions, type ProRunState, useProRunApi } from '../../state/proRun'
import { updateProToolchainBeforeExecution } from '../../state/proToolchainUpdate'
import { useStudioConfig } from '../../studio/config'
import { useProCandidatePreview } from '../../studio/pro-candidate-preview'
import { useStudioProDependencies, useStudioProRuntime } from '../../studio/pro-runtime'
import { ProArtifactPreview } from './ProArtifactPreview'
import { useProWebContainer } from './ProWebContainerProvider'
import { isProConsoleMessage } from './proConsoleBridge'
import { RemoteProPreview } from './RemoteProPreview'
import { useProGameStorage } from './useProGameStorage'

/**
 * `stopped` = a criança apertou Parar (redesenho de 11/2026): a cleanup do efeito matou install e
 * dev-server, mas a POSSE do FS fica com esta instância (só sai no unmount/troca de projeto), então
 * o Rodar seguinte é rápido.
 */
type Phase = 'booting' | 'installing' | 'starting' | 'ready' | 'error' | 'unsupported' | 'stopped'

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
  const { candidate: selection, mode, select, close, report } = useProCandidatePreview()
  const candidate = selection?.kind === 'python' ? null : selection
  const candidateActive = candidate !== null && mode === 'candidate'
  return (
    <div className="flex h-full min-h-0 flex-col">
      {candidate && (
        <div className="border-b border-sz-border bg-sz-panel p-2 text-xs">
          <fieldset className="flex flex-wrap items-center gap-2" aria-label="Versão em execução">
            <Button
              size="sm"
              variant={candidateActive ? 'ghost' : 'primary'}
              aria-pressed={!candidateActive}
              onClick={() => select('current')}
            >
              Jogo atual
            </Button>
            <Button
              size="sm"
              variant={candidateActive ? 'primary' : 'ghost'}
              aria-pressed={candidateActive}
              onClick={() => select('candidate')}
            >
              Proposta
            </Button>
            <Button size="sm" variant="ghost" onClick={close}>
              Fechar experiência
            </Button>
          </fieldset>
          <p className="mt-1 text-sz-fg-soft">
            {candidateActive
              ? 'Experimentando proposta. O progresso desta experiência é temporário.'
              : 'Jogo atual.'}{' '}
            Alternar reinicia a partida.
          </p>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ProToolchainGate active={!candidateActive}>
          {remoteRuntime ? (
            <RemoteProPreview runtime={remoteRuntime} active={!candidateActive} />
          ) : (
            <WebContainerProPreview active={!candidateActive} />
          )}
        </ProToolchainGate>
        {candidateActive && (
          <ProArtifactPreview
            artifact={candidate.artifact}
            identity={`${candidate.jobId}:${candidate.revisionHash}`}
            onStatus={(status) => {
              report(candidate.artifact.id, status)
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Never start npm or a remote build using the known retired toolchain. */
function ProToolchainGate({ children, active }: { children: ReactNode; active: boolean }) {
  const store = useProjectStoreApi()
  const project = useProjectStore((s) => s.project)
  const editingAccess = useProjectStore((s) => s.editingAccess)
  const runtime = useStudioProRuntime()
  const prepare = useStudioProDependencies()
  const [attempt, setAttempt] = useState(0)
  const scope = captureProjectStorageScope()
  const history = useRef({ scope, projectId: project?.id, keys: new Set<string>() })
  if (history.current.scope !== scope || history.current.projectId !== project?.id)
    history.current = { scope, projectId: project?.id, keys: new Set<string>() }
  const repaired = history.current.keys
  const manifest = javaScriptProject(project)?.tree?.['package.json']
  const lock = javaScriptProject(project)?.tree?.['package-lock.json']
  const manifestText = manifest?.kind === 'file' ? manifest.content : null
  const lockText = lock?.kind === 'file' ? lock.content : null
  const sourceKey = useMemo(
    () => JSON.stringify([manifestText, lockText]),
    [manifestText, lockText],
  )
  const [failure, setFailure] = useState<{ project: typeof project; message: string } | null>(null)
  let needsUpdate = false
  let issue: string | null = null
  try {
    needsUpdate =
      manifest?.kind === 'file' && updateLegacyProToolchainManifest(manifest.content) !== null
  } catch (error) {
    issue = error instanceof Error ? error.message : String(error)
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly retries the unchanged source after failure or Undo.
  useEffect(() => {
    if (!active || !needsUpdate || issue || editingAccess !== 'author') return
    const controller = new AbortController()
    const signal = runtime?.signal
      ? AbortSignal.any([controller.signal, runtime.signal])
      : controller.signal
    void (async () => {
      const key = await studioProDigest(sourceKey)
      signal.throwIfAborted()
      if (repaired.has(key)) {
        setFailure({
          project,
          message:
            'O projeto mantém a versão anterior. Para executar, tente novamente a atualização segura.',
        })
        return
      }
      setFailure(null)
      await updateProToolchainBeforeExecution(store, prepare, signal, undefined, () => {
        repaired.add(key)
        // Only compact digests, with the same bound as the existing recoverable history.
        while (repaired.size > PRO_APPLICATION_LIMITS.operations) {
          const oldest = repaired.values().next().value
          if (oldest !== undefined) repaired.delete(oldest)
        }
      })
    })().catch((error: unknown) => {
      if (!controller.signal.aborted)
        setFailure({ project, message: error instanceof Error ? error.message : String(error) })
    })
    return () => controller.abort()
  }, [
    active,
    needsUpdate,
    issue,
    editingAccess,
    project,
    store,
    prepare,
    runtime?.signal,
    attempt,
    sourceKey,
    repaired,
  ])
  if (!needsUpdate && !issue) return children
  if (!active) return null
  const error = issue ?? (failure?.project === project ? failure.message : null)
  return (
    <div
      role={error ? 'alert' : 'status'}
      className="grid h-full place-content-center gap-3 p-4 text-center text-sm"
    >
      <p>
        {error ??
          (editingAccess === 'author'
            ? 'Preparando a atualização segura do ambiente Pro…'
            : 'Aguarde a autoria para atualizar o ambiente Pro.')}
      </p>
      {error && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void studioProDigest(sourceKey).then((key) => {
              repaired.delete(key)
              setAttempt((value) => value + 1)
            })
          }}
        >
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

function WebContainerProPreview({ active = true }: { active?: boolean }): JSX.Element | null {
  const store = useProjectStoreApi()
  const proRun = useProRunApi()
  const [started, setStarted] = useState(active)
  // Parar da criança: a volta de `active` (fechar a proposta do construtor) não religa sozinha.
  const stoppedByUser = useRef(false)
  useEffect(() => {
    if (active && !stoppedByUser.current) setStarted(true)
  }, [active])
  const startedRef = useRef(started)
  startedRef.current = started
  const activeRef = useRef(active)
  activeRef.current = active
  const { ensureMounted, error: mountError, state: mountState } = useProWebContainer()
  // Espelho em ref para ler o estado de mount ATUAL dentro do efeito sem torná-lo
  // dependência (depender dele rerodaria boot/install/dev a cada transição).
  const mountStateRef = useRef(mountState)
  mountStateRef.current = mountState
  const mountErrorRef = useRef(mountError)
  mountErrorRef.current = mountError
  const projectId = useProjectStore((s) => javaScriptProject(s.project)?.id ?? null)
  const devScript = useProjectStore(
    (s) => javaScriptProject(s.project)?.proMeta?.devScript ?? 'dev',
  )
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
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const storageRevision = useProjectStore(
    (state) => javaScriptProject(state.project)?.updatedAt ?? 0,
  )
  const storageName = useProGameStorage({
    frame: iframeRef,
    projectId,
    revision: storageRevision,
    identity: `${url ?? ''}:${attempt}:${reloadNonce}`,
    origin: active && url ? new URL(url).origin : null,
  })
  // Origem do dev-server CORRENTE (setada no server-ready): o listener de
  // console só aceita mensagens vindas exatamente dela.
  const previewOriginRef = useRef<string | null>(null)

  // `attempt` é dep PROPOSITAL: "Tentar de novo" (fase de erro) e "⏻ Reiniciar"
  // (barra do ready) o incrementam para re-disparar o boot/install/dev — a
  // cleanup mata o dev-server atual e o ciclo recomeça. O Reiniciar NÃO pula o
  // `npm install` de propósito: morno (node_modules já populado) ele é rápido e
  // é o que garante que uma dependência recém-adicionada ao package.json entre
  // no ar; a URL pode mudar de porta e o `server-ready` cuida disso. O biome
  // não vê o uso (só `setAttempt`).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-trigger manual via attempt
  useEffect(() => {
    if (!projectId || !started) return
    let cancelled = false
    let cleanup: () => void = () => {}
    let installProcess: WebContainerProcess | null = null

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
          setError(mountErrorRef.current ?? 'Não foi possível iniciar o ambiente.')
        }
        setPhase('error')
        return
      }

      // Ponte de console do app → Console da IDE (ver proConsoleBridge.ts):
      // injetada em toda página que o dev-server servir DEPOIS deste ponto —
      // o iframe só carrega no server-ready, então chega a tempo. Best-effort:
      // sem a ponte o preview segue funcionando (só o console fica mudo).
      try {
        await wc.setPreviewScript(buildProRuntimeBridgeScript(window.location.origin))
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
        if (cancelled || !activeRef.current) return
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
      await flushProjectOperations(store, projectId)
      if (cancelled) return
      const install = await wc.spawn('npm', ['install'])
      installProcess = install
      if (cancelled) {
        install.kill()
        return
      }
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
      installProcess = null
      if (cancelled) {
        // Cleanup already stopped this install before another project could mount.
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

    void run().catch((cause: unknown) => {
      if (cancelled) return
      setError(cause instanceof Error ? cause.message : String(cause))
      setPhase('error')
      cleanup()
    })
    return () => {
      cancelled = true
      try {
        installProcess?.kill()
      } catch {
        // The process may have exited between the check and cancellation.
      }
      cleanup()
    }
  }, [projectId, attempt, ensureMounted, devScript, pushLog, installTimeoutMs, started, store])

  // Recebe o console espelhado pelo bridge (postMessage do iframe do
  // dev-server) e o encaminha ao Console da IDE. Dupla validação: a ORIGEM tem
  // que ser exatamente a do dev-server corrente e a FORMA passa pelo guard —
  // o logsStore ainda trunca cada parte e aplica o rate limit.
  useEffect(() => {
    if (!active) return
    const handler = (event: MessageEvent) => {
      const allowed = previewOriginRef.current
      if (!allowed || event.origin !== allowed) return
      if (event.source !== iframeRef.current?.contentWindow) return
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
  }, [pushLog, active])

  // As ações que a Topbar chama (Rodar / Parar / Atualizar). Estáveis: só leem refs e setters.
  const actions = useMemo<ProRunActions>(
    () => ({
      run: () => {
        if (startedRef.current) {
          // Rodando, preparando ou com erro: recomeça o ciclo. NÃO pula o `npm install` de
          // propósito: morno (node_modules já populado) ele é rápido e é o que garante que uma
          // dependência recém-adicionada ao package.json entre no ar.
          setAttempt((a) => a + 1)
          return
        }
        stoppedByUser.current = false
        setStarted(true)
      },
      stop: () => {
        stoppedByUser.current = true
        setStarted(false)
        setUrl(null)
        setPhase('stopped')
      },
      // Recarrega o APP sem tocar no servidor (a `key` do iframe).
      reload: () => setReloadNonce((n) => n + 1),
    }),
    [],
  )
  const runState = useMemo<ProRunState | null>(() => {
    if (!active) return null
    if (!started || phase === 'stopped') return { phase: 'idle', canRun: true, canStop: false }
    switch (phase) {
      case 'booting':
      case 'installing':
      case 'starting':
        return {
          phase: 'preparing',
          step: { index: phase === 'booting' ? 1 : phase === 'installing' ? 2 : 3, total: 3 },
          canRun: false,
          canStop: true,
          detail: PHASE_LABEL[phase],
        }
      case 'ready':
        return { phase: 'running', canRun: true, canStop: true }
      case 'error':
        return { phase: 'error', canRun: true, canStop: false, error: error ?? undefined }
      default:
        return { phase: 'unsupported', canRun: false, canStop: false }
    }
  }, [active, started, phase, error])
  // Publica para quem fica FORA da prévia (o Rodar/Parar da Topbar, o palco): `null` enquanto a
  // proposta do construtor está na tela e na saída.
  useEffect(() => {
    proRun.getState().publish(runState, runState ? actions : null)
  }, [proRun, runState, actions])
  useEffect(() => () => proRun.getState().publish(null, null), [proRun])

  // Retain the controller/dev process; only the running game document is removed.
  if (!active) return null

  if (phase === 'ready' && url && started) {
    return (
      <div className="flex h-full w-full flex-col bg-sz-bg">
        <div className="min-h-0 flex-1 bg-white">
          <iframe
            key={storageName}
            ref={iframeRef}
            name={storageName}
            src={url}
            title="Pré-visualização (dev-server)"
            className="h-full w-full border-0"
          />
        </div>
      </div>
    )
  }

  // Parado, preparando (os três passos; o texto técnico em "Ver detalhes"), erro e sem suporte:
  // o cartão compartilhado das prévias Pro. A barra própria ("⟳ Atualizar / ⏻ Reiniciar / nome")
  // saiu com o redesenho de 11/2026: a Topbar roda, para e atualiza pela store.
  return (
    <ProStageState
      state={runState ?? { phase: 'idle', canRun: true, canStop: false }}
      subject="game"
      flavor="local"
      onRun={actions.run}
    >
      <LogTail lines={logTail} />
    </ProStageState>
  )
}

function LogTail({ lines }: { lines: string[] }): JSX.Element | null {
  if (lines.length === 0) return null
  return <pre className="sz-pro-stage-state__tech">{lines.join('\n')}</pre>
}
