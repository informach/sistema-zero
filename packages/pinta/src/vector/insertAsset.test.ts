import { describe, expect, it } from 'bun:test'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  createVectorSpriteAsset,
  createVectorTilesetAsset,
  type PintaAsset,
} from '../core/project'
import { normalizeSearchText } from '../core/searchText'
import { addPixelLayer } from '../pixel/layers'
import { boundsUnion, shapeBounds } from './geometry'
import {
  imageShapeForInsert,
  insertableAssets,
  insertPlanFor,
  shapesForInsert,
} from './insertAsset'
import { sanitizeVectorShape, type VectorShape } from './model'

const style = { fill: '#ff0000', stroke: null, opacity: 1, rotation: 0 }
const quadrado = (id: string, x: number, y: number): VectorShape => ({
  ...style,
  id,
  type: 'rect',
  x,
  y,
  w: 40,
  h: 40,
  rx: 0,
})

function cenarioVetorial(shapes: VectorShape[]): PintaAsset {
  const asset = createVectorBackgroundAsset({ name: 'cenario', width: 200, height: 200 })
  return { ...asset, shapes }
}

describe('insertPlanFor (o que cada tipo de desenho vira)', () => {
  it('os TRÊS kinds de vetor entram como FORMAS', () => {
    expect(insertPlanFor(cenarioVetorial([quadrado('a', 0, 0)]))?.kind).toBe('shapes')
    const sprite = createVectorSpriteAsset({ name: 'heroi', frameSize: 32 })
    expect(
      insertPlanFor({
        ...sprite,
        animations: [{ ...sprite.animations[0], frames: [[quadrado('b', 0, 0)]] }],
      } as PintaAsset)?.kind,
    ).toBe('shapes')
    const tileset = createVectorTilesetAsset({ name: 'pecas', tileSize: 16 })
    expect(insertPlanFor({ ...tileset, tiles: [[quadrado('c', 0, 0)]] } as PintaAsset)?.kind).toBe(
      'shapes',
    )
  })

  it('os TRÊS kinds de pixel entram como FIGURA', () => {
    expect(insertPlanFor(createPixelSpriteAsset({ name: 'nave', frameSize: 16 }))?.kind).toBe(
      'pixel',
    )
    expect(
      insertPlanFor(createPixelBackgroundAsset({ name: 'ceu', width: 32, height: 32 }))?.kind,
    ).toBe('pixel')
    expect(insertPlanFor(createTilesetAsset({ name: 'blocos', tileSize: 16 }))?.kind).toBe('pixel')
  })

  it('o MAPA fica de fora (a miniatura dele é um minimapa, não o desenho)', () => {
    const mapa = createTilemapAsset({ name: 'fase', cols: 8, rows: 8, tilesetId: 'x' })
    expect(insertPlanFor(mapa)).toBeNull()
  })

  it('desenho de vetor em BRANCO ainda dá plano (a recusa é do chamador)', () => {
    const plano = insertPlanFor(cenarioVetorial([]))
    expect(plano?.kind).toBe('shapes')
    expect(plano && plano.kind === 'shapes' && plano.shapes.length).toBe(0)
  })
})

describe('shapesForInsert (vetor vira formas)', () => {
  const origem = {
    kind: 'shapes' as const,
    width: 200,
    height: 200,
    shapes: [quadrado('a', 0, 0), quadrado('b', 160, 160)],
  }

  it('ids NOVOS e um grupo ÚNICO (a inserção anda junta)', () => {
    const out = shapesForInsert(origem, { width: 400, height: 400 })
    expect(out).toHaveLength(2)
    expect(out.map((s) => s.id)).not.toContain('a')
    expect(out.map((s) => s.id)).not.toContain('b')
    expect(new Set(out.map((s) => s.groupId)).size).toBe(1)
    expect(out[0]?.groupId).toBeTruthy()
  })

  it('cabe e fica CENTRALIZADO no documento de destino', () => {
    const alvo = { width: 400, height: 300 }
    const out = shapesForInsert(origem, alvo)
    const caixa = boundsUnion(out.map(shapeBounds))
    expect(caixa.x + caixa.width / 2).toBeCloseTo(alvo.width / 2, 6)
    expect(caixa.y + caixa.height / 2).toBeCloseTo(alvo.height / 2, 6)
    // Metade do lado curto: 300 * 0.5 = 150 no maior lado da origem.
    expect(Math.max(caixa.width, caixa.height)).toBeCloseTo(150, 6)
  })

  it('desenho vazio devolve lista vazia (nada a inserir)', () => {
    expect(shapesForInsert({ ...origem, shapes: [] }, { width: 100, height: 100 })).toEqual([])
  })

  it('as formas inseridas passam pelo sanitize', () => {
    for (const shape of shapesForInsert(origem, { width: 400, height: 400 })) {
      expect(sanitizeVectorShape(shape)).not.toBeNull()
    }
  })

  it('ignora shapes escondidos nos bounds e no conteúdo inserido', () => {
    const hiddenFarAway = { ...quadrado('longe', 10_000, 10_000), hidden: true as const }
    const out = shapesForInsert(
      { ...origem, shapes: [quadrado('visivel', 0, 0), hiddenFarAway] },
      { width: 400, height: 300 },
    )

    expect(out).toHaveLength(1)
    expect(boundsUnion(out.map(shapeBounds))).toMatchObject({
      x: 185,
      y: 135,
      width: 30,
      height: 30,
    })
  })
})

