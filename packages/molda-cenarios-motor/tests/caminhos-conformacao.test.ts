import { expect, test } from 'bun:test'
import {
  abrirEdicaoDeTerreno,
  alturaDoCampo,
  type BaseDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  Box3,
  type BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Raycaster,
  Vector3,
} from 'three'
import { conformarParteAoChao } from '../src/curvas/geometria'
import { SuperficiesDosObjetos } from '../src/superficies'

const base: BaseDeTerreno = {
  tipo: 'terreno',
  cobertura: 'grade',
  origem: { x: 0, z: 0 },
  colunas: 64,
  linhas: 64,
  passo: 1,
  min: -10,
  max: 40,
  fundo: 2,
  pecas: [],
}
const piso = () => new PlaneGeometry(4, 4).rotateX(-Math.PI / 2).translate(0, 0.2, 0)

test('modelo conformado mantém relevo, espessura, UV e buffers originais com origem local', () => {
  const g = piso(),
    matriz = new Matrix4().makeTranslation(3, 0, 4),
    mundo = new Matrix4().makeTranslation(10, 0, 10),
    e = abrirEdicaoDeTerreno(base, new Map()),
    antes = [...g.getAttribute('position').array],
    uv = [...g.getAttribute('uv').array]
  g.setAttribute(
    'color',
    new Float32BufferAttribute(Array.from({ length: 4 }, () => [1, 0.3, 0.2]).flat(), 3),
  )
  g.setAttribute(
    'tangent',
    new Float32BufferAttribute(Array.from({ length: 4 }, () => [1, 0, 0, -1]).flat(), 4),
  )
  for (let z = 0; z <= 64; z++)
    for (let x = 0; x <= 64; x++) e.campo.alturas[z * 65 + x] = 2 + x * 0.1 + z * 0.2
  const r = conformarParteAoChao({ geometria: g, matriz }, mundo, base, e, { x: 10, z: 10 })
  try {
    const p = r.geometria.getAttribute('position'),
      n = r.geometria.getAttribute('normal'),
      normal = new Vector3(-0.1, 1, -0.2).normalize(),
      t = r.geometria.getAttribute('tangent'),
      tangente = new Vector3(1, 0.1, 0).normalize(),
      cor = r.geometria.getAttribute('color')
    for (let i = 0; i < p.count; i++) {
      expect(p.getY(i)).toBeCloseTo(alturaDoCampo(e.campo, p.getX(i) + 10, p.getZ(i) + 10) + 0.2, 5)
      expect(new Vector3(n.getX(i), n.getY(i), n.getZ(i)).distanceTo(normal)).toBeLessThan(1e-5)
      expect(new Vector3(t.getX(i), t.getY(i), t.getZ(i)).distanceTo(tangente)).toBeLessThan(1e-5)
      expect(t.getW(i)).toBe(-1)
      expect(cor.getX(i)).toBe(1)
      expect(cor.getY(i)).toBeCloseTo(0.3, 6)
    }
    expect([...g.getAttribute('position').array]).toEqual(antes)
    expect([...g.getAttribute('uv').array]).toEqual(uv)
    expect(r.geometria.getAttribute('uv').count).toBe(p.count)
    expect(r.geometria).not.toBe(g)
    expect(matriz.elements[12]).toBe(3)
    expect(mundo.elements[12]).toBe(10)
  } finally {
    r.descartar()
    g.dispose()
  }
})

test('respeita drawRange da parte para não desenhar o grupo de outro material', () => {
  const g = new BufferGeometry().setAttribute(
    'position',
    new Float32BufferAttribute([1, 0, 1, 1, 0, 2, 2, 0, 1, 5, 0, 1, 5, 0, 2, 6, 0, 1], 3),
  )
  g.setDrawRange(3, 3)
  const r = conformarParteAoChao(
    { geometria: g, matriz: new Matrix4() },
    new Matrix4(),
    base,
    abrirEdicaoDeTerreno(base, new Map()),
    { x: 0, z: 0 },
  )
  try {
    expect(r.geometria.boundingBox!.min.x).toBe(5)
    expect(r.geometria.boundingBox!.max.x).toBe(6)
    expect(r.geometria.getAttribute('position').count).toBe(3)
  } finally {
    r.descartar()
    g.dispose()
  }
})

