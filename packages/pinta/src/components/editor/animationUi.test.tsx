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
  await seed.getState().create({ kind: 'pixel-sprite', name: 'heroi', frameSize: 8 })
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir heroi/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir heroi/ }))
  await waitFor(() => {
    expect(screen.getByText('heroi')).toBeTruthy()
  })
}

describe('UI de animação (F2)', () => {
  it('sprite abre com prévia, lista de animações e filmstrip', async () => {
    await openSpriteEditor()
    expect(screen.getByText(COPY.animation.preview)).toBeTruthy()
    expect(screen.getByText(COPY.animation.animations)).toBeTruthy()
    expect(screen.getByText(COPY.animation.frames)).toBeTruthy()
    // A animação de nascença.
    expect(screen.getByText('parado')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quadro 1' })).toBeTruthy()
  })

  it('novo quadro aparece no filmstrip e vira o selecionado', async () => {
    await openSpriteEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.animation.addFrame }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Quadro 2' })).toBeTruthy()
    })
    const second = screen.getByRole('button', { name: 'Quadro 2' })
    expect(second.getAttribute('aria-pressed')).toBe('true')
  })

  it('nova animação entra na lista com nome sugerido e fica ativa', async () => {
    await openSpriteEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.animation.addAnimation }))
    await waitFor(() => {
      expect(screen.getByText('andar')).toBeTruthy()
    })
  })

  it('cenário (sem animação) NÃO mostra os painéis de sprite', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 8, height: 8 })
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir ceu/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir ceu/ }))
    await waitFor(() => {
      expect(screen.getByText('ceu')).toBeTruthy()
    })
    expect(screen.queryByText(COPY.animation.preview)).toBeNull()
    expect(screen.queryByText(COPY.animation.frames)).toBeNull()
  })

  it('Baixar abre o diálogo com folha + receita para sprites', async () => {
    await openSpriteEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.download }))
    await waitFor(() => {
      expect(screen.getByText(COPY.exportDialog.spritesheet, { exact: false })).toBeTruthy()
    })
    expect(screen.getByText(COPY.exportDialog.recipeTitle)).toBeTruthy()
    expect(screen.getByText(/do quadro 0 ao 0/)).toBeTruthy()
  })
})
