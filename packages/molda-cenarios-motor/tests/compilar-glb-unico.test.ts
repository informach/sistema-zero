import { expect, test } from 'bun:test'
import {
  AnimationClip,
  Bone,
  BoxGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Quaternion,
  Skeleton,
  SkinnedMesh,
  SpotLight,
  Uint16BufferAttribute,
  Vector3,
  VectorKeyframeTrack,
} from 'three'
import { prepararComposicaoDoGlb } from '../src/compilar/composicao-glb'
import { inspecionarGlbDaCompilacao } from '../src/compilar/inspecao-glb'
import { copiarLuzParaGlb } from '../src/compilar/luzes-glb'
import { prepararMatrizesExternasDoGlb } from '../src/compilar/matrizes-glb'
import { exemplo, glb } from './fixtures/glb-compilacao'

test('composição GLB compartilha peças estáticas e conserva canais independentes sem tocar a fonte', () => {
  const g = new BoxGeometry(),
    m = new MeshStandardMaterial(),
    a = new Group(),
    b = new Group(),
    ator = new Group()
  a.add(new Mesh(g, m))
  b.add(new Mesh(g, m))
  b.position.set(10, 2, 3)
  ator.add(new Mesh(g, m))
  const clip = new AnimationClip('andar', 1, [
    new VectorKeyframeTrack(`${ator.uuid}.position`, [0, 1], [0, 0, 0, 1, 0, 0]),
  ])
  let descartes = 0
  g.addEventListener('dispose', () => descartes++)
  m.addEventListener('dispose', () => descartes++)
  const r = prepararComposicaoDoGlb([
    { raiz: a, animacoes: [] },
    { raiz: b, animacoes: [] },
    { raiz: ator, animacoes: [clip] },
  ])
  try {
    for (const n of r.raiz.children.slice(0, 2)) {
      const copia = n.children[0] as Mesh
      expect(copia.geometry).toBe(g)
      expect(copia.material).toBe(m)
    }
    expect(r.raiz.children[1]!.position.toArray()).toEqual([10, 2, 3])
    expect(r.animacoes).toHaveLength(1)
    expect(r.animacoes[0]!.tracks[0]!.name).not.toBe(clip.tracks[0]!.name)
    expect(clip.tracks[0]!.name).toBe(`${ator.uuid}.position`)
    expect(ator.children).toHaveLength(1)
    expect(a.parent).toBeNull()
  } finally {
    r.descartar()
    r.descartar()
    expect(descartes).toBe(0)
    g.dispose()
    m.dispose()
  }
})

test('GLB recusa transformação de pele não representável sem destruir a cena de origem', () => {
  const g = new BoxGeometry(),
    m = new MeshStandardMaterial(),
    pele = new SkinnedMesh(g, m),
    osso = new Bone(),
    raiz = new Group()
  g.setAttribute('skinIndex', new Uint16BufferAttribute(new Uint16Array(24 * 4), 4))
  const pesos = new Float32Array(24 * 4)
  for (let i = 0; i < 24; i++) pesos[i * 4] = 1
  g.setAttribute('skinWeight', new Float32BufferAttribute(pesos, 4))
  pele.add(osso)
  pele.bind(new Skeleton([osso]))
  raiz.add(pele)
  raiz.scale.set(2, 1, 1)
  try {
    expect(() => prepararComposicaoDoGlb([{ raiz, animacoes: [] }])).toThrow(/uniforme/)
    expect(raiz.children[0]).toBe(pele)
    expect(pele.skeleton.bones[0]).toBe(osso)
    expect(g.getAttribute('position').count).toBe(24)
  } finally {
    pele.skeleton.dispose()
    g.dispose()
    m.dispose()
  }
})

