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

  test('from/to preservam posição em 1/16, tamanho em meio bloco e ficam na grade', () => {
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
    for (const v of [...p.from, ...p.to]) {
      expect(Number.isInteger(v / MOLDA_LIMITS.positionPrecision)).toBe(true)
    }
    for (let axis = 0; axis < 3; axis += 1) {
      expect(Number.isInteger(((p.to[axis] ?? 0) - (p.from[axis] ?? 0)) / 0.5)).toBe(true)
    }
  })

  test('posição fina e pivô sobrevivem ao sanitize sem depender do encaixe escolhido', () => {
    const model = makeModel({ snap: 1 })
    const part = createPart({
      id: 'fine',
      name: 'fine',
      from: [1 / 16, 2 / 16, -3 / 16],
      to: [25 / 16, 18 / 16, 21 / 16],
      color: 2,
    })
    part.origin = [9 / 16, 10 / 16, 7 / 16]

    const once = sanitizeMoldaAsset({ ...model, parts: [part] }) as MoldaModelAsset

    expect(once.parts[0]).toEqual(part)
    expect(sanitizeMoldaAsset(structuredClone(once))).toEqual(once)
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

const { meshTriangleCount: meshTris } = await import('../model/mesh')
type MeshRaw = { parts: Array<{ mesh: import('./model').MoldaMesh; from: number[]; to: number[] }> }

describe('malha no sanitize (06/09/2026)', () => {
  const meshPart = () =>
    createPart({ id: 'm', name: 'malha', shape: 'mesh', from: [0, 0, 0], to: [2, 2, 2], color: 2 })

  test('peça de malha volta idêntica (round-trip) e é idempotente', () => {
    const model = makeModel({ parts: [meshPart()] })
    const once = sanitizeMoldaAsset(structuredClone(model))
    expect(once).toEqual(model)
    expect(sanitizeMoldaAsset(structuredClone(once))).toEqual(once)
  })

  test('face com vértice que não existe cai sem derrubar a malha; sem face nenhuma a peça cai', () => {
    const raw = structuredClone(makeModel({ parts: [meshPart()] })) as unknown as MeshRaw
    const first = raw.parts[0]
    if (!first) throw new Error('sem peça')
    first.mesh.faces.f_px = { v: ['v_000', 'v_zzz', 'v_001'] }
    const out = sanitizeMoldaAsset(raw) as MoldaModelAsset
    expect(Object.keys(out.parts[0]?.mesh?.faces ?? {})).toHaveLength(5)
    first.mesh.faces = {}
    expect((sanitizeMoldaAsset(raw) as MoldaModelAsset).parts).toHaveLength(0)
  })

  test('a caixa gravada é ignorada: from/to vêm dos vértices; fora da grade a malha é empurrada para dentro', () => {
    const raw = structuredClone(makeModel({ parts: [meshPart()] })) as unknown as MeshRaw
    const first = raw.parts[0]
    if (!first) throw new Error('sem peça')
    first.from = [-9, -9, -9]
    first.to = [9, 9, 9]
    for (const v of Object.values(first.mesh.vertices)) v[0] += MOLDA_LIMITS.gridHalf - 1
    const out = sanitizeMoldaAsset(raw) as MoldaModelAsset
    expect(out.parts[0]?.from).toEqual([MOLDA_LIMITS.gridHalf - 2, 0, 0])
    expect(out.parts[0]?.to).toEqual([MOLDA_LIMITS.gridHalf, 2, 2])
    expect(out.parts[0]?.mesh?.vertices.v_111?.[0]).toBe(MOLDA_LIMITS.gridHalf)
  })

  test('malha maior que maxPartSize cai; vértices guardam a precisão de 1/16', () => {
    const raw = structuredClone(makeModel({ parts: [meshPart()] })) as unknown as MeshRaw
    const first = raw.parts[0]
    if (!first) throw new Error('sem peça')
    first.mesh.vertices.v_111 = [MOLDA_LIMITS.maxPartSize + 8, 2, 2]
    expect((sanitizeMoldaAsset(raw) as MoldaModelAsset).parts).toHaveLength(0)
    const fine = structuredClone(makeModel({ parts: [meshPart()] })) as unknown as MeshRaw
    const part = fine.parts[0]
    if (!part) throw new Error('sem peça')
    part.mesh.vertices.v_000 = [0.03, 0.05, 0]
    const out = sanitizeMoldaAsset(fine) as MoldaModelAsset
    expect(out.parts[0]?.mesh?.vertices.v_000).toEqual([0, 0.0625, 0])
  })

  test('orçamento de triângulos: corta a peça excedente e não recria excesso ao sincronizar gêmeos', () => {
    const strip = (y: number) => {
      const vertices: Record<string, [number, number, number]> = {}
      const faces: Record<`f_${string}`, { v: string[] }> = {}
      for (let i = 0; i < 512; i += 1) {
        const x = -16 + (32 * i) / 511
        vertices[`v_a${i}`] = [x, y, -1]
        vertices[`v_b${i}`] = [x, y, 1]
      }
      for (let i = 0; i + 1 < 512; i += 1) {
        faces[`f_${i}`] = { v: [`v_b${i}`, `v_a${i}`, `v_a${i + 1}`, `v_b${i + 1}`] }
      }
      return { vertices, faces }
    }
    const parts = Array.from({ length: 20 }, (_, i) =>
      createPart({
        id: `s${i}`,
        name: `tira-${i}`,
        shape: 'mesh',
        from: [-16, i, -1],
        to: [16, i, 1],
        color: 2,
        mesh: strip(i),
      }),
    )
    expect(meshTris(parts[0]?.mesh ?? { vertices: {}, faces: {} })).toBe(1022)
    const out = sanitizeMoldaAsset(structuredClone(makeModel({ parts }))) as MoldaModelAsset
    // 19 × 1022 = 19 418 cabem; a 20ª passaria de 20 000.
    expect(out.parts).toHaveLength(19)
    expect(out.parts.map((p) => p.id)).not.toContain('s19')

    const sideParts = Array.from({ length: 10 }, (_unused, index) => {
      const vertices = {
        v_a: [1, index, 0] as [number, number, number],
        v_b: [2, index, 0] as [number, number, number],
        v_c: [2, index, 1] as [number, number, number],
        v_d: [1, index, 1] as [number, number, number],
      }
      const faces = Object.fromEntries(
        Array.from({ length: 1_000 }, (_face, face) => [
          `f_${face}`,
          { v: ['v_a', 'v_b', 'v_c', 'v_d'] },
        ]),
      )
      return createPart({
        id: `lado-${index}`,
        name: `lado-${index}`,
        shape: 'mesh',
        from: [1, index, 0],
        to: [2, index, 1],
        color: 2,
        mesh: { vertices, faces },
      })
    })
    expect(meshTris(sideParts[0]?.mesh ?? { vertices: {}, faces: {} })).toBe(2_000)
    const mirrored = sanitizeMoldaAsset(
      structuredClone(makeModel({ parts: sideParts, mirrorX: true })),
    ) as MoldaModelAsset
    expect(mirrored.mirrorX).toBe(false)
    expect(mirrored.parts).toHaveLength(10)
  })
})

describe('trancada / escondida (06/09/2026)', () => {
  test('locked e hidden sobrevivem ao sanitize e só entram como `true`', () => {
    const model = makeModel()
    const part = model.parts[0]
    if (!part) throw new Error('fixture')
    part.locked = true
    part.hidden = true
    const clean = sanitizeMoldaAsset(structuredClone(model))
    if (clean?.kind !== 'model') throw new Error('não é modelo')
    expect(clean.parts[0]?.locked).toBe(true)
    expect(clean.parts[0]?.hidden).toBe(true)
    const raw = structuredClone(model) as unknown as { parts: Array<Record<string, unknown>> }
    const first = raw.parts[0]
    if (!first) throw new Error('fixture')
    first.locked = 'sim'
    first.hidden = 1
    const loose = sanitizeMoldaAsset(raw)
    if (loose?.kind !== 'model') throw new Error('não é modelo')
    expect('locked' in (loose.parts[0] ?? {})).toBe(false)
    expect('hidden' in (loose.parts[0] ?? {})).toBe(false)
  })
})
