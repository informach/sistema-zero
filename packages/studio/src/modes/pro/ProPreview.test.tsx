import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { JSX } from 'react'

// mock.module NÃO é isolado por arquivo: captura o módulo real do provider e
// restaura no afterAll para não vazar o stub do useProWebContainer.
const realProvider = { ...(await import('./ProWebContainerProvider')) }

// Controle do `npm install` falso: `exit` é um deferred (resolvemos à mão DEPOIS
// do unmount, encenando a corrida que termina com a instância já cancelada).
let installSpawned = false
let resolveInstallExit: (code: number) => void = () => {}
const installKill = mock(() => undefined)
// Dispara o `server-ready` do container falso (capturado no wc.on) — leva o
// ProPreview à fase 'ready' nos testes do cabeçalho.
let fireServerReady: (url: string) => void = () => {}

function makeFakeContainer() {
  return {
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
const stableEnsureMounted = async () => makeFakeContainer()
mock.module('./ProWebContainerProvider', () => ({
  ...realProvider,
  useProWebContainer: () => ({
    ensureMounted: stableEnsureMounted,
    error: null,
  }),
}))

const { ProPreview } = await import('./ProPreview')
const { useProjectStore } = await import('../../state/projectStore')
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
    installSpawned = false
    resolveInstallExit = () => {}
    fireServerReady = () => {}
    useProjectStore.setState({ project: null })
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
