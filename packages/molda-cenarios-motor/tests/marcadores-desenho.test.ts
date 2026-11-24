import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  MarcadorSchema,
  transformacaoDoMarcador,
  transformarPonto,
} from '@sistemazero/molda-cenarios-core/v2'
import { desenhoDoMarcador } from '../src/jogo/desenho-de-marcador'

const marcador = (configuracao: unknown) =>
  MarcadorSchema.parse({
    id: 'm',
    nome: 'M',
    grupo: null,
    oculto: false,
    bloqueado: false,
    posicao: { x: 10, y: 2, z: 20 },
    giro: Math.PI / 2,
    noChao: false,
    objeto: null,
    configuracao,
  })
test('helpers das oito funções produzem segmentos finitos com orçamento previsível', () => {
  const d = criarDocumentoVazio('d', 'Guias')
  for (const c of [
    { tipo: 'ponto' },
    { tipo: 'inicio', principal: true },
    { tipo: 'zona', forma: { tipo: 'esfera', raio: 2 } },
    {
      tipo: 'rota',
      pontos: [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 1, z: 0 },
      ],
      fechada: false,
      seguirTerreno: false,
    },
    { tipo: 'camera', alvo: { x: 0, y: 0, z: -4 }, campoDeVisao: 48 },
    {
      tipo: 'luz',
      luz: {
        tipo: 'pontual',
        cor: '#ffddaa',
        intensidade: 10,
        alcance: 8,
        decaimento: 2,
        sombra: false,
      },
    },
    { tipo: 'regua', fim: { x: 3, y: 4, z: 0 } },
    { tipo: 'escala', altura: 1.16 },
  ]) {
    const linhas = desenhoDoMarcador(d, marcador(c))
    expect(linhas.length).toBeGreaterThan(0)
    expect(linhas.length % 6).toBe(0)
    expect(linhas.every(Number.isFinite)).toBe(true)
    expect(linhas.length / 3).toBeLessThan(32_769)
  }
})
test('desenho da rota usa a mesma elevação e distância do núcleo, sem aplicar a raiz duas vezes', () => {
  const d = criarDocumentoVazio('d', 'Rota'),
    m = marcador({
      tipo: 'rota',
      pontos: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ],
      fechada: false,
      seguirTerreno: false,
    })
  const linhas = desenhoDoMarcador(d, m),
    t = transformacaoDoMarcador(d, m)
  const inicio = transformarPonto({ x: linhas[0]!, y: linhas[1]!, z: linhas[2]! }, t)
  const fim = transformarPonto({ x: linhas.at(-3)!, y: linhas.at(-2)!, z: linhas.at(-1)! }, t)
  expect(inicio).toEqual(m.posicao)
  expect(fim).toEqual({ x: 10, y: 2, z: 16 })
})
test('câmera vertical e foco vertical conservam vértices finitos; escala usa a altura autoral', () => {
  const d = criarDocumentoVazio('d', 'Vertical'),
    c = marcador({ tipo: 'camera', alvo: { x: 0, y: 4, z: 0 }, campoDeVisao: 48 })
  expect(desenhoDoMarcador(d, c).every(Number.isFinite)).toBe(true)
  const foco = marcador({
    tipo: 'luz',
    luz: {
      tipo: 'foco',
      cor: '#ffddaa',
      intensidade: 10,
      alcance: 8,
      decaimento: 2,
      sombra: false,
      alvo: { x: 0, y: -1, z: 0 },
      angulo: 35,
      penumbra: 0.3,
    },
  })
  expect(desenhoDoMarcador(d, foco).every(Number.isFinite)).toBe(true)
  const e = desenhoDoMarcador(d, marcador({ tipo: 'escala', altura: 1.16 }))
  const ys = Array.from(e).filter((_, i) => i % 3 === 1)
  expect(Math.min(...ys)).toBeCloseTo(0, 6)
  expect(Math.max(...ys)).toBeCloseTo(1.16, 6)
})
