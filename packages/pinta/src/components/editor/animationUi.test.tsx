import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { importPintaJson } from '../../export/projectJson'
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
  it('sprite abre com prévia e faixa Spritesheet (com os quadros)', async () => {
    await openSpriteEditor()
    expect(screen.getByText(COPY.animation.preview)).toBeTruthy()
    expect(screen.getByText(COPY.animation.spritesheet)).toBeTruthy()
    // A animação de nascença aparece (na prévia e na faixa).
    expect(screen.getAllByText('parado').length).toBeGreaterThan(0)
    // O primeiro quadro é clicável na faixa (rótulo inclui o nome da animação).
    expect(screen.getByRole('button', { name: 'parado: quadro 1' })).toBeTruthy()
  })

  it('novo quadro aparece na faixa e vira o selecionado', async () => {
    await openSpriteEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.animation.addFrame }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'parado: quadro 2' })).toBeTruthy()
    })
    const second = screen.getByRole('button', { name: 'parado: quadro 2' })
    expect(second.getAttribute('aria-pressed')).toBe('true')
  })

  it('nova animação entra na faixa com nome sugerido e fica ativa', async () => {
    await openSpriteEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.animation.addAnimation }))
    await waitFor(() => {
      expect(screen.getAllByText('andar').length).toBeGreaterThan(0)
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
    expect(screen.queryByText(COPY.animation.spritesheet)).toBeNull()
  })

  it('Baixar abre o diálogo com folha + receita para sprites', async () => {
    await openSpriteEditor()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.download }))
    await waitFor(() => {
      expect(screen.getByText(COPY.exportDialog.spritesheet, { exact: false })).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: COPY.exportDialog.editableFile })).toBeTruthy()
    expect(screen.getByText(COPY.exportDialog.recipeTitle)).toBeTruthy()
    expect(screen.getByText(/do quadro 0 ao 0/)).toBeTruthy()
  })

  it('baixa o desenho aberto como .pinta.json restaurável', async () => {
    const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const downloads: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob) => {
        downloads.push(blob)
        return 'blob:pinta-editable-test'
      },
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: () => undefined,
    })

    try {
      await openSpriteEditor()
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.download }))
      fireEvent.click(await screen.findByRole('button', { name: COPY.exportDialog.editableFile }))
      await waitFor(() => expect(downloads).toHaveLength(1))
      const result = importPintaJson((await downloads[0]?.text()) ?? '')
      expect(result.warnings).toEqual([])
      expect(result.assets.map((asset) => [asset.kind, asset.name])).toEqual([
        ['pixel-sprite', 'heroi'],
      ])
    } finally {
      if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
  })
})
