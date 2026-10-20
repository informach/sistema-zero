import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { JSX } from 'react'
import {
  StudioProCandidatePreviewProvider,
  useProCandidatePreview,
} from '../../studio/pro-candidate-preview'
import { StudioProRuntimeProvider } from '../../studio/pro-runtime'

// mock.module NÃO é isolado por arquivo: captura o módulo real do provider e
// restaura no afterAll para não vazar o stub do useProWebContainer.
const realProvider = { ...(await import('./ProWebContainerProvider')) }

// Controle do `npm install` falso: `exit` é um deferred (resolvemos à mão DEPOIS
// do unmount, encenando a corrida que termina com a instância já cancelada).
let installSpawned = false
let mountError: string | null = null
let failMount = false
let mountAttempts = 0
let resolveInstallExit: (code: number) => void = () => {}
const installKill = mock(() => undefined)
// Dispara o `server-ready` do container falso (capturado no wc.on) — leva o
// ProPreview à fase 'ready' nos testes do cabeçalho.
let fireServerReady: (url: string) => void = () => {}
// Ponte de console: o ProPreview injeta o script via setPreviewScript.
const setPreviewScript = mock(async (_script: string) => undefined)

function makeFakeContainer() {
  return {
    setPreviewScript,
    on: (event: string, cb: (...args: unknown[]) => void) => {
      if (event === 'server-ready') {
        fireServerReady = (url: string) => cb(5173, url)
      }
      return () => undefined
    },
    spawn: mock(async (cmd: string, args: string[]) => {
      const isInstall = cmd === 'npm' && args[0] === 'install'
      if (isInstall) installSpawned = true
      return {
        output: new ReadableStream<string>({ start() {} }),
        exit: new Promise<number>((resolve) => {
          // Só o install expõe o resolver; o dev é de longa duração (pendente).
          if (isInstall) resolveInstallExit = resolve
        }),
        kill: installKill,
      }
    }),
  }
}

// `useProWebContainer` real lê um contexto que só existe sob um provider que
// BOOTA um WebContainer real (inviável no teste). Stub: devolve o container falso.
// `ensureMounted` precisa ser ESTÁVEL entre renders (o provider real o memoiza
// com useCallback): é dep do efeito do ProPreview, então uma nova referência a
// cada render re-dispara o efeito → setState → re-render → loop infinito
// ("Maximum update depth exceeded").
const stableEnsureMounted = async () => {
  mountAttempts++
  return failMount ? null : makeFakeContainer()
}
mock.module('./ProWebContainerProvider', () => ({
  ...realProvider,
  useProWebContainer: () => ({
    ensureMounted: stableEnsureMounted,
    error: mountError,
  }),
}))

const { ProPreview } = await import('./ProPreview')
const { useProjectStore } = await import('../../state/projectStore')
const { useLogsStore } = await import('../../state/logsStore')
const { resolveStudioConfig, resolvePreviewSecurity, resolveLearning, StudioConfigProvider } =
  await import('../../studio/config')

// Timeout de install GRANDE: quem encerra a corrida é o `exit` que resolvemos à
// mão, não o watchdog — isola o branch CANCELADO do branch de timeout.
const config = {
  ...resolveStudioConfig({ professional: true }, undefined),
  previewSecurity: resolvePreviewSecurity({ terminalProcessTimeoutMs: 600_000 }),
  learning: resolveLearning(),
}

function Harness(): JSX.Element {
  return (
    <StudioConfigProvider value={config}>
      <ProPreview />
    </StudioConfigProvider>
  )
}

afterAll(() => {
  mock.module('./ProWebContainerProvider', () => realProvider)
})

