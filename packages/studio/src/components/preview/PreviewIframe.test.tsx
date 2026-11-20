import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { createEmptyProject, type Project } from '#core'
import * as gameUiFonts from '../../official-extensions/gameUiFont'
import * as gameStorage from '../../state/gameStorage'
import { useHighlightStore } from '../../state/highlightStore'
import { useLogsStore } from '../../state/logsStore'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore } from '../../state/projectStore'
import { useProRun } from '../../state/proRun'
import { useUIStore } from '../../state/uiStore'
import { StudioExecutionProvider } from '../../studio/observation'
import {
  chosenCoverPausesSnapshots,
  extractDocumentTitle,
  heldPreviewDocument,
  PreviewIframe,
} from './PreviewIframe'

const PAUSED_PREVIEW_DOC = '<!doctype html><html lang="pt-BR"><body></body></html>'

/** Preserve real storage behavior; report ordering only when the original assertion fails. */
async function traceTripwire(run: () => Promise<void>): Promise<void> {
  const storage = window.localStorage
  const setItem = storage.setItem.bind(storage)
  const removeItem = storage.removeItem.bind(storage)
  const changes: Array<{ operation: string; key: string; time: number; stack?: string }> = []
  const record = (operation: string, key: string) => {
    if (!key.startsWith('sz:run-tripwire:')) return
    changes.push({ operation, key, time: performance.now(), stack: new Error().stack })
    if (changes.length > 20) changes.shift()
  }
  const set = spyOn(storage, 'setItem').mockImplementation((key, value) => {
    record('set', key)
    setItem(key, value)
  })
  const remove = spyOn(storage, 'removeItem').mockImplementation((key) => {
    record('remove', key)
    removeItem(key)
  })
  try {
    await run()
  } catch (error) {
    console.error('Tripwire ordering at failure', {
      changes,
      phase: useProRun.getState().state?.phase,
      running: useUIStore.getState().previewRunning,
    })
    throw error
  } finally {
    set.mockRestore()
    remove.mockRestore()
  }
}

