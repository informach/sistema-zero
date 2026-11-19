import { expect, test } from 'bun:test'
import { criarFonteDeAlturasCompilada, type TerrenoCompilado } from '../src/compilar'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  campoDaBase,
  codificarPecaDeAlturas,
  criarFonteDeAlturas,
  lerRecursoDeTerreno,
} from '../src/v2'

function exemplo(cobertura: 'grade' | 'pecas' = 'pecas') {
  const digest = 'a'.repeat(64),
    base: BaseDeTerreno = {
      tipo: 'terreno',
      origem: { x: -32, z: 16 },
      passo: 1,
      colunas: 128,
      linhas: 64,
      min: 0,
      max: 100,
      fundo: 0.1,
      ...(cobertura === 'grade' ? { cobertura: 'grade' as const } : {}),
      pecas: [{ coluna: 0, linha: 0, digest }],
      recortes: [
        [
          { x: -12, z: 36 },
          { x: -10, z: 36 },
          { x: -10, z: 38 },
          { x: -12, z: 38 },
        ],
      ],
    },
    r = lerRecursoDeTerreno(
      codificarPecaDeAlturas(
        Float64Array.from(
          { length: AMOSTRAS_DA_PECA },
          (_, i) => (i % 65) / 2 + Math.floor(i / 65) / 3,
        ),
        0,
        100,
      ),
    )
  if (r.tipo !== 'alturas') throw Error('Fixture inválido')
  const recursos = new Map([[digest, r.alturas]]),
    campo = campoDaBase(base, recursos),
    t: TerrenoCompilado = {
      origem: base.origem,
      passo: 1,
      colunas: 128,
      linhas: 64,
      min: 0,
      max: 100,
      fundo: 0.1,
      cobertura,
      pecas: [{ coluna: 0, linha: 0 }],
      recortes: base.recortes!,
      alturas: 'terreno/a.bin',
      pngAlturas: 'terreno/a.png',
    }
  return { t, campo, original: criarFonteDeAlturas(base, recursos) }
}

test('consulta compilada preserva interpolação, peças ausentes, bordas e fundo externo', () => {
  const { t, campo, original } = exemplo(),
    alturas = Float32Array.from(campo.alturas),
    f = criarFonteDeAlturasCompilada(t, alturas)
  let erro = 0
  for (let z = 0; z <= 64; z += 1.25)
    for (let x = 0; x <= 128; x += 1.25)
      erro = Math.max(erro, Math.abs(f(x - 32, z + 16) - original(x - 32, z + 16)))
  expect(erro).toBeLessThan(1e-5)
  expect(f(32, 16)).toBe(0.1)
  expect(f(200, 200)).toBe(0.1)
  expect(f.temChao!({ x: 40, z: 20 })).toBe(false)
  expect(() => f(NaN, 0)).toThrow(/inválido/)
  alturas.fill(99)
  expect(f(-32, 16)).toBe(0)
})

test('piso de grade, recortes e buracos mantêm a mesma diferença entre altura e chão disponível', () => {
  const { t, campo } = exemplo('grade'),
    mascara = new Uint8Array(128 * 64)
  mascara[10 * 128 + 10] = 1
  const f = criarFonteDeAlturasCompilada(t, Float32Array.from(campo.alturas), mascara)
  expect(f.temChao!({ x: -21.5, z: 26.5 })).toBe(false)
  expect(f.temChao!({ x: -11, z: 37 })).toBe(false)
  expect(f.temChao!({ x: 40, z: 20 })).toBe(true)
  expect(f(40, 20)).toBe(0.1)
  mascara.fill(0)
  expect(f.temChao!({ x: -21.5, z: 26.5 })).toBe(false)
})

test('interpolação é triangular, sem substituir pela bilinear', () => {
  const { t, campo } = exemplo(),
    a = Float32Array.from(campo.alturas)
  a[0] = 0
  a[1] = 10
  a[129] = 20
  a[130] = 100
  const f = criarFonteDeAlturasCompilada(t, a)
  expect(f(-31.75, 16.25)).toBe(7.5)
  expect(f(-31.25, 16.75)).toBe(57.5)
  a[0] = NaN
  expect(() => criarFonteDeAlturasCompilada(t, a)).toThrow(/inválidos/)
  expect(() => criarFonteDeAlturasCompilada(t, new Float32Array(1))).toThrow(/grade/)
})
