import { expect, test } from 'bun:test'
import type { MalhaParaRecorte } from '../src/geometria'
import { abrirEdicaoDeTerreno, type BaseDeTerreno } from '../src/v2'
import { recortarMalhaNoChao } from '../src/v2/recorte-de-chao'

const base: BaseDeTerreno = {
  tipo: 'terreno',
  cobertura: 'grade',
  origem: { x: 0, z: 0 },
  colunas: 64,
  linhas: 64,
  passo: 1,
  min: -10,
  max: 20,
  fundo: 0,
  pecas: [],
}
const parede = (diagonal = true): MalhaParaRecorte => ({
  atributos: {
    position: {
      itemSize: 3,
      valores: diagonal
        ? [0, 0, 1, 1, 0, 0, 0, 2, 1, 1, 2, 0]
        : [1, 0, 0, 1, 0, 2, 1, 2, 0, 1, 2, 2],
    },
    uv: { itemSize: 2, valores: [0, 0, 1, 0, 0, 1, 1, 1] },
    color: { itemSize: 3, valores: [1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1] },
  },
  indices: [0, 2, 1, 1, 2, 3],
})
function area3d(p: ArrayLike<number>) {
  let soma = 0
  for (let i = 0; i < p.length; i += 9) {
    const ax = p[i + 3]! - p[i]!,
      ay = p[i + 4]! - p[i + 1]!,
      az = p[i + 5]! - p[i + 2]!,
      bx = p[i + 6]! - p[i]!,
      by = p[i + 7]! - p[i + 1]!,
      bz = p[i + 8]! - p[i + 2]!
    soma += Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2
  }
  return soma
}

test('recorte comum conserva parede vertical sobre a diagonal sem duplicar faces das duas células', () => {
  const m = parede(),
    antes = structuredClone(m),
    estado = abrirEdicaoDeTerreno(base, new Map()),
    r = recortarMalhaNoChao(m, base, estado, { x: 0, z: 0 })
  expect(area3d(r.position!.valores)).toBeCloseTo(Math.SQRT2 * 2, 6)
  expect(r.position!.valores.length).toBe(18)
  expect(r.uv!.valores.length).toBe(12)
  expect(r.color!.valores.length).toBe(18)
  expect(m).toEqual(antes)
})

test('parede na divisa permanece quando um dos lados tem chão e some quando ambos são buraco', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map()),
    m = parede(false)
  for (const z of [0, 1]) estado.buracos.celulas[z * 64 + 1] = 1
  expect(
    area3d(recortarMalhaNoChao(m, base, estado, { x: 0, z: 0 }).position!.valores),
  ).toBeCloseTo(4, 6)
  for (const z of [0, 1]) estado.buracos.celulas[z * 64] = 1
  expect(recortarMalhaNoChao(m, base, estado, { x: 0, z: 0 }).position!.valores.length).toBe(0)
})

test('recorte não achata a altura original do catálogo nem altera cor e UV', () => {
  const m = parede(false),
    r = recortarMalhaNoChao(m, { tipo: 'plano', largura: 64, comprimento: 64 }, null, {
      x: 0,
      z: 0,
    })
  expect(Math.max(...r.position!.valores.filter((_, i) => i % 3 === 1))).toBe(2)
  expect(area3d(r.position!.valores)).toBeCloseTo(4, 8)
  expect(Math.min(...r.color!.valores)).toBe(0)
  expect(Math.max(...r.uv!.valores)).toBe(1)
})

test('malhas com atributos incompatíveis ou índices inválidos são recusadas antes de recortar', () => {
  const m = parede(),
    e = abrirEdicaoDeTerreno(base, new Map())
  expect(() => recortarMalhaNoChao({ ...m, indices: [0, 1, 99] }, base, e, { x: 0, z: 0 })).toThrow(
    'Índice',
  )
  expect(() =>
    recortarMalhaNoChao(
      { ...m, atributos: { ...m.atributos, uv: { valores: [0], itemSize: 2 } } },
      base,
      e,
      { x: 0, z: 0 },
    ),
  ).toThrow('Atributos')
  expect(() =>
    recortarMalhaNoChao(
      { atributos: { position: { itemSize: 3, valores: { length: Infinity } } } },
      base,
      e,
      { x: 0, z: 0 },
    ),
  ).toThrow('Posições')
})

test('face vertical na diagonal interna de um recorte não permanece dentro do lago', () => {
  const b = {
      ...base,
      recortes: [
        [
          { x: 0, z: 0 },
          { x: 1, z: 0 },
          { x: 1, z: 1 },
          { x: 0, z: 1 },
        ],
      ],
    },
    r = recortarMalhaNoChao(parede(), b, abrirEdicaoDeTerreno(base, new Map()), { x: 0, z: 0 })
  expect(r.position!.valores.length).toBe(0)
})

test('face de borda do modelo continua fechando sua margem quando há chão de um lado', () => {
  const b = {
      ...base,
      recortes: [
        [
          { x: 0, z: 0 },
          { x: 1, z: 0 },
          { x: 1, z: 2 },
          { x: 0, z: 2 },
        ],
      ],
    },
    r = recortarMalhaNoChao(parede(false), b, abrirEdicaoDeTerreno(base, new Map()), { x: 0, z: 0 })
  expect(area3d(r.position!.valores)).toBeCloseTo(4, 6)
})

test('paredes com alturas e trechos desiguais conservam a área em várias linhas da grade', () => {
  const e = abrirEdicaoDeTerreno(base, new Map())
  for (let i = 1; i <= 12; i++) {
    const z0 = i / 13,
      z1 = z0 + 4.75,
      m = parede(false)
    m.atributos.position!.valores = [
      1,
      -i / 7,
      z0,
      1,
      i / 11,
      z1,
      1,
      2 - i / 7,
      z0,
      1,
      3 + i / 11,
      z1,
    ]
    const r = recortarMalhaNoChao(m, base, e, { x: 0, z: 0 })
    expect(area3d(r.position!.valores)).toBeCloseTo(4.75 * 2.5, 5)
  }
})