describe('PreviewIframe', () => {
  beforeEach(async () => {
    await clear(captureProjectStorageScope().store)
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  // Desde o redesenho de 11/2026 a prévia não tem barra própria: Rodar, Parar e Atualizar moram
  // na barra de cima e no palco (`ClassicStage`), que chamam as ações que ela publica no `proRun`.
  it('não anuncia execução enquanto a leitura do estado salvo ainda segura o documento', async () => {
    const project = createPreviewProject()
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    const originalLoad = gameStorage.loadGameStorage
    let release = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const read = spyOn(gameStorage, 'loadGameStorage').mockImplementation(async (id) => {
      await pending
      return originalLoad(id)
    })
    try {
      render(<PreviewIframe />)
      await act(async () => {})
      expect(read).toHaveBeenCalledWith(project.id)
      expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
      expect(useProRun.getState().state?.phase).toBe('preparing')
      expect(screen.getByTitle('Pré-visualização').getAttribute('aria-busy')).toBe('true')
      await act(async () => release())
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
      expect(useProRun.getState().state?.phase).toBe('running')
      expect(screen.getByTitle('Pré-visualização').getAttribute('aria-busy')).toBe('false')
    } finally {
      release()
      read.mockRestore()
    }
  })

  it('preserva o jogo ao preparar outra fonte e permite Parar durante a preparação', async () => {
    const base = createPreviewProject()
    const project: Project = {
      ...base,
      installedExtensions: [{ id: 'game-2d', version: '2.1.0', installedAt: 0 }],
    }
    const originalLoad = gameUiFonts.loadGameUiFont
    let release = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const load = spyOn(gameUiFonts, 'loadGameUiFont').mockImplementation(async (...args) => {
      if (args[0] === 'bungee') await pending
      return originalLoad(...args)
    })
    try {
      useProjectStore.setState({ project, isDirty: false, saveError: null })
      render(<PreviewIframe />)
      fireEvent.load(screen.getByTitle('Pré-visualização'))
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
      const runningDoc = getPreviewSrcDoc()
      act(() =>
        useProjectStore.setState({
          project: {
            ...project,
            files: { ...project.files, 'script.js': 'SZGame2D.useFont("bungee");' },
          },
          isDirty: true,
        }),
      )
      await waitFor(() => expect(load.mock.calls.some((args) => args[0] === 'bungee')).toBe(true), {
        timeout: 3000,
      })
      expect(useProRun.getState().state?.phase).toBe('preparing')
      expect(getPreviewSrcDoc() === runningDoc).toBe(true)
      act(() => useProRun.getState().actions?.stop())
      await waitFor(() => expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC))
      await act(async () => release())
      expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
      expect(useProRun.getState().state?.phase).toBe('idle')
      await act(async () => useProRun.getState().actions?.run())
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Bungee'))
    } finally {
      release()
      load.mockRestore()
    }
  })

  it('aguarda comando explícito sem anunciar execução nem bloquear o botão Rodar', async () => {
    useProjectStore.setState({ project: createPreviewProject(), isDirty: false, saveError: null })
    render(
      <StudioExecutionProvider
        value={{
          editingAccess: 'author',
          autoRun: false,
          requireIsolatedPreview: false,
          muted: false,
        }}
      >
        <PreviewIframe />
      </StudioExecutionProvider>,
    )
    await act(async () => {})
    expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
    expect(useProRun.getState().state).toMatchObject({
      phase: 'idle',
      canRun: true,
      canStop: false,
    })
    await act(async () => useProRun.getState().actions?.run())
    await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
    expect(useProRun.getState().state?.phase).toBe('running')
  })

  it('um cenário 3D que não confere vai para os Problemas sem derrubar a prévia', async () => {
    useLogsStore.getState().clear()
    const project = createPreviewProject()
    project.assets = [
      {
        id: 'cena-quebrada',
        name: 'praca',
        kind: 'scene3d',
        source: 'library',
        originalFileName: 'praca.scene3d.json',
        dataUrl: 'data:application/json;base64,e30=',
      },
    ]
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    expect(() => render(<PreviewIframe />)).not.toThrow()
    await waitFor(() =>
      expect(useLogsStore.getState().entries.some((e) => e.text.includes('praca'))).toBe(true),
    )
    useLogsStore.getState().clear()
  })

  it('executa ao montar, reexecuta ao atualizar e volta a executar ao sair de parado', async () => {
    useProjectStore.setState({
      project: createPreviewProject(),
      isDirty: false,
      saveError: null,
    })

    render(<PreviewIframe />)

    expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
    fireEvent.load(screen.getByTitle('Pré-visualização'))

    const initialDoc = await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).toMatch(/<!-- r:\d+ -->/)
      return doc
    })
    const initialNonce = getRenderNonce(initialDoc)

    // O documento entra no DOM antes de o efeito publicar a fase no proRun.
    await waitFor(() => expect(useProRun.getState().state?.phase).toBe('running'))
    act(() => useProRun.getState().actions?.reload?.())

    const refreshedDoc = await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).not.toBe(initialDoc)
      expect(getRenderNonce(doc)).toBeGreaterThan(initialNonce)
      return doc
    })
    const refreshedNonce = getRenderNonce(refreshedDoc)

    act(() => useProRun.getState().actions?.stop())

    await waitFor(() => {
      expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
    })

    await waitFor(() => expect(useProRun.getState().state?.phase).toBe('idle'))
    act(() => useProRun.getState().actions?.run())

    await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).not.toBe(PAUSED_PREVIEW_DOC)
      expect(getRenderNonce(doc)).toBeGreaterThan(refreshedNonce)
    })
  })

  for (const command of ['Parar', 'Rodar de novo'] as const) {
    it(`${command} libera uma primeira execução sem load e conserva a fonte`, async () => {
      const project = createPreviewProject()
      // A partida automática grava antes de executar (revisão da missão, execução item 2):
      // a edição pendente que o Parar precisa conservar nasce depois de a execução começar.
      useProjectStore.setState({ project, isDirty: false, saveError: null })
      render(<PreviewIframe />)
      const frame = screen.getByTitle('Pré-visualização')
      // Model a program that never completes its first document load. The real
      // document and its preparation still run; only its load acknowledgment is withheld.
      frame.addEventListener(
        'load',
        (event) => {
          if (frame.getAttribute('srcdoc') !== PAUSED_PREVIEW_DOC) event.stopImmediatePropagation()
        },
        true,
      )
      fireEvent.load(frame)
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
      act(() => useProjectStore.setState({ isDirty: command === 'Parar' }))
      fireEvent.load(frame)
      await act(async () => {
        if (command === 'Parar') useProRun.getState().actions?.stop()
        else useProRun.getState().actions?.reload?.()
      })
      expect(document.querySelector('[data-sz-preview-gap]')).not.toBeNull()
      expect(useProjectStore.getState().project?.files?.['script.js']).toBe(
        project.files['script.js'],
      )
      if (command === 'Parar') expect(useProjectStore.getState().isDirty).toBe(true)
    })
  }

  // Revisão da missão (achado E3): o vigia da troca derrubava até três vezes um documento que só
  // demora a dar `load`. Ele agora exige silêncio: com sinal de vida do iframe, espera.
  for (const sinalDeVida of [true, false] as const) {
    it(`documento novo sem load ${sinalDeVida ? 'que dá sinal de vida é esperado' : 'e calado é trocado'}`, async () => {
      const project = createPreviewProject()
      useProjectStore.setState({ project, isDirty: false, saveError: null })
      render(<PreviewIframe />)
      fireEvent.load(screen.getByTitle('Pré-visualização'))
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
      const antes = screen.getByTitle('Pré-visualização') as HTMLIFrameElement
      // O documento B nunca dá load (módulos chegando, ou o processo preso pelo A).
      antes.addEventListener(
        'load',
        (event) => {
          if (antes.getAttribute('srcdoc')?.includes('Documento B'))
            event.stopImmediatePropagation()
        },
        true,
      )
      act(() =>
        useProjectStore.setState({
          project: {
            ...project,
            files: {
              ...project.files,
              'index.html': project.files['index.html'].replace(
                'Preview automático',
                'Documento B',
              ),
            },
          },
          isDirty: false,
        }),
      )
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Documento B'), { timeout: 3000 })
      const contentWindow = antes.contentWindow
      if (!contentWindow) throw new Error('O happy-dom não deu janela ao iframe')
      if (sinalDeVida)
        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              source: contentWindow,
              origin: 'null',
              data: { source: 'sz-preview', kind: 'heartbeat', parts: [], timestamp: Date.now() },
            }),
          )
        })
      await act(async () => Bun.sleep(3_600))
      const depois = screen.queryByTitle('Pré-visualização')
      if (sinalDeVida) {
        expect(document.querySelector('[data-sz-preview-gap]')).toBeNull()
        expect(depois).toBe(antes)
      } else {
        expect(depois === antes && !document.querySelector('[data-sz-preview-gap]')).toBe(false)
      }
    }, 10_000)
  }

  // Lote 3.1 (19/11/2026): com a prévia em outra origem o iframe usa `src`, e o `srcdoc` lido do
  // DOM era nulo. Resultado: o Parar nunca reconhecia o jogo preso e não abria o intervalo sem
  // iframe que libera o processo travado.
  it('em outra origem, o Parar reconhece o jogo preso e troca o iframe com o intervalo', async () => {
    useProjectStore.setState({ project: createPreviewProject(), isDirty: false, saveError: null })
    // A validação compara com a origem do host; o happy-dom começa sem endereço ("null").
    // ⚠️ O endereço é global do processo: os outros arquivos da pasta rodam no mesmo processo e
    // conferem a origem (o `StudioProjectPlayer` reprovava). Volta ao endereço de antes no fim.
    const happyDOM = (window as unknown as { happyDOM?: { setURL(url: string): void } }).happyDOM
    const previousURL = window.location.href
    happyDOM?.setURL('http://localhost:5173/estudio')
    try {
      const adapter = {
        createPreviewUrl: async () => 'https://previa.exemplo.test/jogo.html',
        releasePreviewUrl: () => undefined,
      }
      render(
        <StudioExecutionProvider
          value={{
            editingAccess: 'author',
            autoRun: true,
            requireIsolatedPreview: true,
            muted: false,
            originAdapter: adapter,
          }}
        >
          <PreviewIframe />
        </StudioExecutionProvider>,
      )
      fireEvent.load(screen.getByTitle('Pré-visualização'))
      const frame = await waitFor(
        () => {
          const iframe = screen.getByTitle('Pré-visualização')
          expect(iframe.getAttribute('src')).toBe('https://previa.exemplo.test/jogo.html')
          return iframe
        },
        { timeout: 3000 },
      )
      fireEvent.load(frame)
      await waitFor(() => expect(useProRun.getState().state?.phase).toBe('running'))
      // Nenhum batimento desde o load, e o relógio passou do limite de silêncio.
      const realNow = Date.now
      Date.now = () => realNow() + 10_000
      try {
        act(() => useProRun.getState().actions?.stop())
        expect(document.querySelector('[data-sz-preview-gap]')).not.toBeNull()
      } finally {
        Date.now = realNow
      }
    } finally {
      happyDOM?.setURL(previousURL)
    }
  })

  it('a casca em outro site que nunca fica pronta volta ao documento direto e avisa', async () => {
    // Revisão da missão (achado E5): sem `sz-shell:ready` o documento nunca era enviado e o palco
    // ficava vazio com a barra dizendo "rodando".
    useProjectStore.setState({ project: createPreviewProject(), isDirty: false, saveError: null })
    const happyDOM = (window as unknown as { happyDOM?: { setURL(url: string): void } }).happyDOM
    const previousURL = window.location.href
    happyDOM?.setURL('http://localhost:5173/estudio')
    useLogsStore.setState({ entries: [] })
    try {
      render(
        <StudioExecutionProvider
          value={{
            editingAccess: 'author',
            autoRun: true,
            requireIsolatedPreview: false,
            muted: false,
            shellUrl: 'https://casca.exemplo.test/v1/classic-shell/1.html',
          }}
        >
          <PreviewIframe />
        </StudioExecutionProvider>,
      )
      expect(screen.getByTitle('Pré-visualização').getAttribute('src')).toBe(
        'https://casca.exemplo.test/v1/classic-shell/1.html',
      )
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'), {
        timeout: 6000,
      })
      expect(screen.getByTitle('Pré-visualização').getAttribute('src')).toBeNull()
      expect(
        useLogsStore.getState().entries.some((entry) => entry.text.includes('prévia isolada')),
      ).toBe(true)
    } finally {
      happyDOM?.setURL(previousURL)
    }
  }, 10_000)

  it('na casca, o "carregou" de um documento já trocado não vale pelo atual', async () => {
    // Achado E7 da revisão de 20/11: o aviso não dizia qual documento carregou.
    const project = createPreviewProject()
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    const happyDOM = (window as unknown as { happyDOM?: { setURL(url: string): void } }).happyDOM
    const previousURL = window.location.href
    happyDOM?.setURL('http://localhost:5173/estudio')
    const origin = 'https://casca.exemplo.test'
    try {
      render(
        <StudioExecutionProvider
          value={{
            editingAccess: 'author',
            autoRun: true,
            requireIsolatedPreview: false,
            muted: false,
            shellUrl: `${origin}/v1/classic-shell/1.html`,
          }}
        >
          <PreviewIframe />
        </StudioExecutionProvider>,
      )
      const frame = screen.getByTitle('Pré-visualização') as HTMLIFrameElement
      // O happy-dom não dá janela a um iframe com `src` de outro site: uma janela falsa no próprio
      // elemento (é o que o componente consulta para mandar e para autenticar a origem do aviso).
      const enviados: { type?: string; seq?: number; document?: string }[] = []
      const casca = {
        postMessage: (data: { type?: string; seq?: number; document?: string }) => {
          enviados.push(data)
        },
      }
      Object.defineProperty(frame, 'contentWindow', { configurable: true, get: () => casca })
      const daCasca = (data: unknown) =>
        act(() => {
          window.dispatchEvent(new MessageEvent('message', { source: casca, origin, data }))
        })
      fireEvent.load(frame)
      daCasca({ type: 'sz-shell:ready' })
      const pedidos = () => enviados.filter((message) => message.type === 'sz-shell:load')
      // A casca carrega o primeiro documento (a prévia parada) e avisa, como a página dela faria.
      await waitFor(() => expect(pedidos().length).toBeGreaterThan(0))
      daCasca({ type: 'sz-shell:loaded', seq: pedidos().at(-1)?.seq })
      await waitFor(() => expect(pedidos().at(-1)?.document).toContain('Preview automático'), {
        timeout: 3000,
      })
      const antigo = pedidos().at(-1)?.seq
      act(() =>
        useProjectStore.setState({
          project: {
            ...project,
            files: {
              ...project.files,
              'index.html': project.files['index.html'].replace(
                'Preview automático',
                'Documento B',
              ),
            },
          },
          isDirty: false,
        }),
      )
      await waitFor(() => expect(pedidos().at(-1)?.document).toContain('Documento B'), {
        timeout: 3000,
      })
      const atual = pedidos().at(-1)?.seq
      expect(typeof antigo).toBe('number')
      expect(atual).toBe((antigo ?? 0) + 1)
      const avisosDeSom = () => enviados.filter((message) => message.type === 'sz:audio').length
      const antes = avisosDeSom()
      daCasca({ type: 'sz-shell:loaded', seq: antigo })
      expect(avisosDeSom()).toBe(antes)
      daCasca({ type: 'sz-shell:loaded', seq: atual })
      expect(avisosDeSom()).toBe(antes + 1)
    } finally {
      happyDOM?.setURL(previousURL)
    }
  }, 10_000)

  // Um jogo preso num cálculo sem fim segura o processo da prévia: trocar o `srcDoc` do mesmo
  // iframe espera o cálculo, um iframe novo roda na hora (medido no navegador, ver
  // `e2e/preview-hostile-programs.spec.ts`). No caminho normal o iframe NÃO pode ser trocado.
  it('Rodar de novo mantém o mesmo iframe; Parar põe um iframe novo no lugar', async () => {
    useProjectStore.setState({ project: createPreviewProject(), isDirty: false, saveError: null })
    render(<PreviewIframe />)
    fireEvent.load(screen.getByTitle('Pré-visualização'))
    const rodando = await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      return doc
    })
    const primeiro = screen.getByTitle('Pré-visualização')
    fireEvent.load(primeiro)

    act(() => useProRun.getState().actions?.reload?.())
    await waitFor(() => expect(getPreviewSrcDoc()).not.toBe(rodando))
    expect(screen.getByTitle('Pré-visualização') === primeiro).toBe(true)

    act(() => useProRun.getState().actions?.stop())
    await waitFor(() => expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC))
    const depoisDeParar = screen.getByTitle('Pré-visualização')
    expect(depoisDeParar === primeiro).toBe(false)
    expect(depoisDeParar.getAttribute('sandbox')).toBe(
      'allow-scripts allow-modals allow-pointer-lock',
    )
  })

  // Em navegador que não isola a prévia, um jogo que congela a aba congelaria de novo a cada
  // abertura do projeto (a prévia roda sozinha). A marca de execução quebra o laço.
  // Desde o achado E6 (20/11) a marca é por aba: `sz:run-tripwire:<projeto>#<aba>`.
  const marcaDaAba = (projectId: string) => {
    const key = Object.keys(window.localStorage).find((k) =>
      k.startsWith(`sz:run-tripwire:${projectId}#`),
    )
    return key === undefined ? null : window.localStorage.getItem(key)
  }
  it('a marca já existe quando o documento executável é observado no DOM', async () => {
    const project = createPreviewProject()
    const key = `sz:run-tripwire:${project.id}`
    window.localStorage.removeItem(key)
    useProjectStore.setState({ project, isDirty: false, saveError: null })
    render(<PreviewIframe />)
    const frame = screen.getByTitle('Pré-visualização')
    const observed: Array<string | null> = []
    const observer = new MutationObserver(() => {
      if (frame.getAttribute('srcdoc')?.includes('Preview automático'))
        observed.push(marcaDaAba(project.id))
    })
    observer.observe(frame, { attributes: true, attributeFilter: ['srcdoc'] })
    try {
      fireEvent.load(frame)
      await waitFor(() => expect(observed.length).toBeGreaterThan(0))
      expect(observed.every((mark) => mark !== null)).toBe(true)
    } finally {
      observer.disconnect()
    }
  })

  it('a marca de execução permanece após sinais de vida e só sai ao parar ou sair corretamente', async () =>
    traceTripwire(async () => {
      const project = createPreviewProject()
      const chave = `sz:run-tripwire:${project.id}`
      window.localStorage.removeItem(chave)
      useProjectStore.setState({ project, isDirty: false, saveError: null })
      const montada = render(<PreviewIframe />)
      fireEvent.load(screen.getByTitle('Pré-visualização'))
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
      const iframe = screen.getByTitle('Pré-visualização') as HTMLIFrameElement
      expect(marcaDaAba(project.id)).not.toBeNull()

      const contentWindow = iframe.contentWindow
      if (!contentWindow) throw new Error('O happy-dom não deu janela ao iframe')
      const batimento = () =>
        act(() => {
          window.dispatchEvent(
            new MessageEvent('message', {
              source: contentWindow,
              origin: 'null',
              data: { source: 'sz-preview', kind: 'heartbeat', parts: [], timestamp: Date.now() },
            }),
          )
        })
      batimento()
      batimento()
      expect(marcaDaAba(project.id)).not.toBeNull()
      batimento()
      expect(marcaDaAba(project.id)).not.toBeNull()
      // Um jogo pode travar depois de já ter enviado batimentos. Encerrar corretamente,
      // não um batimento anterior, é o que permite a próxima abertura automática.

      // A aba congelou com o jogo rodando: nada desmontou, a marca ficou. Na abertura seguinte...
      montada.unmount()
      expect(marcaDaAba(project.id)).toBeNull()
      // A marca que uma aba congelada deixa (aqui no formato sem dono, que conta como parada).
      window.localStorage.setItem(chave, String(Date.now()))
      useUIStore.setState({ previewRunning: true })
      render(<PreviewIframe />)
      fireEvent.load(screen.getByTitle('Pré-visualização'))
      await waitFor(() => expect(useProRun.getState().state?.phase).toBe('idle'))
      expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
      expect(window.localStorage.getItem(chave)).toBeNull()

      // ...a prévia espera o Rodar, e aí roda (com a marca posta de novo).
      act(() => useProRun.getState().actions?.run())
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
      expect(marcaDaAba(project.id)).not.toBeNull()
    }))

  it('o erro do jogo vira a fase "erro" com o lugar no código e o sinal do bloco; um jogo novo limpa', async () => {
    useProjectStore.setState({ project: createPreviewProject(), isDirty: false, saveError: null })
    render(<PreviewIframe />)
    fireEvent.load(screen.getByTitle('Pré-visualização'))
    await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
    await waitFor(() => expect(useProRun.getState().state?.phase).toBe('running'))
    const iframe = screen.getByTitle('Pré-visualização') as HTMLIFrameElement
    const contentWindow = iframe.contentWindow
    if (!contentWindow) throw new Error('O happy-dom não deu janela ao iframe')
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          source: contentWindow,
          origin: 'null',
          data: {
            source: 'sz-preview',
            kind: 'runtimeError',
            parts: ['TypeError: Cannot read properties of undefined'],
            timestamp: Date.now(),
            error: { message: 'x', userCode: true, line: 7, col: 3 },
          },
        }),
      )
    })
    await waitFor(() => expect(useProRun.getState().state?.phase).toBe('error'))
    const state = useProRun.getState().state
    expect(state?.errorKind).toBe('runtime')
    expect(state?.errorAt).toEqual({ file: 'script.js', line: 7, column: 3 })
    expect(useHighlightStore.getState().runtimeMark).toMatchObject({ file: 'script.js', line: 7 })
    // Rodar de novo = documento novo: o erro e o sinal saem.
    act(() => useProRun.getState().actions?.reload?.())
    await waitFor(() => expect(useProRun.getState().state?.phase).toBe('running'))
    expect(useHighlightStore.getState().runtimeMark).toBeNull()
  })

  it('executa quando o projeto carregado chega depois da montagem do preview', async () => {
    render(<PreviewIframe />)

    expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
    fireEvent.load(screen.getByTitle('Pré-visualização'))

    act(() => {
      useProjectStore.setState({
        project: createPreviewProject(),
        isDirty: false,
        saveError: null,
      })
    })

    await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).toMatch(/<!-- r:\d+ -->/)
    })
  })

  it('permite Pointer Lock para a câmera FPS sem abrir o isolamento de origem', () => {
    render(<PreviewIframe />)

    const sandbox = screen.getByTitle('Pré-visualização').getAttribute('sandbox') ?? ''
    expect(sandbox).toContain('allow-pointer-lock')
    expect(sandbox).not.toContain('allow-same-origin')
  })

  it('mostra gamepad automaticamente somente em touch quando a IR usa teclado', async () => {
    const originalTouchPoints = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints')
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 1 })
    const project = createPreviewProject()
    if (!project.ir || !('behavior' in project.ir)) throw new Error('IR v2 esperada no teste')
    project.ir.behavior.loops.push({
      type: 'g2d:updateEachFrame',
      body: [{ type: 'g2d:topDown', spriteVar: 'jogador', speed: 4 }],
    })
    useProjectStore.setState({ project, isDirty: false, saveError: null })

    try {
      render(<PreviewIframe />)
      await waitFor(() => {
        expect(screen.getByRole('group', { name: 'Controles do jogo' })).not.toBeNull()
      })
    } finally {
      if (originalTouchPoints)
        Object.defineProperty(navigator, 'maxTouchPoints', originalTouchPoints)
      else Reflect.deleteProperty(navigator, 'maxTouchPoints')
    }
  })

  it('não mostra gamepad em dispositivo sem touch mesmo quando a IR usa teclado', async () => {
    const originalTouchPoints = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints')
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 })
    const project = createPreviewProject()
    if (!project.ir || !('behavior' in project.ir)) throw new Error('IR v2 esperada no teste')
    project.ir.behavior.loops.push({
      type: 'g2d:updateEachFrame',
      body: [{ type: 'g2d:topDown', spriteVar: 'jogador', speed: 4 }],
    })
    useProjectStore.setState({ project, isDirty: false, saveError: null })

    try {
      render(<PreviewIframe />)
      await waitFor(() => {
        expect(getPreviewSrcDoc()).toContain('Preview automático')
        expect(screen.queryByRole('group', { name: 'Controles do jogo' })).toBeNull()
      })
    } finally {
      if (originalTouchPoints)
        Object.defineProperty(navigator, 'maxTouchPoints', originalTouchPoints)
      else Reflect.deleteProperty(navigator, 'maxTouchPoints')
    }
  })
})

