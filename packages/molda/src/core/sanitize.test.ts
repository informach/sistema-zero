import { describe, expect, test } from 'bun:test'
import { faceSkinSize } from '../model/shapes'
import { makeModel, makeSky, makeTexture, paintedSkin } from '../testing/fixtures'
import { MOLDA_LIMITS } from './limits'
import { createPart, type MoldaModelAsset } from './model'
import { getPalette } from './palette'
import {
  normalizeBox,
  normalizeRotation,
  resolvePaletteColors,
  sanitizeCustomPalette,
  sanitizeExtraColors,
  sanitizeMoldaAsset,
  sanitizeSkin,
} from './sanitize'
import { bytesToBase64 } from './skinCodec'

describe('sanitizeMoldaAsset: round-trip por tipo', () => {
  test('modelo válido volta idêntico (structuredClone, nunca JSON)', () => {
    const model = makeModel()
    const out = sanitizeMoldaAsset(structuredClone(model))
    expect(out).toEqual(model)
  })

  test('textura válida volta idêntica', () => {
    const texture = makeTexture()
    expect(sanitizeMoldaAsset(structuredClone(texture))).toEqual(texture)
  })

  test('céu válido volta idêntico', () => {
    const sky = makeSky()
    expect(sanitizeMoldaAsset(structuredClone(sky))).toEqual(sky)
  })

  test('sanitize é idempotente', () => {
    const once = sanitizeMoldaAsset(structuredClone(makeModel()))
    const twice = sanitizeMoldaAsset(structuredClone(once))
    expect(twice).toEqual(once)
  })
})

describe('sanitizeSkin: limites antes de converter', () => {
  test('rejeita array com comprimento divergente sem percorrer seus valores', () => {
    const data = new Proxy([1, 2], {
      get(target, property, receiver) {
        if (property === 'every') throw new Error('não deveria percorrer')
        return Reflect.get(target, property, receiver)
      },
    })

    expect(() => sanitizeSkin({ width: 1, height: 1, data })).not.toThrow()
    expect(sanitizeSkin({ width: 1, height: 1, data })).toBeNull()
  })
})

describe('sanitizeMoldaAsset: lixo e bordas', () => {
  test('nunca lança: entradas que não são criação viram null', () => {
    for (const raw of [
      null,
      undefined,
      1,
      'x',
      [],
      {},
      { kind: 'model' },
      { kind: 'nope', id: 'a' },
    ]) {
      expect(sanitizeMoldaAsset(raw)).toBeNull()
    }
  })

  test('nunca lança com valores não numéricos dentro de uma pele JSON', () => {
    const texture = makeTexture()
    const raw = {
      ...texture,
      bitmap: {
        ...texture.bitmap,
        data: Array.from(texture.bitmap.data, (_value, index) => (index === 0 ? 1n : 1)),
      },
    }

    expect(() => sanitizeMoldaAsset(raw)).not.toThrow()
    expect(sanitizeMoldaAsset(raw)).toBeNull()
  })

  test('id com ":" ou nome inválido derruba o registro', () => {
    const model = makeModel()
    expect(sanitizeMoldaAsset({ ...model, id: 'a:b' })).toBeNull()
    expect(sanitizeMoldaAsset({ ...model, name: '???' })).toBeNull()
  })

  test('nome é normalizado para kebab-case', () => {
    const out = sanitizeMoldaAsset({ ...makeModel(), name: 'Minha Nave Épica' })
    expect(out?.name).toBe('minha-nave-epica')
  })

  test('thumb só entra como data URL de imagem dentro do teto', () => {
    const model = makeModel()
    expect(sanitizeMoldaAsset({ ...model, thumb: 'data:image/jpeg;base64,AAAA' })?.thumb).toBe(
      'data:image/jpeg;base64,AAAA',
    )
    expect(sanitizeMoldaAsset({ ...model, thumb: 'https://x/y.png' })?.thumb).toBeUndefined()
    const huge = `data:image/png;base64,${'A'.repeat(MOLDA_LIMITS.maxThumbChars)}`
    expect(sanitizeMoldaAsset({ ...model, thumb: huge })?.thumb).toBeUndefined()
  })

  test('timestamps ausentes caem em 0 sem derrubar', () => {
    const { createdAt: _c, updatedAt: _u, ...rest } = makeSky()
    const out = sanitizeMoldaAsset(rest)
    expect(out?.createdAt).toBe(0)
    expect(out?.updatedAt).toBe(0)
  })
})

