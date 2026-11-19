import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import 'fake-indexeddb/auto'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { clear } from 'idb-keyval'
import { createEmptyProject, type Project } from '#core'
import { useHighlightStore } from '../../state/highlightStore'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore } from '../../state/projectStore'
import { useProRun } from '../../state/proRun'
import { useUIStore } from '../../state/uiStore'
import { StudioExecutionProvider } from '../../studio/observation'
import { chosenCoverPausesSnapshots, extractDocumentTitle, PreviewIframe } from './PreviewIframe'

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

    expect(useProRun.getState().state?.phase).toBe('running')
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

  // Lote 3.1 (19/11/2026): com a prévia em outra origem o iframe usa `src`, e o `srcdoc` lido do
  // DOM era nulo. Resultado: o Parar nunca reconhecia o jogo preso e não abria o intervalo sem
  // iframe que libera o processo travado.
  it('em outra origem, o Parar reconhece o jogo preso e troca o iframe com o intervalo', async () => {
    useProjectStore.setState({ project: createPreviewProject(), isDirty: false, saveError: null })
    // A validação compara com a origem do host; o happy-dom começa sem endereço ("null").
    const happyDOM = (window as unknown as { happyDOM?: { setURL(url: string): void } }).happyDOM
    happyDOM?.setURL('http://localhost:5173/estudio')
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
  })

  // Um jogo preso num cálculo sem fim segura o processo da prévia: trocar o `srcDoc` do mesmo
  // iframe espera o cálculo, um iframe novo roda na hora (medido no navegador, ver
  // `e2e/preview-hostile-programs.spec.ts`). No caminho normal o iframe NÃO pode ser trocado.
  it('Rodar de novo mantém o mesmo iframe; Parar põe um iframe novo no lugar', async () => {
    useProjectStore.setState({ project: createPreviewProject(), isDirty: false, saveError: null })
    render(<PreviewIframe />)
    const primeiro = screen.getByTitle('Pré-visualização')
    fireEvent.load(primeiro)
    const rodando = await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      return doc
    })
    fireEvent.load(primeiro)

    act(() => useProRun.getState().actions?.reload?.())
    await waitFor(() => expect(getPreviewSrcDoc()).not.toBe(rodando))
    expect(screen.getByTitle('Pré-visualização')).toBe(primeiro)

    act(() => useProRun.getState().actions?.stop())
    await waitFor(() => expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC))
    const depoisDeParar = screen.getByTitle('Pré-visualização')
    expect(depoisDeParar).not.toBe(primeiro)
    expect(depoisDeParar.getAttribute('sandbox')).toBe(
      'allow-scripts allow-modals allow-pointer-lock',
    )
  })

  // Em navegador que não isola a prévia, um jogo que congela a aba congelaria de novo a cada
  // abertura do projeto (a prévia roda sozinha). A marca de execução quebra o laço.
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
        observed.push(window.localStorage.getItem(key))
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
      const iframe = screen.getByTitle('Pré-visualização') as HTMLIFrameElement
      fireEvent.load(iframe)
      await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
      expect(window.localStorage.getItem(chave)).not.toBeNull()

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
      expect(window.localStorage.getItem(chave)).not.toBeNull()
      batimento()
      expect(window.localStorage.getItem(chave)).not.toBeNull()
      // Um jogo pode travar depois de já ter enviado batimentos. Encerrar corretamente,
      // não um batimento anterior, é o que permite a próxima abertura automática.

      // A aba congelou com o jogo rodando: nada desmontou, a marca ficou. Na abertura seguinte...
      montada.unmount()
      expect(window.localStorage.getItem(chave)).toBeNull()
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
      expect(window.localStorage.getItem(chave)).not.toBeNull()
    }))

  it('o erro do jogo vira a fase "erro" com o lugar no código e o sinal do bloco; um jogo novo limpa', async () => {
    useProjectStore.setState({ project: createPreviewProject(), isDirty: false, saveError: null })
    render(<PreviewIframe />)
    const iframe = screen.getByTitle('Pré-visualização') as HTMLIFrameElement
    fireEvent.load(iframe)
    await waitFor(() => expect(getPreviewSrcDoc()).toContain('Preview automático'))
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