// Comportamento ANTERIOR (referência): montar o documento todo e ler o <title>.
// O `extractDocumentTitle` deve devolver EXATAMENTE o mesmo, sem parsear tudo.
function titleViaFullParse(html: string): string | null {
  try {
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    const title = parsed.querySelector('title')?.textContent?.trim()
    if (title) return title
  } catch {
    // HTML malformado: cai para null (o componente usa o nome do projeto).
  }
  return null
}

describe('heldPreviewDocument (achado E4): o iframe trocado não recebe o documento que travou', () => {
  it('enquanto o próximo prepara, segura o documento que já estava', () => {
    expect(
      heldPreviewDocument({ holding: true, held: 'jogo-a', stuck: null, candidate: 'jogo-b' }),
    ).toBe('jogo-a')
  })

  it('mas não o que travou o iframe que acabou de ser trocado', () => {
    expect(
      heldPreviewDocument({ holding: true, held: 'preso', stuck: 'preso', candidate: 'novo' }),
    ).toBe(PAUSED_PREVIEW_DOC)
  })

  it('pronto o próximo, vale o próximo', () => {
    expect(
      heldPreviewDocument({ holding: false, held: 'preso', stuck: 'preso', candidate: 'novo' }),
    ).toBe('novo')
  })
})

describe('extractDocumentTitle (paridade com o parse completo)', () => {
  const cases: string[] = [
    // Sem título → null (caminho comum, antes montava o documento à toa).
    '<!doctype html><html><body><h1>oi</h1></body></html>',
    '',
    '   ',
    // Título simples.
    '<!doctype html><html><head><title>Meu Jogo</title></head><body></body></html>',
    // Espaços ao redor (devem ser aparados).
    '<head><title>   Espaçado   </title></head>',
    // Entidades HTML (precisam ser decodificadas como textContent faria).
    '<head><title>Frutas &amp; Verduras</title></head>',
    '<head><title>5 &lt; 10 &amp;&amp; 10 &gt; 5</title></head>',
    '<head><title>Aspas &quot;duplas&quot; e &#39;simples&#39;</title></head>',
    // Atributos na tag title.
    '<head><title lang="pt-BR">Com Atributo</title></head>',
    // Caixa alta (HTML é case-insensitive).
    '<head><TITLE>Maiúsculo</TITLE></head>',
    // Múltiplos títulos → vence o primeiro (igual querySelector).
    '<head><title>Primeiro</title><title>Segundo</title></head>',
    // Título vazio / só espaços → null.
    '<head><title></title></head>',
    '<head><title>   </title></head>',
    // Quebra de linha dentro do título.
    '<head><title>Linha 1\n  Linha 2</title></head>',
    // Não confundir com uma tag parecida.
    '<head><titlebar>Não é título</titlebar></head>',
    // Título no body (querySelector acharia mesmo assim).
    '<body><title>No Corpo</title></body>',
  ]

  for (const html of cases) {
    it(`casa o parse completo para: ${JSON.stringify(html).slice(0, 50)}`, () => {
      expect(extractDocumentTitle(html)).toBe(titleViaFullParse(html))
    })
  }
})