describe('sanitizeMoldaAsset: peças', () => {
  test('peça inválida cai SEM derrubar o modelo', () => {
    const model = makeModel()
    const raw = { ...model, parts: [...model.parts, { id: 'bad', shape: 'nope' }, 'lixo', null] }
    const out = sanitizeMoldaAsset(raw) as MoldaModelAsset
    expect(out.parts.map((p) => p.id)).toEqual(['body', 'wing'])
  })

  test('peça duplicada (mesmo id) fica só a primeira', () => {
    const model = makeModel()
    const raw = { ...model, parts: [model.parts[0], model.parts[0]] }
    const out = sanitizeMoldaAsset(raw) as MoldaModelAsset
    expect(out.parts).toHaveLength(1)
  })

  test('from/to são arredondados ao snap, ordenados e clampados à grade', () => {
    const model = makeModel({ snap: 1 })
    const part = createPart({
      id: 'p',
      name: 'p',
      from: [3.4, -2, 40],
      to: [1.2, 0.6, 50],
      color: 2,
    })
    const out = sanitizeMoldaAsset({ ...model, parts: [part] }) as MoldaModelAsset
    const p = out.parts[0]
    expect(p).toBeDefined()
    if (!p) return
    expect(p.from[0]).toBeLessThan(p.to[0])
    expect(p.from[1]).toBeLessThan(p.to[1])
    expect(p.from[2]).toBeLessThan(p.to[2])
    expect(p.from[1]).toBeGreaterThanOrEqual(0)
    expect(p.to[2]).toBeLessThanOrEqual(MOLDA_LIMITS.gridHalf)
    for (const v of [...p.from, ...p.to]) expect(Number.isInteger(v)).toBe(true)
  })

  test('lado maior que o teto é cortado', () => {
    const { from, to } = normalizeBox([-16, 0, 0], [16, 60, 1], 1)
    expect(to[1] - from[1]).toBe(MOLDA_LIMITS.maxPartSize)
    expect(to[0] - from[0]).toBe(32)
  })

  test('rotação vai para o múltiplo de 15 mais perto, em [0, 360)', () => {
    expect(normalizeRotation([7, -20, 367])).toEqual([0, 345, 0])
    expect(normalizeRotation([44, 46, 720])).toEqual([45, 45, 0])
  })

  test('cor fora da paleta cai na primeira pintável', () => {
    const model = makeModel()
    const part = createPart({ id: 'p', name: 'p', from: [0, 0, 0], to: [1, 1, 1], color: 99 })
    const out = sanitizeMoldaAsset({ ...model, parts: [part] }) as MoldaModelAsset
    expect(out.parts[0]?.color).toBe(1)
    const zero = sanitizeMoldaAsset({ ...model, parts: [{ ...part, color: 0 }] }) as MoldaModelAsset
    expect(zero.parts[0]?.color).toBe(1)
  })

  test('origin é clampada dentro da caixa; ausente fica ausente', () => {
    const model = makeModel()
    const part = {
      ...createPart({ id: 'p', name: 'p', from: [0, 0, 0], to: [2, 2, 2], color: 2 }),
      origin: [9, -9, 1],
    }
    const out = sanitizeMoldaAsset({ ...model, parts: [part] }) as MoldaModelAsset
    expect(out.parts[0]?.origin).toEqual([2, 0, 1])
    const noOrigin = sanitizeMoldaAsset({ ...model, parts: [model.parts[0]] }) as MoldaModelAsset
    expect('origin' in (noOrigin.parts[0] ?? {})).toBe(false)
  })

  test('nome de peça vazio ganha um nome; longo é cortado', () => {
    const model = makeModel()
    const parts = [
      { ...createPart({ id: 'a', name: '', from: [0, 0, 0], to: [1, 1, 1], color: 2 }) },
      {
        ...createPart({ id: 'b', name: 'x'.repeat(80), from: [0, 0, 0], to: [1, 1, 1], color: 2 }),
      },
    ]
    const out = sanitizeMoldaAsset({ ...model, parts }) as MoldaModelAsset
    expect(out.parts[0]?.name).toBe('peca 1')
    expect(out.parts[1]?.name).toHaveLength(MOLDA_LIMITS.maxPartNameChars)
  })

  test('texelsPerUnit e snap desconhecidos caem no padrão', () => {
    const out = sanitizeMoldaAsset({
      ...makeModel(),
      texelsPerUnit: 3,
      snap: 0.25,
    }) as MoldaModelAsset
    expect(out.texelsPerUnit).toBe(4)
    expect(out.snap).toBe(1)
  })

  test('mais peças que o teto: fica só o teto', () => {
    const model = makeModel()
    const parts = Array.from({ length: MOLDA_LIMITS.maxParts + 5 }, (_, i) =>
      createPart({ id: `p${i}`, name: `p${i}`, from: [0, 0, 0], to: [1, 1, 1], color: 2 }),
    )
    const out = sanitizeMoldaAsset({ ...model, parts }) as MoldaModelAsset
    expect(out.parts).toHaveLength(MOLDA_LIMITS.maxParts)
  })
})

