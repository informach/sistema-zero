import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function openVectorEditor(): Promise<void> {
  const seed = createGalleryStore()
  await seed
    .getState()
    .create({ kind: 'vector-background', name: 'livre', width: 480, height: 360 })
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir livre/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir livre/ }))
  await waitFor(() => {
    expect(screen.getByText('livre')).toBeTruthy()
  })
}

/** happy-dom não faz layout: dá medida REAL ao palco p/ converter cliques. */
function measureStage(): HTMLElement {
  const stage = screen.getByRole('img', { name: 'Área de desenho' })
  ;(stage as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 480,
      height: 360,
      right: 480,
      bottom: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
  return stage
}

/** Desenha um retângulo pelo gesto (a ferramenta Retângulo precisa estar ativa). */
function drawRect(stage: HTMLElement, from: [number, number], to: [number, number]): void {
  fireEvent.pointerDown(stage, {
    isPrimary: true,
    pointerId: 1,
    clientX: from[0],
    clientY: from[1],
  })
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: to[0], clientY: to[1] })
  fireEvent.pointerUp(stage, { pointerId: 1 })
}

describe('UI vetorial (F5)', () => {
  it('abre com as ferramentas e os painéis de estilo', async () => {
    await openVectorEditor()
    expect(screen.getByRole('button', { name: COPY.vector.select })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.brush })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.star })).toBeTruthy()
    expect(screen.getByText(COPY.vector.fill)).toBeTruthy()
    expect(screen.getByText(COPY.vector.stroke)).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Área de desenho' })).toBeTruthy()
  })

  it('ferramenta de texto abre o diálogo e adiciona o shape', async () => {
    await openVectorEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.text }))
    fireEvent.pointerDown(screen.getByRole('img', { name: 'Área de desenho' }), {
      isPrimary: true,
      clientX: 10,
      clientY: 10,
    })
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.textPrompt)).toBeTruthy()
    })
    fireEvent.change(screen.getByPlaceholderText(COPY.vector.textPlaceholder), {
      target: { value: 'Olá!' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.add }))
    await waitFor(() => {
      expect(screen.getByText('Olá!')).toBeTruthy()
    })
    // Shape criado fica SELECIONADO: painel de ações aparece.
    expect(screen.getByRole('button', { name: COPY.vector.remove })).toBeTruthy()
  })

  it('caixa de ferramentas: espessuras no topo, grade e os dois slots de cor no pé', async () => {
    await openVectorEditor()
    // Presets de espessura (espelho dos tamanhos de pincel do pixel).
    expect(screen.getByRole('button', { name: `${COPY.vector.strokeWidth}: 4` })).toBeTruthy()
    // Toggle da grade de apoio (mesmo botão do pixel).
    expect(screen.getByRole('button', { name: COPY.tools.grid })).toBeTruthy()
    // Slots: preenchimento (verde default) na frente + o swatch verde da grade
    // de cores compartilham o rótulo; contorno preto só existe no slot.
    expect(
      screen.getAllByRole('button', { name: `${COPY.vector.fill}: verde` }).length,
    ).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: `${COPY.vector.stroke}: preto` })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.swapFillStroke })).toBeTruthy()
  })

  it('trocar preenchimento e contorno inverte os slots', async () => {
    await openVectorEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.swapFillStroke }))
    await waitFor(() => {
      // O contorno herda o verde do preenchimento (rótulo único: os swatches da
      // grade seguem no canal de preenchimento).
      expect(screen.getByRole('button', { name: `${COPY.vector.stroke}: verde` })).toBeTruthy()
    })
  })

  it('o painel de cores pinta o CANAL ativo (chip do contorno)', async () => {
    await openVectorEditor()
    // Chip "Contorno" muda o canal: a grade re-rotula os swatches.
    fireEvent.click(screen.getByText(COPY.vector.stroke))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: `${COPY.vector.stroke}: vermelho` })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: `${COPY.vector.stroke}: vermelho` }))
    await waitFor(() => {
      // Agora o SLOT do contorno também mostra vermelho (2 botões com o rótulo).
      expect(
        screen.getAllByRole('button', { name: `${COPY.vector.stroke}: vermelho` }).length,
      ).toBe(2)
    })
  })

  it('a grade nasce DESLIGADA no vetor e liga/desliga pelo botão', async () => {
    await openVectorEditor()
    expect(document.querySelector('#pin-editor-grid')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.grid }))
    await waitFor(() => {
      expect(document.querySelector('#pin-editor-grid')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.grid }))
    await waitFor(() => {
      expect(document.querySelector('#pin-editor-grid')).toBeNull()
    })
  })

  it('com a grade LIGADA, desenhar uma forma encaixa nos cruzamentos', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.grid }))
    // 480×360 → grade de 16: (30,30)→(32,32) e (93,61)→(96,64).
    drawRect(stage, [30, 30], [93, 61])
    await waitFor(() => {
      const rect = document.querySelector('rect[fill="#78dc52"]')
      expect(rect?.getAttribute('x')).toBe('32')
      expect(rect?.getAttribute('y')).toBe('32')
      expect(rect?.getAttribute('width')).toBe('64')
      expect(rect?.getAttribute('height')).toBe('32')
    })
  })

  it('sem a grade, o desenho fica LIVRE (sem encaixe)', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [30, 30], [93, 61])
    await waitFor(() => {
      const rect = document.querySelector('rect[fill="#78dc52"]')
      expect(rect?.getAttribute('x')).toBe('30')
      expect(rect?.getAttribute('width')).toBe('63')
    })
  })

  it('laço seleciona 2 formas e a alça da UNIÃO redimensiona as duas juntas', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    drawRect(stage, [112, 16], [176, 80])
    await waitFor(() => {
      expect(document.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
    // Laço com a ferramenta Selecionar, do (8,8) ao (200,100): pega as duas.
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.select }))
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 200, clientY: 100 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      // Barra flutuante com "Agrupar a seleção" = 2+ selecionadas.
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
      expect(screen.getByRole('button', { name: COPY.vector.selGroup })).toBeTruthy()
    })
    // As 8 alças da caixa da UNIÃO (14px em zoom 1; escopo no PALCO — ícones
    // lucide também têm <rect width="14">). Arrasta a SE (índice 4):
    // âncora (16,16), fatores ×2 → A vira 64 de largura, B começa em 208.
    const handles = stage.querySelectorAll('rect[width="14"]')
    expect(handles.length).toBe(8)
    const se = handles[4] as SVGRectElement
    fireEvent.pointerDown(se, { isPrimary: true, pointerId: 2, clientX: 176, clientY: 80 })
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 336, clientY: 144 })
    fireEvent.pointerUp(stage, { pointerId: 2 })
    await waitFor(() => {
      const rects = document.querySelectorAll('rect[fill="#78dc52"]')
      expect(rects[0]?.getAttribute('width')).toBe('64')
      expect(rects[1]?.getAttribute('x')).toBe('208')
      expect(rects[1]?.getAttribute('width')).toBe('128')
    })
  })

  it('barra flutuante da seleção duplica a forma', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.selDuplicate }))
    await waitFor(() => {
      expect(document.querySelectorAll('rect[fill="#78dc52"]').length).toBe(2)
    })
  })

  it('alinhar: uma forma sozinha centraliza na TELA', async () => {
    await openVectorEditor()
    const stage = measureStage()
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
    drawRect(stage, [16, 16], [48, 48])
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.vector.alignCenterH })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.alignCenterH }))
    await waitFor(() => {
      // (480 - 32) / 2 = 224.
      const rect = document.querySelector('rect[fill="#78dc52"]')
      expect(rect?.getAttribute('x')).toBe('224')
    })
  })

  it('apagar a seleção remove o shape', async () => {
    await openVectorEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.text }))
    fireEvent.pointerDown(screen.getByRole('img', { name: 'Área de desenho' }), {
      isPrimary: true,
    })
    await waitFor(() => {
      expect(screen.getByText(COPY.vector.textPrompt)).toBeTruthy()
    })
    fireEvent.change(screen.getByPlaceholderText(COPY.vector.textPlaceholder), {
      target: { value: 'some' },
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.add }))
    await waitFor(() => {
      expect(screen.getByText('some')).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.vector.remove }))
    await waitFor(() => {
      expect(screen.queryByText('some')).toBeNull()
    })
  })
})
