/**
 * Painel CAMADAS do vetor: lista as formas (topo primeiro), clicar seleciona,
 * o olhinho esconde do palco (e a forma segue listada), reordenar por teclado
 * e por arrasto muda o empilhamento — o arrasto fecha com UMA entrada de undo.
 */
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

function layersSection(): HTMLElement {
  const section = document.querySelector<HTMLElement>(`section[aria-label="${COPY.layers.title}"]`)
  if (!section) throw new Error('painel Camadas esperado')
  return section
}

function rowLabels(): string[] {
  return Array.from(layersSection().querySelectorAll('li span.truncate')).map(
    (el) => el.textContent ?? '',
  )
}

// `shapeNames` é Record<string, string>: fixa os rótulos usados nas asserções.
const RECT = COPY.vector.shapeNames.rect ?? ''
const ELLIPSE = COPY.vector.shapeNames.ellipse ?? ''

/** Abre um cenário vetorial e desenha retângulo + círculo (círculo por cima). */
async function openWithTwoShapes(): Promise<HTMLElement> {
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
  fireEvent.click(screen.getByRole('button', { name: COPY.tools.rect }))
  fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 16, clientY: 16 })
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: 48, clientY: 48 })
  fireEvent.pointerUp(stage, { pointerId: 1 })
  fireEvent.click(screen.getByRole('button', { name: COPY.tools.ellipse }))
  fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 100, clientY: 16 })
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: 164, clientY: 80 })
  fireEvent.pointerUp(stage, { pointerId: 1 })
  await waitFor(() => {
    expect(rowLabels()).toEqual([ELLIPSE, RECT])
  })
  return stage
}

describe('painel Camadas do vetor', () => {
  it('lista as formas com a de CIMA primeiro e clicar seleciona', async () => {
    await openWithTwoShapes()
    // Clica na linha do retângulo (a de baixo): vira a seleção. O rótulo é
    // "Selecionar: Retângulo" (distinto do botão de FERRAMENTA "Retângulo").
    const rowName = `${COPY.vector.select}: ${RECT}`
    fireEvent.click(screen.getByRole('button', { name: rowName }))
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.vector.selectionBar })).toBeTruthy()
    })
    const row = screen.getByRole('button', { name: rowName })
    expect(row.getAttribute('aria-pressed')).toBe('true')
  })

  it('o olhinho esconde a forma do PALCO (e ela segue listada no painel)', async () => {
    const stage = await openWithTwoShapes()
    expect(stage.querySelectorAll('ellipse').length).toBe(1)
    fireEvent.click(
      screen.getByRole('button', {
        name: `${COPY.layers.hide}: ${ELLIPSE}`,
      }),
    )
    await waitFor(() => {
      expect(stage.querySelectorAll('ellipse').length).toBe(0)
      // Continua no painel, agora com o olho de "Mostrar".
      expect(
        screen.getByRole('button', {
          name: `${COPY.layers.show}: ${ELLIPSE}`,
        }),
      ).toBeTruthy()
    })
    // Mostrar de novo devolve ao palco.
    fireEvent.click(
      screen.getByRole('button', {
        name: `${COPY.layers.show}: ${ELLIPSE}`,
      }),
    )
    await waitFor(() => {
      expect(stage.querySelectorAll('ellipse').length).toBe(1)
    })
  })

  it('setas na alça reordenam o empilhamento', async () => {
    await openWithTwoShapes()
    const grip = screen.getByRole('button', {
      name: `${COPY.layers.reorder}: ${RECT}`,
    })
    fireEvent.keyDown(grip, { key: 'ArrowUp' })
    await waitFor(() => {
      expect(rowLabels()).toEqual([RECT, ELLIPSE])
    })
    fireEvent.keyDown(
      screen.getByRole('button', {
        name: `${COPY.layers.reorder}: ${RECT}`,
      }),
      { key: 'ArrowDown' },
    )
    await waitFor(() => {
      expect(rowLabels()).toEqual([ELLIPSE, RECT])
    })
  })

  it('arrastar pela alça reordena com UMA entrada de undo', async () => {
    await openWithTwoShapes()
    const grip = screen.getByRole('button', {
      name: `${COPY.layers.reorder}: ${RECT}`,
    })
    // happy-dom: todos os <li> medem rect 0 → o move "cruza" a primeira linha.
    fireEvent.pointerDown(grip, { pointerId: 7, clientY: 0 })
    fireEvent.pointerMove(document, { pointerId: 7, clientY: 0 })
    fireEvent.pointerUp(document, { pointerId: 7 })
    await waitFor(() => {
      expect(rowLabels()).toEqual([RECT, ELLIPSE])
    })
    // UM Ctrl+Z desfaz o arrasto inteiro.
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    await waitFor(() => {
      expect(rowLabels()).toEqual([ELLIPSE, RECT])
    })
  })
})
