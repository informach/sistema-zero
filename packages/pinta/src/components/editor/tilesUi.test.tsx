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

describe('UI de tiles (F4)', () => {
  it('tileset abre com a tira de peças + badge de sólido', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir pecas' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir pecas' }))
    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.tiles)).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: 'Peça 0' })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tiles.solid })).toBeTruthy()

    // Nova peça entra e vira a selecionada.
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addTile }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Peça 1' })).toBeTruthy()
    })
  })

  it('tilemap abre com picker de peças e camadas; sem tileset mostra recado', async () => {
    const seed = createGalleryStore()
    const tileset = await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    await seed.getState().create({
      kind: 'tilemap',
      name: 'fase',
      tilesetId: tileset.id,
      cols: 4,
      rows: 3,
    })

    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir fase' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fase' }))
    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.pickTile)).toBeTruthy()
    })
    expect(screen.getByText(COPY.tiles.layers)).toBeTruthy()
    expect(screen.getByText('Chão')).toBeTruthy()

    // Nova camada entra na lista.
    fireEvent.click(screen.getByRole('button', { name: `＋ ${COPY.tiles.addLayer}` }))
    await waitFor(() => {
      expect(screen.getByText('Camada 2')).toBeTruthy()
    })
  })

  it('tilemap órfão (tileset apagado) mostra o recado gentil', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({
      kind: 'tilemap',
      name: 'orfao',
      tilesetId: 'nao-existe',
      cols: 4,
      rows: 3,
    })
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir orfao' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir orfao' }))
    await waitFor(() => {
      expect(screen.getAllByText(COPY.tiles.missingTileset).length).toBeGreaterThan(0)
    })
  })
})