function createPreviewProject(): Project {
  return {
    ...createEmptyProject('project-preview', 'Projeto Preview'),
    files: {
      'index.html': `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Projeto Preview</title>
  </head>
  <body>
    <main>Preview automático</main>
  </body>
</html>`,
      'style.css': 'main { color: rgb(12, 83, 148); }',
      'script.js': 'document.body.dataset.executed = "true";',
    },
  }
}

function getPreviewSrcDoc(): string {
  const iframe = screen.getByTitle('Pré-visualização')
  return iframe.getAttribute('srcdoc') ?? ''
}

/**
 * ⭐ Regressão de um defeito MUDO: o documento esperava a fonte chegar
 * (`gameUiFontReady` segura o render) e depois montava o preview SEM ela. Nada
 * quebrava — a criança escolhia "Press Start 2P", nada mudava na tela, e o
 * jogo exportado (que passa pelo outro caminho) saía com a letra certa.
 *
 * Este teste anda pelo caminho do EDITOR, que era o único quebrado.
 */
describe('PreviewIframe — a fonte escolhida chega ao documento', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  it('embute a fonte que o bloco pediu, e só ela', async () => {
    const project = createPreviewProject()
    useProjectStore.setState({
      project: {
        ...project,
        files: {
          ...project.files,
          'script.js': 'SZGame2D.useFont("pressStart2P");',
        },
        // ⚠️ A extensão instalada é PRÉ-REQUISITO: um projeto sem nenhuma não
        // recebe a fonte (é do HUD dos motores), e mandá-la seria 12 KB à toa
        // numa página de HTML e CSS.
        installedExtensions: [{ id: 'game-2d', version: '0.74.0', installedAt: 0 }],
      },
      isDirty: false,
      saveError: null,
    })

    render(<PreviewIframe />)
    fireEvent.load(screen.getByTitle('Pré-visualização'))

    await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      // A família resolvida chega ao runtime pelo bootstrap...
      expect(doc).toContain('Press Start 2P')
      // ...e os bytes vêm embutidos, porque a CSP do preview não busca fonte na rede.
      expect(doc).toContain('data:font/woff2;base64,')
      // Uma fonte só: as outras quatro nem entram no grafo.
      expect(doc.split('@font-face').length - 1).toBe(1)
    })
  })
})

