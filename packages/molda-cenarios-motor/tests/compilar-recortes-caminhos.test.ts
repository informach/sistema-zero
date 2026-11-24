import { expect, test } from 'bun:test'
import { CaminhoSchema, criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import {
  type BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from 'three'
import { RecortesDoSoloCompilado } from '../src/compilar/recortes-caminhos'
import { CaminhosDoPalco } from '../src/curvas/caminhos'
import { criarPlanoDoCenario } from '../src/plano'
import { MundoDoTeste } from '../src/teste/colisoes'

function area(g: BufferGeometry, m = new Matrix4()) {
  const pos = g.getAttribute('position'),
    n = g.index?.count ?? pos.count
  let soma = 0
  for (let i = 0; i < n; i += 3) {
    const [a, b, c] = [0, 1, 2].map((j) =>
      new Vector3().fromBufferAttribute(pos, g.index?.getX(i + j) ?? i + j).applyMatrix4(m),
    )
    soma += Math.abs(new Vector3().crossVectors(b!.sub(a!), c!.sub(a!)).y) / 2
  }
  return soma
}
test('decals viram recortes visuais contínuos sem abrir buracos no chão físico', () => {
  const d = criarDocumentoVazio('c', 'Encontro'),
    caminhos = new CaminhosDoPalco(),
    chao = new PlaneGeometry(32, 32).rotateX(-Math.PI / 2),
    matriz = new Matrix4(),
    fisica = new MundoDoTeste([{ geometria: chao, matriz }])
  d.base = { tipo: 'plano', largura: 32, comprimento: 32 }
  const comum = {
    nome: 'Trilha',
    grupo: null,
    oculto: false,
    bloqueado: false,
    tipo: 'trilha',
    acabamento: null,
    largura: 2,
  }
  d.caminhos = [
    CaminhoSchema.parse({
      ...comum,
      id: 'a',
      pontos: [
        { x: -8, z: 0 },
        { x: 8, z: 0 },
      ],
    }),
    CaminhoSchema.parse({
      ...comum,
      id: 'b',
      pontos: [
        { x: 0, z: -8 },
        { x: 0, z: 8 },
      ],
    }),
  ]
  const p = chao.getAttribute('position'),
    cores = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++)
    cores.set([p.getX(i) / 32 + 0.5, p.getZ(i) / 32 + 0.5, 0.5], i * 3)
  chao.setAttribute('color', new Float32BufferAttribute(cores, 3))
  let recortada: BufferGeometry | undefined, visual: MundoDoTeste | undefined
  try {
    expect(
      caminhos.definir(
        d,
        null,
        () => null,
        () => null,
        new Set(),
      ).falhas,
    ).toEqual([])
    const fontes = caminhos.superficies(),
      recortes = new RecortesDoSoloCompilado(fontes, () => 0),
      antes = chao.getAttribute('position').array.slice()
    expect(recortes.quantidade).toBeGreaterThan(0)
    recortada = recortes.recortar({ geometria: chao, matriz })
    visual = new MundoDoTeste([{ geometria: recortada, matriz }])
    expect(
      Math.abs(
        area(recortada) + fontes.reduce((s, f) => s + area(f.geometria, f.matriz), 0) - area(chao),
      ),
    ).toBeLessThan(1e-4)
    const de = new Vector3(0.125, 5, 0.125),
      ate = new Vector3(0.125, -5, 0.125)
    expect(fisica.rastrear(de, ate)?.ponto.y).toBeCloseTo(0, 6)
    expect(visual.rastrear(de, ate)).toBeNull()
    expect(chao.getAttribute('position').array).toEqual(antes)
    const p = recortada.getAttribute('position'),
      c = recortada.getAttribute('color')
    for (let i = 0; i < p.count; i++) {
      expect(c.getX(i)).toBeCloseTo(p.getX(i) / 32 + 0.5, 5)
      expect(c.getY(i)).toBeCloseTo(p.getZ(i) / 32 + 0.5, 5)
      expect(p.getY(i)).toBeCloseTo(0, 6)
    }
  } finally {
    visual?.descartar()
    fisica.descartar()
    recortada?.dispose()
    chao.dispose()
    caminhos.descartar()
  }
})

test('peça elevada e material estrutural não removem terreno sob uma ponte', () => {
  const g = new PlaneGeometry(4, 4).rotateX(-Math.PI / 2),
    chao = new PlaneGeometry(32, 32).rotateX(-Math.PI / 2),
    material = new MeshStandardMaterial({ polygonOffset: true, depthWrite: false }),
    matriz = new Matrix4(),
    elevada = new Matrix4().makeTranslation(0, 2, 0)
  try {
    const recortes = new RecortesDoSoloCompilado(
      [{ id: 'ponte', geometria: g, material, matriz: elevada }],
      () => 0,
    )
    expect(recortes.quantidade).toBe(0)
    const r = recortes.recortar({ geometria: chao, matriz })
    try {
      expect(area(r)).toBe(area(chao))
      expect(r).not.toBe(chao)
    } finally {
      r.dispose()
    }
    material.polygonOffset = false
    material.depthWrite = true
    expect(
      new RecortesDoSoloCompilado([{ id: 'ponte', geometria: g, material, matriz }], () => 0)
        .quantidade,
    ).toBe(0)
  } finally {
    g.dispose()
    chao.dispose()
    material.dispose()
  }
})

test('piso plano só cede a faces sólidas opacas visíveis; transparência conserva o chão', () => {
  const g = new PlaneGeometry(4, 4).rotateX(-Math.PI / 2),
    chao = new PlaneGeometry(16, 16).rotateX(-Math.PI / 2),
    material = new MeshStandardMaterial(),
    matriz = new Matrix4(),
    fontes = [{ id: 'objeto', geometria: g, material, matriz }],
    recortes = () => new RecortesDoSoloCompilado(fontes, () => 0, { incluirSolidos: true })
  try {
    expect(recortes().quantidade).toBe(2)
    const r = recortes().recortar({ geometria: chao, matriz })
    try {
      expect(area(r)).toBeCloseTo(240, 5)
    } finally {
      r.dispose()
    }
    for (const propriedade of ['transparent', 'alphaHash', 'alphaToCoverage'] as const) {
      material[propriedade] = true
      expect(recortes().quantidade).toBe(0)
      material[propriedade] = false
    }
    material.alphaTest = 0.5
    expect(recortes().quantidade).toBe(0)
    material.alphaTest = 0
    material.depthWrite = false
    expect(recortes().quantidade).toBe(0)
    material.depthWrite = true
    g.rotateX(Math.PI)
    expect(recortes().quantidade).toBe(0)
  } finally {
    g.dispose()
    chao.dispose()
    material.dispose()
  }
})

test('piso XY rotacionado no nó é recortado no mundo sem perder origem distante ou colisão', () => {
  const piso = criarPlanoDoCenario(32, 32),
    trilha = new PlaneGeometry(4, 16).rotateX(-Math.PI / 2),
    material = new MeshStandardMaterial({ polygonOffset: true, depthWrite: false })
  piso.position.set(-90000, 0, 60000)
  piso.updateWorldMatrix(true, false)
  const matriz = new Matrix4().makeTranslation(-90000, 0, 60000),
    recortes = new RecortesDoSoloCompilado(
      [{ id: 'trilha', geometria: trilha, material, matriz }],
      () => 0,
    ),
    g = recortes.recortar({ geometria: piso.geometry, matriz: piso.matrixWorld }),
    visual = new MundoDoTeste([{ geometria: g, matriz: piso.matrixWorld }])
  try {
    expect(area(g, piso.matrixWorld)).toBeCloseTo(32 * 32 - 4 * 16, 4)
    expect(
      visual.rastrear(new Vector3(-90000, 5, 60000), new Vector3(-90000, -5, 60000)),
    ).toBeNull()
    expect(
      visual.rastrear(new Vector3(-89990, 5, 60000), new Vector3(-89990, -5, 60000))?.ponto.y,
    ).toBeCloseTo(0, 6)
  } finally {
    visual.descartar()
    g.dispose()
    piso.geometry.dispose()
    piso.material.dispose()
    trilha.dispose()
    material.dispose()
  }
})
