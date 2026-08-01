/**
 * Seleção do editor de PIXEL: barra de ações (duplicar/espelhar/apagar),
 * atalhos de teclado (Ctrl+C/V, Delete), teclas das ferramentas e zoom pela
 * rolagem do mouse.
 *
 * happy-dom não faz layout: `getBoundingClientRect` devolve zeros, então
 * clientX/clientY caem direto em pixel do desenho (÷ zoom). É o bastante para
 * marcar um retângulo — o que se pinta de verdade é QA de browser.
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

async function openPixelEditor(): Promise<HTMLElement> {
  const seed = createGalleryStore()
  await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir ceu/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir ceu/ }))
  await waitFor(() => {
    expect(screen.getByRole('img', { name: COPY.a11y.drawArea })).toBeTruthy()
  })
  return screen.getByRole('img', { name: COPY.a11y.drawArea })
}

/** Rabisca com o lápis (zoom 8 → 1 pixel do desenho = 8px de tela). */
function paint(canvas: HTMLElement): void {
  fireEvent.click(screen.getByRole('button', { name: COPY.tools.pencil }))
  fireEvent.pointerDown(canvas, { isPrimary: true, pointerId: 1, clientX: 8, clientY: 8 })
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 24, clientY: 24 })
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 24, clientY: 24 })
}

/** Marca um retângulo com a ferramenta de seleção. */
function markSelection(canvas: HTMLElement, to = 32): void {
  fireEvent.click(screen.getByRole('button', { name: COPY.tools.select }))
  fireEvent.pointerDown(canvas, { isPrimary: true, pointerId: 1, clientX: 0, clientY: 0 })
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: to, clientY: to })
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: to, clientY: to })
}

/** Rabisca e seleciona por cima — só pedaço PINTADO vira seleção. */
function paintAndSelect(canvas: HTMLElement): void {
  paint(canvas)
  markSelection(canvas)
}

/**
 * Rolagem do mouse. O `WheelEvent` do happy-dom DESCARTA deltaMode/shiftKey do
 * init, então o evento é montado à mão — é o que o listener do palco lê.
 */
function wheel(target: HTMLElement, deltaY: number, shiftKey = false): void {
  const event = new Event('wheel', { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    deltaY: { value: deltaY },
    deltaMode: { value: 0 },
    shiftKey: { value: shiftKey },
    clientX: { value: 0 },
    clientY: { value: 0 },
  })
  fireEvent(target, event)
}

function undoButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
}

function pressed(name: string): string | null {
  return screen.getByRole('button', { name }).getAttribute('aria-pressed')
}

describe('seleção do pixel: barra de ações', () => {
  it('a barra só aparece com um pedaço selecionado', async () => {
    const canvas = await openPixelEditor()
    expect(screen.queryByRole('toolbar', { name: COPY.selection.bar })).toBeNull()

    paintAndSelect(canvas)
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.selection.bar })).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: COPY.selection.duplicate })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.selection.flipH })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.selection.flipV })).toBeTruthy()
  })

  it('apagar o pedaço commita e fecha a barra', async () => {
    const canvas = await openPixelEditor()
    expect(undoButton().disabled).toBe(true)

    paintAndSelect(canvas)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.selection.remove })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.selection.remove }))

    await waitFor(() => {
      expect(screen.queryByRole('toolbar', { name: COPY.selection.bar })).toBeNull()
    })
    // Entrada nova no histórico = a área foi mesmo limpa no quadro.
    expect(undoButton().disabled).toBe(false)
  })

  it('marcar um pedaço SEM pintura nenhuma não abre a barra', async () => {
    const canvas = await openPixelEditor()
    // Desenho em branco: ali só existe o fundo quadriculado, não há o que pegar.
    markSelection(canvas)
    await waitFor(() => {
      expect(pressed(COPY.tools.select)).toBe('true')
    })
    expect(screen.queryByRole('toolbar', { name: COPY.selection.bar })).toBeNull()
  })

  it('pintar num canto e marcar o OUTRO canto (vazio) também não seleciona', async () => {
    const canvas = await openPixelEditor()
    paint(canvas)
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.select }))
    fireEvent.pointerDown(canvas, { isPrimary: true, pointerId: 1, clientX: 80, clientY: 80 })
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 110, clientY: 110 })
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 110, clientY: 110 })
    expect(screen.queryByRole('toolbar', { name: COPY.selection.bar })).toBeNull()
  })

  it('clicar FORA do desenho desseleciona (a barra não fica presa aberta)', async () => {
    const canvas = await openPixelEditor()
    paintAndSelect(canvas)
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.selection.bar })).toBeTruthy()
    })

    fireEvent.pointerDown(document.body)
    await waitFor(() => {
      expect(screen.queryByRole('toolbar', { name: COPY.selection.bar })).toBeNull()
    })
  })

  it('clicar na PRÓPRIA barra não desseleciona', async () => {
    const canvas = await openPixelEditor()
    paintAndSelect(canvas)
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.selection.bar })).toBeTruthy()
    })

    const espelhar = screen.getByRole('button', { name: COPY.selection.flipH })
    fireEvent.pointerDown(espelhar)
    fireEvent.click(espelhar)
    expect(screen.getByRole('toolbar', { name: COPY.selection.bar })).toBeTruthy()
  })

  it('duplicar deixa o pedaço FLUTUANDO (a barra continua, pronta para espelhar)', async () => {
    const canvas = await openPixelEditor()
    paintAndSelect(canvas)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.selection.duplicate })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.selection.duplicate }))
    fireEvent.click(screen.getByRole('button', { name: COPY.selection.flipH }))

    expect(screen.getByRole('toolbar', { name: COPY.selection.bar })).toBeTruthy()
  })
})

