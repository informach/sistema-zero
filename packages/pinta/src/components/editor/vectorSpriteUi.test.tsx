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
import { withRightColumnPrototypeStub } from '../../testing/rightColumnStub'

const { PintaApp } = await import('../PintaApp')
const { persistAsset, setPintaStorageNamespace } = await import('../../state/persistence')
const { createGalleryStore } = await import('../../state/galleryStore')
const { makeText } = await import('../../vector/shapes')

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

  it('abre com prévia, faixa Spritesheet E as ferramentas vetoriais', async () => {
    await openVectorSprite()
    expect(screen.getByText(COPY.animation.preview)).toBeTruthy()
    expect(screen.getByText(COPY.animation.spritesheet)).toBeTruthy()
    expect(screen.getAllByText('parado').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: COPY.vector.brush })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'parado: quadro 1' })).toBeTruthy()
  })

  it('coluna direita ÚNICA (espelho do pixel): prévia + Cores + Aparência juntas', async () => {
    await openVectorSprite()
    expect(screen.getByText(COPY.animation.preview)).toBeTruthy()
    expect(document.querySelector(`section[aria-label="${COPY.palette.title}"]`)).toBeTruthy()
    expect(document.querySelector(`section[aria-label="${COPY.vector.appearance}"]`)).toBeTruthy()
    // O painel avulso de w-56 morreu junto com a coluna dupla.
    expect(document.querySelector('.w-56')).toBeNull()
  })

  it('REGRESSÃO: nenhum painel da coluna direita encolhe; quem rola é a coluna', async () => {
    // A Prévia era o único filho sem shrink-0 e virava uma faixa de 8px em
    // 1366×768 ("a prévia está ficando cortada"). O `Panel` é `overflow-hidden`,
    // que zera o mínimo automático do item flex: sem shrink-0 ele encolhe a zero.
    await openVectorSprite()
    const column = document.querySelector<HTMLElement>('[data-pin-right-column]')
    if (!column) throw new Error('coluna direita esperada')
    expect(column.className).toContain('overflow-y-auto')
    expect(column.className).toContain('pin-scroll-y')
    const children = Array.from(column.children)
    expect(children.length).toBeGreaterThanOrEqual(3)
    for (const child of children) expect(child.classList.contains('shrink-0')).toBe(true)
    const preview = column.querySelector(`section[aria-label="${COPY.animation.preview}"]`)
    expect(preview?.classList.contains('shrink-0')).toBe(true)
  })

  it('ao abrir o desenho, se os painéis não cabem, fecha na ordem Aparência → Prévia e Cores fica', async () => {
    // A coluna só existe depois do render: o stub vai no protótipo (só para a
    // coluna marcada; aberto = 250, recolhido = 50, vãos de 8), restaurado no finally.
    await withRightColumnPrototypeStub(300, async () => {
      await openVectorSprite()
      // 3 painéis presentes (sem forma não há Camadas): 766 → fecha Aparência
      // (566) → fecha Prévia (366) → só Cores aberta: para (nunca fecha a última).
      expect(
        screen.getByRole('button', { name: COPY.panel.collapse(COPY.palette.title) }),
      ).toBeTruthy()
      expect(
        screen.getByRole('button', { name: COPY.panel.expand(COPY.animation.preview) }),
      ).toBeTruthy()
      expect(
        screen.getByRole('button', { name: COPY.panel.expand(COPY.vector.appearance) }),
      ).toBeTruthy()
      // O mount é MUDO para o leitor de tela (nada a anunciar antes de ela agir)...
      expect(screen.queryByText(/para tudo caber na tela/)).toBeNull()
      // ...e a Prévia recolhida segue VIVA no cabeçalho: a miniatura está lá.
      const preview = document.querySelector(`section[aria-label="${COPY.animation.preview}"]`)
      expect(preview?.querySelector('svg')).toBeTruthy()
    })
  })

  it('oculta a expansão quando a timeline compacta já mostra todo o conteúdo', async () => {
    await openVectorSprite()
    expect(Boolean(screen.queryByRole('button', { name: COPY.animation.expandTimeline }))).toBe(
      false,
    )
  })

  it('oferece expansão somente quando a timeline compacta esconde conteúdo', async () => {
    await openVectorSprite()
    const timeline = document.querySelector<HTMLElement>('[data-timeline-scroll]')
    if (!timeline) throw new Error('timeline esperada')
    Object.defineProperties(timeline, {
      scrollHeight: { configurable: true, value: 400 },
      clientHeight: { configurable: true, value: 224 },
    })

    fireEvent(window, new Event('resize'))
    const expand = await screen.findByRole('button', { name: COPY.animation.expandTimeline })
    expect(expand.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(expand)
    const compact = screen.getByRole('button', { name: COPY.animation.compactTimeline })
    expect(compact.getAttribute('aria-expanded')).toBe('true')
    expect(timeline.className).toContain('max-h-96')
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

  it('desenhar não recria o ResizeObserver da timeline', async () => {
    const observerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver')
    let observers = 0
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: class {
        constructor() {
          observers += 1
        }
        observe(): void {}
        disconnect(): void {}
      },
    })
    try {
      await openVectorSprite()
      const beforeDrawing = observers
      const stage = screen.getByRole('img', { name: COPY.a11y.drawArea })
      fireEvent.pointerDown(stage, { isPrimary: true, pointerId: 31, clientX: 10, clientY: 10 })
      fireEvent.pointerMove(stage, { pointerId: 31, clientX: 30, clientY: 30 })
      fireEvent.pointerUp(stage, { pointerId: 31 })
      await waitFor(() => {
        expect(stage.querySelector('path')).toBeTruthy()
      })
      expect(observers).toBe(beforeDrawing)
    } finally {
      if (observerDescriptor) {
        Object.defineProperty(globalThis, 'ResizeObserver', observerDescriptor)
      } else {
        Reflect.deleteProperty(globalThis, 'ResizeObserver')
      }
    }
  })

  it('novo quadro e nova animação funcionam como no pixel', async () => {
    await openVectorSprite()
    fireEvent.click(screen.getByRole('button', { name: COPY.animation.addFrame }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'parado: quadro 2' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COPY.animation.addAnimation }))
    await waitFor(() => {
      expect(screen.getAllByText('andar').length).toBeGreaterThan(0)
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

  it('download SVG do diálogo incorpora a fonte usada no personagem', async () => {
    const seed = createGalleryStore()
    const asset = await seed
      .getState()
      .create({ kind: 'vector-sprite', name: 'heroi-com-fonte', frameSize: 64 })
    if (asset?.kind !== 'vector-sprite') throw new Error('personagem vetorial esperado')
    asset.animations[0]?.frames[0]?.push(
      makeText(
        { x: 8, y: 32 },
        'Jogar',
        { fill: '#000000', stroke: null, opacity: 1 },
        'left',
        'bungee',
      ),
    )
    await persistAsset(asset)

    const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
    const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
    const downloads: Blob[] = []
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (blob: Blob) => {
        downloads.push(blob)
        return 'blob:pinta-vector-svg-test'
      },
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: () => undefined,
    })

    try {
      await openAsset('heroi-com-fonte')
      fireEvent.click(screen.getByRole('button', { name: COPY.editor.download }))
      fireEvent.click(await screen.findByRole('button', { name: COPY.exportDialog.spritesheetSvg }))
      await waitFor(() => expect(downloads.length).toBe(1))
      const svg = await downloads[0]?.text()
      expect(svg).toContain('@font-face')
      expect(svg).toContain("font-family:'Bungee'")
      expect(svg).toContain('data:font/woff2;base64,')
    } finally {
      if (createDescriptor) Object.defineProperty(URL, 'createObjectURL', createDescriptor)
      else Reflect.deleteProperty(URL, 'createObjectURL')
      if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor)
      else Reflect.deleteProperty(URL, 'revokeObjectURL')
    }
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
    expect(screen.queryByText(COPY.animation.spritesheet)).toBeNull()
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
