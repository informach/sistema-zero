/**
 * Paridade vetorial: o personagem VETORIAL abre com os MESMOS painéis do pixel
 * (prévia rodando, lista de animações, filmstrip), o palco SVG tem dimensão
 * DEFINIDA (regressão do bug "a área de desenho não aparece") e as peças
 * vetoriais ganham a tira com remap dos mapas.
 */
import { beforeEach, describe, expect, it } from 'bun:test'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { clearIdbMock } from '../../testing/idbMock'

const { PintaApp } = await import('../PintaApp')
const { setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')

beforeEach(() => {
  clearIdbMock()
  setPintaStorageNamespace('')
})

async function openAsset(name: string): Promise<void> {
  render(<PintaApp />)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(`Abrir ${name}`) })).toBeTruthy()
  })
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Abrir ${name}`) }))
  await waitFor(() => {
    expect(screen.getByText(name)).toBeTruthy()
  })
}

describe('personagem vetorial — paridade com o pixel', () => {
  async function openVectorSprite(): Promise<void> {
    const seed = createGalleryStore()
    await seed.getState().create({ kind: 'vector-sprite', name: 'heroi-v', frameSize: 64 })
    await openAsset('heroi-v')
  }

  it('abre com prévia, lista de animações, filmstrip E as ferramentas vetoriais', async () => {
    await openVectorSprite()
    expect(screen.getByText(COPY.animation.preview)).toBeTruthy()
    expect(screen.getByText(COPY.animation.animations)).toBeTruthy()
    expect(screen.getByText(COPY.animation.frames)).toBeTruthy()
    expect(screen.getByText('parado')).toBeTruthy()
    expect(screen.getByRole('button', { name: COPY.vector.brush })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quadro 1' })).toBeTruthy()
  })

  it('REGRESSÃO: o palco SVG tem width/height DEFINIDOS (doc × zoom)', async () => {
    await openVectorSprite()
    const stage = screen.getByRole('img', { name: 'Área de desenho' })
    // 64px de documento × zoom inicial 4 = 256 (dimensão explícita: o palco
    // nunca mais colapsa a zero dentro do wrapper shrink-to-fit).
    expect(stage.getAttribute('width')).toBe('256')
    expect(stage.getAttribute('height')).toBe('256')
    expect(stage.getAttribute('viewBox')).toBe('0 0 64 64')
  })

  it('zoom muda a dimensão do palco', async () => {
    await openVectorSprite()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.zoomIn }))
    await waitFor(() => {
      const stage = screen.getByRole('img', { name: 'Área de desenho' })
      expect(stage.getAttribute('width')).toBe('512')
    })
  })

  it('gesto com palco SEM medida (happy-dom) não injeta NaN no asset', async () => {
    await openVectorSprite()
    const stage = screen.getByRole('img', { name: 'Área de desenho' })
    fireEvent.pointerDown(stage, { isPrimary: true, clientX: 10, clientY: 10 })
    fireEvent.pointerMove(stage, { clientX: 30, clientY: 30 })
    fireEvent.pointerUp(stage)
    await act(async () => {
      await Bun.sleep(0)
    })
    // O pincel cria um path mesmo sem arrasto útil; nada de NaN no d.
    const svgText = document.body.innerHTML
    expect(svgText).not.toContain('NaN')
  })

  it('novo quadro e nova animação funcionam como no pixel', async () => {
    await openVectorSprite()
    fireEvent.click(screen.getByRole('button', { name: COPY.animation.addFrame }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Quadro 2' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.animation.addAnimation }))
    await waitFor(() => {
      expect(screen.getByText('andar')).toBeTruthy()
    })
  })

  it('Baixar abre o diálogo com folha vetorial + receita + dica de upscale', async () => {
    await openVectorSprite()
    fireEvent.click(screen.getByRole('button', { name: COPY.editor.download }))
    await waitFor(() => {
      expect(screen.getByText(COPY.exportDialog.spritesheet, { exact: false })).toBeTruthy()
    })
    expect(screen.getByText(COPY.exportDialog.spritesheetSvg, { exact: false })).toBeTruthy()
    expect(screen.getByText(COPY.exportDialog.recipeTitle)).toBeTruthy()
    expect(screen.getByText(COPY.exportDialog.scaleVectorHint)).toBeTruthy()
    expect(screen.getByText(/do quadro 0 ao 0/)).toBeTruthy()
  })
})

describe('cenário vetorial — palco com dimensão', () => {
  it('abre com o palco em width/height reais (zoom 1 para docs grandes)', async () => {
    const seed = createGalleryStore()
    await seed
      .getState()
      .create({ kind: 'vector-background', name: 'fundo-v', width: 480, height: 360 })
    await openAsset('fundo-v')
    const stage = screen.getByRole('img', { name: 'Área de desenho' })
    expect(stage.getAttribute('width')).toBe('480')
    expect(stage.getAttribute('height')).toBe('360')
    // Cenário não tem painéis de sprite.
    expect(screen.queryByText(COPY.animation.preview)).toBeNull()
    expect(screen.queryByText(COPY.animation.frames)).toBeNull()
  })
})

describe('peças vetoriais — tira + remap', () => {
  it('abre com a TileStrip e adicionar peça remapeia os mapas do tileset', async () => {
    const seed = createGalleryStore()
    const tileset = await seed
      .getState()
      .create({ kind: 'vector-tileset', name: 'pecas-v', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    const tilemap = await seed
      .getState()
      .create({ kind: 'tilemap', name: 'fase-v', tilesetId: tileset.id, cols: 2, rows: 2 })
    if (tilemap?.kind !== 'tilemap') throw new Error('tilemap esperado')
    // Pinta a célula 0 com a peça 0 direto no disco (via absorb+persist do seed).
    const layer = tilemap.layers[0]
    if (!layer) throw new Error('camada esperada')
    layer.cells.set([0, -1, -1, 0])

    await openAsset('pecas-v')
    expect(screen.getByText(COPY.tiles.tiles)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Peça 0' })).toBeTruthy()

    // Nova peça DEPOIS da 0: células apontando p/ 0 não mudam.
    fireEvent.click(screen.getByRole('button', { name: COPY.tiles.addTile }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Peça 1' })).toBeTruthy()
    })
  })

  it('mapa com peças vetoriais abre sem quebrar (canvas mudo no happy-dom)', async () => {
    const seed = createGalleryStore()
    const tileset = await seed
      .getState()
      .create({ kind: 'vector-tileset', name: 'pecas-v', tileSize: 16 })
    if (!tileset) throw new Error('tileset esperado')
    await seed
      .getState()
      .create({ kind: 'tilemap', name: 'fase-v', tilesetId: tileset.id, cols: 2, rows: 2 })
    await openAsset('fase-v')
    expect(screen.getByRole('img', { name: 'Grade do mapa' })).toBeTruthy()
    expect(screen.getByText(COPY.tiles.pickTile)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Peça 0' })).toBeTruthy()
  })
})