test('atualizar alturas conserva topologia, UV e identidade e atualiza limites da superfície', () => {
  const g = piso(),
    e = abrirEdicaoDeTerreno(base, new Map()),
    r = conformarParteAoChao(
      { geometria: g, matriz: new Matrix4() },
      new Matrix4().makeTranslation(8, 0, 8),
      base,
      e,
      { x: 8, z: 8 },
    )
  try {
    const uv = [...r.geometria.getAttribute('uv').array],
      p = r.geometria.getAttribute('position') as BufferAttribute,
      versao = p.version
    expect(r.atualizarAlturas(e.campo, { x0: 40, x1: 41, z0: 40, z1: 41 })).toBe(0)
    expect(p.version).toBe(versao)
    e.campo.alturas.fill(4)
    expect(r.atualizarAlturas(e.campo)).toBe(p.count)
    expect(r.geometria.getAttribute('position')).toBe(p)
    expect(r.geometria.boundingBox!.min.y).toBeCloseTo(4.2, 5)
    expect([...r.geometria.getAttribute('uv').array]).toEqual(uv)
  } finally {
    r.descartar()
    g.dispose()
  }
})

test('máscara e recorte do lago retiram o modelo; descarte não libera a geometria original', () => {
  const g = piso(),
    e = abrirEdicaoDeTerreno(base, new Map())
  e.buracos.celulas[7 * 64 + 7] = 1
  const b = {
      ...base,
      recortes: [
        [
          { x: 8, z: 8 },
          { x: 9, z: 8 },
          { x: 9, z: 9 },
          { x: 8, z: 9 },
        ],
      ],
    },
    r = conformarParteAoChao(
      { geometria: g, matriz: new Matrix4() },
      new Matrix4().makeTranslation(8, 0, 8),
      b,
      e,
      { x: 8, z: 8 },
    )
  let original = 0,
    gerada = 0
  g.addEventListener('dispose', () => original++)
  r.geometria.addEventListener('dispose', () => gerada++)
  const p = r.geometria.getAttribute('position')
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3 + 8,
      z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3 + 8
    expect(x > 7 && x < 8 && z > 7 && z < 8).toBe(false)
    expect(x > 8 && x < 9 && z > 8 && z < 9).toBe(false)
  }
  r.descartar()
  r.descartar()
  expect(original).toBe(0)
  expect(gerada).toBe(1)
  expect(() => r.atualizarAlturas(e.campo)).toThrow('descartada')
  g.dispose()
})

test('picking e seu índice acompanham a mesma geometria após mudar o relevo', () => {
  const g = piso(),
    e = abrirEdicaoDeTerreno(base, new Map()),
    r = conformarParteAoChao(
      { geometria: g, matriz: new Matrix4() },
      new Matrix4().makeTranslation(8, 0, 8),
      base,
      e,
      { x: 8, z: 8 },
    ),
    consulta = new SuperficiesDosObjetos(),
    material = new MeshStandardMaterial(),
    raio = new Raycaster(new Vector3(8, 10, 8), new Vector3(0, -1, 0))
  try {
    consulta.definir([
      { id: 'c', geometria: r.geometria, material, matriz: new Matrix4().makeTranslation(8, 0, 8) },
    ])
    expect(consulta.escolher(raio)!.ponto.y).toBeCloseTo(2.2, 5)
    e.campo.alturas.fill(4)
    r.atualizarAlturas(e.campo)
    consulta.invalidarGeometrias([r.geometria])
    expect(consulta.escolher(raio)!.ponto.y).toBeCloseTo(4.2, 5)
    expect(consulta.limites(new Box3()).min.y).toBeCloseTo(4.2, 5)
  } finally {
    consulta.descartar()
    r.descartar()
    g.dispose()
    material.dispose()
  }
})

test('falha de altura não deixa alteração parcial e um modelo inteiramente recortado tem limites vazios', () => {
  const g = piso(),
    e = abrirEdicaoDeTerreno(base, new Map()),
    r = conformarParteAoChao(
      { geometria: g, matriz: new Matrix4() },
      new Matrix4().makeTranslation(8, 0, 8),
      base,
      e,
      { x: 8, z: 8 },
    )
  try {
    const antes = [...r.geometria.getAttribute('position').array]
    e.campo.alturas[9 * 65 + 9] = NaN
    expect(() => r.atualizarAlturas(e.campo)).toThrow('altura inválida')
    expect([...r.geometria.getAttribute('position').array]).toEqual(antes)
    e.campo.alturas.fill(2)
    e.buracos.celulas.fill(1)
    const vazio = conformarParteAoChao(
      { geometria: g, matriz: new Matrix4() },
      new Matrix4().makeTranslation(8, 0, 8),
      base,
      e,
      { x: 8, z: 8 },
    )
    try {
      expect(vazio.geometria.boundingBox!.isEmpty()).toBe(true)
    } finally {
      vazio.descartar()
    }
  } finally {
    r.descartar()
    g.dispose()
  }
})