function getRenderNonce(doc: string): number {
  const match = doc.match(/<!-- r:(\d+) -->/)
  expect(match).not.toBeNull()
  return Number(match?.[1])
}

describe('chosenCoverPausesSnapshots (B3, 26/09/2026): o preview para de fotografar pela capa RESOLVIDA, não pelo nome cru', () => {
  const imagem = {
    id: 'a1',
    name: 'tela-inicial',
    kind: 'image' as const,
    dataUrl: 'data:image/png;base64,AAA',
    source: 'upload' as const,
  }

  it('sem projeto, ou sem capa escolhida, as fotos seguem', () => {
    expect(chosenCoverPausesSnapshots(null)).toBe(false)
    expect(chosenCoverPausesSnapshots({ assets: [imagem] })).toBe(false)
  })

  it('capa escolhida que EXISTE no projeto segura as fotos', () => {
    expect(chosenCoverPausesSnapshots({ assets: [imagem], coverAssetName: 'tela-inicial' })).toBe(
      true,
    )
  })

  it('nome pendurado (a imagem já não está no projeto, ou não é imagem) NÃO segura as fotos: a capa cai na automática e ela precisa existir', () => {
    expect(chosenCoverPausesSnapshots({ assets: [], coverAssetName: 'tela-inicial' })).toBe(false)
    expect(
      chosenCoverPausesSnapshots({
        assets: [{ ...imagem, kind: 'audio' }],
        coverAssetName: 'tela-inicial',
      }),
    ).toBe(false)
  })
})

