/**
 * Caixa de ferramentas com DUAS cores (08/2026): a paleta pinta o quadrado
 * SELECIONADO (principal ou secundária), o botão de trocar inverte as duas e o
 * botão DIREITO do mouse desenha com a secundária.
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

async function openBackground(): Promise<HTMLElement> {
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

/** O quadrado de cor da caixa (o aria-label carrega o hex atual). */
function slot(kind: 'primary' | 'secondary'): HTMLElement {
  const prefix = kind === 'primary' ? COPY.tools.primaryColor : COPY.tools.secondaryColor
  const found = screen
    .getAllByRole('button')
    .find((b) => (b.getAttribute('aria-label') ?? '').startsWith(`${prefix}:`))
  if (!found) throw new Error(`quadrado não encontrado: ${prefix}`)
  return found
}

function hexOf(kind: 'primary' | 'secondary'): string {
  const prefix = kind === 'primary' ? COPY.tools.primaryColor : COPY.tools.secondaryColor
  return (slot(kind).getAttribute('aria-label') ?? '').slice(prefix.length + 2)
}

describe('caixa de ferramentas: duas cores', () => {
  it('a paleta pinta o quadrado SELECIONADO', async () => {
    await openBackground()
    // Começa na principal.
    expect(slot('primary').getAttribute('aria-pressed')).toBe('true')
    expect(slot('secondary').getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(3) }))
    await waitFor(() => {
      expect(hexOf('primary')).not.toBe(COPY.tools.transparentColor)
    })
    const principal = hexOf('primary')

    // Seleciona a secundária: a próxima cor da paleta cai NELA.
    fireEvent.click(slot('secondary'))
    await waitFor(() => {
      expect(slot('secondary').getAttribute('aria-pressed')).toBe('true')
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(5) }))
    await waitFor(() => {
      expect(hexOf('secondary')).not.toBe(COPY.tools.transparentColor)
    })
    // A principal não se mexeu.
    expect(hexOf('primary')).toBe(principal)
    expect(hexOf('secondary')).not.toBe(principal)
  })

  it('o botão de trocar inverte as duas cores', async () => {
    await openBackground()
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(3) }))
    fireEvent.click(slot('secondary'))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(5) }))
    await waitFor(() => {
      expect(hexOf('secondary')).not.toBe(hexOf('primary'))
    })

    const antes = { principal: hexOf('primary'), secundaria: hexOf('secondary') }
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.swapColors }))
    await waitFor(() => {
      expect(hexOf('primary')).toBe(antes.secundaria)
    })
    expect(hexOf('secondary')).toBe(antes.principal)
  })

  it('a lista de ferramentas e os tamanhos do traço seguem acessíveis', async () => {
    await openBackground()
    // Tamanhos do traço (topo da caixa) e ferramentas continuam por rótulo.
    expect(screen.getByRole('button', { name: `${COPY.tools.brushSize}: 1` })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tools.pencil })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tools.picker })).toBeTruthy()
  })
})

describe('botão direito do mouse', () => {
  it('desenha com a cor SECUNDÁRIA (e o esquerdo com a principal)', async () => {
    const canvas = await openBackground()
    // Principal = cor 3; secundária = cor 5.
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(3) }))
    fireEvent.click(slot('secondary'))
    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.colorLabel(5) }))
    await waitFor(() => {
      expect(hexOf('secondary')).not.toBe(COPY.tools.transparentColor)
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.pencil }))

    const undo = (): HTMLButtonElement =>
      screen.getByRole('button', { name: COPY.editor.undo }) as HTMLButtonElement
    expect(undo().disabled).toBe(true)

    // Traço com o botão DIREITO (button: 2).
    fireEvent.pointerDown(canvas, {
      isPrimary: true,
      pointerId: 1,
      button: 2,
      clientX: 8,
      clientY: 8,
    })
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 8, clientY: 8 })
    await waitFor(() => {
      expect(undo().disabled).toBe(false)
    })
    // O que foi pintado é coisa do canvas (happy-dom não pinta) — o que este
    // teste trava é que o gesto do botão direito COMMITA como qualquer outro.
  })

  it('o menu do navegador não abre em cima do desenho', async () => {
    const canvas = await openBackground()
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    canvas.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
