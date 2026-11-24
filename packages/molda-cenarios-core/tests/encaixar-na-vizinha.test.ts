import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  type DocumentoDeCenario,
  encaixarNaVizinha,
  encaixarPose,
  type InstanciaDeCenario,
  matrizDaPose,
  type PontoDeEncaixe,
  pontosNoMundo,
} from '../src/v2'

// Um trecho de caminho de 4 m no eixo z: um ponto em cada ponta, na altura do piso (0,1 m).
const TRECHO: PontoDeEncaixe[] = [
  { posicao: { x: 0, y: 0.1, z: 2 }, direcao: { x: 0, z: 1 }, largura: 1.2 },
  { posicao: { x: 0, y: 0.1, z: -2 }, direcao: { x: 0, z: -1 }, largura: 1.2 },
]
const pose = (x: number, z: number, giroY = 0) => ({
  posicao: { x, y: 0, z },
  rotacao: { x: 0, y: giroY, z: 0 },
  escala: { x: 1, y: 1, z: 1 },
})

test('a matriz da pose leva o ponto local ao mundo (giro e escala)', () => {
  const [p] = pontosNoMundo(
    [TRECHO[0]!],
    matrizDaPose({ ...pose(10, 5, Math.PI / 2), escala: { x: 2, y: 2, z: 2 } }),
  )
  // Girar 90° em y leva +z a +x; a escala 2 dobra a distância e a largura.
  expect(p!.posicao.x).toBeCloseTo(14, 6)
  expect(p!.posicao.y).toBeCloseTo(0.2, 6)
  expect(p!.posicao.z).toBeCloseTo(5, 6)
  expect(p!.direcao.x).toBeCloseTo(1, 6)
  expect(p!.largura).toBeCloseTo(2.4, 6)
})

test('a peça torta e afastada gira no próprio eixo e encosta ponta com ponta', () => {
  const vizinha = pontosNoMundo(TRECHO, matrizDaPose(pose(0, 0)))
  // A segunda peça está 0,4 m adiante da ponta e virada 20°.
  const r = encaixarPose(TRECHO, pose(0.1, 4.4, (20 * Math.PI) / 180), vizinha, 3)
  expect(r).not.toBeNull()
  expect(r!.pose.rotacao.y).toBeCloseTo(0, 6)
  const pontas = pontosNoMundo(TRECHO, matrizDaPose(r!.pose))
  const tras = pontas.find((p) => p.direcao.z < -0.9)!
  expect(tras.posicao.x).toBeCloseTo(0, 6)
  expect(tras.posicao.z).toBeCloseTo(2, 6)
  expect(r!.pose.posicao.z).toBeCloseTo(4, 6)
})

test('longe demais, ou de lado (sem ponto de frente), nada encaixa', () => {
  const vizinha = pontosNoMundo(TRECHO, matrizDaPose(pose(0, 0)))
  expect(encaixarPose(TRECHO, pose(0, 9), vizinha, 3)).toBeNull()
})

const doc = (): DocumentoDeCenario => {
  const d = criarDocumentoVazio('11111111-1111-4111-8111-111111111111', 'Encaixe')
  d.modelos = [
    {
      id: 'trecho',
      biblioteca: '22222222-2222-4222-8222-222222222222',
      modelo: '33333333-3333-4333-8333-333333333333',
      digest: 'a'.repeat(64),
      volume: { min: { x: -0.6, y: 0, z: -2 }, max: { x: 0.6, y: 0.1, z: 2 } },
    },
    {
      id: 'banco',
      biblioteca: '22222222-2222-4222-8222-222222222222',
      modelo: '44444444-4444-4444-8444-444444444444',
      digest: 'b'.repeat(64),
      volume: { min: { x: -1, y: 0, z: -0.3 }, max: { x: 1, y: 0.5, z: 0.3 } },
    },
  ]
  return d
}
const peca = (id: string, modelo: string, x: number, z: number, giroY = 0): InstanciaDeCenario => ({
  id,
  nome: id,
  grupo: null,
  bloqueado: false,
  oculto: false,
  modelo,
  transformacao: pose(x, z, giroY),
  apoio: { tipo: 'absoluto' },
  colisao: 'malha',
})

test('encaixar na vizinha: usa os pontos da geometria e solta a peça do relevo', () => {
  const d = doc()
  d.instancias = [
    peca('a', 'trecho', 0, 0),
    peca('b', 'trecho', 0.3, 5.5, 0.2),
    peca('c', 'banco', 0, 6),
  ]
  const r = encaixarNaVizinha(d, 'b', (m) => (m.id === 'trecho' ? TRECHO : null))
  expect(r).not.toBeNull()
  expect(r!.vizinha).toBe('a')
  expect(r!.alteracoes.apoio).toEqual({ tipo: 'absoluto' })
  expect(r!.alteracoes.transformacao.posicao.z).toBeCloseTo(4, 6)
  expect(r!.alteracoes.transformacao.rotacao.y).toBeCloseTo(0, 6)
})

test('os pontos escritos à mão no modelo valem mais que os da geometria', () => {
  const d = doc()
  // À mão, o trecho só se liga por um lado (+x): a peça vizinha em +x encaixa por ali.
  d.modelos[0]!.encaixes = [
    { posicao: { x: 0.6, y: 0.1, z: 0 }, direcao: { x: 1, z: 0 }, largura: 1 },
  ]
  d.instancias = [peca('a', 'trecho', 0, 0), peca('b', 'trecho', 1.5, 0, Math.PI)]
  const r = encaixarNaVizinha(d, 'b', () => TRECHO)
  expect(r).not.toBeNull()
  expect(r!.alteracoes.transformacao.posicao.x).toBeCloseTo(1.2, 6)
  // Sem pontos escritos e sem geometria, não há o que encaixar.
  expect(encaixarNaVizinha(doc(), 'x', () => null)).toBeNull()
})
