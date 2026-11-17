import { expect, test } from 'bun:test'
import {
  AMOSTRAS_DA_PECA,
  type BaseDeTerreno,
  codificarPecaDeAlturas,
  lerPecaDeAlturas,
} from '@sistemazero/molda-cenarios-core/v2'
import { type BufferGeometry, Group, type Mesh, Raycaster, Vector3 } from 'three'
import { TerrenoDoPalco } from '../src/Terreno'

const a = 'a'.repeat(64),
  b = 'b'.repeat(64)
const base = (pecas: BaseDeTerreno['pecas']): BaseDeTerreno => ({
  tipo: 'terreno',
  origem: { x: -512, z: 256 },
  passo: 2,
  colunas: 128,
  linhas: 64,
  min: 0,
  max: 255,
  fundo: 0,
  pecas,
})
const peca = (ox: number) =>
  lerPecaDeAlturas(
    codificarPecaDeAlturas(
      Float64Array.from(
        { length: AMOSTRAS_DA_PECA },
        (_, i) => (ox + (i % 65)) / 8 + Math.floor(i / 65) / 16,
      ),
      0,
      255,
    ),
  )
const raio = (x: number, z: number) => new Raycaster(new Vector3(x, 1000, z), new Vector3(0, -1, 0))

test('seleção usa o relevo real, incluindo origem, interior e borda entre peças', () => {
  const terreno = new TerrenoDoPalco(
    base([
      { coluna: 0, linha: 0, digest: a },
      { coluna: 1, linha: 0, digest: b },
    ]),
    new Map([
      [a, peca(0)],
      [b, peca(64)],
    ]),
  )
  try {
    for (const [x, z] of [
      [-510.5, 257.5],
      [-384, 300],
      [-300, 350],
    ]) {
      const ponto = terreno.pontoSobRaio(raio(x!, z!))
      expect(ponto).not.toBeNull()
      expect(ponto!.y).toBeCloseTo(terreno.altura(x!, z!), 5)
    }
    expect(terreno.pontoSobRaio(raio(0, 0))).toBeNull()
    expect(terreno.grupo.children.length).toBe(2)
  } finally {
    terreno.descartar()
  }
})

test('normais de borda coincidem e o BVH não altera os buffers desenhados', () => {
  const terreno = new TerrenoDoPalco(
    base([
      { coluna: 0, linha: 0, digest: a },
      { coluna: 1, linha: 0, digest: b },
    ]),
    new Map([
      [a, peca(0)],
      [b, peca(64)],
    ]),
  )
  try {
    const [esquerda, direita] = terreno.grupo.children as Mesh<BufferGeometry>[]
    const normalA = esquerda!.geometry.getAttribute('normal')
    const normalB = direita!.geometry.getAttribute('normal')
    const indice = esquerda!.geometry.index!.array.slice()
    for (const linha of [1, 20, 63]) {
      const n = linha * 65
      expect(normalA.getX(n + 64)).toBe(normalB.getX(n))
      expect(normalA.getY(n + 64)).toBe(normalB.getY(n))
      expect(normalA.getZ(n + 64)).toBe(normalB.getZ(n))
    }
    terreno.pontoSobRaio(raio(-400, 300))
    expect(esquerda!.geometry.index!.array).toEqual(indice)
    expect('boundsTree' in esquerda!.geometry).toBe(false)
  } finally {
    terreno.descartar()
  }
})

test('área omitida recebe apenas o piso e o descarte é completo e idempotente', () => {
  const terreno = new TerrenoDoPalco(
    base([{ coluna: 0, linha: 0, digest: a }]),
    new Map([[a, peca(0)]]),
  )
  const pai = new Group()
  pai.add(terreno.grupo)
  const malhas = terreno.grupo.children as Mesh<BufferGeometry>[]
  let geometrias = 0,
    materiais = 0
  for (const m of malhas) m.geometry.addEventListener('dispose', () => geometrias++)
  const material = malhas[0]!.material
  if (!Array.isArray(material)) material.addEventListener('dispose', () => materiais++)
  expect(terreno.pontoSobRaio(raio(-300, 300))?.y).toBe(0)
  expect(malhas[1]!.geometry.index!.count).toBe(6)
  terreno.descartar()
  terreno.descartar()
  expect(geometrias).toBe(2)
  expect(materiais).toBe(1)
  expect(pai.children.length).toBe(0)
  expect(terreno.pontoSobRaio(raio(-400, 300))).toBeNull()
})