describe('PreviewIframe — o Kit Plataforma troca de variante AO VIVO', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  it('sem o kit no código, o runtime vem sem ele; a criança usa o kit e o runtime recarrega com ele', async () => {
    const base = createPreviewProject()
    const withJs = (js: string): Project => ({
      ...base,
      files: { ...base.files, 'script.js': js },
      installedExtensions: [{ id: 'game-3d', version: '0.31.0', installedAt: 0 }],
    })
    // `MAX_STAGE_MESHES` só existe no fragmento do kit; `platformKitAbsent` só na variante sem.
    useProjectStore.setState({
      project: withJs('const cena = SZGame3D.createFullscreenScene("#000");'),
      isDirty: false,
      saveError: null,
    })
    render(<PreviewIframe />)
    fireEvent.load(screen.getByTitle('Pré-visualização'))
    await waitFor(
      () => {
        const doc = getPreviewSrcDoc()
        expect(doc).toContain('platformKitAbsent')
        expect(doc).not.toContain('MAX_STAGE_MESHES')
      },
      { timeout: 5000 },
    )

    act(() => {
      useProjectStore.setState({
        project: withJs('const jogo = SZGame3D.createPlatformScene("tela");'),
        isDirty: true,
        saveError: null,
      })
    })
    await waitFor(
      () => {
        const doc = getPreviewSrcDoc()
        expect(doc).toContain('MAX_STAGE_MESHES')
        expect(doc).not.toContain('platformKitAbsent')
      },
      { timeout: 5000 },
    )
  })
})
