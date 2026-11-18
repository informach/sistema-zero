import { expect, test } from 'bun:test'
import { Box3, BoxGeometry, Matrix4, PlaneGeometry, Vector3 } from 'three'
import { TerrenoDoPalco } from '../src/Terreno'
import { MundoDoTeste } from '../src/teste/colisoes'

test('consulta regional de triângulos respeita drawRange, transformação e orçamento sem alterar a fonte', () => {
  const g = new BoxGeometry(2, 2, 2),
    antes = [...g.index!.array]
  g.setDrawRange(6, 6)
  const mundo = new MundoDoTeste([
      { geometria: g, matriz: new Matrix4().makeScale(-2, 1, 3).setPosition(5, 3, 2) },
    ]),
    caixa = new Box3(new Vector3(2, 1, -2), new Vector3(8, 5, 6))
  try {
    const r = mundo.triangulosNaCaixa(caixa)
    expect(r.length).toBe(18)
    for (let i = 0; i < r.length; i += 3) {
      expect(r[i]!).toBeGreaterThanOrEqual(3)
      expect(r[i]!).toBeLessThanOrEqual(7)
      expect(r[i + 1]!).toBeGreaterThanOrEqual(2)
      expect(r[i + 1]!).toBeLessThanOrEqual(4)
      expect(r[i + 2]!).toBeGreaterThanOrEqual(-1)
      expect(r[i + 2]!).toBeLessThanOrEqual(5)
    }
    expect(mundo.triangulosNaCaixa(caixa.clone().translate(new Vector3(100, 0, 0))).length).toBe(0)
    expect(() => mundo.triangulosNaCaixa(caixa, 1)).toThrow('triângulos demais')
    expect(() => mundo.triangulosNaCaixa(caixa, Infinity)).toThrow('orçamento')
    expect([...g.index!.array]).toEqual(antes)
    expect(g.drawRange).toEqual({ start: 6, count: 6 })
    expect(mundo.arvores).toBe(1)
  } finally {
    mundo.descartar()
    g.dispose()
  }
  expect(() => mundo.triangulosNaCaixa(caixa)).toThrow('encerrada')
})

test('cápsula encontra piso real e parede fina sem modificar o índice da malha', () => {
  const piso = new PlaneGeometry(20, 20),
    parede = new BoxGeometry(0.02, 4, 10)
  const indice = Array.from(piso.index!.array)
  const mundo = new MundoDoTeste([
    { geometria: piso, matriz: new Matrix4().makeRotationX(-Math.PI / 2) },
    { geometria: parede, matriz: new Matrix4().makeTranslation(2, 2, 0) },
  ])
  const r = mundo.resolver(new Vector3(0, -0.1, 0), 1.16, 0.19)
  expect(r.posicao.y).toBeCloseTo(0, 3)
  expect(r.normais.some((n) => n.y > 0.99)).toBe(true)
  const colisao = mundo.resolver(new Vector3(1.9, 0.001, 0), 1.16, 0.19)
  expect(colisao.posicao.x).toBeLessThan(1.81)
  expect(Array.from(piso.index!.array)).toEqual(indice)
  expect('boundsTree' in piso).toBe(false)
  mundo.descartar()
  piso.dispose()
  parede.dispose()
})
test('abismo permanece sem piso, broad phase compartilha árvores e câmera não atravessa parede', () => {
  const g = new BoxGeometry(2, 1, 2)
  const mundo = new MundoDoTeste(
    Array.from({ length: 1000 }, (_, i) => ({
      geometria: g,
      matriz: new Matrix4().makeTranslation(i * 10, -0.5, 0),
    })),
  )
  expect(mundo.arvores).toBe(1)
  expect(mundo.resolver(new Vector3(4, -0.2, 0), 1.16, 0.19).normais).toHaveLength(0)
  expect(mundo.rastrear(new Vector3(0, 2, 0), new Vector3(0, -2, 0))?.ponto.y).toBeCloseTo(0, 4)
  expect(mundo.rastrear(new Vector3(0, 0.5, 0), new Vector3(4, 0.5, 0))).toBeNull()
  expect(mundo.resolver(new Vector3(0, -0.1, 0), 1.16, 0.19).candidatos).toBeLessThan(10)
  mundo.descartar()
  g.dispose()
})
test('o recorte real do terreno permanece um furo para cápsula e câmera', () => {
  const terreno = new TerrenoDoPalco(
    {
      tipo: 'terreno',
      origem: { x: -32, z: -32 },
      passo: 1,
      colunas: 64,
      linhas: 64,
      min: 0,
      max: 255,
      fundo: 0,
      pecas: [],
      recortes: [
        [
          { x: -2, z: -2 },
          { x: 2, z: -2 },
          { x: 2, z: 2 },
          { x: -2, z: 2 },
        ],
      ],
    },
    new Map(),
  )
  const mundo = new MundoDoTeste(terreno.fontesDoTeste())
  expect(mundo.resolver(new Vector3(0, -0.1, 0), 1.16, 0.19).normais).toHaveLength(0)
  expect(mundo.rastrear(new Vector3(0, 2, 0), new Vector3(0, -2, 0))).toBeNull()
  expect(mundo.resolver(new Vector3(4, -0.1, 0), 1.16, 0.19).posicao.y).toBeCloseTo(0, 3)
  mundo.descartar()
  terreno.descartar()
})
test('cápsula resolve no mundo mesmo com escala não uniforme, rotação e fontes invertidas', () => {
  const g = new BoxGeometry(2, 1, 2)
  const matriz = new Matrix4()
    .makeRotationY(0.4)
    .scale(new Vector3(3, 2, 0.5))
    .setPosition(0, -1, 0)
  const mundo = new MundoDoTeste([{ geometria: g, matriz }])
  expect(mundo.resolver(new Vector3(0, -0.07, 0), 1.16, 0.19).posicao.y).toBeCloseTo(0, 3)
  expect(mundo.resolver(new Vector3(10, -0.07, 0), 1.16, 0.19).normais).toHaveLength(0)
  mundo.descartar()
  g.dispose()
})
