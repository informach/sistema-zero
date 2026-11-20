import { expect, test } from 'bun:test'
import {
  alteracoesDoGesto,
  apoioNaAgua,
  apoioNaSuperficie,
  capturarFragmento,
  criarDocumentoVazio,
  type DocumentoDeCenario,
  executarLote,
  type InstanciaDeCenario,
  inverterLote,
  posicaoNoMundo,
  type Transformacao,
  transformacaoResolvida,
  transformarPonto,
  validarDocumento,
  volumeNoMundo,
} from '../src/v2'

function exemplo() {
  const d = criarDocumentoVazio('jardim', 'Jardim')
  d.modelos = [
    {
      id: 'barco',
      modelo: 'barco',
      biblioteca: 'b',
      digest: 'a'.repeat(64),
      volume: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 1, z: 1 } },
    },
  ]
  const contorno = [
    { x: -10, z: -10 },
    { x: 10, z: -10 },
    { x: 10, z: 10 },
    { x: -10, z: 10 },
  ]
  d.aguas = [
    {
      id: 'lago',
      nome: 'Lago',
      tipo: 'lago',
      grupo: null,
      bloqueado: false,
      oculto: false,
      modelo: null,
      centro: { x: 20, z: -10 },
      nivel: 4,
      giro: Math.PI / 2,
      escala: 2,
      profundidade: 3,
      contorno,
      recorte: contorno,
    },
  ]
  const o: InstanciaDeCenario = {
    id: 'b',
    nome: 'Barco',
    grupo: null,
    bloqueado: false,
    oculto: false,
    modelo: 'barco',
    colisao: 'caixa',
    transformacao: {
      posicao: { x: 200, y: 200, z: 200 },
      rotacao: { x: 0.2, y: 0.3, z: 0.4 },
      escala: { x: 2, y: 3, z: 4 },
    },
    apoio: {
      tipo: 'agua',
      agua: 'lago',
      local: { x: 3, z: 2 },
      deslocamento: 0.5,
      giro: 0.3,
      escala: 1,
    },
  }
  d.instancias.push(o)
  return { d, o }
}
function perto(a: Transformacao, b: Transformacao) {
  // Compara a transformação efetiva, sem depender da representação equivalente dos Euler.
  for (const p of [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ]) {
    const x = transformarPonto(p, a),
      y = transformarPonto(p, b)
    for (const e of ['x', 'y', 'z'] as const) expect(x[e]).toBeCloseTo(y[e], 9)
  }
}
test('apoio antigo resolve posição, nível, giro e escala locais do lago sem alterar autoria', () => {
  const { d, o } = exemplo(),
    antes = structuredClone(d)
  const t = transformacaoResolvida(d, o)
  expect(posicaoNoMundo(d, o)).toEqual({ x: 24, y: 5, z: -16 })
  expect(t.rotacao.y).toBeCloseTo(Math.PI / 2 + 0.3)
  expect(t.escala).toEqual({ x: 2, y: 2, z: 2 })
  expect(d).toEqual(antes)
})
test('gesto conserva pose XYZ e escala não uniforme, acompanha água e copia o resultado visível', () => {
  const { d, o } = exemplo()
  const mundo: Transformacao = {
    posicao: { x: 24, y: 5, z: -16 },
    rotacao: { x: 0.6, y: 0.4, z: -0.7 },
    escala: { x: 2, y: 3, z: 1 },
  }
  const antes = structuredClone(mundo)
  Object.assign(o, alteracoesDoGesto(d, o, mundo))
  perto(transformacaoResolvida(d, o), mundo)
  expect(mundo).toEqual(antes)
  const f = capturarFragmento(d, ['b'], 'espaco')
  expect(f.instancias[0]!.apoio.tipo).toBe('absoluto')
  perto(f.instancias[0]!.transformacao, mundo)
  const agua = d.aguas[0]!
  if (agua.tipo !== 'lago') throw Error('Lago esperado')
  agua.nivel += 3
  expect(posicaoNoMundo(d, o).y).toBe(8)
  agua.escala *= 2
  expect(transformacaoResolvida(d, o).escala).toEqual({ x: 4, y: 6, z: 2 })
  agua.giro += 0.7
  perto(
    capturarFragmento(d, ['b'], 'espaco').instancias[0]!.transformacao,
    transformacaoResolvida(d, o),
  )
  const volume = volumeNoMundo(d, o)
  expect(volume.max.y).toBeGreaterThan(volume.min.y)
})
test('mar e rio admitem apoio; queda não inventa superfície horizontal', () => {
  const { d, o } = exemplo()
  d.aguas = [
    { id: 'mar', nome: 'Mar', tipo: 'mar', nivel: 2, grupo: null, bloqueado: false, oculto: false },
    {
      id: 'rio',
      nome: 'Rio',
      tipo: 'rio',
      largura: 4,
      profundidade: 2,
      correnteza: 1,
      pontos: [
        { x: 0, y: 4, z: 0 },
        { x: 10, y: 2, z: 0 },
      ],
      grupo: null,
      bloqueado: false,
      oculto: false,
    },
  ]
  const mundo = { ...o.transformacao, posicao: { x: 5, y: 3.5, z: 0 } }
  o.apoio = apoioNaAgua(d, 'rio', mundo)
  perto(transformacaoResolvida(d, o), mundo)
  o.apoio = apoioNaAgua(d, 'mar', mundo)
  perto(transformacaoResolvida(d, o), mundo)
  expect(() => apoioNaAgua(d, 'ausente', mundo)).toThrow('ausente')
  const queda: DocumentoDeCenario['aguas'][number] = {
    id: 'queda',
    nome: 'Queda',
    tipo: 'cachoeira',
    topo: { x: 0, y: 5, z: 0 },
    base: { x: 0, y: 0, z: 0 },
    largura: 2,
    giro: 0,
    grupo: null,
    bloqueado: false,
    oculto: false,
  }
  d.aguas.push(queda)
  expect(() => apoioNaAgua(d, 'queda', mundo)).toThrow('horizontal')
})

