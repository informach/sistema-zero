import { expect, test } from 'bun:test'
import {
  areaDoPoligono,
  distribuirNaCurva,
  faixaDaCurva,
  medirCurva,
  modulosNaCurva,
  perfilDaPonte,
  reamostrarCurva,
  triangularPoligono,
} from '../src/v2/curvas'

const reta = () =>
  medirCurva([
    { x: 0, z: 0 },
    { x: 10, z: 0 },
  ])
test('estações e módulos recusam passos infinitos em vez de produzir escala zero', () => {
  expect(() => reamostrarCurva(reta(), Infinity)).toThrow()
  expect(() => distribuirNaCurva(reta(), { espacamento: Infinity })).toThrow()
  expect(() => modulosNaCurva(reta(), Infinity)).toThrow()
  expect(() => perfilDaPonte({ x: 0, z: 0 }, { x: 10, z: 0 }, () => 0, Infinity)).toThrow()
})
test('área e triangulação conservam precisão após transladar uma praça pequena', () => {
  const origem = [
    { x: 0, z: 0 },
    { x: 0.01, z: 0 },
    { x: 0.01, z: 0.01 },
    { x: 0, z: 0.01 },
  ]
  const longe = origem.map((p) => ({ x: p.x + 100000, z: p.z + 100000 }))
  expect(areaDoPoligono(longe)).toBeCloseTo(areaDoPoligono(origem), 10)
  expect(triangularPoligono(longe)).toHaveLength(6)
})
test('alturas não finitas são recusadas antes de publicar piso ou perfil da ponte', () => {
  expect(() => faixaDaCurva(reta(), { largura: 2, alturaEm: () => 0, elevacao: NaN })).toThrow()
  expect(() => faixaDaCurva(reta(), { largura: 2, alturaEm: () => NaN })).toThrow()
  expect(() => perfilDaPonte({ x: 0, z: 0, y: NaN }, { x: 10, z: 0, y: 3 }, () => 0)).toThrow()
  expect(() => perfilDaPonte({ x: 0, z: 0 }, { x: 10, z: 0 }, () => Infinity)).toThrow()
})
test('praça que se cruza é recusada mesmo quando sua área assinada não é zero', () => {
  const pontos = [
    { x: 0, z: 0 },
    { x: 5, z: 3 },
    { x: -1, z: 3 },
    { x: 4, z: 0 },
    { x: 2, z: 5 },
  ]
  expect(areaDoPoligono(pontos)).toBeGreaterThan(0)
  expect(() => triangularPoligono(pontos)).toThrow()
})