describe('ProPreview — install órfão no cancelamento', () => {
  afterEach(() => {
    cleanup()
    installKill.mockClear()
    setPreviewScript.mockClear()
    installSpawned = false
    failMount = false
    mountError = null
    mountAttempts = 0
    resolveInstallExit = () => {}
    fireServerReady = () => {}
    useProjectStore.setState({ project: null })
    useLogsStore.getState().clear()
  })

  it('uses the supplied remote executor without COEP or a WebContainer mount', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crossOriginIsolated')
    Object.defineProperty(globalThis, 'crossOriginIsolated', { configurable: true, value: false })
    const build = mock(async () => ({ html: '<main>Execução remota</main>' }))
    useProjectStore.setState({
      project: {
        id: 'live-pro',
        kind: 'pro',
        mode: 'code',
        name: 'Oficina',
        createdAt: 1,
        updatedAt: 1,
        files: { 'index.html': '', 'style.css': '', 'script.js': '' },
        ir: null,
        blocksState: null,
        installedExtensions: [],
        tree: { 'index.html': { kind: 'file', content: '<main>Oficina</main>' } },
        proMeta: { templateId: 'vanilla-js', devScript: 'dev' },
      },
    })
    try {
      const view = render(
        <StudioProRuntimeProvider value={{ build }}>
          <Harness />
        </StudioProRuntimeProvider>,
      )
      await waitFor(() =>
        expect(view.container.querySelector('iframe')?.srcdoc).toContain('Execução remota'),
      )
      expect(build).toHaveBeenCalledTimes(1)
      expect(mountAttempts).toBe(0)
      expect(installSpawned).toBe(false)
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'crossOriginIsolated', descriptor)
      else Reflect.deleteProperty(globalThis, 'crossOriginIsolated')
    }
  })

  it('switches only the game document while retaining the local dev-server and mounted controller', async () => {
    useProjectStore.setState({
      project: { id: 'local-candidate', name: 'Atual', kind: 'pro', mode: 'code' } as never,
    })
    let api!: ReturnType<typeof useProCandidatePreview>
    function Probe() {
      api = useProCandidatePreview()
      return null
    }
    const view = render(
      <StudioProCandidatePreviewProvider>
        <Probe />
        <Harness />
      </StudioProCandidatePreviewProvider>,
    )
    await waitFor(() => expect(installSpawned).toBe(true))
    act(() => resolveInstallExit(0))
    await waitFor(() => expect(screen.getByText(/Subindo o servidor/)).toBeTruthy())
    act(() => fireServerReady('http://fake.webcontainer.dev/'))
    const currentFrame = view.container.querySelector('iframe')!
    act(() => {
      api.show({
        projectId: 'local-candidate',
        jobId: 'job',
        revisionHash: 'c'.repeat(64),
        artifact: {
          id: 'a'.repeat(64),
          sha256: 'b'.repeat(64),
          url: `https://runtime.test/v1/artifacts/${'a'.repeat(64)}/index.html`,
          expiresAt: Date.now() + 60_000,
        },
      })
    })
    expect(view.container.querySelectorAll('iframe')).toHaveLength(1)
    expect(currentFrame.isConnected).toBe(false)
    expect(installKill).toHaveBeenCalledTimes(0)
    expect(mountAttempts).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Jogo atual' }))
    expect(view.container.querySelector('iframe')?.src).toBe('http://fake.webcontainer.dev/')
    expect(installKill).toHaveBeenCalledTimes(0)
    expect(mountAttempts).toBe(1)
    view.unmount()
    expect(installKill).toHaveBeenCalledTimes(1)
  })

  it('keeps a mount error visible until an explicit retry, without remounting in a loop', async () => {
    useProjectStore.setState({
      project: { id: 'mount-error', name: 'Pro', kind: 'pro', mode: 'code' } as never,
    })
    failMount = true
    const view = render(<Harness />)
    await screen.findByText('Não foi possível iniciar o ambiente.')
    mountError = 'ENOENT: serialized filesystem error'
    view.rerender(<Harness />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(mountAttempts).toBe(1)
    expect(installSpawned).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    await waitFor(() => expect(mountAttempts).toBe(2))
  })

  it('fase ready: cabeçalho com o nome do projeto + Atualizar que REMONTA o iframe', async () => {
    useProjectStore.setState({
      project: {
        id: 'pro-2',
        name: 'Meu Jogo Pro',
        mode: 'code',
        files: { 'index.html': '', 'style.css': '', 'script.js': '' },
      } as never,
    })

    const { container } = render(<Harness />)
    await waitFor(() => {
      expect(installSpawned).toBe(true)
    })
    act(() => {
      resolveInstallExit(0)
    })
    // Espera a fase 'starting' PINTAR antes do server-ready: disparar cedo
    // demais faz o setPhase('starting') da continuação do install atropelar o
    // 'ready' (no mundo real o servidor nunca fica pronto antes do spawn).
    await waitFor(() => {
      expect(screen.getByText(/Subindo o servidor/)).toBeTruthy()
    })
    await act(async () => {
      fireServerReady('http://fake.webcontainer.dev/')
    })

    await waitFor(() => {
      expect(screen.getByTitle('Pré-visualização (dev-server)')).toBeTruthy()
    })
    expect(screen.getByText('Meu Jogo Pro')).toBeTruthy()

    // ⟳ Atualizar: o iframe é cross-origin (sem location.reload() de fora) — o
    // reload é por REMONTAGEM (key): o nó antigo sai, um novo entra na mesma URL.
    const before = container.querySelector('iframe')
    expect(before).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar o preview' }))
    await waitFor(() => {
      const after = container.querySelector('iframe')
      expect(after).not.toBeNull()
      expect(after).not.toBe(before)
      expect(after?.getAttribute('src')).toBe('http://fake.webcontainer.dev/')
    })
  })

  it('espelha o console do app no Console da IDE — só da origem do dev-server', async () => {
    useProjectStore.setState({
      project: {
        id: 'pro-4',
        name: 'Pro Console',
        mode: 'code',
        files: { 'index.html': '', 'style.css': '', 'script.js': '' },
      } as never,
    })

    render(<Harness />)
    await waitFor(() => {
      expect(installSpawned).toBe(true)
    })
    // A ponte foi injetada com o marker + targetOrigin do HOST (via JSON).
    await waitFor(() => {
      expect(setPreviewScript).toHaveBeenCalled()
    })
    const script = setPreviewScript.mock.calls[0]?.[0] as string
    expect(script).toContain('sz-pro-console')
    expect(script).toContain(JSON.stringify(window.location.origin))

    act(() => {
      resolveInstallExit(0)
    })
    await waitFor(() => {
      expect(screen.getByText(/Subindo o servidor/)).toBeTruthy()
    })
    await act(async () => {
      fireServerReady('http://fake-um.dev/')
    })

    // Origem ERRADA (mesma forma): ignorada em silêncio.
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: 'sz-pro-console', kind: 'log', parts: ['intruso'] },
          origin: 'http://malicioso.dev',
        }),
      )
    })
    // Origem do dev-server corrente: vira entrada do Console da IDE.
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: 'sz-pro-console', kind: 'log', parts: ['olá do main.js'] },
          origin: 'http://fake-um.dev',
        }),
      )
    })

    await waitFor(() => {
      const texts = useLogsStore.getState().entries.map((e) => e.text)
      expect(texts.some((t) => t.includes('olá do main.js'))).toBe(true)
      expect(texts.some((t) => t.includes('intruso'))).toBe(false)
    })
  })

  it('⏻ Reiniciar: mata o dev atual e re-roda o ciclo até um novo server-ready', async () => {
    useProjectStore.setState({
      project: {
        id: 'pro-3',
        name: 'Pro Restart',
        mode: 'code',
        files: { 'index.html': '', 'style.css': '', 'script.js': '' },
      } as never,
    })

    const { container } = render(<Harness />)
    await waitFor(() => {
      expect(installSpawned).toBe(true)
    })
    act(() => {
      resolveInstallExit(0)
    })
    await waitFor(() => {
      expect(screen.getByText(/Subindo o servidor/)).toBeTruthy()
    })
    await act(async () => {
      fireServerReady('http://fake-um.dev/')
    })
    await waitFor(() => {
      expect(container.querySelector('iframe')?.getAttribute('src')).toBe('http://fake-um.dev/')
    })

    // Reiniciar: a cleanup do efeito mata o dev-server atual e o ciclo
    // recomeça — install de novo (morno é rápido e pega deps novas) → dev →
    // um NOVO server-ready, possivelmente noutra porta/URL.
    installSpawned = false
    installKill.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar o servidor' }))

    await waitFor(() => {
      // O processo antigo (dev) foi morto pela cleanup…
      expect(installKill).toHaveBeenCalled()
      // …e um novo npm install entrou no ciclo.
      expect(installSpawned).toBe(true)
    })
    act(() => {
      resolveInstallExit(0)
    })
    await waitFor(() => {
      expect(screen.getByText(/Subindo o servidor/)).toBeTruthy()
    })
    await act(async () => {
      fireServerReady('http://fake-dois.dev/')
    })
    await waitFor(() => {
      expect(container.querySelector('iframe')?.getAttribute('src')).toBe('http://fake-dois.dev/')
    })
  })

  it('mata o npm install se a instância desmontar antes da corrida resolver', async () => {
    // Projeto pro mínimo na store default (o ProPreview só lê id + devScript).
    useProjectStore.setState({
      project: {
        id: 'pro-1',
        name: 'Pro',
        mode: 'code',
        files: { 'index.html': '', 'style.css': '', 'script.js': '' },
      } as never,
    })

    const { unmount } = render(<Harness />)

    // Espera o install entrar na corrida (já passou do `if (cancelled) return`
    // que vem logo após o ensureMounted).
    await waitFor(() => {
      expect(installSpawned).toBe(true)
    })

    // Desmonta: cancelled=true, mas o install segue pendurado na corrida.
    unmount()
    // A corrida resolve AGORA (install "terminou") com a instância já cancelada:
    // o branch cancelado precisa matar o processo para não deixá-lo órfão no
    // container singleton.
    resolveInstallExit(0)

    await waitFor(() => {
      expect(installKill).toHaveBeenCalledTimes(1)
    })
  })
})