describe('seleção do pixel: teclado', () => {
  it('Delete apaga o pedaço selecionado', async () => {
    const canvas = await openPixelEditor()
    paintAndSelect(canvas)
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.selection.bar })).toBeTruthy()
    })

    fireEvent.keyDown(document.body, { key: 'Delete' })
    await waitFor(() => {
      expect(screen.queryByRole('toolbar', { name: COPY.selection.bar })).toBeNull()
    })
    expect(undoButton().disabled).toBe(false)
  })

  it('Delete SEM seleção não mexe no desenho', async () => {
    await openPixelEditor()
    fireEvent.keyDown(document.body, { key: 'Delete' })
    expect(undoButton().disabled).toBe(true)
  })

  it('Ctrl+C e Ctrl+V colam o pedaço e ligam a ferramenta de seleção', async () => {
    const canvas = await openPixelEditor()
    paintAndSelect(canvas)
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.selection.bar })).toBeTruthy()
    })
    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true })

    // Perder a seleção (aqui pelo Delete; no uso real, trocar de quadro) NÃO
    // esvazia a área de transferência — é o que permite colar em outro quadro.
    fireEvent.keyDown(document.body, { key: 'Delete' })
    await waitFor(() => {
      expect(screen.queryByRole('toolbar', { name: COPY.selection.bar })).toBeNull()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.pencil }))

    fireEvent.keyDown(document.body, { key: 'v', ctrlKey: true })
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: COPY.selection.bar })).toBeTruthy()
    })
    expect(pressed(COPY.tools.select)).toBe('true')
  })
})

describe('atalhos das ferramentas', () => {
  it('P escolhe o lápis e E a borracha', async () => {
    await openPixelEditor()
    fireEvent.keyDown(document.body, { key: 'e' })
    await waitFor(() => {
      expect(pressed(COPY.tools.eraser)).toBe('true')
    })
    fireEvent.keyDown(document.body, { key: 'p' })
    await waitFor(() => {
      expect(pressed(COPY.tools.pencil)).toBe('true')
    })
    expect(pressed(COPY.tools.eraser)).toBe('false')
  })

  it('a letra do atalho aparece na dica do botão', async () => {
    await openPixelEditor()
    expect(screen.getByRole('button', { name: COPY.tools.pencil }).getAttribute('title')).toBe(
      `${COPY.tools.pencil} (P)`,
    )
  })

  it('com Ctrl a tecla NÃO troca de ferramenta', async () => {
    await openPixelEditor()
    fireEvent.keyDown(document.body, { key: 'e', ctrlKey: true })
    expect(pressed(COPY.tools.eraser)).toBe('false')
  })

  it('digitando num campo de texto a tecla NÃO troca de ferramenta', async () => {
    await openPixelEditor()
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'e' })
    expect(pressed(COPY.tools.eraser)).toBe('false')
    input.remove()
  })
})

describe('zoom pela rolagem do mouse', () => {
  it('rolar para cima aproxima e para baixo afasta', async () => {
    const canvas = await openPixelEditor()
    expect(screen.getByText('8×')).toBeTruthy()

    wheel(canvas, -120)
    await waitFor(() => {
      expect(screen.getByText('12×')).toBeTruthy()
    })

    wheel(canvas, 120)
    await waitFor(() => {
      expect(screen.getByText('8×')).toBeTruthy()
    })
  })

  it('rolagem pequena demais não muda o zoom (trackpad não pula degraus)', async () => {
    const canvas = await openPixelEditor()
    wheel(canvas, -10)
    expect(screen.getByText('8×')).toBeTruthy()
    // Somando, os retalhos viram um degrau.
    wheel(canvas, -10)
    wheel(canvas, -10)
    wheel(canvas, -10)
    await waitFor(() => {
      expect(screen.getByText('12×')).toBeTruthy()
    })
  })

  it('Shift+rolagem continua rolando a área (não dá zoom)', async () => {
    const canvas = await openPixelEditor()
    wheel(canvas, -120, true)
    expect(screen.getByText('8×')).toBeTruthy()
  })
})
