import { expect, test } from 'bun:test'
import {
  alteracoesDoGesto,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  INCLINACAO_MAXIMA,
  type InstanciaDeCenario,
  posicaoNoMundo,
  transformacaoResolvida,
} from '../src/v2'

const terreno = (): DocumentoDeCenario => {
  const d = criarDocumentoVazio('11111111-1111-4111-8111-111111111111', 'Encosta')
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -40,
    max: 40,
    fundo: -40,
    pecas: [],
  }
  d.modelos = [
    {
      id: 'caixa',
      biblioteca: '22222222-2222-4222-8222-222222222222',
      modelo: '33333333-3333-4333-8333-333333333333',
      digest: 'a'.repeat(64),
      // Uma caixa de 2 × 1 × 2 m com o pivô no meio: a base fica 0,5 m abaixo da origem.
      volume: { min: { x: -1, y: -0.5, z: -1 }, max: { x: 1, y: 0.5, z: 1 } },
    },
  ]
  return d
}
const caixa = (inclinar: boolean, giroY = 0): InstanciaDeCenario => ({
  id: 'o',
  nome: 'Caixa',
  grupo: null,
  bloqueado: false,
  oculto: false,
  modelo: 'caixa',
  transformacao: {
    posicao: { x: 0, y: 0, z: 0 },
    rotacao: { x: 0, y: giroY, z: 0 },
    escala: { x: 1, y: 1, z: 1 },
  },
  apoio: { tipo: 'terreno', deslocamento: 0, referencia: 'volume', inclinar },
  colisao: 'caixa',
})
// Rampa subindo para +x: meio metro a cada metro (26,57°).
const rampa: FonteDeAlturas = (x) => 0.5 * x
const plano: FonteDeAlturas = () => 2

test('sem inclinar, nada muda: o giro guardado e a base no chão como antes', () => {
  const d = terreno()
  const t = transformacaoResolvida(d, caixa(false), rampa)
  expect(t.rotacao).toEqual({ x: 0, y: 0, z: 0 })
  expect(t.posicao.y).toBeCloseTo(0.5, 9)
})

test('na rampa, o objeto toma a inclinação do chão e o centro da base pousa nele', () => {
  const d = terreno()
  const t = transformacaoResolvida(d, caixa(true), rampa)
  const angulo = Math.atan(0.5)
  expect(t.rotacao.x).toBeCloseTo(0, 9)
  expect(t.rotacao.y).toBeCloseTo(0, 9)
  expect(t.rotacao.z).toBeCloseTo(angulo, 9)
  // Centro da base (0, -0,5, 0) girado: fica 0,5·cos(ângulo) abaixo da origem.
  expect(t.posicao.y).toBeCloseTo(0.5 * Math.cos(angulo), 9)
  // O "para cima" do objeto coincide com a normal da rampa.
  const normal = { x: -0.5, y: 1 }
  const tamanho = Math.hypot(normal.x, normal.y)
  expect(-Math.sin(t.rotacao.z)).toBeCloseTo(normal.x / tamanho, 9)
  expect(Math.cos(t.rotacao.z)).toBeCloseTo(normal.y / tamanho, 9)
})

test('no chão plano o objeto que inclina fica reto; a encosta íngreme para no limite', () => {
  const d = terreno()
  expect(transformacaoResolvida(d, caixa(true), plano).rotacao).toEqual({ x: 0, y: 0, z: 0 })
  const parede: FonteDeAlturas = (x) => 4 * x
  const t = transformacaoResolvida(d, caixa(true), parede)
  expect(t.rotacao.z).toBeCloseTo(INCLINACAO_MAXIMA, 9)
})

test('o giro do próprio objeto continua por dentro da encosta', () => {
  const d = terreno()
  const giro = Math.PI / 2
  const t = transformacaoResolvida(d, caixa(true, giro), rampa)
  // Ainda virado 90° em volta do próprio eixo, e com o eixo inclinado pela rampa.
  const para = (v: { x: number; y: number; z: number }) => {
    const { x: rx, y: ry, z: rz } = t.rotacao
    const zx = v.x * Math.cos(rz) - v.y * Math.sin(rz),
      zy = v.x * Math.sin(rz) + v.y * Math.cos(rz)
    const yx = zx * Math.cos(ry) + v.z * Math.sin(ry),
      yz = -zx * Math.sin(ry) + v.z * Math.cos(ry)
    return {
      x: yx,
      y: zy * Math.cos(rx) - yz * Math.sin(rx),
      z: zy * Math.sin(rx) + yz * Math.cos(rx),
    }
  }
  const cima = para({ x: 0, y: 1, z: 0 })
  const tamanho = Math.hypot(0.5, 1)
  expect(cima.x).toBeCloseTo(-0.5 / tamanho, 9)
  expect(cima.y).toBeCloseTo(1 / tamanho, 9)
  expect(cima.z).toBeCloseTo(0, 9)
})

test('mover pelo palco guarda o giro sem a encosta: nada inclina duas vezes', () => {
  const d = terreno()
  const o = caixa(true, 0.3)
  d.instancias = [o]
  // O palco devolve a transformação que mostrou (já inclinada), só que deslocada em z.
  const mostrada = transformacaoResolvida(d, o, rampa)
  const movida = { ...mostrada, posicao: { ...mostrada.posicao, z: 3 } }
  const alteracoes = alteracoesDoGesto(d, o, movida, rampa)
  expect(alteracoes.transformacao.rotacao.x).toBeCloseTo(0, 9)
  expect(alteracoes.transformacao.rotacao.y).toBeCloseTo(0.3, 9)
  expect(alteracoes.transformacao.rotacao.z).toBeCloseTo(0, 9)
  const depois = { ...o, ...alteracoes }
  const resolvida = transformacaoResolvida(d, depois, rampa)
  expect(resolvida.rotacao.x).toBeCloseTo(mostrada.rotacao.x, 9)
  expect(resolvida.rotacao.y).toBeCloseTo(mostrada.rotacao.y, 9)
  expect(resolvida.rotacao.z).toBeCloseTo(mostrada.rotacao.z, 9)
  expect(posicaoNoMundo(d, depois, rampa).y).toBeCloseTo(mostrada.posicao.y, 9)
})

test('sem os bytes do relevo, a projeção autoral não inventa encosta', () => {
  const d = terreno()
  const o = caixa(true)
  d.instancias = [o]
  // Sem fonte, a posição guardada vale (o palco só desenha com o relevo carregado).
  expect(() => transformacaoResolvida(d, o)).toThrow()
})
