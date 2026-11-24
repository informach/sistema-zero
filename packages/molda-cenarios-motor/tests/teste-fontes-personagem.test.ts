import { expect, test } from 'bun:test'
import { criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import {
  AnimationClip,
  Box3,
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  NumberKeyframeTrack,
  Vector3,
} from 'three'
import { MundoDoTeste } from '../src/teste/colisoes'
import { prepararColisoesDoTeste } from '../src/teste/fontes'
import { PersonagemDoTeste } from '../src/teste/personagem'

test('tipos de colisão, peças pendentes e partes duplicadas conservam sua intenção', () => {
  const documento = criarDocumentoVazio('teste', 'Teste'),
    g = new BoxGeometry(1, 2, 1),
    m = new Matrix4()
  const o = {
    id: 'a',
    nome: 'A',
    modelo: 'ref',
    grupo: null,
    oculto: false,
    bloqueado: false,
    apoio: { tipo: 'absoluto' as const },
    transformacao: {
      posicao: { x: 0, y: 0, z: 0 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
  }
  const tipos = ['nenhuma', 'caixa', 'capsula', 'malha'] as const
  documento.instancias = tipos.map((colisao, i) => ({ ...o, id: String(i), colisao }))
  const superficies = documento.instancias.flatMap((o) =>
    [0, 1].map(() => ({ objeto: o.id, geometria: g, matriz: m })),
  )
  superficies.push({ objeto: 'inexistente', geometria: g, matriz: m })
  const corpos = new Map(
    documento.instancias.map((o) => [
      o.id,
      { caixa: new Box3(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 2, 0.5)), matriz: m },
    ]),
  )
  const pacote = prepararColisoesDoTeste(documento, superficies, corpos, [])
  expect(pacote.fontes).toHaveLength(4)
  expect(pacote.fontes.filter((f) => f.geometria === g)).toHaveLength(2)
  expect(pacote.fontes.map((f) => f.objeto)).toEqual(['1', '2', '3', '3'])
  pacote.descartar()
  const pendente = prepararColisoesDoTeste(
    documento,
    superficies.map((s) => ({ ...s, pendente: true })),
    corpos,
    [],
  )
  expect(pendente.fontes).toHaveLength(0)
  pendente.descartar()
  g.dispose()
})
test('avatar respeita altura nativa, pivô deslocado, frente escolhida e clipes originais', () => {
  const raiz = new Group(),
    g = new BoxGeometry(0.5, 1.16, 0.3),
    material = new MeshStandardMaterial(),
    mesh = new Mesh(g, material)
  mesh.position.set(3, 2.58, 4)
  mesh.name = 'Corpo'
  raiz.add(mesh)
  raiz.updateMatrixWorld(true)
  const caixa = new Box3().setFromObject(raiz)
  const track = new NumberKeyframeTrack('Corpo.rotation[y]', [0, 1], [0, 0.4]),
    clipe = new AnimationClip('Pose', 1, [track])
  const valores = Array.from(track.values)
  let descartes = 0
  const modelo = {
    raiz,
    partes: [],
    caixa,
    triangulos: 12,
    animacoes: [clipe],
    descartar() {
      descartes++
      g.dispose()
      material.dispose()
    },
  }
  const personagem = new PersonagemDoTeste(modelo, {
    modo: 'terceira',
    giroDoModelo: Math.PI / 2,
    clipes: { parado: 'Pose' },
  })
  expect(personagem.altura).toBeCloseTo(1.16, 4)
  const volume = new Box3().setFromObject(personagem.grupo)
  expect(volume.min.y).toBeCloseTo(0, 4)
  expect(volume.getCenter(new Vector3()).x).toBeCloseTo(0, 4)
  expect(volume.getCenter(new Vector3()).z).toBeCloseTo(0, 4)
  expect(personagem.clipes).toEqual(['Pose'])
  personagem.atualizar(0.5, 0, true, false)
  expect(mesh.rotation.y).toBeGreaterThan(0)
  expect(Array.from(track.values)).toEqual(valores)
  personagem.descartar()
  expect(descartes).toBe(1)
})
test('boneco genérico tem a altura declarada e invalidez é recusada antes de montar', () => {
  const p = new PersonagemDoTeste(null, { modo: 'terceira', altura: 1.16 }),
    b = new Box3().setFromObject(p.grupo)
  expect(b.min.y).toBeCloseTo(0, 4)
  expect(b.max.y).toBeCloseTo(1.16, 4)
  expect(() => new PersonagemDoTeste(null, { modo: 'terceira', altura: NaN })).toThrow('altura')
  p.descartar()
  const mundo = new MundoDoTeste([])
  mundo.descartar()
  expect(() => mundo.resolver(new Vector3(), 1.16, 0.19)).toThrow('encerrada')
})
