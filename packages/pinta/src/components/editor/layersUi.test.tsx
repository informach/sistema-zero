/**
 * Painel de camadas do editor de pixel (08/2026): listar/ativar, olho,
 * adicionar, apagar com confirmação, renomear e reordenar pelo teclado.
 *
 * happy-dom não faz layout: arrastar de verdade (pointermove com coordenadas)
 * é QA de browser — aqui o caminho testado é o do teclado, que é a mesma
 * operação pura por baixo (`movePixelLayer`).
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { PINTA_LIMITS } from '../../core/project'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function openBackground(): Promise<void> {
  const seed = createGalleryStore()
  await seed.getState().create({ kind: 'pixel-background', name: 'ceu', width: 16, height: 16 })
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Abrir ceu/ })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: /Abrir ceu/ }))
  await waitFor(() => {
    expect(screen.getByLabelText(COPY.layers.title)).toBeTruthy()
  })
}

function addLayer(): void {
  fireEvent.click(screen.getByRole('button', { name: COPY.layers.add }))
}

/** O botão da LINHA da camada (o que seleciona/renomeia), não o olho nem a alça. */
function layerRow(name: string): HTMLElement {
  const all = Array.from(
    screen
      .getByLabelText(COPY.layers.title)
      .querySelectorAll<HTMLElement>('li[data-layer] button[aria-pressed]'),
  )
  const found = all.find((button) => button.textContent?.trim() === name)
  if (!found) throw new Error(`camada não encontrada: ${name}`)
  return found
}

/** Ids das camadas na ORDEM DA LISTA (de cima para baixo). */
function listedLayers(): string[] {
  const list = screen.getByLabelText(COPY.layers.title).querySelectorAll('li[data-layer]')
  return Array.from(list).map((li) => li.textContent?.trim() ?? '')
}

describe('painel de camadas', () => {
  it('cenário abre com UMA camada e o desenho já é dela', async () => {
    await openBackground()
    expect(listedLayers()).toEqual(['Camada 1'])
    // Só uma camada: a lixeira fica esmaecida (não dá para ficar sem nenhuma).
    expect(
      screen.getByRole('button', { name: COPY.layers.remove }).getAttribute('aria-disabled'),
    ).toBe('true')
  })

  it('"+" adiciona no topo e a nova vira a ativa', async () => {
    await openBackground()
    addLayer()
    await waitFor(() => {
      expect(listedLayers()).toEqual(['Camada 2', 'Camada 1'])
    })
    expect(layerRow('Camada 2').getAttribute('aria-pressed')).toBe('true')
    expect(layerRow('Camada 1').getAttribute('aria-pressed')).toBe('false')
  })

  it('clicar numa camada inativa seleciona; na ativa abre o renomear', async () => {
    await openBackground()
    addLayer()
    await waitFor(() => {
      expect(listedLayers()).toHaveLength(2)
    })

    fireEvent.click(layerRow('Camada 1'))
    await waitFor(() => {
      expect(layerRow('Camada 1').getAttribute('aria-pressed')).toBe('true')
    })
    // Agora ela é a ativa: o mesmo clique abre o diálogo de nome.
    fireEvent.click(layerRow('Camada 1'))
    const input = await screen.findByLabelText(COPY.layers.nameLabel)
    fireEvent.change(input, { target: { value: 'roupa' } })
    fireEvent.click(screen.getByRole('button', { name: COPY.layers.save }))
    await waitFor(() => {
      expect(listedLayers()).toEqual(['Camada 2', 'roupa'])
    })
  })

  it('o olho esconde e mostra a camada', async () => {
    await openBackground()
    const eye = screen.getByRole('button', { name: `${COPY.layers.hide}: Camada 1` })
    fireEvent.click(eye)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: `${COPY.layers.show}: Camada 1` })).toBeTruthy()
    })
  })

  it('lixeira: confirmação apaga a camada ativa; cancelar não mexe', async () => {
    await openBackground()
    addLayer()
    await waitFor(() => {
      expect(listedLayers()).toHaveLength(2)
    })

    fireEvent.click(screen.getByRole('button', { name: COPY.layers.remove }))
    await screen.findByText(COPY.layers.removeBody)
    fireEvent.click(screen.getByRole('button', { name: COPY.gallery.cancel }))
    await waitFor(() => {
      expect(screen.queryByText(COPY.layers.removeBody)).toBeNull()
    })
    expect(listedLayers()).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: COPY.layers.remove }))
    await screen.findByText(COPY.layers.removeBody)
    fireEvent.click(screen.getByRole('button', { name: COPY.layers.removeConfirm }))
    await waitFor(() => {
      expect(listedLayers()).toEqual(['Camada 1'])
    })
  })

  it('a alça reordena pelo teclado (a via acessível do arrastar)', async () => {
    await openBackground()
    addLayer()
    await waitFor(() => {
      expect(listedLayers()).toEqual(['Camada 2', 'Camada 1'])
    })

    const handle = screen.getByRole('button', { name: `${COPY.layers.reorder}: Camada 1` })
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    await waitFor(() => {
      expect(listedLayers()).toEqual(['Camada 1', 'Camada 2'])
    })
  })

  it('no teto de camadas o "+" avisa em vez de adicionar', async () => {
    await openBackground()
    for (let i = 1; i < PINTA_LIMITS.maxPixelLayers; i += 1) {
      addLayer()
      await waitFor(() => {
        expect(listedLayers()).toHaveLength(i + 1)
      })
    }
    addLayer()
    await screen.findByText(COPY.layers.limit)
    expect(listedLayers()).toHaveLength(PINTA_LIMITS.maxPixelLayers)
  })
})
