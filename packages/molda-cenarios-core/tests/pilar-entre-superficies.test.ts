import { expect, test } from 'bun:test'
import type { MalhaParaRecorte } from '../src/geometria'
import { abrirEdicaoDeTerreno, type BaseDeTerreno, pilarEntreSuperficies } from '../src/v2'

const plano = { tipo: 'plano' as const, largura: 64, comprimento: 64 },
  prism = (): MalhaParaRecorte => ({
    atributos: {
      position: {
        itemSize: 3,
        valores: [
          -0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 1, -0.5, 0.5, 1, -0.5, 0.5,
          1, 0.5, -0.5, 1, 0.5,
        ],
      },
      uv: { itemSize: 2, valores: [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1] },
    },
    indices: [
      4, 7, 5, 5, 7, 6, 0, 1, 3, 1, 2, 3, 0, 4, 1, 1, 4, 5, 3, 2, 7, 2, 6, 7, 0, 3, 4, 3, 7, 4, 1,
      5, 2, 2, 5, 6,
    ],
  })
function superficie(
  x0: number,
  x1: number,
  y: (x: number, z: number) => number,
  z0 = -0.5,
  z1 = 0.5,
) {
  const ps = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ]
  return [0, 1, 2, 0, 2, 3].flatMap((i) => {
    const [x, z] = ps[i]!
    return [x!, y(x!, z!), z!]
  })
}
function medir(p: Float32Array) {
  let volume = 0,
    areaTopo = 0
  const topos: number[][] = []
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i]!,
      ay = p[i + 1]!,
      az = p[i + 2]!,
      bx = p[i + 3]!,
      by = p[i + 4]!,
      bz = p[i + 5]!,
      cx = p[i + 6]!,
      cy = p[i + 7]!,
      cz = p[i + 8]!,
      ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az)
    volume += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6
    if (ny > 1e-8) {
      areaTopo += ny / 2
      topos.push(Array.from(p.subarray(i, i + 9)))
    }
  }
  return { volume, areaTopo, topos }
}

test('tampa segue as duas faces do arco no interior, não só os cantos do pilar', () => {
  const m = prism(),
    antes = structuredClone(m),
    superiores = [...superficie(-0.5, 0, (x) => 3 + x), ...superficie(0, 0.5, (x) => 3 - x)],
    copia = [...superiores],
    r = pilarEntreSuperficies(m, superiores, plano, null, { x: 0, z: 0 }),
    medida = medir(r.atributos.position!.valores)
  expect(medida.volume).toBeCloseTo(2.75, 5)
  expect(medida.areaTopo).toBeCloseTo(1, 5)
  for (const t of medida.topos) {
    const x = (t[0]! + t[3]! + t[6]!) / 3,
      y = (t[1]! + t[4]! + t[7]!) / 3
    expect(y).toBeCloseTo(3 - Math.abs(x), 5)
  }
  expect(m).toEqual(antes)
  expect(superiores).toEqual(copia)
  expect(r.atributos.uv!.valores.length / 2).toBe(r.atributos.position!.valores.length / 3)
})

test('salto na face inferior de uma viga fecha o espelho interno do sólido', () => {
  const r = pilarEntreSuperficies(
      prism(),
      [...superficie(-0.5, 0, () => 2), ...superficie(0, 0.5, () => 3)],
      plano,
      null,
      { x: 0, z: 0 },
    ),
    p = r.atributos.position!.valores,
    medida = medir(p)
  expect(medida.volume).toBeCloseTo(2.5, 5)
  expect(medida.areaTopo).toBeCloseTo(1, 5)
  let espelho = 0
  for (let i = 0; i < p.length; i += 9)
    if ([0, 3, 6].every((j) => Math.abs(p[i + j]!) < 1e-7)) {
      const nx =
        (p[i + 4]! - p[i + 1]!) * (p[i + 8]! - p[i + 2]!) -
        (p[i + 5]! - p[i + 2]!) * (p[i + 7]! - p[i + 1]!)
      if (nx < -1e-8) espelho += -nx / 2
    }
  expect(espelho).toBeCloseTo(1, 5)
})

test('viga sobreposta escolhe a face mais baixa e conserva o volume sem tampas duplicadas', () => {
  const superiores = [...superficie(-0.5, 0.5, () => 3), ...superficie(-0.2, 0.2, () => 2)],
    r = pilarEntreSuperficies(prism(), superiores, plano, null, { x: 0, z: 0 }),
    m = medir(r.atributos.position!.valores)
  expect(m.areaTopo).toBeCloseTo(1, 5)
  expect(m.volume).toBeCloseTo(2.6, 5)
  const duplicada = pilarEntreSuperficies(prism(), [...superiores, ...superiores], plano, null, {
    x: 0,
    z: 0,
  })
  expect(medir(duplicada.atributos.position!.valores).volume).toBeCloseTo(2.6, 5)
})

test('junta entre tábuas fecha só a madeira do próprio pilar e informa a área de contato real', () => {
  const r = pilarEntreSuperficies(
      prism(),
      [...superficie(-0.5, -0.1, () => 3), ...superficie(0.1, 0.5, () => 4)],
      plano,
      null,
      { x: 0, z: 0 },
    ),
    medida = medir(r.atributos.position!.valores)
  expect(r.contato.area).toBeCloseTo(0.8, 5)
  expect(r.contato.total).toBeCloseTo(1, 5)
  expect(r.alturaNoCentro).toBeCloseTo(3, 5)
  expect(medida.volume).toBeCloseTo(3.4, 5)
  expect(medida.areaTopo).toBeCloseTo(1, 5)
})

test('base segue as células reais em desnível e falta de superfície não inventa apoio', () => {
  const base: BaseDeTerreno = {
      tipo: 'terreno',
      cobertura: 'grade',
      origem: { x: -32, z: -32 },
      colunas: 64,
      linhas: 64,
      passo: 1,
      min: -10,
      max: 20,
      fundo: 0,
      pecas: [],
    },
    e = abrirEdicaoDeTerreno(base, new Map())
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++) e.campo.alturas[z * 65 + x] = 1 + (x - 32) * 0.1 + (z - 32) * 0.2
  const r = pilarEntreSuperficies(
    prism(),
    [...superficie(-0.5, 0, (x) => 3 + x), ...superficie(0, 0.5, (x) => 3 - x)],
    base,
    e,
    { x: 0, z: 0 },
  )
  expect(medir(r.atributos.position!.valores).volume).toBeCloseTo(1.75, 4)
  expect(() =>
    pilarEntreSuperficies(
      prism(),
      superficie(2, 3, () => 3),
      plano,
      null,
      { x: 0, z: 0 },
    ),
  ).toThrow('nenhuma superfície')
  e.buracos.celulas[32 * 64 + 32] = 1
  expect(() =>
    pilarEntreSuperficies(
      prism(),
      superficie(-0.5, 0.5, () => 3),
      base,
      e,
      { x: 0, z: 0 },
    ),
  ).toThrow('chão sob toda')
})
