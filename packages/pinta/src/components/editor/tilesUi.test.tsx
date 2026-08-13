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
  it('revoga a objectURL da folha vetorial se o editor desmonta antes do load', async () => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    const originalImage = globalThis.Image
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    const created: string[] = []
    const revoked: string[] = []
    const fakeContext = new Proxy(
      {},
      {
        get: () => () => undefined,
      },
    ) as CanvasRenderingContext2D
    class PendingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
    }
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => fakeContext,
    })
    Object.defineProperty(globalThis, 'Image', { configurable: true, value: PendingImage })
    URL.createObjectURL = () => {
      const url = `blob:folha-${created.length + 1}`
      created.push(url)
      return url
    }
    URL.revokeObjectURL = (url) => revoked.push(url)

    let mounted: ReturnType<typeof render> | null = null
    try {
      const seed = createGalleryStore()
      const tileset = await seed
        .getState()
        .create({ kind: 'vector-tileset', name: 'pecas-v', tileSize: 16 })
      if (!tileset) throw new Error('tileset esperado')
      await seed.getState().create({
        kind: 'tilemap',
        name: 'fase-v',
        tilesetId: tileset.id,
        cols: 2,
        rows: 2,
      })
      mounted = render(<PintaApp />)
      fireEvent.click(await screen.findByRole('button', { name: /Abrir fase-v/ }))
      await waitFor(() => expect(created.length).toBeGreaterThan(0))

      const sheetUrl = created.at(-1)
      if (!sheetUrl) throw new Error('objectURL da folha esperado')
      mounted.unmount()
      mounted = null
      expect(revoked).toContain(sheetUrl)
    } finally {
      mounted?.unmount()
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: originalGetContext,
      })
      Object.defineProperty(globalThis, 'Image', { configurable: true, value: originalImage })
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    }
  })

  it('tileset abre com a tira de peças + badge de sólido', async () => {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir pecas/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir pecas/ }))
    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.tiles)).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: 'Peça 0' })).toBeTruthy()
    // Botão de colisão (ciclo livre → sólido → plataforma), rótulo dinâmico.
    expect(screen.getByRole('button', { name: new RegExp(COPY.tiles.cycleCollision) })).toBeTruthy()

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
      expect(screen.getByRole('button', { name: /Abrir fase/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir fase/ }))
    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.pickTile)).toBeTruthy()
    })
    expect(screen.getByText(COPY.tiles.layers)).toBeTruthy()
    expect(screen.getByText('Chão')).toBeTruthy()

    // Nova camada entra na lista.
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addLayer }))
    await waitFor(() => {
      expect(screen.getByText('Camada 2')).toBeTruthy()
    })
  })

  it('tilemap traz as ferramentas novas (linha/retângulo/seleção/crescer) + barra de status', async () => {
    const seed = createGalleryStore()
    const tileset = await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    await seed
      .getState()
      .create({ kind: 'tilemap', name: 'fase', tilesetId: tileset.id, cols: 20, rows: 15 })

    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir fase/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir fase/ }))
    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.pickTile)).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: COPY.tools.line })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tools.rect })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tools.select })).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.tiles.autoExpand })).toBeTruthy()
    expect(screen.getByText(COPY.tiles.statusSize(20, 15))).toBeTruthy()
  })

  it('seleção no mapa: grade VAZIA não seleciona; célula pintada seleciona', async () => {
    const seed = createGalleryStore()
    const tileset = await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    await seed
      .getState()
      .create({ kind: 'tilemap', name: 'fase', tilesetId: tileset.id, cols: 8, rows: 6 })

    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir fase/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir fase/ }))
    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.pickTile)).toBeTruthy()
    })

    // O mapa converte ponteiro→célula pela LARGURA REAL do canvas, que é 0 sem
    // layout (happy-dom) — fixa a medida para os cliques caírem em células.
    const grid = screen.getByRole('img', { name: COPY.tiles.mapGrid })
    const cell = 16 * 2 // tileSize × zoom inicial do mapa
    Object.defineProperty(grid, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        left: 0,
        top: 0,
        width: 8 * cell,
        height: 6 * cell,
        right: 8 * cell,
        bottom: 6 * cell,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    })
    const drag = (from: number, to: number): void => {
      fireEvent.pointerDown(grid, { isPrimary: true, pointerId: 1, clientX: from, clientY: from })
      fireEvent.pointerMove(grid, { pointerId: 1, clientX: to, clientY: to })
      fireEvent.pointerUp(grid, { pointerId: 1, clientX: to, clientY: to })
    }

    // 1) Marcar onde NÃO há peça nenhuma: a grade de fundo é referência, não desenho.
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.select }))
    drag(cell, cell * 3)
    expect(screen.queryByRole('button', { name: COPY.tiles.copyPiece })).toBeNull()

    // 2) Pintar uma célula com o lápis e marcar POR CIMA dela: aí sim seleciona.
    fireEvent.click(screen.getByRole('button', { name: COPY.tools.pencil }))
    fireEvent.pointerDown(grid, { isPrimary: true, pointerId: 2, clientX: cell, clientY: cell })
    fireEvent.pointerUp(grid, { pointerId: 2, clientX: cell, clientY: cell })

    fireEvent.click(screen.getByRole('button', { name: COPY.tools.select }))
    drag(cell, cell)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: COPY.tiles.copyPiece })).toBeTruthy()
    })

    // 3) Clicar fora do mapa desseleciona (a barra não fica presa aberta).
    fireEvent.pointerDown(document.body)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: COPY.tiles.copyPiece })).toBeNull()
    })
  })

  it('pintar o mapa com uma peça EM BRANCO avisa (senão parece que o lápis quebrou)', async () => {
    const seed = createGalleryStore()
    const tileset = await seed.getState().create({ kind: 'tileset', name: 'pecas', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    await seed
      .getState()
      .create({ kind: 'tilemap', name: 'fase', tilesetId: tileset.id, cols: 8, rows: 6 })

    render(<PintaApp />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Abrir fase/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir fase/ }))
    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.pickTile)).toBeTruthy()
    })

    const grid = screen.getByRole('img', { name: COPY.tiles.mapGrid })
    fireEvent.pointerDown(grid, { isPrimary: true, pointerId: 1, clientX: 0, clientY: 0 })
    fireEvent.pointerUp(grid, { pointerId: 1, clientX: 0, clientY: 0 })

    await waitFor(() => {
      expect(screen.getByText(COPY.tiles.blankTile)).toBeTruthy()
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
      expect(screen.getByRole('button', { name: /Abrir orfao/ })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: /Abrir orfao/ }))
    await waitFor(() => {
      expect(screen.getAllByText(COPY.tiles.missingTileset).length).toBeGreaterThan(0)
    })
  })
})
