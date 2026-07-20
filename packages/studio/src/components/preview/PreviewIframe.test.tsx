import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEmptyProject, type Project } from '#core'
import { useProjectStore } from '../../state/projectStore'
import { useUIStore } from '../../state/uiStore'
import { extractDocumentTitle, PreviewIframe } from './PreviewIframe'

const PAUSED_PREVIEW_DOC = '<!doctype html><html lang="pt-BR"><body></body></html>'

describe('PreviewIframe', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
    useUIStore.setState({ previewRunning: true })
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

    fireEvent.click(screen.getByRole('button', { name: /Atualizar/ }))

    const refreshedDoc = await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).not.toBe(initialDoc)
      expect(getRenderNonce(doc)).toBeGreaterThan(initialNonce)
      return doc
    })
    const refreshedNonce = getRenderNonce(refreshedDoc)

    fireEvent.click(screen.getByRole('button', { name: /Parar/ }))

    await waitFor(() => {
      expect(getPreviewSrcDoc()).toBe(PAUSED_PREVIEW_DOC)
    })

    fireEvent.click(screen.getByRole('button', { name: /Reproduzir/ }))

    await waitFor(() => {
      const doc = getPreviewSrcDoc()
      expect(doc).toContain('Preview automático')
      expect(doc).not.toBe(PAUSED_PREVIEW_DOC)
      expect(getRenderNonce(doc)).toBeGreaterThan(refreshedNonce)
    })
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

function getRenderNonce(doc: string): number {
  const match = doc.match(/<!-- r:(\d+) -->/)
  expect(match).not.toBeNull()
  return Number(match?.[1])
}