describe('sanitizeMoldaAsset: peles', () => {
  test('pele com tamanho divergente é RE-AMOSTRADA para o tamanho da face', () => {
    const model = makeModel()
    const body = structuredClone(model.parts[0])
    if (!body) throw new Error('fixture')
    body.faces.py = paintedSkin(8, 8, () => 3)
    const out = sanitizeMoldaAsset({ ...model, parts: [body] }) as MoldaModelAsset
    const expected = faceSkinSize(body, 'py', model.texelsPerUnit)
    expect(out.parts[0]?.faces.py?.width).toBe(expected?.width ?? -1)
    expect(out.parts[0]?.faces.py?.height).toBe(expected?.height ?? -1)
    expect(out.parts[0]?.faces.py?.data.every((v) => v === 3)).toBe(true)
  })

  test('pele toda 0 some; face que a forma não tem some; índice fora da paleta vira 0', () => {
    const model = makeModel()
    const body = structuredClone(model.parts[0])
    if (!body) throw new Error('fixture')
    const size = faceSkinSize(body, 'px', model.texelsPerUnit)
    if (!size) throw new Error('size')
    body.faces.px = paintedSkin(size.width, size.height, () => 0)
    body.faces.nx = paintedSkin(size.width, size.height, (x) => (x === 0 ? 200 : 4))
    ;(body.faces as Record<string, unknown>).slope = paintedSkin(4, 4, () => 2)
    const out = sanitizeMoldaAsset({ ...model, parts: [body] }) as MoldaModelAsset
    const faces = out.parts[0]?.faces ?? {}
    expect(faces.px).toBeUndefined()
    expect('slope' in faces).toBe(false)
    expect(faces.nx?.data[0]).toBe(0)
    expect(faces.nx?.data[1]).toBe(4)
  })

  test('pele aceita data como array simples ou base64', () => {
    const skin = paintedSkin(4, 4, (x, y) => (x + y) % 3)
    const asArray = sanitizeSkin({ width: 4, height: 4, data: Array.from(skin.data) })
    const asBase64 = sanitizeSkin({ width: 4, height: 4, data: bytesToBase64(skin.data) })
    expect(asArray?.data).toEqual(skin.data)
    expect(asBase64?.data).toEqual(skin.data)
    expect(sanitizeSkin({ width: 4, height: 4, data: 'n@o-base64!' })).toBeNull()
    expect(sanitizeSkin({ width: 4, height: 4, data: new Uint8Array(3) })).toBeNull()
    expect(sanitizeSkin({ width: 0, height: 4, data: new Uint8Array(0) })).toBeNull()
  })
})