test('mudar o nível leva a pilha inteira e desfaz exatamente; água com dependente não é apagada', () => {
  const { d, o } = exemplo()
  const t = transformacaoResolvida(d, o),
    contato = transformarPonto({ x: 0, y: 1, z: 0 }, t)
  const filho = { ...structuredClone(o), id: 'caixa', apoio: apoioNaSuperficie(d, 'b', contato) }
  d.instancias.push(filho)
  const antes = posicaoNoMundo(d, filho),
    agua = d.aguas[0]!
  if (agua.tipo !== 'lago') throw Error('Lago esperado')
  const resultado = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos: [{ tipo: 'agua.definir', agua: { ...agua, nivel: 9 } }] },
  ).documento
  expect(posicaoNoMundo(resultado, resultado.instancias[1]!).y).toBeCloseTo(antes.y + 5)
  expect(
    executarLote(
      { documento: resultado, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(d, resultado) },
    ).documento,
  ).toEqual(d)
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      { revisaoEsperada: 0, comandos: [{ tipo: 'agua.remover', id: 'lago' }] },
    ),
  ).toThrow('ausente')
  const fora = structuredClone(d)
  if (fora.instancias[0]!.apoio.tipo !== 'agua') throw Error('Apoio esperado')
  fora.instancias[0]!.apoio.local.x = 100000
  expect(() => validarDocumento(fora)).toThrow('limites')
})

test('validar milhares de objetos no mesmo rio calcula a superfície uma vez só', () => {
  const { d, o } = exemplo()
  const pontos = Array.from({ length: 400 }, (_, i) => ({
    x: i * 2,
    y: 4,
    z: Math.sin(i / 8) * 6,
  }))
  d.aguas.push({
    id: 'rio',
    nome: 'Rio',
    tipo: 'rio',
    largura: 4,
    profundidade: 2,
    correnteza: 1,
    pontos,
    grupo: null,
    bloqueado: false,
    oculto: false,
  })
  d.instancias = []
  for (let i = 0; i < 3000; i++) {
    const mundo = {
      ...o.transformacao,
      posicao: { x: pontos[i % 400]!.x, y: 4, z: pontos[i % 400]!.z },
    }
    d.instancias.push({ ...structuredClone(o), id: `b${i}`, apoio: apoioNaAgua(d, 'rio', mundo) })
  }
  const inicio = performance.now()
  validarDocumento(d)
  // Antes: a superfície do rio era refeita por objeto (minutos com rios longos).
  expect(performance.now() - inicio).toBeLessThan(5000)
})
