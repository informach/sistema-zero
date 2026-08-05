/**
 * Painel de prévia da animação (08/2026): ações viraram BOTÕES DE ÍCONE
 * (Reproduzir/Editar/Configurações, tooltip = title) e os detalhes da animação
 * saíram do fluxo — a engrenagem abre uma MODAL.
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

async function openSpriteEditor(): Promise<void> {
  const seed = createGalleryStore()
  await seed.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 16 })
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir heroi/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir heroi/ }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: COPY.animation.reproduce })).toBeTruthy()
  })
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

describe('prévia da animação: botões de ícone', () => {
  it('Reproduzir/Editar são ícones com tooltip e alternam o estado', async () => {
    await openSpriteEditor()

    const play = button(COPY.animation.reproduce)
    const edit = button(COPY.animation.edit)
    // Tooltip = title (padrão ToolButton); rodando por padrão.
    expect(play.getAttribute('title')).toBe(COPY.animation.reproduce)
    expect(edit.getAttribute('title')).toBe(COPY.animation.edit)
    expect(play.getAttribute('aria-pressed')).toBe('true')
    expect(edit.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(edit)
    await waitFor(() => {
      expect(button(COPY.animation.edit).getAttribute('aria-pressed')).toBe('true')
    })
    expect(button(COPY.animation.reproduce).getAttribute('aria-pressed')).toBe('false')
  })

  it('os detalhes NÃO ficam no fluxo: a engrenagem abre uma modal', async () => {
    await openSpriteEditor()

    // Nada de "Animação selecionada" na tela até pedir.
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText(COPY.animation.duration)).toBeNull()
    const settings = button(COPY.animation.settings)
    expect(settings.getAttribute('aria-haspopup')).toBe('dialog')
    expect(settings.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(settings)
    const dialog = await screen.findByRole('dialog', { name: COPY.animation.selected })
    expect(dialog).toBeTruthy()
    // Os controles vivem DENTRO da modal.
    expect(screen.getByText(COPY.animation.duration)).toBeTruthy()
    expect(screen.getByLabelText(COPY.animation.speed)).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.animation.repeatOff })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: COPY.a11y.close }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('mexer na modal muda a animação (repetição desligada)', async () => {
    await openSpriteEditor()
    fireEvent.click(button(COPY.animation.settings))
    await screen.findByRole('dialog', { name: COPY.animation.selected })

    const off = screen.getByRole('button', { name: COPY.animation.repeatOff })
    expect(off.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(off)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: COPY.animation.repeatOff }).getAttribute('aria-pressed'),
      ).toBe('true')
    })
  })
})