test('GLB único conserva vértices/normais mundiais de wrappers com shear, giro, escala e reflexo', () => {
  const raiz = new Group(),
    g = new BoxGeometry(2, 3, 4),
    material = new MeshStandardMaterial(),
    wrappers: Group[] = [],
    malhas: Mesh[] = [],
    referencias: { p: Vector3; n: Vector3 }[][] = []
  try {
    for (const sinal of [-1, 1]) {
      const no = new Group(),
        m = new Mesh(g, material)
      no.name = `no-${sinal}`
      no.matrixAutoUpdate = false
      no.matrix.copy(
        new Matrix4()
          .makeTranslation(50000, 17, -80000)
          .multiply(new Matrix4().makeScale(sinal * 2, 0.75, 3))
          .multiply(new Matrix4().makeRotationY(0.7)),
      )
      m.position.set(1, 2, 3)
      m.rotation.x = 0.4
      no.add(m)
      raiz.add(no)
      wrappers.push(no)
      malhas.push(m)
    }
    raiz.updateMatrixWorld(true)
    for (const m of malhas) {
      const pos = m.geometry.getAttribute('position'),
        norm = m.geometry.getAttribute('normal'),
        mat = new Matrix3().getNormalMatrix(m.matrixWorld)
      referencias.push(
        Array.from({ length: pos.count }, (_, i) => ({
          p: new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld),
          n: new Vector3().fromBufferAttribute(norm, i).applyMatrix3(mat).normalize(),
        })),
      )
    }
    prepararMatrizesExternasDoGlb(wrappers)
    raiz.updateMatrixWorld(true)
    for (const [j, m] of malhas.entries()) {
      const pos = g.getAttribute('position'),
        norm = g.getAttribute('normal'),
        mat = new Matrix3().getNormalMatrix(m.matrixWorld)
      expect(m.geometry).toBe(g)
      for (let i = 0; i < pos.count; i++) {
        expect(
          new Vector3()
            .fromBufferAttribute(pos, i)
            .applyMatrix4(m.matrixWorld)
            .distanceTo(referencias[j]![i]!.p),
        ).toBeLessThan(1e-8)
        expect(
          new Vector3()
            .fromBufferAttribute(norm, i)
            .applyMatrix3(mat)
            .normalize()
            .distanceTo(referencias[j]![i]!.n),
        ).toBeLessThan(1e-10)
      }
    }
  } finally {
    g.dispose()
    material.dispose()
  }
})

test('luzes glTF exigem o destino explícito; não ampliam os modelos aceitos pelo pacote compilado', () => {
  const { j, bin } = exemplo(),
    dados = {
      ...j,
      extensionsUsed: ['KHR_lights_punctual'],
      extensions: {
        KHR_lights_punctual: { lights: [{ type: 'point', color: [1, 1, 1], intensity: 10 }] },
      },
      nodes: [...j.nodes, { extensions: { KHR_lights_punctual: { light: 0 } } }],
      scenes: [{ nodes: [0, 1, 2] }],
    },
    bytes = glb(dados, bin)
  expect(() => inspecionarGlbDaCompilacao(bytes)).toThrow(/extensão/)
  expect(inspecionarGlbDaCompilacao(bytes, { luzes: true }).malhas).toBe(2)
})

test('luz GLB aponta pelo eixo -Z sem alterar alvo/fonte e informa perda de decaimento', () => {
  const grupo = new Group()
  grupo.rotation.y = 0.7
  grupo.position.set(8, 2, -5)
  for (const fonte of [new DirectionalLight(), new SpotLight()]) {
    fonte.position.set(3, 4, 5)
    fonte.target.position.set(-2, 1, 3)
    grupo.add(fonte, fonte.target)
    grupo.updateMatrixWorld(true)
    const alvo = fonte.target.getWorldPosition(new Vector3()),
      pos = fonte.getWorldPosition(new Vector3()),
      antes = fonte.target.position.clone(),
      { luz, aviso } = copiarLuzParaGlb(fonte)
    expect(luz.position.distanceTo(pos)).toBeLessThan(1e-12)
    const direcao = new Vector3(0, 0, -1).applyQuaternion(luz.getWorldQuaternion(new Quaternion()))
    expect(direcao.distanceTo(alvo.sub(pos).normalize())).toBeLessThan(1e-12)
    if (luz instanceof DirectionalLight || luz instanceof SpotLight) {
      expect(luz.target.parent).toBe(luz)
      expect(luz.target.position.toArray()).toEqual([0, 0, -1])
    }
    expect(fonte.target.position.toArray()).toEqual(antes.toArray())
    expect(aviso).toBeUndefined()
  }
  const ponto = new PointLight()
  ponto.name = 'Lampião'
  ponto.decay = 0
  const copia = copiarLuzParaGlb(ponto)
  expect(copia.aviso).toContain('Lampião')
  expect((copia.luz as PointLight).decay).toBe(2)
  expect(ponto.decay).toBe(0)
})