describe('sanitizeMoldaAsset: gêmeos', () => {
  test('mirrorX recompõe um gêmeo ausente quando ainda há espaço', () => {
    const source = createPart({
      id: 'a',
      name: 'a',
      from: [1, 0, 0],
      to: [2, 1, 1],
      color: 2,
    })
    const out = sanitizeMoldaAsset(makeModel({ mirrorX: true, parts: [source] })) as MoldaModelAsset

    expect(out.parts).toHaveLength(2)
    expect(out.parts.find((part) => part.mirrorOf === source.id)?.from).toEqual([-2, 0, 0])
  })

  test('mirrorOf órfão ou apontando para outro gêmeo é apagado', () => {
    const model = makeModel({ mirrorX: true })
    const a = createPart({ id: 'a', name: 'a', from: [1, 0, 0], to: [2, 1, 1], color: 2 })
    const b = {
      ...createPart({ id: 'b', name: 'b', from: [-2, 0, 0], to: [-1, 1, 1], color: 2 }),
      mirrorOf: 'a',
    }
    const c = {
      ...createPart({ id: 'c', name: 'c', from: [0, 0, 0], to: [1, 1, 1], color: 2 }),
      mirrorOf: 'b',
    }
    const d = {
      ...createPart({ id: 'd', name: 'd', from: [0, 0, 0], to: [1, 1, 1], color: 2 }),
      mirrorOf: 'zzz',
    }
    const out = sanitizeMoldaAsset({ ...model, parts: [a, b, c, d] }) as MoldaModelAsset
    expect(out.parts.find((p) => p.id === 'b')?.mirrorOf).toBe('a')
    expect(out.parts.find((p) => p.id === 'c')?.mirrorOf).toBeUndefined()
    expect(out.parts.find((p) => p.id === 'd')?.mirrorOf).toBeUndefined()
  })

  test('com o espelho desligado o gêmeo é assado com a pele que mostrava', () => {
    const model = makeModel({ mirrorX: false })
    const a = createPart({ id: 'a', name: 'a', from: [1, 0, 0], to: [2, 1, 1], color: 2 })
    a.faces.px = paintedSkin(4, 4, (x) => (x === 0 ? 7 : 0))
    const b = {
      ...createPart({ id: 'b', name: 'b', from: [-2, 0, 0], to: [-1, 1, 1], color: 2 }),
      mirrorOf: 'a',
    }
    const out = sanitizeMoldaAsset({ ...model, parts: [a, b] }) as MoldaModelAsset
    expect(out.parts.every((p) => !p.mirrorOf)).toBe(true)
    expect(out.parts[1]?.faces.nx?.data[3]).toBe(7)
    expect(out.parts[1]?.faces.nx?.data[0]).toBe(0)
  })

  test('a geometria do gêmeo é sincronizada com a fonte', () => {
    const model = makeModel({ mirrorX: true })
    const a = createPart({
      id: 'a',
      name: 'a',
      from: [1, 0, 0],
      to: [3, 2, 1],
      color: 2,
      rotation: [0, 30, 0],
    })
    const b = {
      ...createPart({ id: 'b', name: 'b', from: [0, 0, 0], to: [1, 1, 1], color: 5 }),
      mirrorOf: 'a',
    }
    const out = sanitizeMoldaAsset({ ...model, parts: [a, b] }) as MoldaModelAsset
    const twin = out.parts.find((p) => p.id === 'b')
    expect(twin?.from).toEqual([-3, 0, 0])
    expect(twin?.to).toEqual([-1, 2, 1])
    expect(twin?.rotation).toEqual([0, 330, 0])
    expect(twin?.color).toBe(2)
  })
})

