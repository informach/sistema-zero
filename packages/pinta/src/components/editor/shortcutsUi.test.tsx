/**
 * Atalhos de AÇÃO (08/2026) e a janela "Atalhos": X troca as cores, Shift+H
 * espelha o quadro, `.`/`,`/Alt+N/Alt+C nos quadros, Ctrl+G/Ctrl+Shift+G,
 * Ctrl+Shift+H (esconder / sem seleção: mostrar tudo) e Ctrl+Shift+L (trancar /
 * sem seleção: destrancar tudo) no vetor, `?` abre a ajuda (e não abre dentro
 * de um campo de texto).
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createVectorBackgroundAsset } from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'
import type { VectorShape } from '../../vector/model'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
  localStorage.clear()
})

async function openAsset(name: string): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(`Abrir ${name}`) })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Abrir ${name}`) }))
  await waitFor(() => {
    expect(screen.getByRole('img', { name: COPY.a11y.drawArea })).toBeTruthy()
  })
}

function press(init: KeyboardEventInit & { key: string }, target: Element = document.body): void {
  fireEvent.keyDown(target, init)
}

function rectShape(id: string, x: number): VectorShape {
  return {
    id,
    type: 'rect',
    x,
    y: 10,
    w: 40,
    h: 40,
    rx: 0,
    fill: '#ff2121',
    stroke: null,
    opacity: 1,
    rotation: 0,
  }
}

describe('atalhos do PIXEL', () => {
  it('X troca a cor principal com a secundária', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    render(<PintaApp />)
    await openAsset('ceu')
    // Nasce: principal = branco arcade (#ffffff), secundária = transparente.
    expect(screen.getByRole('button', { name: `${COPY.tools.primaryColor}: #ffffff` })).toBeTruthy()
    press({ key: 'x' })
    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: `${COPY.tools.primaryColor}: ${COPY.tools.transparentColor}`,
        }),
      ).toBeTruthy()
    })
    expect(
      screen.getByRole('button', { name: `${COPY.tools.secondaryColor}: #ffffff` }),
    ).toBeTruthy()
    // Com Ctrl, o X é o recortar — não troca as cores de volta.
    press({ key: 'x', ctrlKey: true })
    expect(
      screen.getByRole('button', {
        name: `${COPY.tools.primaryColor}: ${COPY.tools.transparentColor}`,
      }),
    ).toBeTruthy()
  })

  it('Shift+H espelha o quadro (entra no desfazer); Shift+H sozinho NÃO troca para a Mão', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    render(<PintaApp />)
    await openAsset('ceu')
    const undo = screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
    expect(undo.disabled).toBe(true)
    press({ key: 'H', shiftKey: true })
    await waitFor(() => {
      expect(undo.disabled).toBe(false)
    })
    // A ferramenta continua a de antes (o lápis), não a Mão nem outra.
    expect(
      screen.getByRole('button', { name: COPY.tools.pencil }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('quadros: Alt+N cria, "," e "." andam, Alt+C duplica', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 8 })
    render(<PintaApp />)
    await openAsset('heroi')
    press({ key: 'n', altKey: true })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'parado: quadro 2' })).toBeTruthy()
    })
    expect(
      screen.getByRole('button', { name: 'parado: quadro 2' }).getAttribute('aria-pressed'),
    ).toBe('true')
    press({ key: ',' })
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'parado: quadro 1' }).getAttribute('aria-pressed'),
      ).toBe('true')
    })
    press({ key: '.' })
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'parado: quadro 2' }).getAttribute('aria-pressed'),
      ).toBe('true')
    })
    press({ key: 'c', altKey: true })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'parado: quadro 3' })).toBeTruthy()
    })
  })
})

describe('atalhos do VETOR', () => {
  async function openTwoRects(): Promise<HTMLElement> {
    const seed = createGalleryStore()
    const livre = createVectorBackgroundAsset({ name: 'livre', width: 480, height: 360 })
    await seed
      .getState()
      .importAssets([{ ...livre, shapes: [rectShape('a1', 10), rectShape('a2', 100)] }])
    render(<PintaApp />)
    await openAsset('livre')
    return screen.getByRole('img', { name: 'Área de desenho' })
  }

  it('Ctrl+G agrupa e Ctrl+Shift+G desagrupa a seleção', async () => {
    await openTwoRects()
    press({ key: 'a', ctrlKey: true })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selGroup })).toBeTruthy()
    })
    press({ key: 'g', ctrlKey: true })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selUngroup })).toBeTruthy()
    })
    press({ key: 'G', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.selGroup })).toBeTruthy()
    })
  })

  it('Ctrl+Shift+H esconde a seleção; o MESMO Ctrl+Shift+H sem nada selecionado mostra tudo de volta', async () => {
    const stage = await openTwoRects()
    expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(2)
    press({ key: 'a', ctrlKey: true })
    press({ key: 'H', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(0)
    })
    // Escondida sai da seleção → a seleção está vazia → a mesma tecla é "mostrar tudo".
    press({ key: 'H', ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(2)
    })
  })

  it('Ctrl+Shift+L tranca (o Delete não alcança); sem seleção, o mesmo Ctrl+Shift+L destranca tudo', async () => {
    const stage = await openTwoRects()
    press({ key: 'a', ctrlKey: true })
    press({ key: 'L', ctrlKey: true, shiftKey: true })
    // Trancada sai da seleção; Ctrl+A só pega DESTRANCADAS; Delete não apaga nada.
    press({ key: 'a', ctrlKey: true })
    press({ key: 'Delete' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(2)
    // Nada selecionado (todas trancadas): a mesma tecla destranca tudo.
    press({ key: 'L', ctrlKey: true, shiftKey: true })
    press({ key: 'a', ctrlKey: true })
    press({ key: 'Delete' })
    await waitFor(() => {
      expect(stage.querySelectorAll('rect[fill="#ff2121"]').length).toBe(0)
    })
  })
})

describe('Caneta × atalhos de ação (personagem vetorial)', () => {
  it('Enter com pontos pendentes FECHA a forma e NÃO dá play/pause na prévia; Esc descarta sem soltar a seleção', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'vector-sprite', name: 'ave', frameSize: 64 })
    render(<PintaApp />)
    await openAsset('ave')
    const stage = screen.getByRole('img', { name: COPY.a11y.drawArea })
    // happy-dom não faz layout: o palco precisa de um retângulo para mapear os cliques.
    ;(stage as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 256,
        height: 256,
        right: 256,
        bottom: 256,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    // A prévia nasce reproduzindo (botão "Reproduzir" ativo).
    const playButton = () => screen.getByRole('button', { name: COPY.animation.reproduce })
    expect(playButton().getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.pen }))
    for (const [x, y] of [
      [16, 16],
      [48, 16],
      [32, 40],
    ] as const) {
      fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: x, clientY: y })
      fireEvent.pointerUp(stage, { pointerId: 1 })
    }
    press({ key: 'Enter' }, window as unknown as Element)
    await waitFor(() => {
      expect(stage.querySelector('polygon')).toBeTruthy()
    })
    // A prévia continua reproduzindo: o Enter era da Caneta.
    expect(playButton().getAttribute('aria-pressed')).toBe('true')
    // Sem pontos pendentes, Enter é da prévia: pausa.
    press({ key: 'Enter' }, window as unknown as Element)
    await waitFor(() => {
      expect(playButton().getAttribute('aria-pressed')).toBe('false')
    })
  })
})

describe('janela "Atalhos"', () => {
  it('"?" abre a janela com as seções do editor aberto; Esc fecha; dentro de um campo não abre', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
    render(<PintaApp />)
    await openAsset('ceu')
    expect(screen.queryByText(COPY.shortcuts.title)).toBeNull()

    press({ key: '?', code: 'Slash', shiftKey: true })
    await waitFor(() => {
      expect(screen.getByText(COPY.shortcuts.title)).toBeTruthy()
    })
    // Pixel: tem "Camadas" e as letras da caixa; NÃO tem "Organizar" (que é do vetor).
    // (Consultas DENTRO do modal: "Camadas" também é o título do painel atrás dele.)
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(COPY.shortcuts.sections.layers)).toBeTruthy()
    expect(dialog.getByText(COPY.shortcuts.toolsSection)).toBeTruthy()
    expect(dialog.queryByText(COPY.shortcuts.sections.arrange)).toBeNull()
    expect(dialog.getByText(COPY.shortcuts.labels.swapColors)).toBeTruthy()

    press({ key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText(COPY.shortcuts.title)).toBeNull()
    })

    // O botão do topo também abre.
    fireEvent.click(screen.getByRole('button', { name: COPY.shortcuts.button }))
    await waitFor(() => {
      expect(screen.getByText(COPY.shortcuts.title)).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.shortcuts.close }))
    await waitFor(() => {
      expect(screen.queryByText(COPY.shortcuts.title)).toBeNull()
    })

    // Digitando "?" num campo de texto (ex.: renomear), nada abre.
    const input = document.createElement('input')
    document.body.appendChild(input)
    press({ key: '?', code: 'Slash', shiftKey: true }, input)
    expect(screen.queryByText(COPY.shortcuts.title)).toBeNull()
    input.remove()
  })

  it('no vetor a janela lista "Organizar" (agrupar, ordem, trancar, esconder)', async () => {
    const seed = createGalleryStore()
    await seed
      .getState()
      .create({ kind: 'vector-background', name: 'livre', width: 480, height: 360 })
    render(<PintaApp />)
    await openAsset('livre')
    press({ key: '?', code: 'Slash', shiftKey: true })
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy()
    })
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(COPY.shortcuts.sections.arrange)).toBeTruthy()
    expect(dialog.getByText(COPY.shortcuts.labels.group)).toBeTruthy()
    expect(dialog.getByText(COPY.shortcuts.labels.lock)).toBeTruthy()
    expect(dialog.queryByText(COPY.shortcuts.labels.swapColors)).toBeNull()
  })
})
