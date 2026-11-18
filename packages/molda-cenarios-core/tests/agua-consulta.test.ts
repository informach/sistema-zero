import { expect, test } from 'bun:test'
import { AguaSchema } from '../src/v2'
import { prepararConsultaDaAgua } from '../src/v2/consulta-de-agua'

const e = { id: 'a', nome: 'Água', grupo: null, oculto: false, bloqueado: false }
const anel = (r: number) => [
  { x: -r, z: -r },
  { x: r, z: -r },
  { x: r, z: r },
  { x: -r, z: r },
]
test('lago transformado exclui suas ilhas e limita a profundidade pelo relevo disponível', () => {
  const a = AguaSchema.parse({
    ...e,
    tipo: 'lago',
    modelo: null,
    centro: { x: 40, z: -12 },
    giro: Math.PI / 2,
    escala: 2,
    nivel: 5,
    profundidade: 4,
    contorno: anel(4),
    recorte: anel(4),
    ilhas: [anel(1)],
  })
  const q = prepararConsultaDaAgua(a)
  expect(q.em(40, -12)).toBeNull()
  expect(q.em(46, -12)).toEqual({ nivel: 5, profundidade: 4 })
  expect(q.em(46, -12, () => 4.8)?.profundidade).toBeCloseTo(0.2, 8)
  expect(q.em(50, -12)).toBeNull()
  expect(q.em(46, -12, () => 6)).toBeNull()
})
test('rio usa as faces da mesma faixa que será desenhada e correnteza vai da nascente para a foz', () => {
  const a = AguaSchema.parse({
    ...e,
    tipo: 'rio',
    pontos: [
      { x: 0, y: 5, z: 0 },
      { x: 10, y: 3, z: 0 },
      { x: 10, y: 2, z: 10 },
    ],
    largura: 4,
    profundidade: 1.5,
    correnteza: 2,
  })
  const q = prepararConsultaDaAgua(a)
  expect(q.em(5, 0)).toEqual({ nivel: 4, profundidade: 1.5, correnteza: { x: 2, z: 0 } })
  expect(q.em(10, 5)?.correnteza).toEqual({ x: 0, z: 2 })
  expect(q.em(5, 3)).toBeNull()
  expect(q.superficie!.indices.length).toBe(24)
  for (let i = 0; i < q.superficie!.indices.length; i += 3) {
    const v = q.superficie!.posicoes,
      indices = q.superficie!.indices.slice(i, i + 3),
      x = indices.reduce((s, j) => s + v[j * 3]!, 0) / 3,
      z = indices.reduce((s, j) => s + v[j * 3 + 2]!, 0) / 3
    expect(q.em(x, z)).not.toBeNull()
  }
})
test('mar usa o nível mundial; cachoeira não inventa uma área horizontal para nadar', () => {
  const mar = prepararConsultaDaAgua(AguaSchema.parse({ ...e, tipo: 'mar', nivel: 2 }))
  expect(mar.em(10000, -10000)).toEqual({ nivel: 2, profundidade: 100000 })
  expect(mar.em(0, 0, () => 1)).toEqual({ nivel: 2, profundidade: 1 })
  expect(mar.em(0, 0, () => 3)).toBeNull()
  const queda = prepararConsultaDaAgua(
    AguaSchema.parse({
      ...e,
      tipo: 'cachoeira',
      topo: { x: 0, y: 5, z: 0 },
      base: { x: 0, y: 0, z: 0 },
      largura: 3,
      giro: 0,
    }),
  )
  expect(queda.em(0, 0)).toBeNull()
  expect(mar.em(NaN, 0)).toBeNull()
})