describe('sanitizeMoldaAsset: paleta', () => {
  test('customPalette órfã não substitui a paleta indicada por paletteId', () => {
    const customPalette = {
      name: 'Órfã',
      colors: ['', ...Array.from({ length: 15 }, () => '#123456')],
    }

    expect(resolvePaletteColors({ paletteId: 'pastel', customPalette })).toEqual(
      getPalette('pastel').colors,
    )
  })

  test('extras normalizadas, deduplicadas, cortadas no teto; chave omitida quando vazia', () => {
    expect(sanitizeExtraColors(['#ABC', '#aabbcc', 'x', '#123456'])).toEqual(['#aabbcc', '#123456'])
    expect(sanitizeExtraColors([])).toBeUndefined()
    expect(sanitizeExtraColors('nope')).toBeUndefined()
    const many = Array.from({ length: 60 }, (_, i) => `#${i.toString(16).padStart(6, '0')}`)
    expect(sanitizeExtraColors(many)).toHaveLength(MOLDA_LIMITS.maxExtraColors)
    const out = sanitizeMoldaAsset({ ...makeModel(), extraColors: [] })
    expect(out && 'extraColors' in out).toBe(false)
  })

  test('paleta custom preserva os slots vazios e o índice 0 reservado', () => {
    const colors = ['#ffffff', '#ff0000', '', 'lixo', '#00ff00']
    const custom = sanitizeCustomPalette({ name: 'Minha', colors })
    expect(custom?.colors).toHaveLength(16)
    expect(custom?.colors[0]).toBe('')
    expect(custom?.colors[1]).toBe('#ff0000')
    expect(custom?.colors[2]).toBe('')
    expect(custom?.colors[3]).toBe('')
    expect(custom?.colors[4]).toBe('#00ff00')
    expect(sanitizeCustomPalette({ colors: ['', '', 'x'] })).toBeNull()
  })

  test('paletteId custom sem paleta válida cai na arcade', () => {
    const out = sanitizeMoldaAsset({ ...makeModel(), paletteId: 'custom', customPalette: null })
    expect(out && 'paletteId' in out ? out.paletteId : null).toBe('arcade')
  })

  test('cor de peça num slot vazio da custom cai na primeira pintável', () => {
    const custom = { name: 'x', colors: ['', '', '', '#112233'] }
    const model = makeModel({ paletteId: 'custom', customPalette: custom })
    const part = createPart({ id: 'p', name: 'p', from: [0, 0, 0], to: [1, 1, 1], color: 2 })
    const out = sanitizeMoldaAsset({ ...model, parts: [part] }) as MoldaModelAsset
    expect(out.parts[0]?.color).toBe(3)
  })

  test('as paletas de fábrica têm 16 cores com o 0 reservado', () => {
    for (const id of ['arcade', 'pastel', 'cinzas'] as const) {
      const palette = getPalette(id)
      expect(palette.colors).toHaveLength(16)
      expect(palette.colors[0]).toBe('')
      for (const hex of palette.colors.slice(1)) expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('sanitizeMoldaAsset: textura e céu', () => {
  test('textura com tamanho inválido cai; bitmap re-amostrado ao tamanho', () => {
    const texture = makeTexture()
    expect(sanitizeMoldaAsset({ ...texture, size: 20 })).toBeNull()
    const out = sanitizeMoldaAsset({ ...texture, size: 32 })
    expect(out?.kind === 'texture' && out.bitmap.width).toBe(32)
    expect(sanitizeMoldaAsset({ ...texture, bitmap: null })).toBeNull()
  })

  test('céu com params lixo cai no preset padrão; slider fora do range é clampado', () => {
    const sky = makeSky()
    const out = sanitizeMoldaAsset({ ...sky, params: 'x' })
    expect(out?.kind === 'sky' && out.params.preset).toBe('dia')
    const wild = sanitizeMoldaAsset({
      ...sky,
      params: { ...sky.params, preset: 'marte', sunElevation: 500, exposure: -3, topColor: 'zzz' },
    })
    if (wild?.kind !== 'sky') throw new Error('kind')
    expect(wild.params.preset).toBe('custom')
    expect(wild.params.sunElevation).toBe(90)
    expect(wild.params.exposure).toBe(0.25)
    expect(wild.params.topColor).toMatch(/^#[0-9a-f]{6}$/)
  })
})
