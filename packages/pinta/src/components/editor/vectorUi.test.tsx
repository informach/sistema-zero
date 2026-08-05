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
    const stage = screen.getByRole('img', { name: 'Área de desenho' })
    // happy-dom não faz layout: o palco precisa de medida p/ converter o clique.
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
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.grid }))
    // 480×360 → grade de 16: (30,30)→(32,32) e (93,61)→(96,64).
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 30, clientY: 30 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 93, clientY: 61 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
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
    fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 1, clientX: 30, clientY: 30 })
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 93, clientY: 61 })
    fireEvent.pointerUp(stage, { pointerId: 1 })
    await waitFor(() => {
      const rect = document.querySelector('rect[fill="#78dc52"]')
      expect(rect?.getAttribute('x')).toBe('30')
      expect(rect?.getAttribute('width')).toBe('63')
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
