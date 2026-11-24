import { expect, test } from 'bun:test'
import { Box3, Ray, Vector3 } from 'three'
import { IndiceDeCaixas } from '../src/indice-de-caixas'

test('margem de seleção amplia apenas a consulta, sem mover caixas ou alterar a física padrão', () => {
  const caixa = new Box3(new Vector3(0, 0, 0), new Vector3(1, 1, 0)),
    antes = caixa.clone(),
    indice = new IndiceDeCaixas(),
    raio = new Ray(new Vector3(-0.01, 0.5, 3), new Vector3(0, 0, -1))
  indice.definir([caixa])
  expect(indice.consultar(raio)).toEqual([])
  expect(indice.consultar(raio, 0.02)).toEqual([0])
  expect(caixa).toEqual(antes)
  expect(indice.limites(new Box3())).toEqual(antes)
  expect(() => indice.consultar(raio, NaN)).toThrow('Margem')
})

test('índice e refit concordam com a varredura em 20 mil caixas sem alterar suas fontes', () => {
  const caixas = Array.from(
    { length: 20_000 },
    (_, i) =>
      new Box3(
        new Vector3(
          (i % 200) * 3 - 300,
          (Math.floor(i / 200) % 10) * 3 - 15,
          Math.floor(i / 2000) * 4 - 20,
        ),
        new Vector3(
          (i % 200) * 3 - 299,
          (Math.floor(i / 200) % 10) * 3 - 14,
          Math.floor(i / 2000) * 4 - 19,
        ),
      ),
  )
  const indice = new IndiceDeCaixas()
  indice.definir(caixas)
  let estado = 7513
  const sortear = () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0
    return estado / 4294967296
  }
  for (let i = 0; i < 100; i++) {
    const raio = new Ray(
      new Vector3(sortear() * 800 - 400, sortear() * 50 - 25, sortear() * 60 - 30),
      new Vector3(sortear() - 0.5, sortear() - 0.5, sortear() - 0.5).normalize(),
    )
    expect(indice.consultar(raio)).toEqual(
      caixas.flatMap((c, n) => (raio.intersectsBox(c) ? [n] : [])),
    )
    const n = Math.floor(sortear() * caixas.length)
    caixas[n]!.translate(new Vector3(10, -2, 5))
    indice.atualizar(n, caixas[n]!)
  }
  expect(indice.limites(new Box3())).toEqual(
    caixas.reduce((uniao, c) => uniao.union(c), new Box3()),
  )
  expect(indice.quantidade).toBe(20_000)
})
test('vazio, caixas coincidentes, raio interno e refit para vazio conservam a ordem', () => {
  const indice = new IndiceDeCaixas(),
    raio = new Ray(new Vector3(), new Vector3(1, 0, 0)),
    caixa = new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1))
  expect(indice.consultar(raio)).toEqual([])
  indice.definir([caixa, caixa, new Box3()])
  expect(indice.consultar(raio)).toEqual([0, 1])
  indice.atualizar(0, new Box3())
  expect(indice.consultar(raio)).toEqual([1])
  indice.definir([])
  expect(indice.limites(new Box3()).isEmpty()).toBe(true)
})

test('a distância limita a consulta ao trecho e concorda com a varredura das caixas', () => {
  const caixas = Array.from(
    { length: 4000 },
    (_, i) =>
      new Box3(
        new Vector3((i % 80) * 2.5 - 100, 0, Math.floor(i / 80) * 2.5 - 60),
        new Vector3((i % 80) * 2.5 - 99, 2, Math.floor(i / 80) * 2.5 - 59),
      ),
  )
  const indice = new IndiceDeCaixas()
  indice.definir(caixas)
  let estado = 99
  const sortear = () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0
    return estado / 4294967296
  }
  const ponto = new Vector3()
  for (let i = 0; i < 200; i++) {
    const raio = new Ray(
      new Vector3(sortear() * 200 - 100, sortear() * 3, sortear() * 120 - 60),
      new Vector3(sortear() - 0.5, sortear() * 0.2 - 0.1, sortear() - 0.5).normalize(),
    )
    const distancia = sortear() * 6
    const esperado = caixas.flatMap((c, n) =>
      c.containsPoint(raio.origin) ||
      (raio.intersectBox(c, ponto) !== null && ponto.distanceTo(raio.origin) <= distancia)
        ? [n]
        : [],
    )
    expect(indice.consultar(raio, 0, distancia)).toEqual(esperado)
    // Um trecho curto visita uma fração do que o raio inteiro cruzaria.
    expect(esperado.length).toBeLessThanOrEqual(indice.consultar(raio).length)
  }
  // Sem distância, tudo como antes; distância inválida é recusada.
  const raio = new Ray(new Vector3(-120, 1, -59.5), new Vector3(1, 0, 0))
  expect(indice.consultar(raio, 0, 3)).toEqual([])
  expect(indice.consultar(raio).length).toBe(80)
  expect(indice.consultar(raio, 0, 21)).toEqual([0])
  expect(() => indice.consultar(raio, 0, -1)).toThrow('Distância')
})