describe('imageShapeForInsert (pixel vira figura)', () => {
  const src = `data:image/png;base64,${'A'.repeat(40)}`
  const origem = { kind: 'image' as const, width: 32, height: 16, src }

  it('nasce centralizada, pixelada e válida para o sanitize', () => {
    const alvo = { width: 400, height: 300 }
    const shape = imageShapeForInsert(origem, alvo)
    if (shape.type !== 'image') throw new Error('tipo')
    expect(shape.pixelated).toBe(true)
    expect(shape.src).toBe(src)
    const caixa = shapeBounds(shape)
    // Folga de 1px: a figura assenta em pixel INTEIRO de propósito (meio pixel
    // borraria a arte de pixel), então o centro pode ficar meio pixel fora.
    expect(Math.abs(caixa.x + caixa.width / 2 - alvo.width / 2)).toBeLessThanOrEqual(1)
    expect(Math.abs(caixa.y + caixa.height / 2 - alvo.height / 2)).toBeLessThanOrEqual(1)
    // O maior lado vira metade do lado curto do destino.
    expect(caixa.width).toBeCloseTo(150, 6)
    expect(sanitizeVectorShape(shape)).not.toBeNull()
  })

  it('mantém a proporção do desenho original (2:1 continua 2:1)', () => {
    const shape = imageShapeForInsert(origem, { width: 400, height: 300 })
    const caixa = shapeBounds(shape)
    expect(caixa.width / caixa.height).toBeCloseTo(2, 6)
  })
})

describe('insertableAssets (a lista do seletor)', () => {
  const cenario = { ...cenarioVetorial([quadrado('a', 0, 0)]), id: 'aberto', name: 'meu-cenario' }
  const outro = { ...cenarioVetorial([quadrado('b', 0, 0)]), id: 'outro', name: 'castelo' }
  const nave = { ...createPixelSpriteAsset({ name: 'nave', frameSize: 16 }), id: 'nave' }
  const mapa = {
    ...createTilemapAsset({ name: 'fase', cols: 4, rows: 4, tilesetId: 'x' }),
    id: 'mapa',
  }
  const todos = [cenario, outro, nave, mapa] as PintaAsset[]

  it('tira o desenho ABERTO e o mapa', () => {
    const ids = insertableAssets(todos, 'aberto', '', normalizeSearchText).map((a) => a.id)
    expect(ids).toEqual(['outro', 'nave'])
  })

  it('busca por nome ignorando acento e maiúscula', () => {
    const comAcento = { ...outro, name: 'castelo-mágico' } as PintaAsset
    const lista = [comAcento, nave] as PintaAsset[]
    expect(insertableAssets(lista, 'aberto', 'MAGICO', normalizeSearchText)).toHaveLength(1)
    expect(insertableAssets(lista, 'aberto', 'nave', normalizeSearchText)).toHaveLength(1)
    expect(insertableAssets(lista, 'aberto', 'dragao', normalizeSearchText)).toHaveLength(0)
  })

  it('busca também pelo nome do JOGO (projectRef)', () => {
    const doJogo = {
      ...outro,
      projectRef: { id: 'j1', name: 'Reino Zero' },
    } as PintaAsset
    expect(insertableAssets([doJogo], 'aberto', 'reino', normalizeSearchText)).toHaveLength(1)
  })

  it('filtra a lista sem rasterizar nem acessar os pixels das camadas', () => {
    const layered = addPixelLayer(
      createPixelBackgroundAsset({ name: 'camadas', width: 32, height: 32 }),
    )
    Object.defineProperty(layered.cels[0] as object, 'data', {
      get: () => {
        throw new Error('o filtro não pode ler pixels')
      },
    })

    expect(() => insertableAssets([layered], 'aberto', '', normalizeSearchText)).not.toThrow()
  })
})
